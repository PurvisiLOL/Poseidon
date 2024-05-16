import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChatInputCommandInteraction,
  Client,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import ticketsetupSchema from "../../core/database/mongodb/schemas/ticket/ticketSetupDatabase.js";

export default {
  data: new SlashCommandBuilder()
    .setName("ticketsetup")
    .setDescription("Setups your ticket.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((option) =>
      option
        .setName("feedback-channel")
        .setDescription("A channel where will all feedback be sent to.")
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)
    )
    .addChannelOption((option) =>
      option
        .setName("ticket-channel")
        .setDescription("A channel where the ticket will be sent to.")
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)
    )
    .addRoleOption((option) =>
      option
        .setName("staff-role")
        .setDescription(
          "Staff role which will have access to the ticket threads."
        )
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("ticket-type")
        .setDescription(
          "Whether the ticket will be sent as Button/s or as a Modal."
        )
        .addChoices(
          { name: "Modal", value: "modal" },
          { name: "Buttons", value: "buttons" }
        )
        .setRequired(true)
    ),

  /**
   * @param {Client} client
   * @param {ChatInputCommandInteraction} interaction
   */

  async execute(interaction, client) {
    try {
      const { guild, options } = interaction;

      const staffRole = options.getRole("staff-role");
      const ticketChannel = options.getChannel("ticket-channel");
      const feedbackChannel = options.getChannel("feedback-channel");
      const ticketType = options.getString("ticket-type");

      await interaction.deferReply({ ephemeral: true });

      const BtnTicketCreateEmbed = new EmbedBuilder()
        .setTitle("Support Ticket")
        .setColor("Green")
        .setDescription(
          `
              > Please open a ticket if you really need support otherwise you might get banned from the server.
            `
        )
        .setFooter({ text: "Support Ticket" })
        .setTimestamp();

      const ModalTicketCreateEmbed = new EmbedBuilder()
        .setTitle("Create Ticket")
        .setColor("Green")
        .setDescription(
          `
              > Please don't open a ticket if you don't need anything. You might get banned if you did that.
            `
        )
        .setFooter({ text: "Ticket Creation" })
        .setTimestamp();

      const TicketSetupEmbed = new EmbedBuilder()
        .setTitle("Ticket Setted up Successfully.")
        .setColor("DarkGreen")
        .setDescription(
          `
              > The Ticket has been setted up with the following settings:
            `
        )
        .addFields(
          { name: "Ticket Channel", value: `${ticketChannel}`, inline: true },
          {
            name: "Feedback Channel",
            value: `${feedbackChannel}`,
            inline: true,
          },
          { name: "Staff Role", value: `${staffRole}`, inline: true },
          { name: "Ticket Type", value: `${ticketType}`, inline: true }
        )
        .setTimestamp();

      const openTicketBtn = new ActionRowBuilder().addComponents([
        new ButtonBuilder()
          .setCustomId("supportTicketBtn")
          .setLabel(ticketType === "buttons" ? "Support" : "Open Ticket")
          .setStyle(ButtonStyle.Secondary),
      ]);

      let setupTicket = await ticketsetupSchema.findOne({
        TicketChannelID: ticketChannel.id,
      });

      if (setupTicket) {
        return await interaction.editReply({
          content: `Ticket has already been created in ${ticketChannel}.`,
        });
      }

      if (!setupTicket) {
        setupTicket = await ticketsetupSchema.create({
          GuildID: guild.id,
          FeedbackChannelID: feedbackChannel.id,
          TicketChannelID: ticketChannel.id,
          StaffRoleID: staffRole.id,
          TicketType: ticketType,
        });
        await setupTicket.save().catch((err) => {
          console.error(err);
        });
      }

      if (ticketType === "buttons") {
        await ticketChannel.send({
          embeds: [BtnTicketCreateEmbed],
          components: [openTicketBtn],
        });
      } else {
        await ticketChannel.send({
          embeds: [ModalTicketCreateEmbed],
          components: [openTicketBtn],
        });
      }

      return await interaction.editReply({
        embeds: [TicketSetupEmbed],
      });
    } catch (err) {
      console.log(err);
    }
  },
};
