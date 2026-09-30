from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

from app.analysis import (
    get_available_cities,
    get_dataset_summary,
    get_correlation_matrix,
    get_monthly_trends,
    get_dataset_records,
)
from app.model import train_city_models, predict_temperature
from app.live_weather import fetch_live_weather

app = FastAPI(
    title="Weather Data Analysis & Forecasting System",
    description="Python backend performing Pandas exploratory data analysis and Scikit-Learn temperature forecasting on historical weather records.",
    version="1.0.0",
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PredictionRequest(BaseModel):
    city: str = Field(default="Delhi", description="City for model context")
    temp_yesterday: float = Field(default=28.5, description="Observed temperature yesterday (°C)")
    temp_day_before: float = Field(default=27.8, description="Observed temperature 2 days ago (°C)")
    humidity: float = Field(default=55.0, description="Relative humidity (%)")
    pressure: float = Field(default=1010.0, description="Atmospheric pressure (hPa)")
    wind_speed: float = Field(default=12.0, description="Wind speed (km/h)")
    day_of_year: int = Field(default=180, ge=1, le=366, description="Day of year (1-366)")


@app.get("/")
def root():
    return {
        "status": "online",
        "service": "Weather Data Analysis & Forecasting API",
        "endpoints": [
            "/health",
            "/api/cities",
            "/api/analysis/summary",
            "/api/analysis/correlations",
            "/api/analysis/monthly-trends",
            "/api/model/evaluation",
            "/api/model/predict",
            "/api/dataset/records",
            "/api/weather/live",
        ]
    }


@app.get("/health")
def health():
    return {"status": "ok", "message": "Weather service operational"}


@app.get("/api/cities")
def list_cities():
    """List all cities available in the local meteorological dataset."""
    return get_available_cities()


@app.get("/api/analysis/summary")
def summary(city: Optional[str] = Query("Delhi", description="City name or 'all'")):
    """Get Pandas summary statistics (mean, median, variance, std, IQR)."""
    try:
        return get_dataset_summary(city)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/api/analysis/correlations")
def correlations(city: Optional[str] = Query("Delhi", description="City name or 'all'")):
    """Get Pearson correlation matrix across atmospheric variables."""
    return get_correlation_matrix(city)


@app.get("/api/analysis/monthly-trends")
def monthly_trends(city: str = Query("Delhi", description="City name")):
    """Get monthly seasonal aggregated trends (temperature, rainfall, humidity)."""
    return get_monthly_trends(city)


@app.get("/api/model/evaluation")
def model_evaluation(city: str = Query("Delhi", description="City name")):
    """Get machine learning model evaluation metrics (MAE, RMSE, R² score) and actual vs predicted values."""
    res = train_city_models(city)
    return {
        "city": res["city"],
        "metrics": res["metrics"],
        "training_samples": res["training_samples"],
        "testing_samples": res["testing_samples"],
        "features": res["features"],
        "recent_evaluation": res["recent_evaluation"],
    }


@app.post("/api/model/predict")
def run_prediction(req: PredictionRequest):
    """Predict tomorrow's temperature using trained Random Forest regression model."""
    return predict_temperature(
        city=req.city,
        temp_yesterday=req.temp_yesterday,
        temp_day_before=req.temp_day_before,
        humidity=req.humidity,
        pressure=req.pressure,
        wind_speed=req.wind_speed,
        day_of_year=req.day_of_year,
    )


@app.get("/api/dataset/records")
def dataset_records(
    city: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    sort_by: str = Query("date"),
    order: str = Query("desc"),
):
    """Browse historical meteorological observations from the CSV dataset."""
    return get_dataset_records(city, limit, offset, sort_by, order)


@app.get("/api/weather/live")
async def live_weather(city: str = Query("Delhi")):
    """Fetch live weather conditions and 7-day forecast from Open-Meteo REST API."""
    try:
        return await fetch_live_weather(city)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch live weather: {str(e)}")
