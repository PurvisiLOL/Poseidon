import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} from "discord.js";
import config from "../../config.json" assert { type: "json" };
import editReply from "../../core/functions/editReply.js";
import automodDB from "../../core/database/mongodb/schemas/automod/automod.js";
import ms from "ms";

async function updateAutoMod(plugin, actions, logChannel, time, guildId) {
  let automod = await automodDB.findOne({ Guild: guildId });

  if (!automod) {
    if (actions === "Disable") {
      return {
        message: "You haven't enabled automod yet to disable this plugin",
        success: false,
      };
    } else {
      automod = {
        Guild: guildId,
        ProfanityFilter: false,
        ChatSanity: false,
        ImageModeration: false,
        LogChannel: logChannel.id,
        AutoModTimeOut: ms(time),
      };

      if (plugin === "all") {
        automod.ProfanityFilter = true;
        automod.ChatSanity = true;
        automod.ImageModeration = true;
      } else {
        automod[plugin] = true;
      }

      await new automodDB(automod).save();
    }
  } else {
    if (actions === "Enable") {
      automod[plugin === "all" ? "ProfanityFilter" : plugin] = true;
    } else {
      automod[plugin === "all" ? "ProfanityFilter" : plugin] = false;
    }

    await automod.save();
  }

  return {
    message: `Successfully ${actions}d ${plugin}`,
    success: true,
  };
}

export default {
  data: new SlashCommandBuilder()
    .setName("automod")
    .setDescription("setup automod in your server")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((options) =>
      options
        .setName("plugins")
        .setDescription("Select a plugin to enable")
        .addChoices(
          { name: "Profanity Filter", value: "ProfanityFilter" },
          {
            name: "Chat Sanity (Default - AntiCaps, AntiSpam, BlockedKeyword)",
            value: "ChatSanity",
          },
          {
            name: "Image Moderation (Default - AntiNSFW, AntiProfaneImage)",
            value: "ImageModeration",
          },
          { name: "All", value: "all" }
        )
        .setRequired(true)
    )
    .addChannelOption((options) =>
      options
        .setName("log-channel")
        .setDescription("The channel where all the logs will be sent")
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)
    )
    .addStringOption((options) =>
      options
        .setName("actions")
        .setDescription("Disable/Enable the selected plugin")
        .addChoices(
          { name: "Disable", value: "disable" },
          { name: "Enable", value: "enable" }
        )
        .setRequired(true)
    )
    .addStringOption((options) =>
      options
        .setName("timeout-time")
        .setDescription("Select a timeout time")
        .addChoices(
          { name: "1 minute", value: "1m" },
          { name: "5 minutes", value: "5m" },
          { name: "10 minutes", value: "10m" },
          { name: "30 minutes", value: "30m" },
          { name: "1 hour", value: "30h" },
          { name: "5 hours", value: "5h" },
          { name: "1 day", value: "1d" }
        )
    ),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    const plugin = interaction.options.getString("plugins");
    const actions = interaction.options.getString("actions");
    const logChannel = interaction.options.getChannel("log-channel");
    const time = interaction.options.getString("timeout-time") || "1m";

    const result = await updateAutoMod(
      plugin,
      actions,
      logChannel,
      time,
      interaction.guild.id
    );

    await editReply(
      interaction,
      config.messageConfig.globalEmojis[result.success ? "tick" : "cross"],
      result.message,
      true
    );
  },
};
