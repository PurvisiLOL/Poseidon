export default {
  customId: "test",
  developer: true,
  cooldown: 10000,

  async execute(interaction, client) {
    interaction.reply({ content: "it works :)" });
  },
};
