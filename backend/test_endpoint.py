import asyncio
import httpx

async def test():
    async with httpx.AsyncClient() as client:
        # Test the endpoint without auth - should give 401, getting 500 means route-level error
        print("=== Test 1: No auth ===")
        r = await client.get("http://localhost:8000/api/v1/integration/enrollment-package")
        print(f"Status: {r.status_code}")
        print(f"Headers: {dict(r.headers)}")
        print(f"Body: {r.text[:1000]}")
        
        # Check if /docs works
        print("\n=== Test 2: /docs ===")
        r2 = await client.get("http://localhost:8000/docs")
        print(f"Status: {r2.status_code}")
        
        # Check openapi.json for our route
        print("\n=== Test 3: Check routes in openapi.json ===")
        r3 = await client.get("http://localhost:8000/openapi.json")
        if r3.status_code == 200:
            data = r3.json()
            paths = data.get("paths", {})
            for path in sorted(paths.keys()):
                if "integration" in path and "enrollment" in path:
                    print(f"  FOUND: {path} -> {list(paths[path].keys())}")
        
        # Try the health endpoint
        print("\n=== Test 4: Health ===")
        r4 = await client.get("http://localhost:8000/api/v1/health")
        print(f"Status: {r4.status_code}")
        print(f"Body: {r4.text[:200]}")

asyncio.run(test())
