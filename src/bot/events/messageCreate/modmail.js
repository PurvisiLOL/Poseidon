import {
  Client,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  EmbedBuilder,
  ComponentType,
  ChannelType,
  Message,
  InteractionCollector,
} from "discord.js";
import config from "../../config.json" assert { type: "json" };
import editReply from "../../core/functions/editReply.js";
import modMailSchema from "../../core/database/mongodb/schemas/modmail/modmail.js";
import userModMailSchema from "../../core/database/mongodb/schemas/modMail/userModmail.js";
import dmModmail from "../../Core/database/mongodb/schemas/modMail/dmModmail.js";

export default {
  name: "messageCreate",

  /**
   *
   * @param {Message} message
   * @param {Client} client
   */
  async execute(message, client) {
    //Check if the message is in a dm and is not a bot
    if (message.channel.type !== ChannelType.DM) return;
    if (message.author.bot) return;

    //Get the message authors id and username
    const userId = message.author.id;

    /**
     * This is the template to open a modmail through dms in a specific guild.
     * The user will send a guild id
     * If the guild id is correct then we will check if the guild has a modmail system configured or not
     * If not return with a error message
     * Else we will create a new modmail in the guild
     */

    try {
      //Check if the guildId provided is correct or not
      const guildIdCheck = client.guilds.cache.get(message.content);
      //Make sure to not return nothing, as the user could be just sending some random message to the bot
      if (!guildIdCheck) return;

      //Check if the guild has a modmail system configured or not
      const modMailCheck = await modMailSchema.findOne({
        Guild: guildIdCheck.id,
      });
      const userDataCheck = await userModMailSchema.findOne({
        Guild: guildIdCheck.id,
        User: userId,
      });

      //Checking if the modmail system exists in that guild
      if (!modMailCheck) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("ModMail System")
              .setDescription(
                "The guildId you provided hasn't configured modmail system in their guild yet"
              )
              .setColor("Red")
              .setTimestamp(),
          ],
        });
      }

      //Construct buttons for them to create a new modmail
      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("create2")
          .setLabel("ModMail")
          .setEmoji(config.messageConfig.incoming_envelope) //Custom Emoji, replace with your own
          .setStyle(ButtonStyle.Danger),

        new ButtonBuilder()
          .setCustomId("delete2")
          .setLabel("Force Delete")
          .setStyle(ButtonStyle.Danger)
      );

      //Check if the user already has data
      const data = await dmModmail.findOne({
        User: userId,
        GuildID: guildIdCheck.id,
      });

      //Check and respond
      const msg = await checkAndRespond(message, data, buttons, userDataCheck);

      //Handle the responses using this function
      await handleResponse(
        guildIdCheck,
        userId,
        client,
        message,
        data,
        buttons,
        msg
      );
    } catch (e) {
      //Here if the guild id is not in the discord type then it will throw an error, we have to make sure not to send an error message to the user and log that to the console instead
      console.log(e);
    }
  },
};

async function checkAndRespond(message, data, buttons, userDataCheck) {
  let msg;
  if (data || userDataCheck) {
    await buttons.components[0].setDisabled(true);
    //If data then throw an error message : )
    msg = await message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Modmail System")
          .setDescription(
            `${config.messageConfig.x} | You already have a dm/modmail data, would you like to force delete it?`
          )
          .setTimestamp()
          .setColor("Yellow"),
      ],
      components: [buttons],
    });
    return;
  } else {
    await buttons.components[1].setDisabled(true);
    //If the guild has a modmail system configured then we will prompt the user if they want to create a modmail
    msg = await message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("ModMail System")
          .setDescription("Would you like to send a modmail to this guild")
          .setColor("Random")
          .setTimestamp(),
      ],
      components: [buttons],
    });
  }

  return msg;
}

async function handleResponse(
  guild,
  userId,
  client,
  message,
  data,
  buttons,
  msg
) {
  //Create a new collector for handling the interactions
  const collector = new InteractionCollector(client, {
    componentType: ComponentType.Button,
  });

  //Listening for events
  collector.on("collect", async (i) => {
    //Defer reply if a interaction has been collected
    await i.deferReply();

    //Switch to the customId and check if it is create2
    switch (i.customId) {
      case "create2":
        //Update the buttons
        await updateOldMessage(buttons, msg);

        //Let them know that we are creating new data in the database
        await editReply(
          i,
          config.messageConfig.gen,
          "Creating data in the database...",
          false
        );

        //Creating a new entry in the database
        await new dmModmail({
          User: userId,
          GuildID: guild.id,
        }).save();

        //Initializing a new a button
        const button = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("create") //MOST IMPORTANT, DON'T CHANGE THE CUSTOM ID OR IT WON'T WORK
            .setLabel("Get Support")
            .setStyle(ButtonStyle.Primary)
        );

        //Tell them it has been finished and send a create button to them
        await i.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle("Modmail System")
              .setDescription(
                `${config.messageConfig.tick} | Create a new modmail in ${guild.name}`
              )
              .setTimestamp()
              .setColor("Green"),
          ],
          components: [button],
        });

        collector.stop();
        break;
      case "delete2":
        //Let them know that we are deleting data in the database
        await editReply(
          i,
          config.messageConfig.gen,
          "Force deleting data in the database...",
          false
        );

        //Delete data in the database
        await dmModmail.deleteMany({ User: userId });
        //Delete the userData from the database
        await userModMailSchema.findOneAndDelete({
          Guild: guild.id,
          User: userId,
        });

        //Update them on the progress
        await editReply(
          i,
          config.messageConfig.tick,
          "Successfully force deleted data from the database",
          false
        );

        //Return the new message
        collector.stop();
        break;
    }
  });
}

async function updateOldMessage(buttons, msg) {
  //Update the buttons
  buttons.components[0].setDisabled(true);
  buttons.components[1].setDisabled(true);

  //Edit the message
  await msg.edit({ components: [buttons] });
}
