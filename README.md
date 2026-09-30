# Python-Based Weather Data Analysis & Forecasting Application

A data science and machine learning application for meteorological analysis and temperature forecasting. The system analyzes historical daily atmospheric observations using **Pandas** and **NumPy**, trains supervised regression models with **Scikit-Learn**, and presents insights through an interactive dashboard built with **FastAPI** and **Next.js**.

---

## Features

- **Historical Meteorological Dataset**: Multi-year daily observation dataset (2022–2024, 5,480 records) across 5 major cities (Delhi, Mumbai, Bengaluru, London, New York).
- **Automated Dataset Ingestion**: Includes `scripts/download_dataset.py` to fetch archive data from Open-Meteo REST endpoints.
- **Exploratory Data Analysis (EDA)**:
  - Descriptive statistics (Mean, Median, Standard Deviation, Variance, Min, Max, 25th/75th Percentiles, and Interquartile Range).
  - Pearson Correlation Matrix across temperature, relative humidity, atmospheric pressure, wind speed, and precipitation.
  - Monthly seasonal aggregations and rainfall profiles.
- **Machine Learning Temperature Forecasting**:
  - Supervised Random Forest Regressor and baseline Linear Regression models.
  - Feature engineering: 1-day & 2-day temperature lags, 7-day rolling average, lag humidity, lag pressure, lag wind speed, and cyclical day-of-year seasonal features ($\sin$/$\cos$).
  - Error quantification: Mean Absolute Error (MAE $\approx \pm 0.77^\circ\text{C}$), Root Mean Squared Error (RMSE), and Coefficient of Determination ($R^2 > 0.95$).
  - Interactive prediction simulator for testing custom weather scenarios.
- **Live Weather Integration**: Real-time conditions and 7-day forecasts queried on demand.
- **Dataset Explorer & Export**: Paginated browser for the historical CSV dataset with instant CSV download capability.

---

## Dataset Description

The dataset is stored in `data/weather_dataset.csv` and contains daily meteorological observations from January 1, 2022 to December 31, 2024:

| Column | Description | Unit |
| :--- | :--- | :--- |
| `date` | Observation date (YYYY-MM-DD) | Date |
| `city` | City name | Text |
| `country` | Country | Text |
| `latitude` | Geographic latitude coordinate | Decimal degrees |
| `longitude` | Geographic longitude coordinate | Decimal degrees |
| `temp_mean` | Daily mean 2-meter air temperature | °C |
| `temp_max` | Daily maximum recorded temperature | °C |
| `temp_min` | Daily minimum recorded temperature | °C |
| `apparent_temp`| Perceived feels-like temperature | °C |
| `humidity_mean`| Daily average relative humidity | % |
| `precipitation_mm` | Total daily precipitation | mm |
| `wind_speed_max` | Maximum wind speed at 10 meters | km/h |
| `pressure_mean` | Mean sea-level / surface atmospheric pressure | hPa |
| `weather_condition` | Weather classification label | Categorical |

To download or update the dataset, run:
```bash
python scripts/download_dataset.py
```

---

## Project Structure

```text
├── data/
│   └── weather_dataset.csv        # Historical weather dataset
├── scripts/
│   └── download_dataset.py        # Dataset acquisition script
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                # FastAPI REST API endpoints
│   │   ├── analysis.py            # Pandas statistics & correlation engine
│   │   ├── model.py               # Scikit-learn Random Forest model
│   │   └── live_weather.py        # Real-time Open-Meteo client
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── test_analysis.py       # Unit tests for data analysis
│   │   └── test_model.py          # Unit tests for ML forecaster
│   └── requirements.txt           # Python dependencies
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout and fonts
│   │   ├── page.tsx               # Interactive multi-tab dashboard
│   │   └── globals.css            # Custom CSS styling
│   └── lib/
│       └── api.ts                 # API client utilities
├── package.json                   # Next.js frontend dependencies
├── tsconfig.json                  # TypeScript configuration
└── README.md
```

---

## Installation & Setup

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Backend Setup (FastAPI & Python)
```bash
# Navigate to backend directory
cd backend

# Install Python requirements
pip install -r requirements.txt

# Start the FastAPI server
uvicorn app.main:app --reload --port 8000
```
Backend will be running at `http://127.0.0.1:8000`. You can view the interactive Swagger API documentation at `http://127.0.0.1:8000/docs`.

### 2. Frontend Setup (Next.js)
In a separate terminal window:
```bash
# From the project root
npm install

# Start the Next.js development server
npm run dev
```
Open `http://localhost:3000` in your web browser to view the application.

---

## Running Unit Tests

The backend includes test coverage for both Pandas statistical calculations and Scikit-Learn model predictions:

```bash
pytest backend/tests
```

---

## Machine Learning Formulation

To forecast temperature, we treat daily temperature prediction as a time-series regression task:

$$\hat{T}_{t} = f\left(T_{t-1}, T_{t-2}, \bar{T}_{7\text{-day}}, H_{t-1}, P_{t-1}, W_{t-1}, \sin\left(\frac{2\pi d}{365.25}\right), \cos\left(\frac{2\pi d}{365.25}\right)\right)$$

Where:
- $T_{t-1}, T_{t-2}$: Lagged temperature observations from previous 1 and 2 days
- $\bar{T}_{7\text{-day}}$: 7-day rolling average to capture short-term thermal inertia
- $H_{t-1}, P_{t-1}, W_{t-1}$: Lagged atmospheric humidity, pressure, and wind speed
- $\sin / \cos$: Cyclical day-of-year features capturing annual seasonality

Model validation is performed using an 80/20 chronological train-test split to avoid lookahead bias.
