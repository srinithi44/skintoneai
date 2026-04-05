import os
from fastapi import APIRouter, Query
import httpx

router = APIRouter()

@router.get("/")
async def get_weather_tips(city: str = Query("Chennai")):
    api_key = os.getenv("OPENWEATHER_API_KEY")
    url = f"https://api.openweathermap.org/data/2.5/weather?q={city}&appid={api_key}&units=metric"
    
    # Beauty tip logic
    default_tip = "Great day for any look! Experiment freely."
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, timeout=5)
            if resp.status_code != 200:
                raise Exception("API Error")
            data = resp.json()
            
            temp = data["main"]["temp"]
            humidity = data["main"]["humidity"]
            desc = data["weather"][0]["description"].lower()
            
            tip = default_tip
            if temp > 30: tip = "Use matte, long-wear formulas. Avoid heavy foundations."
            elif humidity > 70: tip = "Opt for waterproof mascara and a good setting spray."
            elif temp < 15: tip = "Use hydrating primers and cream-based blushes."
            elif "rain" in desc: tip = "Waterproof everything. Keep the look minimal."
            
            return {
                "city": city,
                "temperature": temp,
                "humidity": humidity,
                "description": data["weather"][0]["description"],
                "beauty_tip": tip
            }
    except:
        # Fallback for demo mode
        return {
            "city": f"{city} (Demo)",
            "temperature": 28,
            "humidity": 65,
            "description": "Clear Sky",
            "beauty_tip": default_tip,
            "demo": True
        }
