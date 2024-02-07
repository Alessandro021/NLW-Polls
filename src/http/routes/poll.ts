import z from "zod"
import { prisma } from "../../lib/prismaClient"
import {routerPoll} from "../server"
import { randomUUID } from "crypto"
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
    
        return res.status(200).send({poll})
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

            } else if(userPreviosVoteOnPoll){
                return res.status(404).send({message: "Você já votou nessa enquete."})
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
    
           
        return res.status(201).send()
    })
}