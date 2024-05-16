import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChatInputCommandInteraction,
  Client,
} from "discord.js";
import ticketScheme from "../../core/database/mongodb/schemas/ticket/ticketSchema.js";

export default {
  data: new SlashCommandBuilder()
    .setName("ticketremovemember")
    .setDescription("Removes a member from the ticket.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageThreads)
    .addUserOption((option) =>
      option
        .setName("member")
        .setDescription("The member you want to remove from the ticket.")
        .setRequired(true)
    ),
  userPermissions: [PermissionFlagsBits.ManageThreads],
  botPermissinons: [],

  /**
   * @param {Client} client
   * @param {ChatInputCommandInteraction} interaction
   */

  run: async (client, interaction) => {
    try {
      const { channel, options, guild } = interaction;

      await interaction.deferReply();

      const membertoRemove = options.getUser("member");

      const ticket = await ticketScheme.findOne({
        GuildID: guild.id,
        TicketChannelID: channel.id,
        Closed: false,
      });

      if (!ticket) {
        return await interaction.editReply({
          content:
            "This is not a valid ticket channel. Members can only be removed in the ticket channel.",
        });
      }

      const existMemberServer = guild.members.cache.find(
        (m) => m.id === membertoRemove.id
      );

      if (!existMemberServer) {
        return await interaction.editReply({
          content: "The member is not in the server.",
        });
      }

      const threadMember = await channel.members
        .fetch(membertoRemove.id)
        .catch((err) => {
          return;
        });

      if (!threadMember) {
        return await interaction.editReply({
          content: "The member is not in the ticket to be removed.",
        });
      }

      await ticketScheme.findOneAndUpdate(
        {
          GuildID: guild.id,
          TicketChannelID: channel.id,
          Closed: false,
        },
        {
          $pull: {
            MembersAdded: membertoRemove.id,
          },
        }
      );
      ticket.save();

      await channel.members.remove(membertoRemove.id);

      return await interaction.editReply({
        content: `Successfully removed ${membertoRemove} from the ticket.`,
      });
    } catch (err) {
      return;
    }
  },
};
