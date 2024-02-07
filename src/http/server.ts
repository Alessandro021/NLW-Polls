import fastify from "fastify"
import cookie from "@fastify/cookie"
import { poll } from "./routes/poll"

const app = fastify()

app.register(cookie, {
    secret: "poll-secret",
    hook: 'onRequest'
})

export const routerPoll =  app.register(poll)

app.head("/", (req, res) => {
    res.status(200)
})

app.listen({port: 3333}).then(() => console.log("listening on port"))