import { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } from "discord.js";
import level from "../../core/database/mongodb/schemas/rank/level.js";

export default {
    data: new SlashCommandBuilder()
    .setName('reset-server-xp')
    .setDescription(`Reset your server's xp`),
    async execute (interaction) {
        const perm = new EmbedBuilder()
        .setColor('Random')
        .setDescription(`<:8916crossmark:1200361991798263858> | You do not have the permission to reset the whole server's xp.`)
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return await interaction.reply({ embeds: [perm], ephemeral: true });

        const { guildId } = interaction;

        await level.deleteMany({ Guild: guildId }).exec();
        const embed = new EmbedBuilder()
            .setColor('Random')
            .setDescription(`<:7425classiccheckmark:1209411330973376544> | ${interaction.guild.name}'s XP has successfully been reseted.`);
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
}