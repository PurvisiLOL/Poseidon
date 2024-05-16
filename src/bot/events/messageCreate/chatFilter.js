import {
  Message,
  Client,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  Collection,
  ButtonStyle,
  GuildMember,
} from "discord.js";
import automodDB from "../../core/database/mongodb/schemas/automod/automod.js";
import userAutomod from "../../core/database/mongodb/schemas/automod/userAutomod.js";
import carryBasicAutoModeration from "../../core/functions/carryBasicAutoModeration.js";
import handleLogButtonsAutomod from "../../core/functions/automodHandleLogButtons.js";
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
    // Ignore messages sent by the bot
    if (message.author.bot) return;
    if (!message.member.bannable || !message.member.kickable) return;

    // Find automod settings for the guild
    const data = await automodDB.findOne({
      Guild: message.guild.id,
    });

    // If no automod settings or profanity filter is enabled, return early
    if (!data || !data.ChatSanity) return;

    // Find user-specific automod settings for the guild
    const data2 = await userAutomod.findOne({
      Guild: message.guild.id,
      User: message.author.id,
    });

    // Carry out basic auto moderation if user-specific settings are found
    const logChannel = await message.guild.channels.fetch(data.LogChannel);

    try {
      // Check for caps in the message
      const capsData = await checkForCaps(message.content);
      const antiSpamData = await checkForSpam(
        client.antiSpam,
        message.author,
        1500
      );
      const antiLink = await checkForLink(message.content);

      if (capsData || antiSpamData || antiLink) {
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

        // Create a default embed for user notification
        const embed = new EmbedBuilder()
          .setFooter({ text: "Automod by Arrowment" })
          .setColor("Yellow")
          .setDescription(
            capsData
              ? `${message.author.username} - Please lower your voice in the chat, keep it clean!`
              : antiSpamData
              ? `${message.author.username} - Please don't spam in the chat, keep it clean!`
              : `${message.author.username} - Please don't send links in the chat, keep it clean!`
          )
          .setTimestamp();

        message.channel.send({ embeds: [embed] });

        const logEmbed = new EmbedBuilder()
          .setTitle("Chat Sanity")
          .setFooter({ text: "Automod by Arrowment" })
          .addFields(
            { name: "User", value: `<@${message.author.id}>`, inline: true },
            {
              name: "Action",
              value: capsData
                ? "Speaking in high tone"
                : antiSpamData
                ? "Spamming the chat"
                : "Sending Links",
              inline: true,
            },
            {
              name: "User Display Name",
              value: message.member.displayName,
              inline: true,
            },
            { name: "User ID", value: message.author.id, inline: true },
            { name: "Message", value: message.content, inline: true },
            {
              name: "Infraction Points",
              value: data2.InfractionPoints ? String(data2.InfractionPoints) : "No Infraction Points",
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
          "ChatSanity",
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
 * @param {string} text
 * @returns {boolean}
 */
async function checkForLink(text) {
  const regex =
    /(?:(?:https?|ftp|file):\/\/|www\.|ftp\.)(?:\([-A-Z0-9+&@#\/%=~_|$?!:,.]*\)|[-A-Z0-9+&@#\/%=~_|$?!:,.])*(?:\([-A-Z0-9+&@#\/%=~_|$?!:,.]*\)|[A-Z0-9+&@#\/%=~_|$])/gim;
  return regex.test(text);
}

/**
 *
 * @param {string} text
 * @returns {boolean}
 */
async function checkForCaps(text) {
  let uppercaseCount = (text.match(/[A-Z]/g) || []).length;
  let lowercaseCount = (text.match(/[a-z]/g) || []).length;
  let totalLetters = uppercaseCount + lowercaseCount;

  let uppercasePercentage = (uppercaseCount / totalLetters) * 100;
  // let lowercasePercentage = (lowercaseCount / totalLetters) * 100;

  if (uppercasePercentage > 70 && text.length > 8) {
    return true;
  } else {
    return false;
  }
}

/**
 *
 * @param {Collection} collection //discord.js Collection - import { Collection } from "discord.js"
 * @param {GuildMember} user The discord user
 * @param {number} totalTimeBetweenMessages Total time between messages
 */
async function checkForSpam(collection, user, totalTimeBetweenMessages) {
  try {
    //Search the collection with userId of the author
    const data = collection.get(user.id);

    //Run actions accordingly
    if (data) {
      const subtractionOfDates = Date.now() - data.LastMessageDate; //Subtract the last message date from the LastMessageDate
      const messageCount = data.MessageCount; //Get the total number of messages in the collection from the userId

      const deleteCollection = Date.now() - data.CreatedDate; //Get the date at which the collection was created and subtract with the current date

      let collectionDeletionTime = 10_000; // 10 seconds = 10_000 miliseconds

      if (subtractionOfDates < totalTimeBetweenMessages && messageCount > 3)
        return true;
      else {
        data.MessageCount += 1; //Increment the message count
        data.LastMessageDate = Date.now(); //Change the last message date to the current date
      }

      if (deleteCollection > collectionDeletionTime) collection.delete(user.id); //If te delete collection is greater than 10000 (10 seconds), delete the collection.
    } else {
      /**
     Creating a new object with the following properties -

     * User - The user id
     * MessageCount - The total message count
     * CreatedDate - The current date or the collection creation date
     * LastMessageDate - The last message date or the message sent by the user now
     */

      const userData = {
        User: user.id,
        MessageCount: 1,
        CreatedDate: Date.now(),
        LastMessageDate: Date.now(),
      }; //The object

      collection.set(user.id, userData); //Set the object and finding key to the collection
    }

    return false;
  } catch (e) {
    console.error(e);
    return false;
  }
}
