import pytest
from app.model import train_city_models, predict_temperature


def test_train_city_models():
    model_data = train_city_models("Delhi")
    assert "metrics" in model_data
    rf_metrics = model_data["metrics"]["random_forest"]
    assert rf_metrics["mae"] < 2.5
    assert rf_metrics["r2_score"] > 0.85
    assert len(model_data["recent_evaluation"]) == 30


def test_predict_temperature():
    prediction = predict_temperature(
        city="Delhi",
        temp_yesterday=30.0,
        temp_day_before=29.5,
        humidity=50.0,
        pressure=1008.0,
        wind_speed=10.0,
        day_of_year=150,
    )
    assert "predicted_temp" in prediction
    # Temperature should be physically plausible for summer in Delhi
    assert 20.0 <= prediction["predicted_temp"] <= 45.0
    assert "confidence_interval" in prediction
