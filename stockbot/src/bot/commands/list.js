import { SlashCommandBuilder } from 'discord.js';
import redis from '../../services/redis.js';
import notifier from '../../services/notifier.js';

export const data = new SlashCommandBuilder()
    .setName('list')
    .setDescription('List all products you are tracking');

export async function execute(interaction) {
    const userId = interaction.user.id;

    try {
        // Get user's products
        const products = await redis.getUserProducts(userId);

        // Create embed
        const embed = notifier.createProductListEmbed(products);

        await interaction.reply({
            embeds: [embed],
        });

    } catch (error) {
        console.error('Error in /list command:', error);
        await interaction.reply({
            content: `❌ An error occurred: ${error.message}`,
            ephemeral: true,
        });
    }
}
