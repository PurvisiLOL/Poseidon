import {
    Client,
    ChatInputCommandInteraction,
    PermissionFlagsBits,
  } from "discord.js";
  
  export default {
    customId: "lockTicketBtn",
  
    /**
     * @param {Client} client
     * @param {ChatInputCommandInteraction} interaction
     */
  
    async execute(interaction, client) {
      try {
        const { channel } = interaction;
  
        await interaction.deferReply();
  
        await channel.setLocked(true);
  
        return await interaction.editReply({
          content: "Ticket has been Locked Successfully.",
          ephemeral: true,
        });
      } catch (err) {
        console.error(err);
      }
    },
  };
  