import numpy as np
import pandas as pd
from typing import Dict, Any, List
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, root_mean_squared_error, r2_score
from app.analysis import load_dataset

# Cache models per city
_models_cache: Dict[str, Any] = {}


def prepare_features(df: pd.DataFrame) -> pd.DataFrame:
    """Engineer time-series lag and seasonal features for weather forecasting."""
    data = df.sort_values("date").copy()
    
    # Lag features
    data["temp_lag1"] = data["temp_mean"].shift(1)
    data["temp_lag2"] = data["temp_mean"].shift(2)
    data["temp_roll7"] = data["temp_mean"].rolling(window=7).mean()
    data["humidity_lag1"] = data["humidity_mean"].shift(1)
    data["pressure_lag1"] = data["pressure_mean"].shift(1)
    data["wind_lag1"] = data["wind_speed_max"].shift(1)

    # Cyclical seasonal features based on day of year
    day_of_year = data["date"].dt.dayofyear
    data["sin_season"] = np.sin(2 * np.pi * day_of_year / 365.25)
    data["cos_season"] = np.cos(2 * np.pi * day_of_year / 365.25)

    data.dropna(inplace=True)
    return data


def train_city_models(city: str = "Delhi") -> Dict[str, Any]:
    """Train Random Forest and Linear Regression models for a specific city."""
    global _models_cache
    if city in _models_cache:
        return _models_cache[city]

    df = load_dataset()
    city_df = df[df["city"].str.lower() == city.lower()]
    if city_df.empty:
        city_df = df[df["city"] == "Delhi"]

    data = prepare_features(city_df)
    
    feature_cols = [
        "temp_lag1",
        "temp_lag2",
        "temp_roll7",
        "humidity_lag1",
        "pressure_lag1",
        "wind_lag1",
        "sin_season",
        "cos_season",
    ]
    
    X = data[feature_cols]
    y = data["temp_mean"]

    # 80/20 Chronological train/test split
    split_idx = int(len(X) * 0.8)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]
    dates_test = data["date"].iloc[split_idx:]

    # Model 1: Random Forest
    rf = RandomForestRegressor(n_estimators=100, max_depth=12, random_state=42)
    rf.fit(X_train, y_train)
    rf_preds = rf.predict(X_test)

    # Model 2: Linear Regression baseline
    lr = LinearRegression()
    lr.fit(X_train, y_train)
    lr_preds = lr.predict(X_test)

    rf_mae = round(float(mean_absolute_error(y_test, rf_preds)), 2)
    rf_rmse = round(float(root_mean_squared_error(y_test, rf_preds)), 2)
    rf_r2 = round(float(r2_score(y_test, rf_preds)), 3)

    lr_mae = round(float(mean_absolute_error(y_test, lr_preds)), 2)
    lr_rmse = round(float(root_mean_squared_error(y_test, lr_preds)), 2)
    lr_r2 = round(float(r2_score(y_test, lr_preds)), 3)

    # Prepare actual vs predicted for the last 30 test days for UI visualization
    comparison_data = []
    last_n = 30
    for d, act, pred in zip(dates_test.iloc[-last_n:], y_test.iloc[-last_n:], rf_preds[-last_n:]):
        comparison_data.append({
            "date": d.strftime("%Y-%m-%d"),
            "actual_temp": round(float(act), 1),
            "predicted_temp": round(float(pred), 1),
            "residual_error": round(float(abs(act - pred)), 2),
        })

    model_entry = {
        "city": city,
        "features": feature_cols,
        "rf_model": rf,
        "lr_model": lr,
        "metrics": {
            "random_forest": {
                "mae": rf_mae,
                "rmse": rf_rmse,
                "r2_score": rf_r2,
                "accuracy_description": f"Random Forest achieved R² of {rf_r2} with an average error of ±{rf_mae}°C.",
            },
            "linear_regression": {
                "mae": lr_mae,
                "rmse": lr_rmse,
                "r2_score": lr_r2,
                "accuracy_description": f"Baseline Linear Regression achieved R² of {lr_r2} with MAE ±{lr_mae}°C.",
            },
        },
        "recent_evaluation": comparison_data,
        "training_samples": len(X_train),
        "testing_samples": len(X_test),
    }

    _models_cache[city] = model_entry
    return model_entry


def predict_temperature(
    city: str,
    temp_yesterday: float,
    temp_day_before: float,
    humidity: float,
    pressure: float,
    wind_speed: float,
    day_of_year: int = 180,
) -> Dict[str, Any]:
    """Generate temperature forecast using the trained Random Forest model."""
    model_data = train_city_models(city)
    rf = model_data["rf_model"]

    # Compute rolling estimate and cyclical season
    rolling_7 = (temp_yesterday * 4 + temp_day_before * 3) / 7.0
    sin_season = np.sin(2 * np.pi * day_of_year / 365.25)
    cos_season = np.cos(2 * np.pi * day_of_year / 365.25)

    input_df = pd.DataFrame([{
        "temp_lag1": temp_yesterday,
        "temp_lag2": temp_day_before,
        "temp_roll7": rolling_7,
        "humidity_lag1": humidity,
        "pressure_lag1": pressure,
        "wind_lag1": wind_speed,
        "sin_season": sin_season,
        "cos_season": cos_season,
    }])

    predicted_temp = float(rf.predict(input_df)[0])
    
    # Uncertainty interval based on model MAE
    mae = model_data["metrics"]["random_forest"]["mae"]
    lower_bound = round(predicted_temp - mae, 1)
    upper_bound = round(predicted_temp + mae, 1)

    return {
        "city": city,
        "predicted_temp": round(predicted_temp, 1),
        "confidence_interval": {
            "lower": lower_bound,
            "upper": upper_bound,
            "mae_margin": mae,
        },
        "inputs_received": {
            "temp_yesterday": temp_yesterday,
            "temp_day_before": temp_day_before,
            "humidity": humidity,
            "pressure": pressure,
            "wind_speed": wind_speed,
            "day_of_year": day_of_year,
        }
    }
