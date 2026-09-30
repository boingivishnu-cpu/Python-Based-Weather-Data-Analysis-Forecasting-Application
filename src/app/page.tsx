"use client";

import { useEffect, useState, useTransition } from "react";
import {
  fetchCities,
  fetchHealth,
  fetchLiveWeather,
  fetchSummary,
  fetchCorrelations,
  fetchMonthlyTrends,
  fetchModelEvaluation,
  fetchDatasetRecords,
  runPrediction,
  CityInfo,
  LiveWeatherResponse,
  DatasetSummary,
  CorrelationMatrixData,
  MonthlyTrendItem,
  ModelMetrics,
  DatasetRecordsResponse,
} from "@/lib/api";

export default function WeatherApp() {
  const [cities, setCities] = useState<CityInfo[]>([]);
  const [selectedCity, setSelectedCity] = useState("Delhi");
  const [activeTab, setActiveTab] = useState<"overview" | "eda" | "forecasting" | "dataset">("overview");
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  // Data states
  const [liveWeather, setLiveWeather] = useState<LiveWeatherResponse | null>(null);
  const [summaryData, setSummaryData] = useState<DatasetSummary | null>(null);
  const [corrData, setCorrData] = useState<CorrelationMatrixData | null>(null);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrendItem[]>([]);
  const [modelMetrics, setModelMetrics] = useState<ModelMetrics | null>(null);
  const [recordsData, setRecordsData] = useState<DatasetRecordsResponse | null>(null);
  const [recordsOffset, setRecordsOffset] = useState(0);

  // ML Prediction Simulator state
  const [simYesterday, setSimYesterday] = useState("28.5");
  const [simDayBefore, setSimDayBefore] = useState("27.8");
  const [simHumidity, setSimHumidity] = useState("52");
  const [simPressure, setSimPressure] = useState("1010");
  const [simWind, setSimWind] = useState("12");
  const [predResult, setPredResult] = useState<{
    temp: number;
    interval: { lower: number; upper: number; mae_margin: number };
  } | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);

  const [isLoading, startTransition] = useTransition();

  // Initial check & load cities
  useEffect(() => {
    fetchHealth().then((isOk) => setBackendOnline(isOk));
    fetchCities()
      .then((data) => setCities(data))
      .catch(() => {
        // Fallback default cities if API not yet ready
        setCities([
          { name: "Delhi", country: "India", latitude: 28.61, longitude: 77.2, records_count: 1096, start_date: "2022-01-01", end_date: "2024-12-31" },
          { name: "Mumbai", country: "India", latitude: 19.07, longitude: 72.87, records_count: 1096, start_date: "2022-01-01", end_date: "2024-12-31" },
          { name: "Bengaluru", country: "India", latitude: 12.97, longitude: 77.59, records_count: 1096, start_date: "2022-01-01", end_date: "2024-12-31" },
          { name: "London", country: "United Kingdom", latitude: 51.5, longitude: -0.12, records_count: 1096, start_date: "2022-01-01", end_date: "2024-12-31" },
          { name: "New York", country: "United States", latitude: 40.71, longitude: -74.0, records_count: 1096, start_date: "2022-01-01", end_date: "2024-12-31" },
        ]);
      });
  }, []);

  // Fetch data when selected city changes
  useEffect(() => {
    startTransition(() => {
      fetchLiveWeather(selectedCity)
        .then(setLiveWeather)
        .catch(console.error);

      fetchSummary(selectedCity)
        .then(setSummaryData)
        .catch(console.error);

      fetchCorrelations(selectedCity)
        .then(setCorrData)
        .catch(console.error);

      fetchMonthlyTrends(selectedCity)
        .then(setMonthlyTrends)
        .catch(console.error);

      fetchModelEvaluation(selectedCity)
        .then(setModelMetrics)
        .catch(console.error);

      fetchDatasetRecords(selectedCity, 25, recordsOffset)
        .then(setRecordsData)
        .catch(console.error);
    });
  }, [selectedCity, recordsOffset]);

  // Handle ML simulation submission
  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPredicting(true);
    try {
      const res = await runPrediction({
        city: selectedCity,
        temp_yesterday: parseFloat(simYesterday),
        temp_day_before: parseFloat(simDayBefore),
        humidity: parseFloat(simHumidity),
        pressure: parseFloat(simPressure),
        wind_speed: parseFloat(simWind),
        day_of_year: 180,
      });
      setPredResult({
        temp: res.predicted_temp,
        interval: res.confidence_interval,
      });
    } catch (err) {
      console.error("Prediction error:", err);
    } finally {
      setIsPredicting(false);
    }
  };

  // CSV Export function
  const handleExportCSV = () => {
    if (!recordsData || !recordsData.records.length) return;
    const headers = Object.keys(recordsData.records[0]).join(",");
    const rows = recordsData.records.map((r) => Object.values(r).join(",")).join("\n");
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `weather_${selectedCity.toLowerCase()}_records.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container">
      {/* Header */}
      <header className="app-header">
        <div className="brand-section">
          <h1>Python-Based Weather Data Analysis & Forecasting</h1>
          <p>Atmospheric statistics, Pearson correlation, and machine learning forecasting</p>
        </div>

        <div className="header-controls">
          <div className="city-select-box">
            <label htmlFor="city-select">City:</label>
            <select
              id="city-select"
              value={selectedCity}
              onChange={(e) => {
                setSelectedCity(e.target.value);
                setRecordsOffset(0);
              }}
            >
              {cities.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.country})
                </option>
              ))}
            </select>
          </div>

          <div className={`status-badge ${backendOnline === false ? "offline" : ""}`}>
            <span className="status-dot"></span>
            {backendOnline === true ? "FastAPI Connected" : backendOnline === false ? "Backend Offline" : "Connecting..."}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          Overview & Live Weather
        </button>
        <button
          className={`tab-btn ${activeTab === "eda" ? "active" : ""}`}
          onClick={() => setActiveTab("eda")}
        >
          Exploratory Data Analysis (EDA)
        </button>
        <button
          className={`tab-btn ${activeTab === "forecasting" ? "active" : ""}`}
          onClick={() => setActiveTab("forecasting")}
        >
          ML Forecasting Model
        </button>
        <button
          className={`tab-btn ${activeTab === "dataset" ? "active" : ""}`}
          onClick={() => setActiveTab("dataset")}
        >
          Dataset Explorer
        </button>
      </nav>

      {/* Tab 1: Overview & Live Weather */}
      {activeTab === "overview" && (
        <section>
          {liveWeather && (
            <div className="hero-weather-card">
              <div>
                <span style={{ fontSize: "0.85rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Current Observation &bull; {liveWeather.city}, {liveWeather.country}
                </span>
                <div className="hero-temp-large">{liveWeather.current.temperature.toFixed(1)}°C</div>
                <div className="hero-condition">{liveWeather.current.condition}</div>
                <div style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: "0.25rem" }}>
                  Feels like {liveWeather.current.feels_like.toFixed(1)}°C
                </div>
              </div>

              <div className="hero-details-grid">
                <div className="hero-mini-stat">
                  <span>Humidity</span>
                  <strong>{liveWeather.current.humidity}%</strong>
                </div>
                <div className="hero-mini-stat">
                  <span>Pressure</span>
                  <strong>{liveWeather.current.pressure.toFixed(0)} hPa</strong>
                </div>
                <div className="hero-mini-stat">
                  <span>Wind Speed</span>
                  <strong>{liveWeather.current.wind_speed.toFixed(1)} km/h</strong>
                </div>
                <div className="hero-mini-stat">
                  <span>Precipitation</span>
                  <strong>{liveWeather.current.precipitation} mm</strong>
                </div>
              </div>
            </div>
          )}

          {/* 7-Day Forecast */}
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <h2 className="card-title">7-Day Meteorological Outlook</h2>
            <p className="card-subtitle">Numerical Weather Prediction via Open-Meteo REST service</p>
            <div className="forecast-scroll">
              {liveWeather?.forecast_7day.map((day) => (
                <div key={day.date} className="forecast-chip">
                  <div className="forecast-day-name">
                    {new Date(day.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </div>
                  <div className="forecast-cond">{day.condition}</div>
                  <div className="forecast-high-low">
                    <span className="forecast-high">{day.temp_max.toFixed(0)}°</span>
                    <span className="forecast-low">{day.temp_min.toFixed(0)}°</span>
                  </div>
                  {day.rain_prob > 0 && (
                    <div style={{ fontSize: "0.7rem", color: "var(--accent-blue)", marginTop: "0.3rem" }}>
                      💧 {day.rain_prob}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Dataset Quick Summary Cards */}
          {summaryData && (
            <div className="grid-4">
              <div className="stat-box">
                <div className="stat-label">Historical Mean Temp</div>
                <div className="stat-value">{summaryData.statistics.temp_mean?.mean}°C</div>
                <div className="stat-meta">Std Dev: ±{summaryData.statistics.temp_mean?.std_dev}°C</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Temperature Range</div>
                <div className="stat-value">
                  {summaryData.statistics.temp_min?.min}° to {summaryData.statistics.temp_max?.max}°
                </div>
                <div className="stat-meta">IQR: {summaryData.statistics.temp_mean?.iqr}°C</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Average Humidity</div>
                <div className="stat-value">{summaryData.statistics.humidity_mean?.mean}%</div>
                <div className="stat-meta">Range: {summaryData.statistics.humidity_mean?.min}% - {summaryData.statistics.humidity_mean?.max}%</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Total Observations</div>
                <div className="stat-value">{summaryData.total_records}</div>
                <div className="stat-meta">From {summaryData.date_range.start} to {summaryData.date_range.end}</div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Tab 2: Exploratory Data Analysis (EDA) */}
      {activeTab === "eda" && (
        <section>
          {/* Descriptive Statistics Table */}
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <h2 className="card-title">Descriptive Atmospheric Statistics (Pandas Series)</h2>
            <p className="card-subtitle">
              Calculated over {summaryData?.total_records} observations ({summaryData?.date_range.start} to {summaryData?.date_range.end}) for {selectedCity}
            </p>

            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Atmospheric Metric</th>
                    <th>Mean</th>
                    <th>Median (50%)</th>
                    <th>Std Dev (s)</th>
                    <th>Variance (s²)</th>
                    <th>Min</th>
                    <th>Max</th>
                    <th>25th Pct</th>
                    <th>75th Pct</th>
                    <th>IQR</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryData &&
                    Object.entries(summaryData.statistics).map(([metric, stats]) => {
                      const displayNames: Record<string, string> = {
                        temp_mean: "Mean Temperature (°C)",
                        temp_max: "Daily Maximum Temperature (°C)",
                        temp_min: "Daily Minimum Temperature (°C)",
                        humidity_mean: "Relative Humidity (%)",
                        pressure_mean: "Surface Pressure (hPa)",
                        wind_speed_max: "Max Wind Speed (km/h)",
                        precipitation_mm: "Daily Precipitation (mm)",
                      };
                      return (
                        <tr key={metric}>
                          <td style={{ fontWeight: 600 }}>{displayNames[metric] || metric}</td>
                          <td>{stats.mean}</td>
                          <td>{stats.median}</td>
                          <td>{stats.std_dev}</td>
                          <td>{stats.variance}</td>
                          <td>{stats.min}</td>
                          <td>{stats.max}</td>
                          <td>{stats.q25}</td>
                          <td>{stats.q75}</td>
                          <td>{stats.iqr}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid-2">
            {/* Correlation Matrix */}
            <div className="card">
              <h2 className="card-title">Pearson Correlation Matrix</h2>
              <p className="card-subtitle">Quantifying linear relationships between atmospheric variables</p>

              {corrData && (
                <div>
                  <table className="matrix-table">
                    <thead>
                      <tr>
                        <th>Parameter</th>
                        {corrData.variables.map((v) => (
                          <th key={v}>{v}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {corrData.matrix.map((row) => (
                        <tr key={row.variable}>
                          <td className="var-col">{row.variable}</td>
                          {corrData.variables.map((v) => {
                            const val = row[v] as number;
                            let cellClass = "cell-neutral";
                            if (val >= 0.7) cellClass = "cell-pos-high";
                            else if (val >= 0.2) cellClass = "cell-pos-mid";
                            else if (val <= -0.5) cellClass = "cell-neg-high";
                            else if (val <= -0.2) cellClass = "cell-neg-mid";

                            return (
                              <td key={v} className={cellClass}>
                                {val.toFixed(2)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div style={{ marginTop: "1rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    <strong style={{ color: "var(--text-main)" }}>Key Physical Observations:</strong>
                    <ul style={{ paddingLeft: "1.2rem", marginTop: "0.35rem" }}>
                      {corrData.key_insights.map((insight, idx) => (
                        <li key={idx}>{insight}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Monthly Seasonal Progression */}
            <div className="card">
              <h2 className="card-title">Monthly Seasonal Profile</h2>
              <p className="card-subtitle">Average temperature and total precipitation across the calendar year</p>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {monthlyTrends.map((item) => (
                  <div key={item.month} style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.8rem" }}>
                    <span style={{ width: "32px", fontWeight: 700, color: "var(--text-muted)" }}>{item.month}</span>
                    <div style={{ flex: 1, background: "var(--bg-secondary)", height: "20px", borderRadius: "4px", overflow: "hidden", position: "relative" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${Math.min(100, Math.max(5, ((item.avg_temp + 5) / 45) * 100))}%`,
                          background: item.avg_temp > 25 ? "linear-gradient(90deg, #f59e0b, #ef4444)" : "linear-gradient(90deg, #0284c7, #38bdf8)",
                          borderRadius: "4px",
                          display: "flex",
                          alignItems: "center",
                          paddingLeft: "0.5rem",
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: "0.7rem",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {item.avg_temp}°C
                      </div>
                    </div>
                    <span style={{ width: "65px", textAlign: "right", color: "var(--accent-blue)", fontFamily: "var(--font-mono)" }}>
                      {item.total_rainfall} mm
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Tab 3: Machine Learning Forecasting Model */}
      {activeTab === "forecasting" && (
        <section>
          {/* ML Performance Metrics */}
          {modelMetrics && (
            <div className="grid-3" style={{ marginBottom: "1.5rem" }}>
              <div className="stat-box">
                <div className="stat-label">Random Forest R² Score</div>
                <div className="stat-value" style={{ color: "var(--accent-emerald)" }}>
                  {modelMetrics.metrics.random_forest.r2_score}
                </div>
                <div className="stat-meta">Coefficient of Determination (80/20 test split)</div>
              </div>

              <div className="stat-box">
                <div className="stat-label">Mean Absolute Error (MAE)</div>
                <div className="stat-value" style={{ color: "var(--accent-blue)" }}>
                  ±{modelMetrics.metrics.random_forest.mae}°C
                </div>
                <div className="stat-meta">Baseline Linear Regression: ±{modelMetrics.metrics.linear_regression.mae}°C</div>
              </div>

              <div className="stat-box">
                <div className="stat-label">Root Mean Squared Error (RMSE)</div>
                <div className="stat-value">{modelMetrics.metrics.random_forest.rmse}°C</div>
                <div className="stat-meta">Trained on {modelMetrics.training_samples} daily observations</div>
              </div>
            </div>
          )}

          <div className="grid-2">
            {/* Interactive Model Simulator */}
            <div className="card">
              <h2 className="card-title">Interactive Forecast Predictor</h2>
              <p className="card-subtitle">Input observed atmospheric conditions to predict next-day temperature</p>

              <form onSubmit={handleSimulate} className="simulator-form">
                <div className="form-group">
                  <label htmlFor="temp-yest">Yesterday Temperature (°C)</label>
                  <input
                    id="temp-yest"
                    type="number"
                    step="0.1"
                    className="form-input"
                    value={simYesterday}
                    onChange={(e) => setSimYesterday(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="temp-prev">Day Before Yesterday (°C)</label>
                  <input
                    id="temp-prev"
                    type="number"
                    step="0.1"
                    className="form-input"
                    value={simDayBefore}
                    onChange={(e) => setSimDayBefore(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="hum-in">Relative Humidity (%)</label>
                  <input
                    id="hum-in"
                    type="number"
                    step="1"
                    className="form-input"
                    value={simHumidity}
                    onChange={(e) => setSimHumidity(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="press-in">Surface Pressure (hPa)</label>
                  <input
                    id="press-in"
                    type="number"
                    step="1"
                    className="form-input"
                    value={simPressure}
                    onChange={(e) => setSimPressure(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label htmlFor="wind-in">Wind Speed (km/h)</label>
                  <input
                    id="wind-in"
                    type="number"
                    step="0.5"
                    className="form-input"
                    value={simWind}
                    onChange={(e) => setSimWind(e.target.value)}
                    required
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <button type="submit" className="btn-primary" disabled={isPredicting}>
                    {isPredicting ? "Computing ML Prediction..." : "Predict Next-Day Temperature"}
                  </button>
                </div>
              </form>

              {predResult && (
                <div className="prediction-result-box">
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                    Predicted Next-Day Temperature
                  </div>
                  <div className="prediction-result-val">{predResult.temp}°C</div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-main)" }}>
                    Confidence Range: {predResult.interval.lower}°C &ndash; {predResult.interval.upper}°C (±{predResult.interval.mae_margin}°C MAE)
                  </div>
                </div>
              )}
            </div>

            {/* Test Set Evaluation: Actual vs Predicted */}
            <div className="card">
              <h2 className="card-title">Recent Test Set Validation (Last 30 Days)</h2>
              <p className="card-subtitle">Comparing actual recorded temperatures with Random Forest predictions</p>

              <div className="table-wrapper" style={{ maxHeight: "360px" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Actual Temp</th>
                      <th>Predicted</th>
                      <th>Residual (Error)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modelMetrics?.recent_evaluation.map((row) => (
                      <tr key={row.date}>
                        <td>{row.date}</td>
                        <td style={{ fontWeight: 700 }}>{row.actual_temp}°C</td>
                        <td style={{ color: "var(--accent-blue)" }}>{row.predicted_temp}°C</td>
                        <td style={{ color: row.residual_error < 1.0 ? "var(--accent-emerald)" : "var(--accent-amber)" }}>
                          {row.residual_error}°C
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Tab 4: Dataset Explorer */}
      {activeTab === "dataset" && (
        <section>
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <h2 className="card-title" style={{ margin: 0 }}>Historical Weather Dataset Explorer</h2>
                <p className="card-subtitle" style={{ margin: 0, marginTop: "0.25rem" }}>
                  Showing records for {selectedCity} ({recordsData?.total || 0} total entries in CSV)
                </p>
              </div>

              <button onClick={handleExportCSV} className="btn-primary" style={{ width: "auto", padding: "0.5rem 1rem" }}>
                Download CSV
              </button>
            </div>

            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>City</th>
                    <th>Mean Temp (°C)</th>
                    <th>Max Temp</th>
                    <th>Min Temp</th>
                    <th>Humidity (%)</th>
                    <th>Precipitation (mm)</th>
                    <th>Wind Speed (km/h)</th>
                    <th>Pressure (hPa)</th>
                    <th>Condition</th>
                  </tr>
                </thead>
                <tbody>
                  {recordsData?.records.map((r, i) => {
                    let badgeClass = "badge-clear";
                    if (r.weather_condition.includes("Rain")) badgeClass = "badge-rain";
                    else if (r.weather_condition.includes("Cold")) badgeClass = "badge-cold";
                    else if (r.weather_condition.includes("Wind")) badgeClass = "badge-wind";

                    return (
                      <tr key={`${r.date}-${i}`}>
                        <td>{r.date}</td>
                        <td style={{ fontWeight: 600 }}>{r.city}</td>
                        <td style={{ fontWeight: 700 }}>{r.temp_mean}</td>
                        <td>{r.temp_max}</td>
                        <td>{r.temp_min}</td>
                        <td>{r.humidity_mean}</td>
                        <td>{r.precipitation_mm}</td>
                        <td>{r.wind_speed_max}</td>
                        <td>{r.pressure_mean}</td>
                        <td>
                          <span className={`badge ${badgeClass}`}>{r.weather_condition}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="pagination-bar">
              <div>
                Showing records {recordsOffset + 1} to {Math.min(recordsOffset + 25, recordsData?.total || 0)} of {recordsData?.total || 0}
              </div>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  className="page-btn"
                  disabled={recordsOffset === 0}
                  onClick={() => setRecordsOffset((prev) => Math.max(0, prev - 25))}
                >
                  Previous
                </button>
                <button
                  className="page-btn"
                  disabled={!recordsData || recordsOffset + 25 >= recordsData.total}
                  onClick={() => setRecordsOffset((prev) => prev + 25)}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="app-footer">
        <p>Weather Data Analysis & Forecasting System &bull; Built with Python, Pandas, Scikit-Learn & Next.js</p>
      </footer>
    </div>
  );
}
