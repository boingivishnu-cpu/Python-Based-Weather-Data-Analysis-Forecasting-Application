const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export interface CityInfo {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  records_count: number;
  start_date: string;
  end_date: string;
}

export interface MetricStats {
  mean: number;
  median: number;
  std_dev: number;
  variance: number;
  min: number;
  max: number;
  q25: number;
  q75: number;
  iqr: number;
}

export interface DatasetSummary {
  city: string;
  total_records: number;
  date_range: {
    start: string;
    end: string;
  };
  statistics: Record<string, MetricStats>;
}

export interface CorrelationMatrixData {
  variables: string[];
  matrix: Array<{
    variable: string;
    [key: string]: string | number;
  }>;
  key_insights: string[];
}

export interface MonthlyTrendItem {
  month_num: number;
  month: string;
  avg_temp: number;
  max_temp: number;
  min_temp: number;
  avg_humidity: number;
  total_rainfall: number;
  avg_wind: number;
}

export interface ModelMetrics {
  city: string;
  metrics: {
    random_forest: {
      mae: number;
      rmse: number;
      r2_score: number;
      accuracy_description: string;
    };
    linear_regression: {
      mae: number;
      rmse: number;
      r2_score: number;
      accuracy_description: string;
    };
  };
  training_samples: number;
  testing_samples: number;
  features: string[];
  recent_evaluation: Array<{
    date: string;
    actual_temp: number;
    predicted_temp: number;
    residual_error: number;
  }>;
}

export interface LiveWeatherResponse {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  current: {
    temperature: number;
    feels_like: number;
    humidity: number;
    pressure: number;
    wind_speed: number;
    precipitation: number;
    condition: string;
    weather_code: number;
  };
  forecast_7day: Array<{
    date: string;
    temp_max: number;
    temp_min: number;
    precipitation: number;
    rain_prob: number;
    condition: string;
  }>;
}

export interface DatasetRecordsResponse {
  total: number;
  offset: number;
  limit: number;
  records: Array<{
    date: string;
    city: string;
    country: string;
    temp_mean: number;
    temp_max: number;
    temp_min: number;
    humidity_mean: number;
    precipitation_mm: number;
    wind_speed_max: number;
    pressure_mean: number;
    weather_condition: string;
  }>;
}

export async function fetchHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, { cache: "no-store", signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchCities(): Promise<CityInfo[]> {
  const res = await fetch(`${API_BASE}/api/cities`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load cities");
  return res.json();
}

export async function fetchSummary(city: string): Promise<DatasetSummary> {
  const res = await fetch(`${API_BASE}/api/analysis/summary?city=${encodeURIComponent(city)}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch summary statistics");
  return res.json();
}

export async function fetchCorrelations(city: string): Promise<CorrelationMatrixData> {
  const res = await fetch(`${API_BASE}/api/analysis/correlations?city=${encodeURIComponent(city)}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch correlation matrix");
  return res.json();
}

export async function fetchMonthlyTrends(city: string): Promise<MonthlyTrendItem[]> {
  const res = await fetch(`${API_BASE}/api/analysis/monthly-trends?city=${encodeURIComponent(city)}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch monthly trends");
  return res.json();
}

export async function fetchModelEvaluation(city: string): Promise<ModelMetrics> {
  const res = await fetch(`${API_BASE}/api/model/evaluation?city=${encodeURIComponent(city)}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch model evaluation");
  return res.json();
}

export async function fetchLiveWeather(city: string): Promise<LiveWeatherResponse> {
  const res = await fetch(`${API_BASE}/api/weather/live?city=${encodeURIComponent(city)}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch live weather");
  return res.json();
}

export async function fetchDatasetRecords(city: string, limit = 50, offset = 0): Promise<DatasetRecordsResponse> {
  const url = `${API_BASE}/api/dataset/records?city=${encodeURIComponent(city)}&limit=${limit}&offset=${offset}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch dataset records");
  return res.json();
}

export async function runPrediction(data: {
  city: string;
  temp_yesterday: number;
  temp_day_before: number;
  humidity: number;
  pressure: number;
  wind_speed: number;
  day_of_year: number;
}) {
  const res = await fetch(`${API_BASE}/api/model/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Prediction request failed");
  return res.json();
}
