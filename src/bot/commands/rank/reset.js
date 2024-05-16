import { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } from "discord.js";
import level from "../../core/database/mongodb/schemas/rank/level.js";

export default {
    data: new SlashCommandBuilder()
    .setName('reset-xp')
    .setDescription(`Reset a member's xp`)
    .addUserOption(option => option.setName('user').setDescription('The member you want to clear the xp of').setRequired(true)),
    async execute (interaction) {
        const perm = new EmbedBuilder()
        .setColor('Random')
        .setDescription(`<:8916crossmark:1200361991798263858> | You do not have the permission to reset a user's xp.`)
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return await interaction.repy({ embeds: [perm], ephemeral: true });

        const { guildId } = interaction;

        const target = interaction.options.getUser('user');

        await level.deleteMany({ Guild: guildId, User: target.id }).exec();
        const embed = new EmbedBuilder()
        .setColor('Random')
        .setDescription(`<:7425classiccheckmark:1209411330973376544> | ${target.tag}'s XP has successfully been reseted.`);
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
}