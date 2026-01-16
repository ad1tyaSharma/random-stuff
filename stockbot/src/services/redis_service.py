import redis.asyncio as redis
import json
import time
from src.config import get_settings

settings = get_settings()

class RedisService:
    def __init__(self):
        self.redis = redis.from_url(settings.REDIS_URL, decode_responses=True)

    async def close(self):
        await self.redis.close()

    def _url_to_key(self, url: str) -> str:
        import base64
        return base64.b64encode(url.encode()).decode().replace('/', '_').replace('+', '-')

    # ============ Product Operations ============

    async def add_product(self, url: str, product_data: dict):
        key = f"product:{self._url_to_key(url)}"
        
        data = {
            "url": url,
            "name": product_data.get("name", "Unknown Product"),
            "status": product_data.get("status", "unknown"),
            "imageUrl": product_data.get("imageUrl", ""),
            "lastChecked": str(int(time.time() * 1000)),
            "createdAt": str(int(time.time() * 1000)),
        }
        
        await self.redis.hset(key, mapping=data)
        await self.redis.sadd("products:all", url)
        return True

    async def remove_product(self, url: str):
        subscriber_count = await self.get_subscriber_count(url)
        
        if subscriber_count == 0:
            key = f"product:{self._url_to_key(url)}"
            await self.redis.delete(key)
            await self.redis.srem("products:all", url)
            return True
        return False

    async def get_product(self, url: str):
        key = f"product:{self._url_to_key(url)}"
        data = await self.redis.hgetall(key)
        if not data:
            return None
        return data

    async def get_all_products(self):
        urls = await self.redis.smembers("products:all")
        products = []
        for url in urls:
            product = await self.get_product(url)
            if product:
                subscribers = await self.get_subscribers(url)
                product["subscribers"] = list(subscribers)
                products.append(product)
        return products

    async def update_product_status(self, url: str, status: str, additional_data: dict = None):
        key = f"product:{self._url_to_key(url)}"
        if not await self.redis.exists(key):
            return False
            
        data = {
            "status": status,
            "lastChecked": str(int(time.time() * 1000))
        }
        if additional_data:
            data.update(additional_data)
            
        await self.redis.hset(key, mapping=data)
        return True

    # ============ User Subscription Operations ============

    async def subscribe_user(self, user_id: str, url: str):
        await self.redis.sadd(f"product:{self._url_to_key(url)}:subscribers", user_id)
        await self.redis.sadd(f"user:{user_id}:products", url)
        return True

    async def unsubscribe_user(self, user_id: str, url: str):
        await self.redis.srem(f"product:{self._url_to_key(url)}:subscribers", user_id)
        await self.redis.srem(f"user:{user_id}:products", url)
        await self.remove_product(url) # Cleanup if empty
        return True

    async def get_subscribers(self, url: str):
        return await self.redis.smembers(f"product:{self._url_to_key(url)}:subscribers")

    async def get_subscriber_count(self, url: str):
        return await self.redis.scard(f"product:{self._url_to_key(url)}:subscribers")

    async def get_user_products(self, user_id: str):
        urls = await self.redis.smembers(f"user:{user_id}:products")
        products = []
        for url in urls:
            product = await self.get_product(url)
            if product:
                products.append(product)
        return products

    async def is_user_subscribed(self, user_id: str, url: str):
        return await self.redis.sismember(f"product:{self._url_to_key(url)}:subscribers", user_id)

    async def get_stats(self):
        urls = await self.redis.smembers("products:all")
        total_subscribers = 0
        in_stock = 0
        out_of_stock = 0
        
        for url in urls:
            product = await self.get_product(url)
            if not product: continue
            
            subs = await self.get_subscriber_count(url)
            total_subscribers += subs
            
            if product.get('status') == 'in_stock':
                in_stock += 1
            elif product.get('status') == 'out_of_stock':
                out_of_stock += 1

        return {
            "totalProducts": len(urls),
            "totalSubscribers": total_subscribers,
            "inStock": in_stock,
            "outOfStock": out_of_stock
        }

db = RedisService()
