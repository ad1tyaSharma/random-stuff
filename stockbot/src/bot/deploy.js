import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';

// Import commands
import * as startCommand from './commands/start.js';
import * as stopCommand from './commands/stop.js';
import * as listCommand from './commands/list.js';
import * as statusCommand from './commands/status.js';

dotenv.config();

const commands = [
    startCommand.data.toJSON(),
    stopCommand.data.toJSON(),
    listCommand.data.toJSON(),
    statusCommand.data.toJSON(),
];

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

async function deployCommands() {
    try {
        console.log(`🔄 Started refreshing ${commands.length} application (/) commands.`);

        let data;

        if (process.env.DISCORD_GUILD_ID) {
            // Deploy to specific guild (instant, good for testing)
            console.log(`📍 Deploying to guild: ${process.env.DISCORD_GUILD_ID}`);

            data = await rest.put(
                Routes.applicationGuildCommands(
                    process.env.DISCORD_CLIENT_ID,
                    process.env.DISCORD_GUILD_ID
                ),
                { body: commands },
            );
        } else {
            // Deploy globally (takes up to 1 hour to propagate)
            console.log('🌍 Deploying globally (may take up to 1 hour to propagate)');

            data = await rest.put(
                Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
                { body: commands },
            );
        }

        console.log(`✅ Successfully reloaded ${data.length} application (/) commands!`);

        console.log('\n📋 Registered commands:');
        commands.forEach(cmd => {
            console.log(`   /${cmd.name} - ${cmd.description}`);
        });

    } catch (error) {
        console.error('❌ Error deploying commands:', error);
    }
}

deployCommands();
