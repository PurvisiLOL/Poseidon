import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  CommandInteraction,
  Client,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Message,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  InteractionCollector,
  InteractionType,
  StringSelectMenuBuilder,
  AttachmentBuilder,
  Colors,
} from "discord.js";
import config from "../../config.json" assert { type: "json" };
import embedData from "../../core/database/mongodb/schemas/embed/embed.js";
import ms from "ms";
import editReply from "../../core/functions/editReply.js";
import { generateRandomString } from "../../core/functions/generateRandomId.js";
import reply from "../../core/functions/reply.js";
import findClosestString from "../../core/functions/findClosestString.js";

export default {
  cooldown: ms("5s"),
  data: new SlashCommandBuilder()
    .setName("embed-create")
    .setDescription("Create an custom embed and send it using a webhook.")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  /**
   *
   * @param {CommandInteraction} interaction
   * @param {Client} client
   */
  async execute(interaction, client) {
    //Defer reply the interaction
    await interaction.deferReply({ ephemeral: true });

    //Find the data from the database
    const userData = await embedData.findOne({ User: interaction.user.id });

    const embed = new EmbedBuilder()
      .setTimestamp()
      .setAuthor({
        name: "Embed Create",
        iconURL: client.user.displayAvatarURL({ dynamic: true }),
      })
      .setColor("Random");

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Import Embed JSON")
        .setStyle(ButtonStyle.Primary)
        .setCustomId("import-json-embed"),
      new ButtonBuilder()
        .setLabel("Create Embed")
        .setStyle(ButtonStyle.Secondary)
        .setCustomId("create-embed")
    );

    let replyObject = { embeds: [embed] };

    if (!userData) {
      embed.setDescription("You don't have any embed data yet, create one now");

      replyObject.components = [buttons];
    } else {
      if (userData.EmbedInfo.length === 0) {
        embed.setDescription(
          "You haven't created any embeds till now, create one now"
        );
        replyObject.components = [buttons];
      } else {
        embed.setDescription("Select a embed from the list of option(s).");

        let options = [];
        userData.EmbedInfo.forEach((option) => {
          options.push(option);
        });

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId("embed-create-selection")
          .setPlaceholder("Select a embed from the list of option(s)")
          .setOptions(options);

        const selectMenuActionRow = new ActionRowBuilder().addComponents(
          selectMenu
        );

        replyObject.components = [selectMenuActionRow, buttons];
      }
    }

    const msg = await interaction.editReply(replyObject);

    await handleButtons(msg, client, userData, interaction);
  },
};

/**
 *
 * @param {Message} msg
 */
async function handleButtons(msg, client, data, message) {
  const collector = msg.createMessageComponentCollector();

  collector.on("collect", async (i) => {
    if (i.customId === "import-json-embed") {
      const modal = new ModalBuilder()
        .setCustomId("embed-json-embed")
        .setTitle("Embed JSON");

      const embed_paragraph = new TextInputBuilder()
        .setCustomId("embed-json-text")
        .setLabel("Json Code")
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("Your JSON code");

      const embed_name = new TextInputBuilder()
        .setCustomId("embed-json-name")
        .setLabel("Embed Name")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Your JSON code");

      const embed_description = new TextInputBuilder()
        .setCustomId("embed-json-description")
        .setLabel("Embed Description")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Your JSON code");

      const text = new ActionRowBuilder().addComponents(embed_paragraph);
      const text1 = new ActionRowBuilder().addComponents(embed_name);
      const text2 = new ActionRowBuilder().addComponents(embed_description);

      modal.addComponents(text, text1, text2);

      i.showModal(modal);

      const filter = (int) => int.user.id === i.user.id;
      const collector2 = new InteractionCollector(client, {
        filter,
        interactionType: InteractionType.ModalSubmit,
        max: 1,
      });

      collector2.on("collect", async (interaction) => {
        data = await embedData.findOne({ User: interaction.user.id });

        const jsonData =
          interaction.fields.getTextInputValue("embed-json-text") || null;
        const jsonData1 =
          interaction.fields.getTextInputValue("embed-json-name") || null;
        const jsonData2 =
          interaction.fields.getTextInputValue("embed-json-description") ||
          null;

        let jsonEmbed;

        try {
          jsonEmbed = JSON.parse(jsonData);
        } catch {
          return reply(
            interaction,
            config.messageConfig.globalEmojis.cross,
            'Invalid JSON format, Please use this format { `"embed-data"` }',
            true
          );
        }

        const embedInfo = {
          label: jsonData1,
          description: jsonData2,
          value: generateRandomString(2),
        };
        const embedJson = {
          embeds: jsonEmbed,
        };

        if (!data) {
          new embedData({
            User: interaction.user.id,
            EmbedInfo: [embedInfo],
            EmbedJsonInfo: [embedJson],
          }).save();
        } else {
          if (data.EmbedInfo.length > 6) {
            return reply(
              interaction,
              config.messageConfig.globalEmojis.cross,
              "You can only have 6 max embeds.",
              true
            );
          }

          data.EmbedInfo.push(embedInfo);
          data.EmbedJsonInfo.push(embedJson);
          data.save();
        }

        reply(
          interaction,
          config.messageConfig.globalEmojis.tick,
          "Successfully imported the json data",
          true
        );

        collector2.stop({ reason: "Stopped after importing" });
      });
    } else if (i.customId === "embed-create-selection") {
      await i.deferReply({ ephemeral: true });

      if (!i.values) {
        return editReply(
          i,
          config.messageConfig.globalEmojis.cross,
          "An error occured!",
          true
        );
      } else {
        const embedInfo = data.EmbedInfo.findIndex(
          (option) => option.value === i.values[0]
        );
        const embedJSON = data.EmbedJsonInfo[embedInfo];
        const embedData = embedJSON["embeds"];
        const embed = EmbedBuilder.from(embedData);

        editReply(
          i,
          config.messageConfig.globalEmojis.tick,
          `Selected the embed with the index ${embedInfo}`,
          true
        );
        const [buttons, buttons2, buttons3] = getEmbedEditButtons();

        const msg = await message
          .editReply({
            embeds: [embed],
            components: [buttons, buttons2, buttons3],
          })
          .catch(async () => {
            const string = JSON.stringify(embedJSON);
            const stringBuffer = new Buffer.from(string, "utf-8");
            const jsonAttachment = new AttachmentBuilder(stringBuffer, {
              name: generateRandomString(5) + ".json",
            });
            const deleteButton = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setStyle(ButtonStyle.Danger)
                .setLabel("Delete")
                .setCustomId("delete-embed")
            );

            const mesg = await i.editReply({
              embeds: [
                new EmbedBuilder()
                  .setTimestamp()
                  .setAuthor({
                    name: "Embed Create",
                    iconURL: client.user.displayAvatarURL({ dynamic: true }),
                  })
                  .setColor("Random")
                  .setDescription(
                    "The embed you imported/created data is either corrupted, deleted or exceeds the api limit, you either download the json data or delete the embed!"
                  ),
              ],
              components: [deleteButton],
              files: [jsonAttachment],
            });

            const collector3 = mesg.createMessageComponentCollector();

            collector3.on("collect", async (inter) => {
              await inter.deferReply({ ephemeral: true });

              if (inter.customId === "delete-embed") {
                data.EmbedInfo.splice(embedInfo, 1);
                data.EmbedJsonInfo.splice(embedInfo, 1);
                data.save();

                editReply(
                  inter,
                  config.messageConfig.globalEmojis.tick,
                  "Successfully deleted the embed",
                  true
                );
              }
            });

            return;
          });

        await handleEmbedEditButtons(msg, embed, embedInfo, message, client);
      }
    } else if (i.customId === "create-embed") {
      const modal2 = new ModalBuilder()
        .setCustomId("embed-create-modal2")
        .setTitle("Create Embed");

      const info1 = new TextInputBuilder()
        .setLabel("Name")
        .setPlaceholder("The name of your embed")
        .setMinLength(1)
        .setCustomId("embed-info1")
        .setRequired(true)
        .setStyle(TextInputStyle.Short);

      const info2 = new TextInputBuilder()
        .setLabel("Description")
        .setPlaceholder("The descripton of your embed")
        .setCustomId("embed-info2")
        .setMinLength(1)
        .setRequired(true)
        .setStyle(TextInputStyle.Short);

      const row1 = new ActionRowBuilder().addComponents(info1);
      const row2 = new ActionRowBuilder().addComponents(info2);

      modal2.addComponents(row1, row2);

      i.showModal(modal2);

      const filter = (int) => int.user.id === i.user.id;
      const collector6 = new InteractionCollector(client, {
        filter,
        interactionType: InteractionType.ModalSubmit,
        max: 1,
      });

      collector6.on("collect", async (interact) => {
        data = await embedData.findOne({ User: interact.user.id });

        const info1 = interact.fields.getTextInputValue("embed-info1");
        const info2 = interact.fields.getTextInputValue("embed-info2");

        const dummyEmbed = new EmbedBuilder()
          .setTitle("Dummy Embed")
          .setDescription("This is a dummy embed")
          .setColor("Random");

        const dummyEmbedJsonData = dummyEmbed.toJSON();

        const embedInfo = {
          label: info1,
          description: info2,
          value: generateRandomString(2),
        };
        const embedJson = {
          embeds: dummyEmbedJsonData,
        };

        if (!data) {
          new embedData({
            User: interact.user.id,
            EmbedInfo: [embedInfo],
            EmbedJsonInfo: [embedJson],
          }).save();
        } else {
          if (data.EmbedInfo.length > 6) {
            return reply(
              interact,
              config.messageConfig.globalEmojis.cross,
              "You can only have 6 max embeds.",
              true
            );
          }

          data.EmbedInfo.push(embedInfo);
          data.EmbedJsonInfo.push(embedJson);
          data.save();
        }

        reply(
          interact,
          config.messageConfig.globalEmojis.tick,
          "Successfully created a new embed",
          true
        );

        collector6.stop({ reason: "Stopped after creating embed" });
      });
    }

    collector.stop({ reason: "Successfully collected all the data" });
  });
}

function getEmbedEditButtons() {
  const embedEditButtons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setStyle(ButtonStyle.Secondary)
      .setLabel("Title")
      .setCustomId("set-title-embed"),

    new ButtonBuilder()
      .setStyle(ButtonStyle.Secondary)
      .setLabel("Description")
      .setCustomId("set-description-embed"),

    new ButtonBuilder()
      .setStyle(ButtonStyle.Secondary)
      .setLabel("Author")
      .setCustomId("set-author-embed"),

    new ButtonBuilder()
      .setStyle(ButtonStyle.Secondary)
      .setLabel("Footer")
      .setCustomId("set-footer-embed"),

    new ButtonBuilder()
      .setStyle(ButtonStyle.Secondary)
      .setLabel("Timestamp")
      .setCustomId("set-timestamp-embed")
  );

  const embedEditButtons2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setStyle(ButtonStyle.Secondary)
      .setLabel("Add Fields")
      .setCustomId("add-fields-embed"),

    new ButtonBuilder()
      .setStyle(ButtonStyle.Secondary)
      .setLabel("Image")
      .setCustomId("set-image-embed"),

    new ButtonBuilder()
      .setStyle(ButtonStyle.Secondary)
      .setLabel("Thumbnail")
      .setCustomId("set-thumbnail-embed"),

    new ButtonBuilder()
      .setStyle(ButtonStyle.Secondary)
      .setLabel("Color")
      .setCustomId("set-color-embed"),

    new ButtonBuilder()
      .setStyle(ButtonStyle.Primary)
      .setLabel("Send Using Webhook")
      .setCustomId("send-embed-webhook")
  );

  const embedEditButtons3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setStyle(ButtonStyle.Danger)
      .setLabel("Delete")
      .setCustomId("delete-embed"),

    new ButtonBuilder()
      .setStyle(ButtonStyle.Success)
      .setLabel("Export")
      .setCustomId("export-embed")
  );

  return [embedEditButtons, embedEditButtons2, embedEditButtons3];
}

/**
 *
 * @param {ActionRowBuilder} buttons1
 * @param {ActionRowBuilder} buttons2
 * @param {ActionRowBuilder} buttons3
 * @param {CommandInteraction} message
 * @param {EmbedBuilder} embed
 */
async function handleEmbedEditButtons(
  message,
  embed,
  dataIndex,
  inter,
  client
) {
  const collector4 = message.createMessageComponentCollector();

  collector4.on("collect", async (interaction) => {
    const data = await embedData.findOne({ User: interaction.user.id });

    if (!data) {
      return editReply(
        interaction,
        config.messageConfig.globalEmojis.cross,
        "An error occurred while executing the action",
        true
      );
    }

    let type;

    const infoModal = new ModalBuilder()
      .setCustomId("update-embed-modal")
      .setTitle("Update Embed");

    if (interaction.customId === "set-title-embed") {
      type = 0;

      const text1 = new TextInputBuilder()
        .setCustomId("update-embed-title")
        .setPlaceholder("Enter your embed title")
        .setLabel("Title")
        .setStyle(TextInputStyle.Short)
        .setMinLength(1)
        .setMaxLength(256);

      const actionRowText1 = new ActionRowBuilder().addComponents(text1);

      infoModal.addComponents(actionRowText1);
    } else if (interaction.customId === "set-description-embed") {
      type = 1;

      const text2 = new TextInputBuilder()
        .setCustomId("update-embed-description")
        .setPlaceholder("Enter your embed description")
        .setLabel("Description")
        .setStyle(TextInputStyle.Paragraph)
        .setMinLength(1);

      const actionRowText2 = new ActionRowBuilder().addComponents(text2);

      infoModal.addComponents(actionRowText2);
    } else if (interaction.customId === "set-author-embed") {
      type = 2;

      const text3 = new TextInputBuilder()
        .setCustomId("update-embed-author")
        .setPlaceholder("Enter your embed author name")
        .setLabel("Author Name")
        .setMaxLength(256)
        .setMinLength(1)
        .setStyle(TextInputStyle.Short);

      const actionRowText3 = new ActionRowBuilder().addComponents(text3);

      infoModal.addComponents(actionRowText3);
    } else if (interaction.customId === "set-footer-embed") {
      type = 3;

      const text3 = new TextInputBuilder()
        .setCustomId("update-embed-footer")
        .setPlaceholder("Enter your embed footer name")
        .setLabel("Footer Name")
        .setMaxLength(2048)
        .setMinLength(1)
        .setStyle(TextInputStyle.Short);

      const actionRowText3 = new ActionRowBuilder().addComponents(text3);

      infoModal.addComponents(actionRowText3);
    } else if (interaction.customId === "set-timestamp-embed") {
      type = 4;

      const text4 = new TextInputBuilder()
        .setCustomId("update-embed-timestamp")
        .setPlaceholder("True or False")
        .setLabel("Timestamp")
        .setMaxLength(5)
        .setMinLength(4)
        .setStyle(TextInputStyle.Short);

      const actionRowText4 = new ActionRowBuilder().addComponents(text4);

      infoModal.addComponents(actionRowText4);
    } else if (interaction.customId === "add-fields-embed") {
      type = 5;

      const text5 = new TextInputBuilder()
        .setCustomId("update-embed-fields-name")
        .setPlaceholder("Enter your field name")
        .setLabel("Field Name")
        .setMinLength(1)
        .setMaxLength(256)
        .setStyle(TextInputStyle.Short);

      const text6 = new TextInputBuilder()
        .setCustomId("update-embed-fields-value")
        .setPlaceholder("Enter your field value")
        .setLabel("Field Value")
        .setMaxLength(1)
        .setMaxLength(1024)
        .setStyle(TextInputStyle.Short);

      const actionRowText5 = new ActionRowBuilder().addComponents(text5);
      const actionRowText6 = new ActionRowBuilder().addComponents(text6);

      infoModal.addComponents(actionRowText5, actionRowText6);
    } else if (interaction.customId === "set-image-embed") {
      type = 6;

      const text6 = new TextInputBuilder()
        .setCustomId("update-embed-image")
        .setPlaceholder("Enter image URL")
        .setLabel("Image URL")
        .setMinLength(1)
        .setMaxLength(100)
        .setStyle(TextInputStyle.Short);

      const actionRowText6 = new ActionRowBuilder().addComponents(text6);

      infoModal.addComponents(actionRowText6);
    } else if (interaction.customId === "set-thumbnail-embed") {
      type = 7;

      const text7 = new TextInputBuilder()
        .setCustomId("update-embed-thumbnail")
        .setPlaceholder("Enter thumbnail URL")
        .setLabel("Thumbnail URL")
        .setMinLength(1)
        .setMaxLength(100)
        .setStyle(TextInputStyle.Short);

      const actionRowText7 = new ActionRowBuilder().addComponents(text7);

      infoModal.addComponents(actionRowText7);
    } else if (interaction.customId === "set-color-embed") {
      type = 8;

      const text8 = new TextInputBuilder()
        .setCustomId("update-embed-color")
        .setPlaceholder("Red, Green, Blue")
        .setLabel("Color")
        .setMinLength(1)
        .setMaxLength(100)
        .setStyle(TextInputStyle.Short);

      const actionRowText8 = new ActionRowBuilder().addComponents(text8);

      infoModal.addComponents(actionRowText8);
    } else if (interaction.customId === "send-embed-webhook") {
      type = 9;

      const text9 = new TextInputBuilder()
        .setCustomId("create-webhook-name")
        .setPlaceholder("Name of your new webhook")
        .setLabel("Webhook Name")
        .setMinLength(1)
        .setMaxLength(30)
        .setStyle(TextInputStyle.Short);

      const actionRowText9 = new ActionRowBuilder().addComponents(text9);

      infoModal.addComponents(actionRowText9);
    } else {
      await interaction.deferReply({ ephemeral: true });

      if (interaction.customId === "export-embed") {
        const jsonData = data.EmbedJsonInfo[dataIndex];
        const string = JSON.stringify(jsonData);
        const stringBuffer = new Buffer.from(string, "utf-8");
        const jsonAttachment = new AttachmentBuilder(stringBuffer, {
          name: generateRandomString(5) + ".json",
        });

        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle("Exported Embed")
              .setDescription("Successfully exported this embed to `JSON`")
              .setFooter({ text: "If any error occurs then please try again" })
              .setColor("Random")
              .setTimestamp(),
          ],
          files: [jsonAttachment],
        });
      } else if (interaction.customId === "delete-embed") {
        data.EmbedInfo.splice(dataIndex, 1);
        data.EmbedJsonInfo.splice(dataIndex, 1);

        await inter.editReply({
          content: "This embed has been deleted!",
          embeds: [],
          components: [],
        });

        data.save();

        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle("Deleted Embed")
              .setDescription("Successfully deleted this embed")
              .setFooter({ text: "You can keep creating embeds" })
              .setColor("Random")
              .setTimestamp(),
          ],
        });
      }
    }

    if (!interaction.deffered) {
      interaction.showModal(infoModal);

      const filter = (i) => i.user.id === interaction.user.id;
      const collector5 = new InteractionCollector(client, { filter });

      collector5.on("collect", async (int) => {
        await int.deferReply({ ephemeral: true });

        if (type === 0) {
          const title =
            int.fields.getTextInputValue("update-embed-title") || null;

          embed.setTitle(title);
        } else if (type === 1) {
          const description =
            int.fields.getTextInputValue("update-embed-description") || null;

          embed.setDescription(description);
        } else if (type === 2) {
          const author =
            int.fields.getTextInputValue("update-embed-author") || null;

          embed.setAuthor({ name: author });
        } else if (type === 3) {
          const footer =
            int.fields.getTextInputValue("update-embed-footer") || null;

          embed.setFooter({ text: footer });
        } else if (type === 4) {
          embed.setTimestamp();
        } else if (type === 5) {
          const fieldName =
            int.fields.getTextInputValue("update-embed-fields-name") || null;
          const fieldValue =
            int.fields.getTextInputValue("update-embed-fields-value") || null;

          embed.addFields({
            name: fieldName,
            value: fieldValue,
          });
        } else if (type === 6) {
          const imageUrl =
            int.fields.getTextInputValue("update-embed-image") || null;

          embed.setImage(imageUrl);
        } else if (type === 7) {
          const thumbnailUrl =
            int.fields.getTextInputValue("update-embed-thumbnail") || null;

          embed.setThumbnail(thumbnailUrl);
        } else if (type === 8) {
          const color =
            int.fields.getTextInputValue("update-embed-color") || null;

          const nearestColor = findClosestString(color, [
            "Default",
            "White",
            "Aqua",
            "Green",
            "Blue",
            "Yellow",
            "Purple",
            "LuminousVividPink",
            "Fuchsia",
            "Gold",
            "Orange", //Color dataset
            "Red",
            "Grey",
            "Navy",
            "DarkAqua",
            "DarkGreen",
            "DarkBlue",
            "DarkPurple",
            "DarkVividPink",
            "DarkGold",
            "DarkOrange",
            "DarkRed",
            "DarkGrey",
            "DarkerGrey",
            "LightGrey",
            "DarkNavy",
            "Blurple",
            "Greyple",
            "DarkButNotBlack",
            "NotQuiteBlack",
          ]);

          embed.setColor(Colors[nearestColor.closestString]);
        } else if (type === 9) {
          const name =
            int.fields.getTextInputValue("create-webhook-name") || null;

          await int.channel
            .createWebhook({
              name: name,
              reason: "Webhook for sending the embed",
            })
            .then((bot) => {
              return bot.send({ embeds: [embed] });
            })
            .catch((err) => {
              console.log(err);
            });
        }

        inter.editReply({ embeds: [embed] });

        const newJson = embed.toJSON();
        const object = {
          embeds: newJson,
        };
        data.EmbedJsonInfo[dataIndex] = object;
        data.save();

        editReply(
          int,
          config.messageConfig.globalEmojis.tick,
          "Successfully edited the embed and saved it",
          true
        );

        collector5.stop("Collected interaction");
      });
    }
  });
}
