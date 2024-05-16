import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  ComponentType,
  EmbedBuilder,
  Guild,
  GuildMember,
  Message,
  PermissionFlagsBits,
} from "discord.js";
import editReply from "./editReply.js";
import { generateRandomString } from "../../core/functions/generateRandomId.js";
import config from "../../config.json" assert { type: "json" };

/**
 *
 * @param {GuildMember} member
 * @param {Guild} guild
 * @param {ActionRowBuilder} buttons
 * @param {Message} msg
 * @param {String} automodPlugin
 * @param {any} data
 * @param {Client} client
 */
async function handleLogButtonsAutomod(
  member,
  buttons,
  msg,
  automodPlugin,
  data,
  client
) {
  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
  });

  collector.on("collect", async (interaction) => {
    await interaction.deferReply({ ephemeral: true });

    if (!member.bannable || !member.kickable) {
      return editReply(
        interaction,
        config.messageConfig.globalEmojis.cross,
        "This user is not moderatable by this bot.",
        true
      );
    }

    const clientMember = await interaction.guild.members.fetch(client.user.id);
    if (
      !clientMember.permissions.has(PermissionFlagsBits.BanMembers) ||
      !clientMember.permissions.has(PermissionFlagsBits.KickMembers) ||
      !clientMember.permissions.has(PermissionFlagsBits.ModerateMembers)
    ) {
      return editReply(
        interaction,
        config.messageConfig.globalEmojis.cross,
        `I don't have permission to moderate this member. Provide me with \`[BAN_MEMBERS, KICK_MEMBERS, MODERATE_MEMBERS]\` permissions`,
        true
      );
    }

    let actionObject = {
      "automod-timeout": "timedOut",
      "automod-kick": "kicked",
      "automod-ban": "banned",
    };

    const reason =
      automodPlugin +
      `: ${actionObject[interaction.customId]} by ${
        interaction.user.username
      }`;

    const embed = new EmbedBuilder()
      .setDescription(
        `You have been ${actionObject[interaction.customId]} from ${
          interaction.guild.name
        }`
      )
      .addFields(
        { name: "Reason", value: reason },
        { name: "Punisher", value: interaction.user.username },
        { name: "Case-Id", value: generateRandomString(5) }
      )
      .setColor("DarkPurple")
      .setTimestamp();

    const guildButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel(interaction.guild.name)
        .setStyle(ButtonStyle.Link)
        .setURL("https://discord.com")
        .setDisabled(true)
    );

    await member.send({
      embeds: [embed],
      components: [guildButton],
    });

    await editReply(
      interaction,
      config.messageConfig.globalEmojis.tick,
      `Successfully ${actionObject[interaction.customId]} ${member.displayName}`
    );

    switch (interaction.customId) {
      case "automod-timeout":
        await member.timeout(data.AutoModTimeOut, reason);
        break;
      case "automod-kick":
        await member.kick(reason);
        break;
      case "automod-ban":
        await member.ban(reason);
        break;
      default:
        await member.timeout(data.AutoModTimeout, reason);
        break;
    }

    buttons.components[0].setDisabled(true);
    buttons.components[1].setDisabled(true);
    buttons.components[2].setDisabled(true);

    await msg.edit({ components: [buttons] });
    collector.stop();
  });
}

export default handleLogButtonsAutomod;
