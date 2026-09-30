import httpx
from typing import Dict, Any, Optional

WMO_CODES = {
    0: "Clear Sky",
    1: "Mainly Clear",
    2: "Partly Cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing Rime Fog",
    51: "Light Drizzle",
    53: "Moderate Drizzle",
    55: "Dense Drizzle",
    61: "Slight Rain",
    63: "Moderate Rain",
    65: "Heavy Rain",
    71: "Slight Snow",
    73: "Moderate Snow",
    75: "Heavy Snow",
    80: "Slight Rain Showers",
    81: "Moderate Rain Showers",
    82: "Violent Rain Showers",
    95: "Thunderstorm",
    96: "Thunderstorm with Hail",
}


async def fetch_live_weather(city: str) -> Dict[str, Any]:
    """Fetch real-time weather and 7-day forecast from Open-Meteo."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        # Step 1: Geocoding
        geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={city}&count=1"
        geo_res = await client.get(geo_url)
        geo_data = geo_res.json()

        if not geo_data.get("results"):
            # Default to Delhi if not found
            lat, lon, city_name, country = 28.6139, 77.2090, city, "Unknown"
        else:
            first = geo_data["results"][0]
            lat = first["latitude"]
            lon = first["longitude"]
            city_name = first["name"]
            country = first.get("country", "")

        # Step 2: Fetch current and daily forecast
        weather_url = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lon}"
            f"&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,surface_pressure,wind_speed_10m"
            f"&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max"
            f"&timezone=auto"
        )
        weather_res = await client.get(weather_url)
        wdata = weather_res.json()

        curr = wdata.get("current", {})
        daily = wdata.get("daily", {})

        current_code = curr.get("weather_code", 0)
        current_condition = WMO_CODES.get(current_code, "Partly Cloudy")

        daily_items = []
        dates = daily.get("time", [])
        max_temps = daily.get("temperature_2m_max", [])
        min_temps = daily.get("temperature_2m_min", [])
        precips = daily.get("precipitation_sum", [])
        rain_probs = daily.get("precipitation_probability_max", [])
        codes = daily.get("weather_code", [])

        for i in range(min(len(dates), 7)):
            daily_items.append({
                "date": dates[i],
                "temp_max": max_temps[i] if i < len(max_temps) else 0.0,
                "temp_min": min_temps[i] if i < len(min_temps) else 0.0,
                "precipitation": precips[i] if i < len(precips) else 0.0,
                "rain_prob": rain_probs[i] if i < len(rain_probs) else 0,
                "condition": WMO_CODES.get(codes[i], "Clear") if i < len(codes) else "Clear",
            })

        return {
            "city": city_name,
            "country": country,
            "latitude": lat,
            "longitude": lon,
            "current": {
                "temperature": curr.get("temperature_2m", 25.0),
                "feels_like": curr.get("apparent_temperature", 25.0),
                "humidity": curr.get("relative_humidity_2m", 50),
                "pressure": curr.get("surface_pressure", 1013.0),
                "wind_speed": curr.get("wind_speed_10m", 10.0),
                "precipitation": curr.get("precipitation", 0.0),
                "condition": current_condition,
                "weather_code": current_code,
            },
            "forecast_7day": daily_items,
        }
