import { SlashCommandBuilder } from 'discord.js';
import redis from '../../services/redis.js';

export const data = new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop tracking a product')
    .addStringOption(option =>
        option
            .setName('url')
            .setDescription('The product URL to stop tracking')
            .setRequired(true)
    );

export async function execute(interaction) {
    const url = interaction.options.getString('url');
    const userId = interaction.user.id;

    try {
        // Check if user is subscribed
        const isSubscribed = await redis.isUserSubscribed(userId, url);

        if (!isSubscribed) {
            await interaction.reply({
                content: '❌ You are not tracking this product!',
                ephemeral: true,
            });
            return;
        }

        // Get product info before unsubscribing
        const product = await redis.getProduct(url);
        const productName = product?.name || 'Unknown Product';

        // Unsubscribe user
        await redis.unsubscribeUser(userId, url);

        await interaction.reply({
            content: `✅ Stopped tracking: **${productName}**\n\nYou will no longer receive notifications for this product.`,
        });

    } catch (error) {
        console.error('Error in /stop command:', error);
        await interaction.reply({
            content: `❌ An error occurred: ${error.message}`,
            ephemeral: true,
        });
    }
}
