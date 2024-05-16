import {
  Client,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from "discord.js";

export default {
  customId: "noCloseTicketBtn",

  /**
   * @param {Client} client
   * @param {ChatInputCommandInteraction} interaction
   */

  run: async (client, interaction) => {
    try {
      return await interaction.reply({
        content: "Closing the Ticket has been canceled.",
        ephemeral: true,
      });
    } catch (err) {
      console.error(err);
    }
  },
};
