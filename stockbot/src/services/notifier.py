import discord
import logging
from src.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

class NotifierService:
    def __init__(self):
        self.bot = None

    def set_bot(self, bot: discord.Client):
        self.bot = bot

    def _create_embed(self, product: dict, old_status: str, new_status: str):
        is_back_in_stock = new_status == 'in_stock'
        color = discord.Color.green() if is_back_in_stock else discord.Color.red()
        title = "🟢 Back in Stock!" if is_back_in_stock else "🔴 Out of Stock!"
        
        embed = discord.Embed(
            title=title,
            description=product.get('name', 'Unknown Product'),
            color=color,
            url=product.get('url', '')
        )
        
        embed.add_field(name="Status", value="✅ Available" if is_back_in_stock else "❌ Sold Out", inline=True)
        embed.add_field(name="Previous", value=self._format_status(old_status), inline=True)
        
        if product.get('imageUrl'):
            embed.set_thumbnail(url=product['imageUrl'])
            
        if is_back_in_stock:
            embed.add_field(name="🛒 Quick Action", value=f"[Buy Now]({product['url']})", inline=False)
            
        embed.set_footer(text="Amul Stock Tracker")
        embed.timestamp = discord.utils.utcnow()
        return embed

    def _format_status(self, status: str):
        if status == 'in_stock': return '✅ In Stock'
        if status == 'out_of_stock': return '❌ Out of Stock'
        if status == 'unknown': return '❓ Unknown'
        return status

    async def notify_users(self, user_ids: list[str], product: dict, old_status: str, new_status: str):
        if not self.bot:
            logger.error("Notifier: Bot instance not set")
            return

        embed = self._create_embed(product, old_status, new_status)
        
        for user_id in user_ids:
            try:
                if settings.NOTIFICATION_TYPE == 'channel' and settings.NOTIFICATION_CHANNEL_ID:
                    channel = self.bot.get_channel(int(settings.NOTIFICATION_CHANNEL_ID))
                    if channel:
                        await channel.send(content=f"<@{user_id}>", embed=embed)
                else:
                    user = await self.bot.fetch_user(int(user_id))
                    if user:
                        await user.send(embed=embed)
                logger.info(f"Notified user {user_id} about {product.get('name')}")
            except Exception as e:
                logger.error(f"Failed to notify user {user_id}: {e}")

notifier = NotifierService()
