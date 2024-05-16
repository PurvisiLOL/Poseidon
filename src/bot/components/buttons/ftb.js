import {
    Client,
    ChatInputCommandInteraction,
    ModalBuilder,
    ActionRowBuilder,
    TextInputBuilder,
    TextInputStyle,
  } from "discord.js";
  
  export default {
    customId: "feedbackTicketBtn",
  
    /**
     * @param {Client} client
     * @param {ChatInputCommandInteraction} interaction
     */
  
    async execute (interaction, client) {
      try {
        const feedbackTicketModal = new ModalBuilder()
          .setTitle("Feedback Ticket")
          .setCustomId("feedbackTicketMdl")
          .setComponents(
            new ActionRowBuilder().setComponents(
              new TextInputBuilder()
                .setLabel("Feedback Message")
                .setCustomId("feedbackTicketMsg")
                .setPlaceholder(
                  "The ticket was awesome and the staff was absolutely the best with me."
                )
                .setStyle(TextInputStyle.Paragraph)
            )
          );
  
        return interaction.showModal(feedbackTicketModal);
      } catch (err) {
        console.error(err);
      }
    },
  };
  