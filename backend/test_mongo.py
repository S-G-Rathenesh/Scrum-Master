import asyncio
import os
import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv(".env")
uri = os.getenv("MONGODB_URI")

async def test():
    print("Testing without tlsCAFile...")
    try:
        client = AsyncIOMotorClient(uri, serverSelectionTimeoutMS=5000)
        await client.admin.command('ping')
        print("SUCCESS without tlsCAFile")
    except Exception as e:
        print("FAIL without tlsCAFile:", e)

    print("Testing with tlsCAFile...")
    try:
        client = AsyncIOMotorClient(uri, tlsCAFile=certifi.where(), serverSelectionTimeoutMS=5000)
        await client.admin.command('ping')
        print("SUCCESS with tlsCAFile")
    except Exception as e:
        print("FAIL with tlsCAFile:", e)

asyncio.run(test())
