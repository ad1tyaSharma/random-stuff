import discord
from discord.ext import commands
from discord import app_commands
import logging
from src.config import get_settings
from src.services.notifier import notifier

settings = get_settings()
logger = logging.getLogger(__name__)

class GenericBot(commands.Bot):
    def __init__(self):
        intents = discord.Intents.default()
        intents.message_content = False # Not required for slash commands
        intents.dm_messages = True
        
        super().__init__(
            command_prefix='!', 
            intents=intents,
            help_command=None
        )

    async def setup_hook(self):
        # Load commands (Cogs)
        await self.load_extension("src.bot.commands_cog")
        
        # Sync Slash Commands
        if settings.DISCORD_GUILD_ID:
            guild = discord.Object(id=settings.DISCORD_GUILD_ID)
            self.tree.copy_global_to(guild=guild)
            await self.tree.sync(guild=guild)
            logger.info(f"📍 Commands synced to guild {settings.DISCORD_GUILD_ID}")
        else:
            await self.tree.sync()
            logger.info("🌍 Commands synced globally")

    async def on_ready(self):
        logger.info(f"✅ Discord bot logged in as {self.user}")
        notifier.set_bot(self)

bot_instance = GenericBot()
