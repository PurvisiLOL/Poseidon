import {
  SlashCommandBuilder,
  EmbedBuilder,
  InteractionCollector,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  InteractionType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from "discord.js";
//Importing important files
import config from "../../config.json" assert { type: "json" };
import editReply from "../../core/functions/editReply.js";

export default {
  data: new SlashCommandBuilder()
    .setName("modmail-user")
    .setDescription("Send a mail to a usr")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption((options) =>
      options
        .setName("user")
        .setDescription("Select a user to mail to!")
        .setRequired(true)
    ),

  /**
   *
   * @param {ChatInputCommandInteraction} interaction
   * @param {Client} client
   */
  async execute(interaction, client) {
    //Getting user
    const user = interaction.options.getUser("user");

    if (user.id === client.user.id) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(`${config.messageConfig.x} | You cannot modmail me`)
            .setColor("Random")
            .setTimestamp(),
        ],
        ephemeral: true,
      });
    }

    //Show modal
    await createModal(interaction);

    const filter = (i) => i.id === interaction.user.id;
    //Create a new Collector
    const collector = new InteractionCollector(client, {
      filter,
      maxComponents: 1,
      interactionType: InteractionType.ModalSubmit,
    });

    try {
      //Listening for events
      collector.on("collect", async (i) => {
        //Defer replying
        await i.deferReply({ ephemeral: true });

        //Getting the message from modal
        const modmail = i.fields.getTextInputValue("message");

        //Send the user a message
        await user.send({
          embeds: [
            new EmbedBuilder()
              .setTitle(`New Message from ${interaction.guild.name}`)
              .setDescription(modmail)
              .setFooter({
                text: `You have received this message from ${interaction.user.username}, Please enter ${interaction.guild.id} to open a modmail`,
              })
              .setTimestamp()
              .setColor("Random"),
          ],
        });

        //Update the mod/admin that we have sent the modmail
        await editReply(
          i,
          config.messageConfig.tick,
          `Successfully mailed ${user}`,
          true
        );
      });
    } catch {
      //EditReply with a error and let them know
      await editReply(
        i,
        config.messageConfig.x,
        "User has its dm closed!",
        true
      );
    }
  },
};

async function createModal(interaction) {
  const personalInfo = new ModalBuilder()
    .setCustomId("modmail2")
    .setTitle("Modmail a User");

  //Creating components
  const question = new TextInputBuilder()
    .setCustomId("message")
    .setLabel("Message")
    .setPlaceholder(
      "Hello, i have warned you already, please stop sending links"
    )
    .setRequired(true)
    .setStyle(TextInputStyle.Paragraph);

  //Adding them as action row builder
  const firstActionRow = new ActionRowBuilder().setComponents(question);

  //Adding the components to the modal
  personalInfo.setComponents(firstActionRow);
  //Show the modal to the user
  await interaction.showModal(personalInfo);
}
