import {
  Client,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import ticketsetupSchema from "../../core/database/mongodb/schemas/ticket/ticketSetupDatabase.js";
import ticketScheme from "../../core/database/mongodb/schemas/ticket/ticketSchema.js";

export default {
  customId: "yesCloseTicketBtn",

  /**
   * @param {Client} client
   * @param {ChatInputCommandInteraction} interaction
   */

  async execute(interaction, client) {
    try {
      const { channel, guild } = interaction;

      const closingEmbed = new EmbedBuilder()
        .setColor("Red")
        .setTitle("Closing Ticket")
        .setDescription("> The Ticket will be closed shortly.");

      await channel.send({ embeds: [closingEmbed] });

      await interaction.deferReply();

      const closedEmbed = new EmbedBuilder()
        .setColor("Red")
        .setTitle("Ticket Closed")
        .setDescription("> The Ticket has been closed successfully.");

      const setupTicket = await ticketsetupSchema.findOne({
        GuildID: guild.id,
        TicketChannelID: channel.parentId,
      });

      const ticket = await ticketScheme.findOne({
        GuildID: guild.id,
        TicketChannelID: channel.id,
        Closed: false,
      });

      const staffRole = guild.roles.cache.get(setupTicket.StaffRoleID);

      const hasRole = staffRole.members.has(ticket.TicketMemberID);

      if (!hasRole) {
        ticket.MembersAdded.map(async (m) => {
          await channel.members.remove(m);
        });
        await channel.members.remove(ticket.TicketMemberID);
      }

      await ticketScheme.findOneAndUpdate(
        {
          GuildID: guild.id,
          TicketChannelID: channel.id,
          Closed: false,
        },
        {
          Closed: true,
        }
      );

      await channel.setArchived(true);

      return await interaction.editReply({
        embeds: [closedEmbed],
      });
    } catch (err) {
      console.error(err);
    }
  },
};
