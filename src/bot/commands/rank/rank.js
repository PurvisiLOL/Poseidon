import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, CommandInteraction } from "discord.js";
import level from "../../core/database/mongodb/schemas/rank/level.js";
import canvacord from "canvacord";

export default {
    data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Gets a rank from a member inside of the server')
    .addUserOption(option => option.setName('member').setDescription('The user to see the level/xp of').setRequired(false)),
    /**
     * 
     * @param {CommandInteraction} interaction 
     * @returns 
     */
    async execute (interaction) {
        await interaction.deferReply();
        const { options, user, guild } = interaction;

        const member = options.getMember('member') || user;
        const data = await level.findOne({ Guild: guild.id, User: member.id});

        const embed = new EmbedBuilder()
        .setColor('Random')
        .setDescription(`<:8916crossmark:1200361991798263858> | ${member} has not gained any xp`)

        if (!data) return await interaction.editReply({ embeds: [embed], ephemeral: true });

        const required = data.Level * data.Level * 20 + 20;

        const rank = new canvacord.RankCardBuilder()
        .setAvatar(member.displayAvatarURL({ dynamic: true }))
        .setBackground("IMAGE", `./rankcard.png`)
        .setCurrentXP(data.XP)
        .setRequiredXP(required)
        .setRank(1, "Rank", false)
        .setLevel(data.Level, "Level")
        .setUsername(member.username)
        .setDisplayName(member.displayName)
        .setFonts()

        const card = await rank.build();

        let attachment = new AttachmentBuilder(card, { name:"rank.png" });


        interaction.editReply({ files: [attachment] })
    }
}