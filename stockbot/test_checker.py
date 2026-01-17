import asyncio
import logging
from src.services.stock_checker import checker
from src.config import get_settings

logging.basicConfig(level=logging.INFO)

async def test_stock():
    # In Stock
    in_stock_url = "https://shop.amul.com/en/product/amul-chocolate-whey-protein-34-g-or-pack-of-30-sachets"
    # Out of Stock
    out_of_stock_url = "https://shop.amul.com/en/product/amul-whey-protein-gift-pack-32-g-or-pack-of-10-sachets"
    
    print("🔎 Testing In-Stock Product...")
    res1 = await checker.check_stock(in_stock_url)
    print(f"Result: {res1['status']} (Expected: in_stock)")
    
    print("\n🔎 Testing Out-of-Stock Product...")
    res2 = await checker.check_stock(out_of_stock_url)
    print(f"Result: {res2['status']} (Expected: out_of_stock)")
    
    await checker.stop()

if __name__ == "__main__":
    asyncio.run(test_stock())
