import os
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional

# Path to the dataset CSV file
DATA_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "weather_dataset.csv")

_df_cache: Optional[pd.DataFrame] = None


def load_dataset() -> pd.DataFrame:
    """Load and cache the weather dataset from CSV."""
    global _df_cache
    if _df_cache is None:
        if not os.path.exists(DATA_PATH):
            raise FileNotFoundError(f"Weather dataset not found at {DATA_PATH}. Run download_dataset.py first.")
        df = pd.read_csv(DATA_PATH)
        df["date"] = pd.to_datetime(df["date"])
        # Clean null values if any
        numeric_cols = ["temp_mean", "temp_max", "temp_min", "apparent_temp", "humidity_mean", "precipitation_mm", "wind_speed_max", "pressure_mean"]
        for col in numeric_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce").fillna(df[col].mean())
        _df_cache = df
    return _df_cache.copy()


def get_available_cities() -> List[Dict[str, Any]]:
    """Return distinct cities present in the dataset with coordinates."""
    df = load_dataset()
    cities = []
    for city, group in df.groupby("city"):
        first_row = group.iloc[0]
        cities.append({
            "name": str(city),
            "country": str(first_row["country"]),
            "latitude": float(first_row["latitude"]),
            "longitude": float(first_row["longitude"]),
            "records_count": int(len(group)),
            "start_date": group["date"].min().strftime("%Y-%m-%d"),
            "end_date": group["date"].max().strftime("%Y-%m-%d"),
        })
    return cities


def get_dataset_summary(city: Optional[str] = None) -> Dict[str, Any]:
    """Compute comprehensive descriptive statistics using Pandas."""
    df = load_dataset()
    if city and city.lower() != "all":
        df = df[df["city"].str.lower() == city.lower()]
        if df.empty:
            raise ValueError(f"No records found for city: {city}")

    stats = {}
    metrics = ["temp_mean", "temp_max", "temp_min", "humidity_mean", "pressure_mean", "wind_speed_max", "precipitation_mm"]
    
    for metric in metrics:
        s = df[metric]
        q25 = float(s.quantile(0.25))
        q75 = float(s.quantile(0.75))
        stats[metric] = {
            "mean": round(float(s.mean()), 2),
            "median": round(float(s.median()), 2),
            "std_dev": round(float(s.std()), 2),
            "variance": round(float(s.var()), 2),
            "min": round(float(s.min()), 2),
            "max": round(float(s.max()), 2),
            "q25": round(q25, 2),
            "q75": round(q75, 2),
            "iqr": round(q75 - q25, 2),
        }

    return {
        "city": city if city else "All Cities",
        "total_records": int(len(df)),
        "date_range": {
            "start": df["date"].min().strftime("%Y-%m-%d"),
            "end": df["date"].max().strftime("%Y-%m-%d"),
        },
        "statistics": stats,
    }


def get_correlation_matrix(city: Optional[str] = None) -> Dict[str, Any]:
    """Compute Pearson correlation matrix between atmospheric variables."""
    df = load_dataset()
    if city and city.lower() != "all":
        df = df[df["city"].str.lower() == city.lower()]

    columns = [
        "temp_mean",
        "humidity_mean",
        "pressure_mean",
        "wind_speed_max",
        "precipitation_mm",
    ]
    
    corr_df = df[columns].corr(method="pearson").round(3)
    
    # Format as list of records for frontend rendering
    records = []
    variables = ["Temperature", "Humidity", "Pressure", "Wind Speed", "Precipitation"]
    col_mapping = dict(zip(columns, variables))
    
    for col1 in columns:
        row = {"variable": col_mapping[col1]}
        for col2 in columns:
            row[col_mapping[col2]] = float(corr_df.loc[col1, col2])
        records.append(row)

    return {
        "variables": variables,
        "matrix": records,
        "key_insights": [
            f"Temperature and Humidity correlation is {corr_df.loc['temp_mean', 'humidity_mean']:.2f} (inverse relation).",
            f"Precipitation and Humidity correlation is {corr_df.loc['precipitation_mm', 'humidity_mean']:.2f}.",
            f"Temperature and Pressure correlation is {corr_df.loc['temp_mean', 'pressure_mean']:.2f}.",
        ]
    }


def get_monthly_trends(city: str = "Delhi") -> List[Dict[str, Any]]:
    """Aggregate daily weather data by month for seasonal trend charts."""
    df = load_dataset()
    city_df = df[df["city"].str.lower() == city.lower()].copy()
    if city_df.empty:
        city_df = df.copy()

    city_df["month"] = city_df["date"].dt.month
    city_df["month_name"] = city_df["date"].dt.strftime("%b")

    monthly = city_df.groupby(["month", "month_name"]).agg({
        "temp_mean": "mean",
        "temp_max": "max",
        "temp_min": "min",
        "humidity_mean": "mean",
        "precipitation_mm": "sum",
        "wind_speed_max": "mean",
    }).reset_index().sort_values("month")

    results = []
    for _, row in monthly.iterrows():
        results.append({
            "month_num": int(row["month"]),
            "month": str(row["month_name"]),
            "avg_temp": round(float(row["temp_mean"]), 1),
            "max_temp": round(float(row["temp_max"]), 1),
            "min_temp": round(float(row["temp_min"]), 1),
            "avg_humidity": round(float(row["humidity_mean"]), 1),
            "total_rainfall": round(float(row["precipitation_mm"]), 1),
            "avg_wind": round(float(row["wind_speed_max"]), 1),
        })

    return results


def get_dataset_records(
    city: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    sort_by: str = "date",
    order: str = "desc"
) -> Dict[str, Any]:
    """Return paginated rows of historical weather data."""
    df = load_dataset()
    if city and city.lower() != "all":
        df = df[df["city"].str.lower() == city.lower()]

    ascending = (order.lower() == "asc")
    if sort_by in df.columns:
        df = df.sort_values(by=sort_by, ascending=ascending)

    total = len(df)
    sliced = df.iloc[offset : offset + limit]

    records = []
    for _, row in sliced.iterrows():
        records.append({
            "date": row["date"].strftime("%Y-%m-%d"),
            "city": str(row["city"]),
            "country": str(row["country"]),
            "temp_mean": round(float(row["temp_mean"]), 1),
            "temp_max": round(float(row["temp_max"]), 1),
            "temp_min": round(float(row["temp_min"]), 1),
            "humidity_mean": round(float(row["humidity_mean"]), 1),
            "precipitation_mm": round(float(row["precipitation_mm"]), 1),
            "wind_speed_max": round(float(row["wind_speed_max"]), 1),
            "pressure_mean": round(float(row["pressure_mean"]), 1),
            "weather_condition": str(row["weather_condition"]),
        })

    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "records": records,
    }
