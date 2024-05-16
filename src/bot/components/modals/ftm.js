import { Client, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import ticketsetupSchema from "../../core/database/mongodb/schemas/ticket/ticketSchema.js";

export default {
  customId: "feedbackTicketMdl",

  /**
   * @param {Client} client
   * @param {ChatInputCommandInteraction} interaction
   */

  async function(interaction, client) {
    try {
      const { fields, guild, member, channel } = interaction;

      const feedbackMessage = fields.getTextInputValue("feedbackTicketMsg");

      await interaction.deferReply();

      const ticketSetup = await ticketsetupSchema.findOne({
        GuildID: guild.id,
        TicketChannelID: channel.parentId,
      });

      const feedbackEmbed = new EmbedBuilder()
        .setColor("Blurple")
        .setTitle(`Ticket Feedback`)
        .setDescription(
          `
            \`\`\`${feedbackMessage}\`\`\`
            >  **Submitted By:** ${member}
            > Thank You for your feedback. This helps us to improve.
          `
        )
        .setFooter({ text: guild.name, iconURL: guild.iconURL() })
        .setTimestamp();

      await guild.channels.cache.get(ticketSetup.FeedbackChannelID).send({
        embeds: [feedbackEmbed],
      });

      return await interaction.editReply({
        content: "The Feedback is submitted successfully.",
      });
    } catch (err) {
      console.error(err);
    }
  },
};
