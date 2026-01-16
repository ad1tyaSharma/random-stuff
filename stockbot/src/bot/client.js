import { Client, GatewayIntentBits, Collection, Events } from 'discord.js';
import config from '../config/index.js';
import notifier from '../services/notifier.js';

// Import commands
import * as startCommand from './commands/start.js';
import * as stopCommand from './commands/stop.js';
import * as listCommand from './commands/list.js';
import * as statusCommand from './commands/status.js';

class DiscordBot {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.DirectMessages,
            ],
        });

        this.commands = new Collection();
        this.setupCommands();
        this.setupEventHandlers();
    }

    /**
     * Register all commands
     */
    setupCommands() {
        const commands = [startCommand, stopCommand, listCommand, statusCommand];

        for (const command of commands) {
            this.commands.set(command.data.name, command);
        }
    }

    /**
     * Setup event handlers
     */
    setupEventHandlers() {
        // Ready event
        this.client.once(Events.ClientReady, (c) => {
            console.log(`✅ Discord bot logged in as ${c.user.tag}`);
            console.log(`📡 Serving ${c.guilds.cache.size} guild(s)`);

            // Set activity
            c.user.setActivity('stock prices 📊', { type: 3 }); // Watching
        });

        // Interaction handler
        this.client.on(Events.InteractionCreate, async (interaction) => {
            if (!interaction.isChatInputCommand()) return;

            const command = this.commands.get(interaction.commandName);

            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(`Error executing ${interaction.commandName}:`, error);

                const errorMessage = '❌ There was an error executing this command!';

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: errorMessage, ephemeral: true });
                } else {
                    await interaction.reply({ content: errorMessage, ephemeral: true });
                }
            }
        });

        // Error handler
        this.client.on(Events.Error, (error) => {
            console.error('❌ Discord client error:', error);
        });
    }

    /**
     * Start the bot
     */
    async start() {
        try {
            await this.client.login(config.discord.token);

            // Set notifier client
            notifier.setClient(this.client);

            return this.client;
        } catch (error) {
            console.error('❌ Failed to start Discord bot:', error.message);
            throw error;
        }
    }

    /**
     * Stop the bot
     */
    async stop() {
        if (this.client) {
            await this.client.destroy();
            console.log('📴 Discord bot disconnected');
        }
    }

    /**
     * Get command data for deployment
     */
    getCommandData() {
        return [
            startCommand.data.toJSON(),
            stopCommand.data.toJSON(),
            listCommand.data.toJSON(),
            statusCommand.data.toJSON(),
        ];
    }
}

// Singleton instance
export const bot = new DiscordBot();
export default bot;
