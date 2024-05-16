import {
  Client,
  ChatInputCommandInteraction,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import ticketsetupSchema from "../../core/database/mongodb/schemas/ticket/ticketSetupDatabase.js";
import ticketScheme from "../../core/database/mongodb/schemas/ticket/ticketSchema.js";

export default {
  customId: "supportTicketBtn",

  /**
   * @param {Client} client
   * @param {ChatInputCommandInteraction} interaction
   */

  async execute(interaction, client) {
    try {
      const { channel, guild, member } = interaction;

      const ticketSetup = await ticketsetupSchema.findOne({
        GuildID: guild.id,
        TicketChannelID: channel.id,
      });

      if (!ticketSetup) {
        return await interaction.reply({
          content: "There has been a mistake. You can't create a Ticket.",
        });
      }

      if (ticketSetup.TicketType === "modal") {
        const ticketModal = new ModalBuilder()
          .setTitle("Support Ticket")
          .setCustomId("ticketMdl")
          .setComponents(
            new ActionRowBuilder().setComponents(
              new TextInputBuilder()
                .setLabel("Subject")
                .setCustomId("ticketSubject")
                .setPlaceholder("Report Member")
                .setStyle(TextInputStyle.Short)
            ),
            new ActionRowBuilder().setComponents(
              new TextInputBuilder()
                .setLabel("Description")
                .setCustomId("ticketDesc")
                .setPlaceholder(
                  "A member by the name @someone tried to scam me with the nitro gift."
                )
                .setStyle(TextInputStyle.Paragraph)
            )
          );

        return interaction.showModal(ticketModal);
      } else {
        await interaction.deferReply({ ephemeral: true });

        const ticketChannel = guild.channels.cache.find(
          (c) => c.id === ticketSetup.TicketChannelID
        );

        const staffRole = guild.roles.cache.get(ticketSetup.StaffRoleID);

        const username = member.user.globalName ?? member.user.username;

        const ticketEmbed = new EmbedBuilder()
          .setColor("DarkGreen")
          .setAuthor({ name: username, iconURL: member.displayAvatarURL() })
          .setTitle("Support Ticket")
          .setDescription(
            `
            > The Staff will be with you shortly. 
            > With that time please explain what kind of support you need 
            > as much as you can explain as it will easy for the staff to solve your issue fast.
  
            > **Remeber** Opening a Ticket for no reason can get you in a big Trouble.
            `
          )
          .setFooter({
            text: `${guild.name}  •  Support Ticket`,
            iconURL: guild.iconURL(),
          })
          .setTimestamp();

        const ticketButtons = new ActionRowBuilder().setComponents([
          new ButtonBuilder()
            .setCustomId("closeTicketBtn")
            .setLabel("Close Ticket")
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId("lockTicketBtn")
            .setLabel("Lock Ticket")
            .setStyle(ButtonStyle.Success),
        ]);

        let ticket = await ticketScheme.findOne({
          GuildID: guild.id,
          TicketMemberID: member.id,
          ParentTicketChannelID: channel.id,
          Closed: false,
        });

        const ticketCount = await ticketScheme
          .findOne({
            GuildID: guild.id,
            TicketMemberID: member.id,
            ParentTicketChannelID: channel.id,
            Closed: true,
          })
          .count();

        if (ticket) {
          return await interaction.editReply({
            content: `You have already opened a ticket.`,
          });
        }

        const thread = await ticketChannel.threads.create({
          name: `${ticketCount + 1} - ${username}'s Ticket`,
          type: ChannelType.PrivateThread,
        });

        await thread.send({
          content: `${staffRole} - Ticket made by ${member}`,
        });

        await thread.send({
          embeds: [ticketEmbed],
          components: [ticketButtons],
        });

        if (!ticket) {
          ticket = await ticketScheme.create({
            GuildID: guild.id,
            TicketMemberID: member.id,
            TicketChannelID: thread.id,
            ParentTicketChannelID: channel.id,
            Closed: false,
            MembersAdded: [],
          });
          await ticket.save().catch((err) => {
            console.error(err);
          });
        }

        return await interaction.editReply({
          content: `Your ticket has been created successfully ${thread}`,
        });
      }
    } catch (err) {
      console.error(err);
    }
  },
};
