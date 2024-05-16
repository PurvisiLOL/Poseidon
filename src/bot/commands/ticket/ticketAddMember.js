import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChatInputCommandInteraction,
  Client,
} from "discord.js";
import ticketScheme from "../../core/database/mongodb/schemas/ticket/ticketSchema.js";

export default {
  data: new SlashCommandBuilder()
    .setName("ticketaddmember")
    .setDescription("Adds a member to the ticket.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageThreads)
    .addUserOption((option) =>
      option
        .setName("member")
        .setDescription("The member you want to add in the ticket.")
        .setRequired(true)
    ),

  /**
   * @param {Client} client
   * @param {ChatInputCommandInteraction} interaction
   */

  async execute(interaction, client) {
    try {
      const { channel, options, guild } = interaction;

      await interaction.deferReply();

      const membertoAdd = options.getUser("member");

      const ticket = await ticketScheme.findOne({
        GuildID: guild.id,
        TicketChannelID: channel.id,
        Closed: false,
      });

      if (!ticket) {
        return await interaction.editReply({
          content:
            "This is not a valid ticket channel. Members can only be added in the ticket channel.",
        });
      }

      const existMemberServer = guild.members.cache.find(
        (m) => m.id === membertoAdd.id
      );

      if (!existMemberServer) {
        return await interaction.editReply({
          content: "The member is not in the server.",
        });
      }

      const threadMember = await channel.members
        .fetch(membertoAdd.id)
        .catch((err) => {
          return;
        });

      if (threadMember) {
        return await interaction.editReply({
          content: "The member is already in the ticket.",
        });
      }

      ticket.MembersAdded.push(membertoAdd.id);
      ticket.save();

      await channel.members.add(membertoAdd.id);

      return await interaction.editReply({
        content: `Successfully added ${membertoAdd} to the ticket.`,
      });
    } catch (err) {
      return;
    }
  },
};
