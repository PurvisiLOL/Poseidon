import { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } from "discord.js";
import level from "../../core/database/mongodb/schemas/rank/level.js";

export default {
    data: new SlashCommandBuilder()
    .setName('set-xp')
    .setDescription(`Sets a member's xp`)
    .addUserOption(option => option.setName('user').setDescription('The member you want to set the xp of').setRequired(true))
    .addNumberOption(option => option.setName('xp').setDescription('How much of XP?').setRequired(true)),
    async execute(interaction) {
        const perm = new EmbedBuilder()
        .setColor('Random')
        .setDescription(`<:8916crossmark:1200361991798263858> | You do not have the permission to reset a user's xp.`)
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return await interaction.reply({ embeds: [perm], ephemeral: true });

        const { guildId } = interaction;

        const target = interaction.options.getUser('user');
        const xp = interaction.options.getNumber('xp');

        await level.findOneAndUpdate({ Guild: guildId, User: target.id }, { XP: xp }, { upsert: true }).exec();
        const embed = new EmbedBuilder()
        .setColor('Random')
        .setDescription(`<:7425classiccheckmark:1209411330973376544> | ${target.tag}'s XP has successfully been set to ${xp}.`);
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
}
