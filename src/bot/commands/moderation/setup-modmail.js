import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ChatInputCommandInteraction,
  ComponentType,
  PermissionFlagsBits,
} from "discord.js";
//Importing important files
import guildData from "../../core/database/mongodb/schemas/modmail/modmail.js";
import config from "../../config.json" assert { type: "json" };
import editReply from "../../core/functions/editReply.js";

export default {
  data: new SlashCommandBuilder()
    .setName("setup-modmail")
    .setDescription("Setup modmail system on your system!")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((options) =>
      options
        .setName("channel")
        .setDescription(
          "Enter a channel which will have the create-modmail button"
        )
        .addChannelTypes(ChannelType.GuildText)
    )
    .addChannelOption((options) =>
      options
        .setName("thread-channel")
        .setDescription(
          "Enter a channel which will have all the modmail threads"
        )
        .addChannelTypes(ChannelType.GuildText)
    )
    .addStringOption((options) =>
      options
        .setName("description")
        .setDescription("Enter a description for the modmail")
        .setRequired(false)
        .setMaxLength(200)
    )
    .addAttachmentOption((options) =>
      options
        .setName("image")
        .setDescription("Input a image for the modmail attachment")
        .setRequired(false)
    )
    .addStringOption((options) =>
      options
        .setName("button-name")
        .setDescription("What should be the name of the help button?")
        .setMaxLength(80)
        .setRequired(false)
    ),
  /**
   *
   * @param {ChatInputCommandInteraction} interaction
   * @param {Client} client
   */
  async execute(interaction, client) {
    //Defer reply incase the response takes longer than 3 seconds
    await interaction.deferReply({ ephemeral: true });
    try {
      //Unpacking values from interaction
      const { options } = interaction;
      const channel = options.getChannel("channel");
      const description = options.getString("description");
      const image = options.getAttachment("image");
      const buttonName = options.getString("button-name");
      const tchannel = options.getChannel("thread-channel");

      //Creating buttons
      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("disable")
          .setLabel("Disable")
          .setEmoji(config.messageConfig.globalEmojis.cross) //Custom Emoji, replace with your own
          .setStyle(ButtonStyle.Danger),

        new ButtonBuilder()
          .setCustomId("enable")
          .setLabel("Enable")
          .setEmoji(config.messageConfig.globalEmojis.tick) //Custom Emoji, replace with your own
          .setStyle(ButtonStyle.Success)
      );

      //category
      //Creating a embed
      const embed = new EmbedBuilder()
        .setAuthor({
          name: `${config.messageConfig.gen} Setup Modmail`, //Custom Emoji, replace with your own
          iconURL: client.user.displayAvatarURL({ dynamic: true }), //Getting the client's avatar
        })
        .setColor("Random")
        .setTimestamp()
        .setDescription(`Please select an action`)
        .setFooter({ text: "Made with ❤️ by Arrowment developers" });

      //Replying to the user
      const page = await interaction.editReply({
        embeds: [embed],
        components: [buttons],
        ephemeral: true,
      });

      const filter = (i) => i.user.id === interaction.user.id;
      
      //Creating a new component collector
      const collector = page.createMessageComponentCollector({ filter, componentType: ComponentType.Button });

      //See for collected info
      collector.on("collect", async (i) => {
        //Defer replying
        await i.deferReply({ ephemeral: true });

        //Checking if i.user.id is equal to interaction.user.id
        if (i.user.id !== interaction.user.id) {
          await editReply(
            i,
            config.messageConfig.x,
            "This is not your command!",
            true
          );
          return;
        } else {
          //Finding the guildData in the database
          const data = await guildData.findOne({ Guild: i.guild.id });

          //Use a switch statement to see for collected components
          switch (i.customId) {
            case "enable":
              await enable(
                i,
                data,
                channel,
                description,
                image,
                buttonName,
                buttons,
                client,
                interaction,
                tchannel
              );

              collector.stop();
              break;
            case "disable":
              await disable(i, data, buttons, interaction);

              collector.stop();
              break;
          }
        }
      });
    } catch (err) {
      console.log(err);
      //Let the user know
      let message =
        "An **error occurred** while asking executing.\n\nThe causes of the following error could be:\n`1.)` Database under maintenance or is down/moved\n`2.)` Internal code error";
      await editReply(interaction, config.messageConfig.x, message, true);
      return;
    }
  },
};

async function enable(
  i,
  data,
  channel,
  description,
  image,
  buttonName,
  button,
  client,
  interaction,
  tchannel
) {
  if (!data) {
    //Disabling the buttons
    button.components[0].setDisabled(true);
    button.components[1].setDisabled(true);
    interaction.editReply({ components: [button] });

    //Checking if channel exists or not
    if (!channel || !tchannel) {
      return editReply(
        i,
        config.messageConfig.x,
        "Please run the command again and provide a channel/thread-channel",
        true
      );
    }

    await editReply(i, config.messageConfig.gen, "Setting up messages", true); //Custom Emoji, Enter your own

    //Default message
    let defaultMessage =
      "Want a help with something?, We are here to help you.\nClick on the button below to get started.\n\nHow to get help?\nClick the button below!\nBot will dm you, send your query there\nNow wait for a response from the admins";

    //Sending a message to the given channel
    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${config.messageConfig.gen} Modmail`, //Custom Emoji, replace with your own
        iconURL: client.user.displayAvatarURL({ dynamic: true }), //Getting the client's avatar
      })
      .setDescription(description ? description : defaultMessage)
      .setTimestamp()
      .setColor("Random")
      .setFooter({ text: "Made with ❤️ by Arrowment developers" });

    //Creating a button
    const buttons2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("create")
        .setLabel(buttonName ? buttonName : "Get Help")
        .setEmoji(config.messageConfig.globalEmojis.security) //Custom Emoji, replace with your own
        .setStyle(ButtonStyle.Danger)
    );

    //Add a image if exists
    if (image) embed.setThumbnail(image.attachment);

    //Send the message in the channel
    const message = await channel.send({
      embeds: [embed],
      components: [buttons2],
    });

    //Updating the user
    await editReply(i, config.messageConfig.gen, "Enabling modmail", true); //Custom Emoji, Enter your own

    //Creating a new entry in the database
    let newData = new guildData({
      Guild: i.guild.id,
      ChannelID: channel.id,
      ThreadChannel: tchannel.id,
      MessageID: message.id,
      DmMessage: "",
    });

    //Saving the data in the database
    newData.save();

    //Updating the user on the status
    await editReply(
      i,
      config.messageConfig.tick,
      "Successfully enabled modmail",
      true
    );

    return;
  } else {
    //EditReply with a error and let them know
    await editReply(
      i,
      config.messageConfig.x,
      "Modmail is already enabled, Please contact the administrators if the issue persists",
      true
    );
    return;
  }
}

async function disable(i, data, button, interaction) {
  if (data) {
    //Disabling the buttons
    button.components[0].setDisabled(true);
    button.components[1].setDisabled(true);
    interaction.editReply({ components: [button] });

    //Let them know
    await editReply(i, config.messageConfig.gen, "Disabling modmail", true);

    //Initialise a empty variable
    let msg;

    //Fetching the message sent earlier
    const channel = await i.guild.channels.cache.get(data.ChannelID);
    try {
      if (channel) msg = await channel.messages.fetch(data.MessageID);

      //Let them know that we are deleting the message
      await editReply(i, config.messageConfig.gen, "Deleting messages", true);
      if (msg) await msg.delete();
    } catch {}

    //Remove the entry from database
    await guildData.findOneAndDelete({ Guild: i.guild.id });

    //Update the user on the status
    await editReply(
      i,
      config.messageConfig.tick,
      "Successfully disabled modmail!",
      true
    );
  } else {
    //EditReply with a error and let them know
    await editReply(
      i,
      config.messageConfig.x,
      "Modmail is already disabled, Please contact the administrators if the issue persists",
      true
    );
    return;
  }
}
