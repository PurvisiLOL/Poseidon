import {
    ChatInputCommandInteraction,
    Client,
    ButtonBuilder,
    ActionRowBuilder,
    ButtonStyle,
    EmbedBuilder,
    ComponentType,
  } from "discord.js";
  import config from "../../config.json" assert { type: "json" };
  import editReply from "../../core/functions/editReply.js";
  import modMailSchema from "../../core/database/mongodb/schemas/modmail/modmail.js";
  import userModMailSchema from "../../core/database/mongodb/schemas/modMail/userModmail.js";
  import dmModmail from "../../Core/database/mongodb/schemas/modMail/dmModmail.js";
  
  export default {
    name: "interactionCreate",
  
    /**
     *
     * @param {ChatInputCommandInteraction} interaction
     * @param {Client} client
     */
    async execute(interaction, client) {
      //Checking if the interaction is a button or not
      if (!interaction.isButton()) return;
  
      //Switching to the button id
      switch (interaction.customId) {
        case "create":
          //DeferReplying
          await interaction.deferReply({ ephemeral: true });
  
          const userDM = await dmModmail.findOne({ User: interaction.user.id });
          let guild;
          if (!userDM) {
            guild = interaction.guild;
          } else {
            const guildCache = client.guilds.cache.get(userDM.GuildID);
            guild = guildCache;
          }
  
          await editReply(
            interaction,
            config.messageConfig.gen,
            "Fetching database information..",
            true
          );
  
          //Fetching modmail schema in the database
          const guildData = await modMailSchema.findOne({
            Guild: guild.id,
          });
          //Checking if guildData exists or not
          if (!guildData)
            return editReply(
              interaction,
              config.messageConfig.x,
              "Modmail system hasn't been configured yet",
              true
            );
  
          //Fetching the thread-channel
          const tchannel = await guild.channels.fetch(guildData.ThreadChannel);
  
          if (!tchannel) {
            return editReply(
              interaction,
              config.messageConfig.x,
              "Modmail hasn't been properly configured. Please contact the admins",
              true
            );
          }
  
          //magik
          //i dropped my macbook
  
          //Creating a new thread
          const thread = await tchannel.threads.create({
            name: `modmail-${interaction.user.id}-${process.pid}`,
            reason: `Requested by ${interaction.user.username} at the process ${process.pid}`,
          });
  
          if (!thread)
            return editReply(
              interaction,
              config.messageConfig.x,
              "Failed to create your mail",
              true
            );
  
          const newData = new userModMailSchema({
            Guild: guild.id,
            User: interaction.user.id,
            ThreadID: thread.id,
          });
          newData.save();
  
          //Edit reply to let them know the status
          await editReply(
            interaction,
            config.messageConfig.gen,
            "Successfully created your mail, check your dms",
            true
          );
  
          const col1 = await handleMessagesFromUserSide(thread, interaction);
          const col = await handleMessageFromAdminsSide(thread, interaction);
  
          //Send a message to channel
          await dmUser(
            interaction,
            col,
            col1,
            client,
            guildData.DmMessage,
            guild
          );
          await sendMessage(thread, interaction, client, col, col1, guild);
          break;
      }
    },
  };
  
  async function handleMessageFromAdminsSide(channel, interaction, stop) {
    const collector = channel.createMessageCollector();
  
    if (stop) return collector.stop();
  
    collector.on("collect", async (message) => {
      if (message.author.bot) return;
      await message.react(config.messageConfig.globalEmojis.tick);
  
      message.attachments.forEach(async (value, key) => {
        await interaction.user.send({
          content: `*Attachment* by **${message.author.username}** from **${message.guild.name}**`,
          files: [value.attachment],
        });
      });
  
      if (message.content) {
        await interaction.user.send({
          embeds: [
            new EmbedBuilder()
              .setAuthor({
                name: `ModMail`, //Custom Emoji, replace with your own
                iconURL: message.author.displayAvatarURL({ dynamic: true }), //Getting the user's avatar
              })
              .setDescription(`${message.author.username} - ${message.content}`)
              .setFooter({ text: `Sent from ${message.guild.name}` })
              .setTimestamp()
              .setColor("Orange"),
          ],
        });
  
        //If you find this, then remember this its always too late
      }
    });
  
    return collector;
  }
  
  async function handleMessagesFromUserSide(channel, interaction, stop) {
    const dm = await interaction.user.createDM();
    const collector = await dm.createMessageCollector();
  
    if (stop) return collector.stop();
  
    collector.on("collect", async (message) => {
      if (message.author.bot) return;
      await message.react(config.messageConfig.globalEmojis.tick);
  
      message.attachments.forEach(async (value, key) => {
        await channel.send({
          content: `*Attachment* by **${message.author.username}**`,
          files: [value.attachment],
        });
      });
  
      if (message.content) {
        await channel.send({
          embeds: [
            new EmbedBuilder()
              .setAuthor({
                name: `ModMail`, //Custom Emoji, replace with your own
                iconURL: message.author.displayAvatarURL({ dynamic: true }), //Getting the user's avatar
              })
              .setDescription(`${message.author.username} - ${message.content}`)
              .setThumbnail()
              .setColor("Orange"),
  
            //amogus twerk
          ],
        });
      }
    });
  
    return collector;
  }
  
  async function archiveThread(
    interaction,
    i,
    col,
    col1,
    client,
    type,
    buttons,
    page,
    guild,
    col2
  ) {
    if (type === 1) i = interaction; //Type 1 = interaction but in guild
  
    //Fetch data from the database
    const [guildData, dmData, userData] = await fetchData(guild, interaction, i);
  
    //Delete user data from the database
    await deleteUserData(dmData, userData, guild, interaction, i);
  
    //Fetch thread and user data from the database
    const [threadUser, channel, thread] = await fetchThreadAndChannelData(
      client,
      userData,
      guildData,
      i,
      guild
    );
  
    //Send the creator of the mail a message if the type if 1
    if (type === 1) {
      await sendThreadCreatorMessage(threadUser, interaction);
    }
  
    //Send the message in thread
    await sendMessageToThread(thread, interaction);
  
    //End the collectors
    await endCollectors(col, col1, col2, i);
  
    //Archiving the thread after 10 seconds
    setTimeout(async () => {
      //Archiving the thread
      await thread.setLocked(true);
    }, 10_000);
  
    //Disabling the buttons
    buttons.components[0].setDisabled(true);
    if (type === 1) buttons.components[1].setDisabled(true);
  
    //Editing the page variable message
    await page.edit({
      components: [buttons],
    });
  
    //Let them know that the task has been finished.
    await editReply(
      i,
      config.messageConfig.tick,
      "Successfully archived the thread",
      true
    );
  }
  
  async function dmUser(interaction, col, col1, client, message, guild) {
    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("archive2")
        .setLabel("Archive")
        .setEmoji(config.messageConfig.globalEmojis.security) //Custom Emoji, replace with your own
        .setStyle(ButtonStyle.Danger)
    );
  
    const content = message
      ? message
      : "Thanks for opening a modmail. Please send a message below and ask for help";
  
    let page;
    try {
      page = await interaction.user.send({
        embeds: [
          new EmbedBuilder()
            .setAuthor({
              name: `:${config.messageConfig.gen}: ModMail`, //Custom Emoji, replace with your own
              iconURL: interaction.user.displayAvatarURL({ dynamic: true }), //Getting the user's avatar
            })
            .setDescription(content)
            .setColor("Random")
            .setTimestamp(),
        ],
        components: [buttons],
      });
    } catch {
      col.stop();
      col1.stop();
  
      return editReply(
        interaction,
        config.messageConfig.x,
        "You have your dms blocked",
        true
      );
    }
  
    const collector = page.createMessageComponentCollector({
      component: ComponentType.Button,
    });
  
    collector.on("collect", async (i) => {
      await i.deferReply({ ephemeral: true });
      switch (i.customId) {
        case "archive2":
          await archiveThread(
            interaction,
            i,
            col,
            col1,
            client,
            0,
            buttons,
            page,
            guild,
            collector
          );
          break;
      }
    });
  }
  
  async function deleteThread(interaction, i, client, col, col1, guild, col2) {
    //Fetch the data from the database
    const [guildData, dmData, userData] = await fetchData(guild, interaction, i);
  
    //Delete the user data
    await deleteUserData(dmData, userData, guild, interaction, i);
  
    //Fetch channel and thread data
    const [threadUser, channel, thread] = await fetchThreadAndChannelData(
      client,
      userData,
      guildData,
      i,
      guild
    );
  
    //Send message to the thread
    await sendMessageToThread(thread, interaction);
  
    //End all the collectors
    await endCollectors(col, col1, col2, i);
  
    //Let them know that the task has been finished.
    await editReply(
      i,
      config.messageConfig.tick,
      "Successfully archived the thread",
      true
    );
  
    //Send message to the mailer
    await sendThreadCreatorMessage(threadUser, interaction);
  
    //Archiving the thread after 10 seconds
    setTimeout(async () => {
      //Archiving the thread
      await thread.delete();
    }, 10_000);
  }
  
  async function sendMessage(channel, interaction, client, col, col1, guild) {
    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("close")
        .setLabel("Close")
        .setStyle(ButtonStyle.Danger),
  
      new ButtonBuilder()
        .setCustomId("archive2")
        .setLabel("Archive")
        .setStyle(ButtonStyle.Danger)
    );
  
    //Send a message to the channel
    const page = await channel.send({
      embeds: [
        new EmbedBuilder()
          .setAuthor({
            name: `${config.messageConfig.gen} ModMail`, //Custom Emoji, replace with your own
            iconURL: interaction.user.displayAvatarURL({ dynamic: true }), //Getting the user's avatar
          })
          .setDescription(`${interaction.user.username} has opened a modmail`)
          .setColor("Random")
          .setTimestamp(),
      ],
      components: [buttons],
    });
  
    const collector = page.createMessageComponentCollector({
      component: ComponentType.Button,
    });
    collector.on("collect", async (i) => {
      await i.deferReply({ ephemeral: true });
  
      switch (i.customId) {
        case "archive2":
          await archiveThread(
            i,
            interaction,
            col,
            col1,
            client,
            1,
            buttons,
            page,
            guild,
            collector
          );
          break;
        case "close":
          await deleteThread(interaction, i, client, col, col1, guild, collector);
          break;
      }
    });
  }
  
  async function deleteUserData(dmData, userData, guild, interaction, i) {
    //Tell them we are deleting their useInfo
    await editReply(
      i,
      config.messageConfig.gen,
      "Deleting user modmail data from database",
      true
    );
  
    //Let them know no user data was found
    if (!userData) {
      return editReply(
        i,
        config.messageConfig.x,
        "This user's data was not found, they probably have deleted the data.\nYou can lock this manually or delete it using the button provided",
        true
      );
    }
  
    //If the data is present nuke em!
    if (userData) {
      await userModMailSchema.findOneAndDelete({
        Guild: guild.id,
        User: i.user.id,
      });
    }
    if (dmData) {
      await dmModmail.findOneAndDelete({
        User: i.user.id,
        GuildID: guild.id,
      });
    }
  }
  
  async function endCollectors(col, col1, col2, i) {
    if (col && col1 && col2) {
      //Let them know we are ending the collectors
      await editReply(
        i,
        config.messageConfig.gen,
        "Ending message collectors",
        true
      );
  
      //Setting the last value to true ends the collector for good.
      col.stop();
      col1.stop();
      col2.stop();
    }
  }
  
  async function sendThreadCreatorMessage(threadUser, interaction) {
    if (threadUser) {
      await threadUser.send({
        embeds: [
          new EmbedBuilder()
            .setAuthor({
              name: `${config.messageConfig.gen} ModMail`, //Custom Emoji, replace with your own
              iconURL: interaction.user.displayAvatarURL({ dynamic: true }), //Getting the user's avatar
            })
            .setDescription(
              `\`${interaction.user.username}\` has closed the your modmail`
            )
            .setColor("Random")
            .setTimestamp(),
        ],
      });
    }
  }
  
  async function fetchData(guild, interaction, i) {
    //Find data in the database
    const guildData = await modMailSchema.findOne({
      Guild: guild.id,
    });
  
    //Checking if guildData exists or not
    if (!guildData)
      return editReply(
        i,
        config.messageConfig.x,
        "This guild has disabled modmail",
        true
      );
  
    //Fetching user dm data (from messageCreate)
    const dmData = await dmModmail.findOne({
      User: interaction.user.id,
      GuildID: guild.id,
    });
  
    //Fetching the user data
    const userData = await userModMailSchema.findOne({
      Guild: guild.id,
      User: interaction.user.id,
    });
  
    return [guildData, dmData, userData];
  }
  
  async function fetchThreadAndChannelData(
    client,
    userData,
    guildData,
    i,
    guild
  ) {
    const threadUser = await client.users.cache.get(userData.User);
  
    //Fetching the channel
    const channel = await guild.channels.fetch(guildData.ChannelID);
    if (!channel) {
      return editReply(
        i,
        config.messageConfig.x,
        "Source thread wasn't found",
        true
      );
    }
  
    //Fetching the thread
    const thread = await channel.threads.fetch(userData.ThreadID);
    if (!thread)
      return editReply(
        i,
        config.messageConfig.x,
        "This thread doesn't exist",
        true
      );
  
    return [threadUser, channel, thread];
  }
  
  async function sendMessageToThread(thread, interaction) {
    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${config.messageConfig.gen} ModMail`, //Custom Emoji, replace with your own
        iconURL: interaction.user.displayAvatarURL({ dynamic: true }), //Getting the user's avatar
      })
      .setDescription(`\`${interaction.user.username}\` has closed the thread`)
      .setFooter({
        text: "This thread will be deleted in 10 seconds, Please use `/modmail` to send messages to the user, this thread has been archived",
      })
      .setColor("Random")
      .setTimestamp();
  
    await thread.send({
      embeds: [embed],
    });
  }
  