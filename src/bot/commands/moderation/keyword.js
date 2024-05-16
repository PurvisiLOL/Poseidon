import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChatInputCommandInteraction,
  Client,
} from "discord.js";
import config from "../../config.json" assert { type: "json" };
import editReply from "../../core/functions/editReply.js";
import keywordDB from "../../core/database/mongodb/schemas/automod/blockedKeywords.js";
import { findClosestString } from "../../core/functions/findClosestString.js";

export default {
  data: new SlashCommandBuilder()
    .setName("keyword")
    .setDescription("Allow or Block a specific keyword from your server")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((options) =>
      options
        .setName("word")
        .setDescription("Specify a word to allow or block")
        .setRequired(true)
    )
    .addStringOption((options) =>
      options
        .setName("action")
        .setDescription("Allow this keyword or block it?")
        .setChoices(
          { name: "Allow", value: "allow" },
          { name: "Block", value: "block" },
          { name: "Remove", value: "remove" }
        )
        .setRequired(true)
    ),

  /**
   *
   * @param {ChatInputCommandInteraction} interaction
   * @param {Client} client
   */

  async execute(interaction, client) {
    // Defer reply
    await interaction.deferReply({ ephemeral: true });

    // Unpack the options from the command
    const { options } = interaction;

    // Options value
    const word = options.getString("word");
    const action = options.getString("action");

    const actionObject = {
      allow: 1,
      block: 2,
      remove: 3,
    };
    const whatToDo = actionObject[action]; // Get the action in a numerical value

    // Find the data in the database
    let keywordData = await keywordDB.findOne({
      Guild: interaction.guild.id,
    });

    let message = "";

    if (!keywordData) {
      if (whatToDo === 3) {
        return editReply(
          interaction,
          config.messageConfig.globalEmojis.x,
          "You haven't added a keyword yet!",
          true
        );
      }

      // Initialize arrays
      const array1 = whatToDo === 1 ? [word] : [];
      const array2 = whatToDo === 2 ? [word] : [];

      keywordData = new keywordDB({
        Guild: interaction.guild.id,
        AllowedWords: array1,
        BlockedWords: array2,
      });

      await keywordData.save(); // Create a new data in the database

      message += `Successfully added ||${word}|| to the database`;
    } else {
      // Retrieve arrays of allowed and blocked words
      const allowedWordsArray = keywordData.AllowedWords || [];
      const blockedWordsArray = keywordData.BlockedWords || [];

      const checkWordsInArray = (word, array) => {
        return array.includes(word);
      };

      if (whatToDo === 1) {
        if (!checkWordsInArray(word, blockedWordsArray)) {
          allowedWordsArray.push(word);

          message += `Successfully allowed ||${word}||`;
        } else {
          message += `||${word}|| already exists in blocked list`;
        }
      } else if (whatToDo === 2) {
        if (!checkWordsInArray(word, allowedWordsArray)) {
          blockedWordsArray.push(word);

          message += `Successfully blocked ||${word}||`;
        } else {
          message += `||${word}|| already exists in allowed list`;
        }
      } else if (whatToDo === 3) {
        // Remove the keyword from the arrays
        keywordData.AllowedWords = allowedWordsArray.filter((w) => w !== word);
        keywordData.BlockedWords = blockedWordsArray.filter((w) => w !== word);

        if (
          keywordData.AllowedWords.length === allowedWordsArray.length &&
          keywordData.BlockedWords.length === blockedWordsArray.length
        ) {
          const closestWord = findClosestString(
            word,
            allowedWordsArray.concat(blockedWordsArray)
          ).closestString;

          return editReply(
            interaction,
            config.messageConfig.globalEmojis.cross,
            `Keyword "${word}" not found in the database, did you mean "${closestWord}"!`,
            true
          );
        }

        message += `Successfully removed "${word}" from ${
          keywordData.AllowedWords.includes(word)
            ? "allowed words list"
            : "blocked words list"
        }`;
      }

      await keywordData.save(); // Save changes to the database
    }

    return editReply(
      interaction,
      config.messageConfig.globalEmojis.tick,
      message,
      true
    );
  },
};
