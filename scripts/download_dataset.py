"""
Script to download historical daily meteorological data from Open-Meteo Archive API
and save it as an authentic CSV dataset for exploratory data analysis and forecasting.
"""

import os
import time
import httpx
import pandas as pd

# List of cities with geographic coordinates
CITIES = [
    {"city": "Delhi", "country": "India", "latitude": 28.6139, "longitude": 77.2090},
    {"city": "Mumbai", "country": "India", "latitude": 19.0760, "longitude": 72.8777},
    {"city": "Bengaluru", "country": "India", "latitude": 12.9716, "longitude": 77.5946},
    {"city": "London", "country": "United Kingdom", "latitude": 51.5074, "longitude": -0.1278},
    {"city": "New York", "country": "United States", "latitude": 40.7128, "longitude": -74.0060},
]

START_DATE = "2022-01-01"
END_DATE = "2024-12-31"

DAILY_VARIABLES = [
    "temperature_2m_max",
    "temperature_2m_min",
    "temperature_2m_mean",
    "apparent_temperature_mean",
    "precipitation_sum",
    "wind_speed_10m_max",
    "relative_humidity_2m_mean",
    "surface_pressure_mean",
]


def determine_weather_condition(precip_mm: float, max_temp: float, wind_kmh: float) -> str:
    """Infer general weather condition label based on meteorological measurements."""
    if precip_mm > 5.0:
        return "Rainy"
    elif precip_mm > 0.5:
        return "Light Rain"
    elif wind_kmh > 35.0:
        return "Windy"
    elif max_temp > 35.0:
        return "Hot / Sunny"
    elif max_temp < 10.0:
        return "Cold"
    else:
        return "Pleasant / Clear"


def download_city_weather(client: httpx.Client, city_info: dict) -> pd.DataFrame:
    """Fetch daily archive data for a specific city."""
    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude": city_info["latitude"],
        "longitude": city_info["longitude"],
        "start_date": START_DATE,
        "end_date": END_DATE,
        "daily": ",".join(DAILY_VARIABLES),
        "timezone": "auto",
    }

    print(f"Downloading historical data for {city_info['city']} ({START_DATE} to {END_DATE})...")
    response = client.get(url, params=params, timeout=30.0)
    response.raise_for_status()
    data = response.json()["daily"]

    df = pd.DataFrame({
        "date": data["time"],
        "city": city_info["city"],
        "country": city_info["country"],
        "latitude": city_info["latitude"],
        "longitude": city_info["longitude"],
        "temp_mean": data["temperature_2m_mean"],
        "temp_max": data["temperature_2m_max"],
        "temp_min": data["temperature_2m_min"],
        "apparent_temp": data["apparent_temperature_mean"],
        "humidity_mean": data["relative_humidity_2m_mean"],
        "precipitation_mm": data["precipitation_sum"],
        "wind_speed_max": data["wind_speed_10m_max"],
        "pressure_mean": data["surface_pressure_mean"],
    })

    # Add derived weather condition label
    df["weather_condition"] = [
        determine_weather_condition(p, t, w)
        for p, t, w in zip(df["precipitation_mm"], df["temp_max"], df["wind_speed_max"])
    ]

    return df


def main():
    os.makedirs("data", exist_ok=True)
    all_data = []

    with httpx.Client() as client:
        for city in CITIES:
            try:
                city_df = download_city_weather(client, city)
                all_data.append(city_df)
                time.sleep(1.0)  # Gentle rate limiting
            except Exception as e:
                print(f"Error downloading {city['city']}: {e}")

    if not all_data:
        print("Failed to download any data.")
        return

    final_df = pd.concat(all_data, ignore_index=True)
    # Sort chronologically by city and date
    final_df.sort_values(by=["city", "date"], inplace=True)

    csv_path = os.path.join("data", "weather_dataset.csv")
    final_df.to_csv(csv_path, index=False)
    print(f"Successfully saved {len(final_df)} records to {csv_path}")
    print("\nDataset Sample:")
    print(final_df.head(5))


if __name__ == "__main__":
    main()
