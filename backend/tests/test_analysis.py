import pytest
from app.analysis import (
    load_dataset,
    get_available_cities,
    get_dataset_summary,
    get_correlation_matrix,
    get_monthly_trends,
    get_dataset_records,
)


def test_load_dataset():
    df = load_dataset()
    assert not df.empty
    assert "temp_mean" in df.columns
    assert "city" in df.columns
    assert len(df) >= 1000


def test_get_available_cities():
    cities = get_available_cities()
    city_names = [c["name"] for c in cities]
    assert "Delhi" in city_names
    assert "Mumbai" in city_names
    assert "London" in city_names


def test_get_dataset_summary():
    summary = get_dataset_summary("Delhi")
    assert summary["city"] == "Delhi"
    assert summary["total_records"] > 0
    assert "temp_mean" in summary["statistics"]
    assert summary["statistics"]["temp_mean"]["min"] <= summary["statistics"]["temp_mean"]["max"]


def test_get_correlation_matrix():
    corr = get_correlation_matrix("Delhi")
    assert "matrix" in corr
    assert len(corr["matrix"]) == 5
    # Diagonal correlation should be 1.0
    for row in corr["matrix"]:
        var = row["variable"]
        assert pytest.approx(row[var], 0.01) == 1.0


def test_get_monthly_trends():
    trends = get_monthly_trends("Delhi")
    assert len(trends) == 12
    assert trends[0]["month"] == "Jan"


def test_get_dataset_records():
    res = get_dataset_records("Delhi", limit=10, offset=0)
    assert len(res["records"]) == 10
    assert res["total"] > 10
