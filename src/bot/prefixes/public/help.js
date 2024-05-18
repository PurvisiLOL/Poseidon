import { Client, Message, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import ms from "ms";
import fs from 'fs';

export default {
  name: "help",
  aliases: ["h"], //... more aliases
    /**
   *
   * @param {Message} message
   * @param {Client} client
   */
  async execute(message, client) {
    const commandFolders = fs.readdirSync('./src/bot/commands').filter(folder => !folder.startsWith('.'));
    const commandsByCategory = {};

    // Iterate through each command folder
    for (const folder of commandFolders) {
        const commandFiles = fs.readdirSync(`./src/bot/commands/${folder}`).filter(file => file.endsWith('.js'));
        const commands = [];

        // Iterate through each command file in the folder
        for (const file of commandFiles) {
            const { default: command } = await import(`../../commands/${folder}/${file}`);
            console.log('command', command);
            commands.push({ name: command.data.name, description: command.data.description });
        }

        // Store the commands under the folder category
        commandsByCategory[folder] = commands;
    }

    // Create a dropdown menu with category options
    const dropdownOptions = Object.keys(commandsByCategory).map(folder => ({
        label: folder,
        value: folder
    }));

    // Create the select menu with category options
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('category-select')
        .setPlaceholder('Select a category')
        .addOptions(...dropdownOptions.map(option => ({
            label: option.label,
            value: option.value
        })));

    // Create the embed with the select menu
    const embed = new EmbedBuilder()
        .setTitle('Command - Help')
        .setDescription('Select a category from the dropdown menu to view commands')
        .setThumbnail(`${client.user.displayAvatarURL()}`)

        const row = new ActionRowBuilder()
        .addComponents(selectMenu);

    // Send the embed with the select menu
    await message.reply({ embeds: [embed], components: [row], ephemeral: true });

    // Handle interaction with the select menu
    const filter = i => i.isSelectMenu() && i.customId === 'category-select';
    const collector = message.channel.createMessageComponentCollector({ filter });

    collector.on('collect', async i => {
        const selectedCategory = i.values[0];
        const categoryCommands = commandsByCategory[selectedCategory];

        // Update the embed with the selected category's commands
        const categoryEmbed = new EmbedBuilder()
            .setTitle(`${selectedCategory} Commands`)
            .setDescription('List of available commands in this category:')
            .setThumbnail(`${client.user.displayAvatarURL()}`)
            .addFields(categoryCommands.map(command => ({
                name: command.name,
                value: command.description
            })));

        await i.update({ embeds: [categoryEmbed] });
    });
  },
};
