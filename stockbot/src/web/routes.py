from fastapi import APIRouter, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os
import time

from src.services.redis_service import db
from src.services.stock_checker import checker
from src.services.scheduler import scheduler

router = APIRouter()

# Pydantic Models
class ProductRequest(BaseModel):
    url: str
    userId: str | None = None

# API Routes
@router.get("/api/health")
async def health():
    return {
        "success": True, 
        "status": "ok", 
        "uptime": time.process_time()
    }

@router.get("/api/products")
async def get_products():
    products = await db.get_all_products()
    return {"success": True, "count": len(products), "products": products}

@router.post("/api/products")
async def add_product(req: ProductRequest):
    if not checker.is_valid_amul_url(req.url):
        raise HTTPException(status_code=400, detail="Invalid URL")
        
    result = await checker.check_stock(req.url)
    if result['status'] == 'error':
        raise HTTPException(status_code=400, detail=result.get('error'))
        
    await db.add_product(req.url, result)
    
    if req.userId:
        await db.subscribe_user(req.userId, req.url)
        
    product = await db.get_product(req.url)
    return {"success": True, "product": product}

@router.delete("/api/products")
async def remove_product(req: ProductRequest):
    if req.userId:
        await db.unsubscribe_user(req.userId, req.url)
    else:
        # Admin force remove
        await db.remove_product(req.url)
        
    return {"success": True, "message": "Product removed"}

@router.get("/api/status")
async def check_status(url: str):
    if not checker.is_valid_amul_url(url):
         raise HTTPException(status_code=400, detail="Invalid URL")
    
    result = await checker.check_stock(url)
    return {"success": True, "url": url, **result}

@router.get("/api/stats")
async def get_stats():
    stats = await db.get_stats()
    return {"success": True, **stats}

@router.post("/api/check")
async def force_check():
    await scheduler.force_check()
    return {"success": True, "message": "Check initiated"}
