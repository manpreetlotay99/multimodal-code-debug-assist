#!/usr/bin/env python3
import asyncio
import aiohttp

async def test_gemini_api():
    api_key = "AIzaSyCFde44U9vRs0vWCXKTkiHnM_sA1lGMsfM"
    base_url = "https://generativelanguage.googleapis.com/v1beta"
    
    url = f"{base_url}/models/gemini-1.5-flash:generateContent?key={api_key}"
    
    payload = {
        "contents": [{
            "parts": [{"text": "Hello, can you analyze this simple JavaScript code: var x = 5; if (x == 5) console.log(x); What issues do you see?"}]
        }],
        "generationConfig": {
            "temperature": 0.3,
            "topK": 40,
            "topP": 0.95,
            "maxOutputTokens": 2048
        }
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            print(f"🤖 Testing Gemini API with URL: {url[:80]}...")
            async with session.post(url, json=payload) as response:
                print(f"📡 Status: {response.status}")
                
                if response.status == 200:
                    data = await response.json()
                    text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                    print(f"✅ Success! Response length: {len(text)} chars")
                    print(f"📝 Response preview: {text[:300]}...")
                    return True
                else:
                    error_text = await response.text()
                    print(f"❌ Error {response.status}: {error_text}")
                    return False
                    
    except Exception as e:
        print(f"💥 Exception: {str(e)}")
        return False

if __name__ == "__main__":
    success = asyncio.run(test_gemini_api())
    if success:
        print("🎉 Gemini API is working!")
    else:
        print("💔 Gemini API is not working - this is why you're getting 'AI Analysis Unavailable'")