import {
  Message,
  Client,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  Collection,
  ButtonStyle,
} from "discord.js";
import automodDB from "../../core/database/mongodb/schemas/automod/automod.js";
import userAutomod from "../../core/database/mongodb/schemas/automod/userAutomod.js";
import carryBasicAutoModeration from "../../core/functions/carryBasicAutoModeration.js";
import handleLogButtonsAutomod from "../../core/functions/automodHandleLogButtons.js";
import { checkBotMessage } from "../../core/functions/automodCheckBotMessage.js";
import axios from "axios";
import ms from "ms";

/**
 * This event handler executes whenever a message is created in a guild.
 */
export default {
  name: "messageCreate",

  /**
   * Executes the message creation handler.
   * @param {Message} message - The message object.
   * @param {Client} client - The Discord client.
   */
  async execute(message, client) {
    // Ignore messages sent by the bot
    if (message.author.bot) return;
    if (!message.member.bannable || !message.member.kickable) return;
    if (message.channel.nsfw) return;
    if (onCooldown(client.imageModerationCooldown, message.guild.id)) return;

    // Find automod settings for the guild
    const data = await automodDB.findOne({
      Guild: message.guild.id,
    });

    // If no automod settings or profanity filter is enabled, return early
    if (!data || !data.ImageModeration) return;

    // Find user-specific automod settings for the guild
    const data2 = await userAutomod.findOne({
      Guild: message.guild.id,
      User: message.author.id,
    });

    // Carry out basic auto moderation if user-specific settings are found
    const logChannel = await message.guild.channels.fetch(data.LogChannel);

    if (logChannel && data2) {
      carryBasicAutoModeration(
        message.member,
        message.guild,
        logChannel,
        data2,
        data,
        client
      );
    }

    try {
      const avatarUrl =
        message.author.avatarURL() ||
        "https://st5.depositphotos.com/35914836/63482/i/450/depositphotos_634821438-stock-photo-beautiful-sunset-sea.jpg";

      const results1 = await checkForNsfw(avatarUrl);
      const results2 = await checkForProfanity(avatarUrl);
      let results3;
      let results4;

      if (message.attachments.first()) {
        results3 = await checkForNsfw(message.attachments.first().url);
        results4 = await checkForProfanity(message.attachments.first().url);
      }

      if (results1 || results2 || results3 || results4) {
        if (message && message.deletable) await message.delete();

        // Increment user's infraction points or create a new record
        if (!data2) {
          new userAutomod({
            Guild: message.guild.id,
            User: message.author.id,
            InfractionPoints: 1,
          }).save();
        } else {
          data2.InfractionPoints += 1;
          await data2.save();
        }

        if (checkBotMessage(client.automodWarnMessage, message.author)) return;

        const WarnMsg = results1
          ? `${message.author.username} - Please change your profile picture as it contains NSFW content`
          : results2
          ? `${message.author.username} - Please change your profile picture as it contains badsigns or gore content`
          : results3
          ? `${message.author.username} - Please don't send attachments with NSFW content`
          : `${message.author.username} - Please don't send attachments which contains badsigns or gore content`;

        const LogMsg = results1
          ? `${message.author.username} - Profile picture contains NSFW content`
          : results2
          ? `${message.author.username} - Profile picture contains badsigns or gore content`
          : results3
          ? `${message.author.username} - Sent a NSFW attachment`
          : `${message.author.username} - Sent a attachment which contains badsigns or gore content`;

        message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setFooter({ text: "Automod by Arrowment" })
              .setColor("Yellow")
              .setDescription(WarnMsg)
              .setTimestamp(),
          ],
        });

        const logEmbed = new EmbedBuilder()
          .setTitle("Image Moderation")
          .setFooter({ text: "Automod by Arrowment" })
          .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
          .setDescription(LogMsg)
          .addFields(
            {
              name: "User",
              value: `<@${message.author.id}>`,
              inline: true,
            },
            {
              name: "User Display Name",
              value: message.member.displayName,
              inline: true,
            },
            { name: "User ID", value: message.author.id, inline: true },
            {
              name: "Infraction Points",
              value: data2.InfractionPoints
                ? String(data2.InfractionPoints)
                : "No Infraction Points",
              inline: true,
            }
          )
          .setColor("Red");

        const buttons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel("Timeout")
            .setCustomId("automod-timeout")
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setLabel("Kick")
            .setCustomId("automod-kick")
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setLabel("Ban")
            .setCustomId("automod-ban")
            .setStyle(ButtonStyle.Danger)
        );
        const logMessage = await logChannel.send({
          embeds: [logEmbed],
          components: [buttons],
        });

        await handleLogButtonsAutomod(
          message.member,
          buttons,
          logMessage,
          "ImageModeration",
          data,
          client
        );
      }
    } catch (err) {
      console.error(err);
    }
  },
};

/**
 *
 * @param {string} link
 * @returns {boolean}
 */
async function checkForNsfw(link) {
  const results = await fetchData("nudity-2.0", link);

  if (results && results.data.nudity) {
    if (
      results.data.nudity.sexual_activity > 0.3 ||
      results.data.nudity.sexual_display > 0.3 ||
      results.data.nudity.erotica > 0.3 ||
      results.data.nudity.sextoy > 0.3
    ) {
      return true;
    }
  }

  return false;
}

/**
 *
 * @param {string} link
 * @returns {boolean}
 */
async function checkForProfanity(link) {
  const results = await fetchData("offensive,gore", link);

  if (results) {
    const offensive = results.data.offensive;
    const gore = results.data.gore;

    if (gore.prob > 0.9) return true;
    if (
      offensive.nazi > 0.9 ||
      offensive.supremacist > 0.9 ||
      offensive.terrorist > 0.9 ||
      offensive.middle_finger > 0.9
    )
      return true;
  }

  return false;
}

/**
 * Fetch data from an external API using Axios.
 * @param {string} model - The model to use for data retrieval.
 * @param {string} link - The link to fetch data for.
 * @returns {Promise<any>} - A promise that resolves with the response data.
 */
async function fetchData(model, link) {
  const apiSecret = process.env.sightEngine_ApiKey;

  // Return the axios call directly to ensure it returns a promise
  return axios.get("https://api.sightengine.com/1.0/check.json", {
    params: {
      url: link,
      models: model,
      api_user: process.env.sightEngine_ApiUser,
      api_secret: apiSecret,
    },
  });
}

/**
 *
 * @param {Collection} collection
 * @param {string} guildId
 * @returns {boolean}
 */
function onCooldown(collection, guildId) {
  //collection = client.imageModerationCooldown

  const data = collection.get(guildId);

  if (data) {
    const subtraction = Date.now() - data.LastUsed;

    if (subtraction > ms("60s")) collection.delete(guildId);
    //If the subtraction of current data and when the last check was done is more than 60 seconds then we delete the collection
    else if (subtraction < ms("60s") && data.TotalChecks > 5) {
      return true; //If the subtraction is less than 60 seconds and TotalChecks is more than 5 then we return true;
    } else data.TotalChecks += 1; //If none of the if statements are matched then we increment the total count
  } else {
    const creationData = {
      Type: "ImageModeration",
      LastUsed: Date.now(),
      TotalChecks: 1,
    };

    collection.set(guildId, creationData); //Set the cooldown with the guildId as a key
  }

  return false;
}
