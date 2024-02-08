import fastify from "fastify"
import cookie from "@fastify/cookie"
import { poll } from "./routes/poll"
import { pollResults } from "./websocket/poll-result"
import websocket from "@fastify/websocket"

const app = fastify()

app.register(cookie, {
    secret: "poll-secret",
    hook: 'onRequest'
})

app.register(websocket)

export const routerPoll =  app.register(poll)
export const routerPollResult =  app.register(pollResults)

app.head("/", (req, res) => {
    res.status(200)
})

app.listen({port: 3333}).then(() => console.log("listening on port"))