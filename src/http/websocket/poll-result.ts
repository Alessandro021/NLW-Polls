import z from "zod"
import { voting } from "../../utils/voting-pub-sub"
import { routerPollResult } from "../server"

export const pollResults = async () => {
    routerPollResult.get("/polls/:pollId/results", { websocket: true}, (connection, req) => {

        const getPollParams = z.object({
            pollId: z.string().uuid(),
        })
    
        const {pollId} =  getPollParams.parse(req.params)
        voting.subscribe(pollId, (message) => {
                connection.socket.send(JSON.stringify(message))
        })
    })
}