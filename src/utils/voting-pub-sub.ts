type Message = {
    pollOptionId: string,
    votes: number
}

type Subscriber = (message: Message) => void

interface Channels {
    [key: string]: Subscriber[];
}

let channels: Channels = {};

const subscribe = (pollId: string, subscriber: Subscriber) => {
    if (!channels[pollId]) {
        channels[pollId] = [];
    }
    channels[pollId].push(subscriber);
}

const publish = (pollId: string, message: Message) => {
    if (!channels[pollId]) {
        return;
    }
    channels[pollId].forEach(subscriber => subscriber(message));
}

export const voting =  {subscribe, publish}