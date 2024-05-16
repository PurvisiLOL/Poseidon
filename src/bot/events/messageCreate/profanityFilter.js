import {
  Message,
  Client,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import automodDB from "../../core/database/mongodb/schemas/automod/automod.js";
import userAutomod from "../../core/database/mongodb/schemas/automod/userAutomod.js";
import carryBasicAutoModeration from "../../core/functions/carryBasicAutoModeration.js";
import handleLogButtonsAutomod from "../../core/functions/automodHandleLogButtons.js";
import blockedKeywords from "../../core/database/mongodb/schemas/automod/blockedKeywords.js";
import fs from "fs";
import { generateRandomString } from "../../core/functions/generateRandomId.js";
import { checkBotMessage } from "../../core/functions/automodCheckBotMessage.js";

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
    // Ignore messages sent by bots
    if (message.author.bot) return;
    if (!message.member.bannable || !message.member.kickable) return;

    // Find automod settings for the guild
    const data = await automodDB.findOne({
      Guild: message.guild.id,
    });

    // If no automod settings or profanity filter is enabled, return early
    if (!data || !data.ProfanityFilter) return;

    // Find user-specific automod settings for the guild
    const data2 = await userAutomod.findOne({
      Guild: message.guild.id,
      User: message.author.id,
    });

    // Carry out basic auto moderation if user-specific settings are found
    const logChannel = await message.guild.channels.fetch(data.LogChannel);

    if (logChannel && data2) {
      if (data2) {
        await carryBasicAutoModeration(
          message.member,
          message.guild,
          logChannel,
          data2,
          data,
          client
        );
      }
    }

    // Fetch the log channel for the guild
    const channel = await message.guild.channels.fetch(data.LogChannel);

    try {
      // Check for profanity in the message content and member's nickname
      await checkForStuff(
        message.content,
        message,
        channel,
        data2,
        0,
        client,
        data
      );
      await checkForStuff(
        message.member.nickname,
        message,
        channel,
        data2,
        1,
        client,
        data
      );
    } catch (err) {
      console.error(err);
    }
  },
};

/**
 * Checks if a message contains profanity and takes action if necessary.
 * @param {string} content - The content of the message.
 * @param {Message} message - The Discord message object.
 * @param {Message.channel} channel - The log channel.
 * @param {any} data - The user automod settings object.
 * @param {number} type - The type of action to take (0 = delete message, 1 = change nickname).
 * @param {Client} client
 * @param {any} guildData
 */
async function checkForStuff(
  content,
  message,
  channel,
  data,
  type,
  client,
  guildData
) {
  let badWordsArray;

  //Get keyword data from the database
  const blockedDB = await blockedKeywords.findOne({ Guild: message.guild.id });
  if (blockedDB && blockedDB.BlockedWords) {
    badWordsArray = blockedDB.BlockedWords;
  } else badWordsArray = [];

  //Get goodWords from the database
  if (blockedDB && blockedDB.AllowedWords) {
    const check = blockedDB.AllowedWords.includes(content);
    if (check) return;
  }

  // Check for profanity
  const check1 = checkForBadWords(content, badWordsArray);

  // If message contains profanity
  if (check1.flagged) {
    // Increment user's infraction points or create a new record
    if (!data) {
      new userAutomod({
        Guild: message.guild.id,
        User: message.author.id,
        InfractionPoints: 1,
      }).save();
    } else {
      data.InfractionPoints += 1;
      await data.save();
    }

    // Create an embed for logging
    const logEmbed = new EmbedBuilder()
      .setTitle("Profanity Detection")
      .setFooter({ text: "Automod by Arrowment" })
      .addFields(
        { name: "User", value: `<@${message.author.id}>`, inline: true },
        {
          name: "Closest Profane Word",
          value: check1.word || "*Error Occurred*",
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
          value: data.InfractionPoints
            ? String(data.InfractionPoints)
            : "No Infraction Points",
          inline: true,
        }
      )
      .setColor("Red");

    // Create a default embed for user notification
    const embed = new EmbedBuilder()
      .setFooter({ text: "Automod by Arrowment" })
      .setColor("Yellow")
      .setTimestamp();

    // Perform action based on type
    if (type === 0) {
      if (message && message.deletable) await message.delete(); // Delete the message

      if (checkBotMessage(client.automodWarnMessage, message.author)) return;

      // Notify user of the action
      embed.setDescription(
        `${message.author.username} - Please refrain from sending message which contains profane words or the words which are blocked.`
      );

      // Log the action
      logEmbed
        .setDescription(
          `${message.author.username} - Message deleted due to profanity or is blocked`
        )
        .addFields({ name: "Message", value: content, inline: true });
    } else if (type === 1) {
      // Change user's nickname
      const oldName = message.member.nickname;
      const newNickName = generateRandomString(3);
      await message.member.setNickname(
        newNickName,
        "Profane nickname detected"
      );

      if (checkBotMessage(client.automodWarnMessage, message.author)) return;

      // Notify user of the action
      embed.setDescription(
        `${message.author.username} - Your nickname has been changed to **${newNickName}** due to profanity or it contains blocked words.`
      );

      // Log the action
      logEmbed
        .setDescription(
          `${message.author.username} - Nickname changed to **${newNickName}** due to profanity or contains blocked words.`
        )
        .addFields(
          { name: "Old Nickname", value: oldName, inline: true },
          { name: "New Nickname", value: newNickName, inline: true }
        );
    }

    // Send notification to the user
    message.channel.send({ embeds: [embed] });

    // Send log message to the log channel
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

    let logMessage = await channel.send({
      embeds: [logEmbed],
      components: [buttons],
    });

    await handleLogButtonsAutomod(
      message.member,
      buttons,
      logMessage,
      "Profanity-Filter",
      guildData,
      client
    );
  }
}

/**
 *
 * @param {string} userInput
 * @param {array} badWordsArray
 * @returns {boolean}
 */

function checkForBadWords(userInput, badWordsArray) {
  //Read the file and parse it
  const data = fs.readFileSync("src/bot/core/functions/badwords.json", "utf8");
  const parsedData = JSON.parse(data);

  let table;
  if (userInput && typeof userInput === "string") {
    let flagged = false;
    let flaggedWord = null;

    const fullArray = parsedData.words.concat(badWordsArray);

    // Iterate through each word in parsedData.words
    for (let i = 0; i < fullArray.length; i++) {
      const word = fullArray[i];

      // Check if the word matches the regexPattern
      if (new RegExp("\\b" + word + "\\b").test(userInput)) {
        // If matched, set flaggedWord to the matched word and break out of the loop
        flaggedWord = word;
        flagged = true;
        break;
      }
    }

    //Table contains the flagged boolean. Others are null
    table = {
      score: null,
      closestString: null,
      minimumEditDistance: null,
      word: flaggedWord,
      flagged: flagged,
    };
  } else {
    const table = {
      score: null,
      closestString: null,
      minimumEditDistance: null,
      word: null,
      flagged: false,
    };

    return table;
  }
  return table;
}
