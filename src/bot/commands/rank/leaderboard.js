import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import level from "../../core/database/mongodb/schemas/rank/level.js";

export default {
    data: new SlashCommandBuilder()
    .setName('xp-leaderboard')
    .setDescription(`Get's the server's xp leaderboard`),
    async execute (interaction) {
        const { guild, client } = interaction;

        let text = "";

        const embed1 = new EmbedBuilder()
        .setColor('Random')
        .setDescription(`<:8916crossmark:1200361991798263858> | Whoops looks like there's no one on the leaderboard, please try later again when people have more than 0 xp.`)
        const Data = await level.find({ Guild: guild.id })
        .sort({
            XP: -1,
            Level: 1
        })
        .limit(10)

        if (!Data) return await interaction.reply({ embeds: [embed1], ephemeral: true });

        await interaction.deferReply();
        
        for (let counter = 0; counter < Data.length; ++counter) {
            let { User, XP, Level } = Data[counter];

            const value = await client.users.fetch(User) || "Unknown Member"
            const member = value.tag;
            text += `${counter + 1}. ${member} | XP: ${XP} Level ${Level} \n`

            const embed = new EmbedBuilder()
            .setColor('Random')
            .setTitle(`${interaction.guild.name}'s XP Leaderboard:`)
            .setDescription(`\`\`\`${text}\`\`\``)
            .setTimestamp()
            .setFooter({ text: "XP Leaderboard" })

            interaction.editReply({ embeds: [embed] })
        }
    }
}