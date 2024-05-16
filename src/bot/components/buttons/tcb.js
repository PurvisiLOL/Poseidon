import {
  Client,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  ButtonStyle,
  ButtonBuilder,
  ActionRowBuilder,
} from "discord.js";

export default {
  customId: "closeTicketBtn",

  /**
   * @param {Client} client
   * @param {ChatInputCommandInteraction} interaction
   */

  async execute(interaction, client) {
    try {
      await interaction.deferReply();

      const confirmCloseTicketEmbed = new EmbedBuilder()
        .setColor("DarkRed")
        .setTitle("Close Ticket").setDescription(`
            > Please give your feedback on how was the staff members behavior
            > how was your experience with the staff?
            > if you wouldn't like to give feedback then tell the staff to close the ticket.
          `);

      const confirmCloseTicketBtns = new ActionRowBuilder().addComponents([
        new ButtonBuilder()
          .setCustomId("yesCloseTicketBtn")
          .setLabel("Yes, Close Ticket")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId("noCloseTicketBtn")
          .setLabel("No, Not now")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("feedbackTicketBtn")
          .setLabel("Give Feedback")
          .setStyle(ButtonStyle.Secondary),
      ]);

      return await interaction.editReply({
        content: "Confirmation before Closing the Ticket.",
        embeds: [confirmCloseTicketEmbed],
        components: [confirmCloseTicketBtns],
      });
    } catch (err) {
      console.error(err);
    }
  },
};
