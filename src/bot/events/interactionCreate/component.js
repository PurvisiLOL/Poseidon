import { ChatInputCommandInteraction, Client } from "discord.js"; // Importing required modules
import config from "../../config.json" assert { type: "json" }; // Importing the configuration file
import reply from "../../core/functions/reply.js"; // Importing the reply function
import validateUser from "../../core/functions/validateUser.js";

export default {
  name: "interactionCreate", // The name of the event

  /**
   * The function that is executed when the event is triggered
   * @param {ChatInputCommandInteraction} interaction - The interaction that triggered the event
   * @param {Client} client - The Discord.js client
   */
  async execute(interaction, client) {
    // Getting the interaction's custom ID
    if (interaction.customId) {
      const component = client.components.get(interaction.customId); // Getting the component with the given custom ID

      if (!component) return;

      await validateUser(component, interaction, client)
    }
  },
};
