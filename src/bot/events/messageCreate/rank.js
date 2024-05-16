import level from "../../core/database/mongodb/schemas/rank/level.js";
import { EmbedBuilder } from "discord.js";
export default {
  name: "messageCreate",

  /**
   *
   * @param {Message} message
   * @param {Client} client
   */
  async execute(message, client) {
    if (message.author.bot) return;

    const { guild, author } = message;

    if (!guild || author.bot) return;

    let data1 = await level
      .findOne({ Guild: guild.id, User: author.id })
      .exec();

    if (!data1) {
      data1 = await level.create({
        Guild: guild.id,
        User: author.id,
        XP: 0,
        Level: 0,
      });
    }

    const channel = message.channel;
    const give = 1;
    const data = await level
      .findOne({ Guild: guild.id, User: author.id })
      .exec();

    if (!data) return;

    const requiredXP = data.Level * data.Level * 20 + 20;

    if (data.XP + give >= requiredXP) {
      data.XP += give;
      data.Level += 1;
      await data.save();

      if (!channel) return;

      const embed = new EmbedBuilder();
      embed.setColor("Random");
      embed.setDescription(
        `${author} has leveled up to **Level ${data.Level}**!`
      );

      channel.send({ embeds: [embed] });
    } else {
      data.XP += give;
      data.save();
    }
  },
};
