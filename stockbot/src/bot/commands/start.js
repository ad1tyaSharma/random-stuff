import { SlashCommandBuilder } from 'discord.js';
import redis from '../../services/redis.js';
import stockChecker from '../../services/stockChecker.js';
import notifier from '../../services/notifier.js';

export const data = new SlashCommandBuilder()
    .setName('start')
    .setDescription('Start tracking a product for stock updates')
    .addStringOption(option =>
        option
            .setName('url')
            .setDescription('The Amul product URL to track')
            .setRequired(true)
    );

export async function execute(interaction) {
    const url = interaction.options.getString('url');
    const userId = interaction.user.id;

    // Validate URL
    if (!stockChecker.isValidAmulUrl(url)) {
        await interaction.reply({
            content: '❌ Invalid URL! Please provide a valid Amul product URL.\nExample: `https://shop.amul.com/en/product/amul-whey-protein-32-g-or-pack-of-30-sachets`',
            ephemeral: true,
        });
        return;
    }

    // Defer reply as checking may take some time
    await interaction.deferReply();

    try {
        // Check if user already tracking this product
        const isSubscribed = await redis.isUserSubscribed(userId, url);

        if (isSubscribed) {
            await interaction.editReply({
                content: '⚠️ You are already tracking this product!',
            });
            return;
        }

        // Check current stock status
        const result = await stockChecker.checkStock(url);

        if (result.status === 'error') {
            await interaction.editReply({
                content: `❌ Failed to check product: ${result.error}`,
            });
            return;
        }

        // Add product to tracking
        await redis.addProduct(url, {
            name: result.name,
            status: result.status,
            imageUrl: result.imageUrl,
        });

        // Subscribe user to product
        await redis.subscribeUser(userId, url);

        // Get updated product data
        const product = await redis.getProduct(url);
        const embed = notifier.createProductEmbed(product, '✅ Now Tracking');

        await interaction.editReply({
            content: '🔔 You will be notified when the stock status changes!',
            embeds: [embed],
        });

    } catch (error) {
        console.error('Error in /start command:', error);
        await interaction.editReply({
            content: `❌ An error occurred: ${error.message}`,
        });
    }
}
