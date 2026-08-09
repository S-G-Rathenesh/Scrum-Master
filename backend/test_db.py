import asyncio
import sys
from app.database.mongodb import connect_to_mongo, close_mongo_connection, get_database

async def test_db():
    print("Testing DB connection...")
    try:
        await connect_to_mongo()
        db = get_database()
        
        print("Writing to DB...")
        insert_result = await db.test_collection.insert_one({"test": "data"})
        doc_id = insert_result.inserted_id
        print(f"Write successful! Document ID: {doc_id}")
        
        print("Reading from DB...")
        doc = await db.test_collection.find_one({"_id": doc_id})
        print(f"Read successful! Document: {doc}")
        
        print("Deleting from DB...")
        delete_result = await db.test_collection.delete_one({"_id": doc_id})
        print(f"Delete successful! Deleted count: {delete_result.deleted_count}")
        
        await close_mongo_connection()
        print("All database tests passed!")
        
    except Exception as e:
        print(f"Database test failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(test_db())
