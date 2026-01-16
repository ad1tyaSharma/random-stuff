import discord
from discord.ext import commands
from discord import app_commands
from src.services.redis_service import db
from src.services.stock_checker import checker

class StockCommands(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @app_commands.command(name="start", description="Start tracking a product URL")
    @app_commands.describe(url="The Amul product URL to track")
    async def start(self, interaction: discord.Interaction, url: str):
        await interaction.response.defer(ephemeral=False)
        
        # Validation
        if not checker.is_valid_amul_url(url):
            await interaction.followup.send("❌ Invalid URL. Please provide a valid URL from shop.amul.com/product/...", ephemeral=True)
            return

        # Check Stock
        status_msg = await interaction.followup.send(f"🔎 Checking stock for the first time...")
        
        result = await checker.check_stock(url)
        
        if result['status'] == 'error':
             await interaction.followup.send(f"❌ Error accessing URL: {result.get('error')}", ephemeral=True)
             return

        # Add to Redis
        await db.add_product(url, result)
        await db.subscribe_user(str(interaction.user.id), url)

        # Reply
        embed = discord.Embed(title="✅ Now Tracking", color=discord.Color.blue())
        embed.description = f"**{result['name']}**\nAdded to your tracking list."
        embed.add_field(name="Current Status", value=result['status'].replace('_', ' ').title(), inline=True)
        if result.get('imageUrl'):
            embed.set_thumbnail(url=result['imageUrl'])
            
        await interaction.followup.send(embed=embed)

    @app_commands.command(name="stop", description="Stop tracking a product")
    @app_commands.describe(url="The product URL to remove")
    async def stop(self, interaction: discord.Interaction, url: str):
        await interaction.response.defer(ephemeral=False)
        
        is_subbed = await db.is_user_subscribed(str(interaction.user.id), url)
        if not is_subbed:
             await interaction.followup.send("❌ You are not tracking this product.", ephemeral=True)
             return
             
        await db.unsubscribe_user(str(interaction.user.id), url)
        await interaction.followup.send("🗑️ Removed product from your tracking list.")

    @app_commands.command(name="list", description="Show all products you are tracking")
    async def list_products(self, interaction: discord.Interaction):
        await interaction.response.defer()
        
        products = await db.get_user_products(str(interaction.user.id))
        
        if not products:
             await interaction.followup.send("📭 You are not tracking any products.")
             return
             
        embed = discord.Embed(title="📋 Your Tracking List", color=discord.Color.blue())
        
        for p in products:
            status_emoji = "✅" if p['status'] == 'in_stock' else "❌" if p['status'] == 'out_of_stock' else "❓"
            embed.add_field(
                name=f"{status_emoji} {p.get('name', 'Unknown')}",
                value=f"[Link]({p['url']})\nStatus: {p['status']}",
                inline=False
            )
            
        await interaction.followup.send(embed=embed)

    @app_commands.command(name="status", description="Check stock status without tracking")
    @app_commands.describe(url="The Amul product URL to check")
    async def status(self, interaction: discord.Interaction, url: str):
        await interaction.response.defer()
        
        if not checker.is_valid_amul_url(url):
            await interaction.followup.send("❌ Invalid URL.")
            return
            
        result = await checker.check_stock(url)
        
        if result['status'] == 'error':
             await interaction.followup.send(f"❌ Error: {result.get('error')}")
             return
             
        is_in_stock = result['status'] == 'in_stock'
        embed = discord.Embed(
            title="🟢 In Stock" if is_in_stock else "🔴 Out of Stock",
            color=discord.Color.green() if is_in_stock else discord.Color.red()
        )
        embed.description = f"**{result['name']}**"
        embed.set_thumbnail(url=result['imageUrl'])
        
        await interaction.followup.send(embed=embed)

async def setup(bot):
    await bot.add_cog(StockCommands(bot))
