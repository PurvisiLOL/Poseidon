import { Client, Collection } from "discord.js"
import discordIntents from "./intents.js";
import discordPartials from "./partials.js";

//Constructing the client
const client = new Client({
    intents: discordIntents,
    partials: discordPartials,
    allowedMentions: {
        parse: ["everyone", "users", "roles"]
    },
    presence: {
        activities: [{
            name: 'order',
            type: 4,
            state: 'status'
        }]
    }
})

//creating collections
client.commands = new Collection();
client.components = new Collection();
client.antiSpam = new Collection();
client.automodWarnMessage = new Collection();
client.imageModerationCooldown = new Collection();
client.cooldown = new Collection();

export default client;
