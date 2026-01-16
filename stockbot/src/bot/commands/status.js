import { SlashCommandBuilder } from 'discord.js';
import stockChecker from '../../services/stockChecker.js';
import notifier from '../../services/notifier.js';

export const data = new SlashCommandBuilder()
    .setName('status')
    .setDescription('Check the current stock status of a product (without tracking)')
    .addStringOption(option =>
        option
            .setName('url')
            .setDescription('The Amul product URL to check')
            .setRequired(true)
    );

export async function execute(interaction) {
    const url = interaction.options.getString('url');

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
        // Check stock status
        const result = await stockChecker.checkStock(url);

        if (result.status === 'error') {
            await interaction.editReply({
                content: `❌ Failed to check product: ${result.error}`,
            });
            return;
        }

        // Create embed
        const product = {
            url,
            name: result.name,
            status: result.status,
            imageUrl: result.imageUrl,
            lastChecked: Date.now(),
        };

        const embed = notifier.createProductEmbed(product, '📊 Stock Status');

        await interaction.editReply({
            content: 'ℹ️ Use `/start <url>` to track this product for notifications.',
            embeds: [embed],
        });

    } catch (error) {
        console.error('Error in /status command:', error);
        await interaction.editReply({
            content: `❌ An error occurred: ${error.message}`,
        });
    }
}
