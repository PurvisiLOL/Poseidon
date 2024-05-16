import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from "discord.js";
//Importing important files
import guildData from "../../core/database/mongodb/schemas/modmail/modmail.js";
import config from "../../config.json" assert { type: "json" };
import editReply from "../../core/functions/editReply.js";

export default {
  data: new SlashCommandBuilder()
    .setName("edit-modmail")
    .setDescription("Customize ModMail embed in your server")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((options) =>
      options
        .setName("action")
        .setDescription("Select an action to edit")
        .addChoices(
          { name: "Thread Channel", value: "Thread Channel" },
          { name: "ModMail Channel", value: "ModMail Channel" }
        )
        .setRequired(true)
    ),

  /**
   *
   * @param {ChatInputCommandInteraction} interaction
   * @param {Client} client
   */
  async execute(interaction, client) {
    //Defer reply
    await interaction.deferReply({ ephemeral: true });
    try {
      //Unpack the options from the command
      const { options } = interaction;
      let action = options.getString("action");

      const data = await guildData.findOne({ Guild: interaction.guild.id });
      if (!data)
        return editReply(
          interaction,
          config.messageConfig.x,
          "Please setup modmail first",
          true
        );

      const filter = (i) => i.author.id === interaction.user.id;

      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Edit ModMail")
            .setDescription(`Please enter an ${action} id`)
            .setTimestamp()
            .setFooter({
              text: `You have 2 minutes to respond, Enter "cancel" to cancel`,
            })
            .setTimestamp()
            .setColor("Random")
            .setAuthor({
              name: interaction.user.tag,
              iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
            }),
        ],
      });

      await interaction.channel
        .awaitMessages({ filter, max: 1, time: 120_000, errors: ["time"] })
        .then(async (msg) => {
          const message = msg.first();
          if (message.content.toLowerCase() === "cancel") {
            return editReply(
              interaction,
              config.messageConfig.tick,
              "Cancelled your request",
              true
            );
          } else {
            let actionObj = {
              "Thread Channel": 0,
              "ModMail Channel": 1,
            };

            let actionNo = actionObj[action];
            const channel = await interaction.guild.channels.fetch(
              message.content
            );
            if (!channel)
              return editReply(
                interaction,
                config.messageConfig.x,
                "Please provide a correct channel id"
              );

            if (actionNo === 0) {
              data.ThreadChannel = message.content;
            } else if (actionNo === 1) {
              data.ChannelID = message.content;
            }

            data.save();
            await editReply(
              interaction,
              config.messageConfig.tick,
              `Successfully edited ${action}`,
              true
            );
          }
        });
    } catch (e) {
      console.log(e);
      return editReply(
        interaction,
        config.messageConfig.x,
        "Please provide a valid channel id",
        true
      );
    }
  },
};
