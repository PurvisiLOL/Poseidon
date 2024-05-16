import {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    InteractionCollector,
    CommandInteraction,
    InteractionType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    PermissionFlagsBits,
  } from "discord.js";
  //Importing important files
  import guildData from "../../core/database/mongodb/schemas/modmail/modmail.js";
  import config from "../../config.json" assert { type: "json" };
  import editReply from "../../core/functions/editReply.js";
  
  export default {
    data: new SlashCommandBuilder()
      .setName("customize-modmail-embed")
      .setDescription("Customize ModMail embed in your server")
      .setDMPermission(false)
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addAttachmentOption((options) =>
        options
          .setName("image")
          .setDescription("Input a image for the modmail attachment")
      )
      .addStringOption((options) =>
        options
          .setName("footer")
          .setDescription("What should be the footer of the embed?")
          .setMaxLength(128)
      )
      .addStringOption((options) =>
        options
          .setName("button-name")
          .setDescription("What should be the name of the help button?")
          .setMaxLength(80)
      )
      .addStringOption((options) =>
        options
          .setName("button-emoji")
          .setDescription("What should be the emoji of the help button?")
          .setMaxLength(2)
      )
      .addStringOption((options) =>
        options
          .setName("title")
          .setDescription("What should be the title of the embed?")
          .setMaxLength(80)
      ),
  
    /**
     *
     * @param {CommandInteraction} interaction
     * @param {Client} client
     */
    async execute(interaction, client) {
      const { options } = interaction;
  
      //Unpacking options from interaction
      const image = options.getAttachment("image");
      const string = options.getString("footer");
      const buttonName = options.getString("button-name");
      const title = options.getString("title");
      const emoji = options.getString("button-emoji");
  
      //Show the modal to the users
      await createModal(interaction);
  
      const filter = (i) => interaction.user.id === i.user.id;
      //Create a interaction collector for the modal
      const collector = new InteractionCollector(client, {
        filter, 
        maxComponents: 2,
        interactionType: InteractionType.ModalSubmit,
      });
  
      collector.on("collect", async (i) => {
        //Defer replying
        await i.deferReply({ ephemeral: true });
  
        //Fetching data
        const data = await guildData.findOne({ Guild: i.guild.id });
  
        switch (i.customId) {
          case "modmail":
            //Fetch the description
            const description =
              i.fields.getTextInputValue("description") ||
              "Click the button below to get help from the best mods in the world.";
  
            const dmEmbed =
              i.fields.getTextInputValue("dm") ||
              "Thanks for opening a modmail. Please send a message below and ask for help";
  
            //Check if modmail is enabled
            if (!data) {
              await editReply(
                i,
                config.messageConfig.x,
                "Modmail hasn't been configured yet"
              );
            } else {
              //Fetching the old message
              let msg;
  
              //Fetching the message sent earlier
              const channel = await i.guild.channels.cache.get(data.ChannelID);
              try {
                if (channel) msg = await channel.messages.fetch(data.MessageID);
                else
                  return editReply(
                    i,
                    config.messageConfig.x,
                    "The channel in which modmail was configured has been deleted, Please disable modmail and try again",
                    true
                  );
  
                //Let them know that we are deleting the message
                await editReply(
                  i,
                  config.messageConfig.gen,
                  "Deleting messages",
                  true
                );
                if (msg) await msg.delete();
              } catch {}
  
              //Construct a embed
              const embed = new EmbedBuilder()
                .setAuthor({
                  name: `${config.messageConfig.gen} Modmail`, //Custom Emoji, replace with your own
                  iconURL: client.user.displayAvatarURL({ dynamic: true }), //Getting the client's avatar
                })
                .setDescription(description)
                .setFooter({ text: string })
                .setTimestamp()
                .setColor("Random");
  
              //Set the rest of parameters
              if (image) embed.setThumbnail(image.attachment);
              else if (title) embed.setTitle(title);
  
              //Construct a button
              let buttonLabel = buttonName
                ? emoji
                  ? emoji
                  : config.messageConfig.utility + buttonName
                : "Support";
              const button = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setLabel(buttonLabel)
                  .setCustomId("create")
                  .setStyle(ButtonStyle.Danger)
              );
  
              //Send the message to the channel
              const mssg = await channel.send({
                embeds: [embed],
                components: [button],
              });
              data.MessageID = mssg.id;
              data.DmMessage = dmEmbed;
              data.save();
  
              await editReply(
                i,
                config.messageConfig.gen,
                "Successfully saved settings",
                true
              );
              collector.stop();
              break;
            }
        }
      });
    },
  };
  
  async function createModal(interaction) {
    const personalInfo = new ModalBuilder()
      .setCustomId("modmail")
      .setTitle("Modmail");
  
    //Creating components
    const question = new TextInputBuilder()
      .setCustomId("description")
      .setLabel("Description")
      .setPlaceholder(
        "Click the button below to get help from the best mods in the world."
      )
      .setStyle(TextInputStyle.Paragraph);
  
    const question2 = new TextInputBuilder()
      .setCustomId("dm")
      .setLabel("DM Embed Description")
      .setPlaceholder(
        "Thanks for opening a modmail. Please send a message below and ask for help"
      )
      .setStyle(TextInputStyle.Paragraph);
  
    //Adding them as action row builder
    const firstActionRow = new ActionRowBuilder().setComponents(question);
    const firs2tActionRow = new ActionRowBuilder().setComponents(question2);
  
    //Adding the components to the modal
    personalInfo.setComponents(firstActionRow, firs2tActionRow);
    //Show the modal to the user
    await interaction.showModal(personalInfo);
  }
  