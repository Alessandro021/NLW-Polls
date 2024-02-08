import z from "zod"
import { prisma } from "../../lib/prismaClient"
import {routerPoll} from "../server"
import { randomUUID } from "crypto"
import { redis } from "../../lib/redis"
import {voting } from "../../utils/voting-pub-sub"
// import { FastifyInstance } from "fastify"


// export const poll = async(app: FastifyInstance) => {}
export const poll = async () => {

    //CREATE POLL
    routerPoll.post("/polls", async (req, res) => {
        const createPollBody = z.object({
            title: z.string(),
            options: z.array(z.string())
        })
    
         const {title, options} =  createPollBody.parse(req.body)
    
        const poll = await prisma.poll.create({
            data: {title: title, options: {
                createMany: {
                    data: options.map(option => {
                        return {title: option}
                    })
                }
            }},
            select: {
                id: true
            }
        })
    
        return res.status(201).send({pollId: poll.id})
    })

    //GET POLL
    routerPoll.get("/polls/:pollId", async (req, res) => {
        const getPollParams = z.object({
            pollId: z.string().uuid(),
        })
    
         const {pollId} =  getPollParams.parse(req.params)
    
        const poll = await prisma.poll.findUnique({
           where: {id: pollId},
           include: {
                options: {
                    select: {
                        id: true,
                        title: true
                    }
                }
           }
        })

        if(!poll){
            return res.status(400).send({message: "Enquete não existe."})
        }

        const result = await redis.zrange(pollId, 0, -1, "WITHSCORES")
        
        const votes = result.reduce((obj, line, index ): {} => {
            if(index % 2 === 0){
                const score = result[index + 1]
                Object.assign(obj, {[line]: Number(score)})
                // obj[line] = Number(score);
            }

            return obj
        }, {} as Record<string, number>)

        return res.status(200).send({
            poll: {
                id: poll.id,
                title: poll.title,
                options: poll.options.map(option => {
                    return {
                        id: option.id,
                        title: option.title,
                        score: (option.id in votes) ? votes[option.id] : 0
                        // score: votes[option.id] ?? 0
                    }
                })
            }
        })
    })

    //POST VOTE_ON_POLL
    routerPoll.post("/polls/:pollId/votes", async (req, res) => {
        const voteOnPollBody = z.object({
            pollOptionId: z.string().uuid(),
        })

        const voteOnPollParams = z.object({
            pollId: z.string().uuid(),
        })
    
         const {pollOptionId} =  voteOnPollBody.parse(req.body)
         const {pollId} =  voteOnPollParams.parse(req.params)

         let sessionId = req.cookies?.sessionId

         if(sessionId){
            const userPreviosVoteOnPoll = await prisma.vote.findUnique({
                where: {
                    sessionId_pollId: {
                        sessionId: sessionId,
                        pollId: pollId
                    }
                }
            })
            if(userPreviosVoteOnPoll && userPreviosVoteOnPoll.pollOptionId !== pollOptionId){

                await prisma.vote.delete({
                    where: {id: userPreviosVoteOnPoll.id}
                })

                const votes = await redis.zincrby(pollId, -1, userPreviosVoteOnPoll.pollOptionId)

                voting.publish(pollId, {
                    pollOptionId: userPreviosVoteOnPoll.pollOptionId,
                    votes: Number(votes)
                })

            } else if(userPreviosVoteOnPoll){
                return res.status(400).send({message: "Você já votou nessa enquete."})
            }
         }

         if(!sessionId){
            sessionId = randomUUID()

            res.setCookie("sessionId", sessionId, {
                path: "/",
                maxAge: 60 * 60 * 24 * 30, //30 dias
                signed: true,
                httpOnly: true
            })
        }

        await prisma.vote.create({
            data: { sessionId: sessionId, pollId: pollId, pollOptionId: pollOptionId }
        })

        const votes = await redis.zincrby(pollId, 1, pollOptionId)
    
        voting.publish(pollId, {
            pollOptionId,
            votes: Number(votes)
        })

        return res.status(201).send()
    })
}