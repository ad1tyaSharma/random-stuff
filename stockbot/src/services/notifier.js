import { EmbedBuilder } from 'discord.js';
import config from '../config/index.js';

class NotificationService {
    constructor() {
        this.client = null;
    }

    /**
     * Set the Discord client
     */
    setClient(client) {
        this.client = client;
    }

    /**
     * Send notification to a user about stock status change
     */
    async notifyUser(userId, product, oldStatus, newStatus) {
        if (!this.client) {
            console.error('❌ Discord client not set');
            return false;
        }

        try {
            const embed = this.createStockEmbed(product, oldStatus, newStatus);

            if (config.notifications.type === 'dm') {
                // Send DM to user
                const user = await this.client.users.fetch(userId);
                await user.send({ embeds: [embed] });
            } else if (config.notifications.type === 'channel' && config.notifications.channelId) {
                // Send to channel with user mention
                const channel = await this.client.channels.fetch(config.notifications.channelId);
                await channel.send({
                    content: `<@${userId}>`,
                    embeds: [embed]
                });
            }

            console.log(`📬 Notified user ${userId} about ${product.name}`);
            return true;
        } catch (error) {
            console.error(`❌ Failed to notify user ${userId}:`, error.message);
            return false;
        }
    }

    /**
     * Notify multiple users about a product status change
     */
    async notifyUsers(userIds, product, oldStatus, newStatus) {
        const results = [];

        for (const userId of userIds) {
            const success = await this.notifyUser(userId, product, oldStatus, newStatus);
            results.push({ userId, success });
        }

        return results;
    }

    /**
     * Create a rich embed for stock notification
     */
    createStockEmbed(product, oldStatus, newStatus) {
        const isBackInStock = newStatus === 'in_stock';

        const embed = new EmbedBuilder()
            .setTitle(isBackInStock ? '🟢 Back in Stock!' : '🔴 Out of Stock!')
            .setDescription(product.name)
            .setColor(isBackInStock ? 0x00ff00 : 0xff0000)
            .setURL(product.url)
            .addFields(
                {
                    name: 'Status',
                    value: isBackInStock ? '✅ Available' : '❌ Sold Out',
                    inline: true
                },
                {
                    name: 'Previous',
                    value: this.formatStatus(oldStatus),
                    inline: true
                },
            )
            .setTimestamp()
            .setFooter({ text: 'Amul Stock Tracker' });

        if (product.imageUrl) {
            embed.setThumbnail(product.imageUrl);
        }

        if (isBackInStock) {
            embed.addFields({
                name: '🛒 Quick Action',
                value: `[Buy Now](${product.url})`,
                inline: false,
            });
        }

        return embed;
    }

    /**
     * Format status for display
     */
    formatStatus(status) {
        switch (status) {
            case 'in_stock': return '✅ In Stock';
            case 'out_of_stock': return '❌ Out of Stock';
            case 'unknown': return '❓ Unknown';
            default: return status;
        }
    }

    /**
     * Create embed for command responses
     */
    createProductEmbed(product, title = 'Product Information') {
        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(product.name)
            .setColor(product.status === 'in_stock' ? 0x00ff00 : 0xff0000)
            .setURL(product.url)
            .addFields(
                {
                    name: 'Status',
                    value: this.formatStatus(product.status),
                    inline: true
                },
                {
                    name: 'Last Checked',
                    value: product.lastChecked
                        ? `<t:${Math.floor(product.lastChecked / 1000)}:R>`
                        : 'Never',
                    inline: true
                },
            )
            .setTimestamp()
            .setFooter({ text: 'Amul Stock Tracker' });

        if (product.imageUrl) {
            embed.setThumbnail(product.imageUrl);
        }

        return embed;
    }

    /**
     * Create a list embed showing multiple products
     */
    createProductListEmbed(products, title = 'Your Tracked Products') {
        const embed = new EmbedBuilder()
            .setTitle(title)
            .setColor(0x0099ff)
            .setTimestamp()
            .setFooter({ text: 'Amul Stock Tracker' });

        if (products.length === 0) {
            embed.setDescription('No products being tracked.\nUse `/start <url>` to add a product.');
        } else {
            const description = products.map((product, index) => {
                const statusIcon = product.status === 'in_stock' ? '🟢' : '🔴';
                const name = product.name?.substring(0, 40) || 'Unknown';
                return `${index + 1}. ${statusIcon} [${name}](${product.url})`;
            }).join('\n');

            embed.setDescription(description);
            embed.addFields({
                name: 'Summary',
                value: `Tracking **${products.length}** product(s)`,
                inline: false,
            });
        }

        return embed;
    }
}

// Singleton instance
export const notifier = new NotificationService();
export default notifier;
