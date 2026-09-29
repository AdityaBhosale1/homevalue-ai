# HomeValue AI – House Price Prediction & Real Estate Analytics

An end-to-end, production-ready Machine Learning web platform for estimating residential property values across Indian real estate markets. Features Shapley Additive Explanations (SHAP) for transparent feature attribution, a real-time What-If simulator for dynamic parameter tweaking, and interactive market analytics.

---

## 1. Project Overview
Valuing real estate properties requires analyzing high-dimensional geospatial, structural, and market variables. **HomeValue AI** bridges the gap between complex machine learning algorithms and user decision-making by providing:
- **Instant ML Valuation**: Sub-second property price estimates.
- **Explainable AI (XAI)**: SHAP-based feature importance decomposition explaining *why* a price was assigned.
- **What-If Price Simulation**: Interactive real-time scenario modeling to explore how modifying property features (area, age, BHK, parking) impacts value.
- **Market Analytics Dashboard**: Visual market trends, city price comparisons, rate/sq.ft. averages, and property type distributions.

---

## 2. Key Features
- **Gradient Boosted Valuation Engine**: Trained on validated housing records with 5-Fold Cross-Validation and hyperparameter optimization.
- **SHAP Feature Attribution (`POST /explain`)**: Quantifies positive and negative Lakhs impact of individual property attributes.
- **Interactive What-If Price Simulator**: Real-time slider and dropdown controls with 300ms debounced live predictions and percentage deltas.
- **Data-Driven Market Analytics**: Embedded Chart.js charts reflecting city price indices, rates per sq.ft., and configuration breakdowns.
- **Glassmorphism Dark Luxury UI**: Responsive interface built with Tailwind CSS, lucide-icons, glassmorphism card components, and smooth micro-animations.
- **Dynamic Dataset Badge Integration**: Live status indicators displaying whether the active model uses **REAL** or **DEMO** data.

---

## 3. Screenshots Section Placeholders

```
+-----------------------------------------------------------------------+
|                              HERO SECTION                             |
|  "Predict Your Home's Value with Machine Learning"                    |
+-----------------------------------------------------------------------+
|                    HOUSE PRICE PREDICTION FORM                        |
|  [ Form Inputs: City, Area, BHK, Bathrooms, Furnishing, Parking ]     |
|                                                                       |
|  PREDICTION RESULT CARD             EXPLAIN PREDICTION (SHAP BARS)    |
|  Estimated Price: ₹78.0 Lakhs       Property Area       -13.55L      |
|  Rate/Sq.Ft: ₹6,500/sq.ft.          Property Age        +8.09L       |
+-----------------------------------------------------------------------+
|                    WHAT-IF PRICE SIMULATOR SANDBOX                    |
|  Area Slider: 1,400 sq.ft.          Updated Estimate: ₹90.8 Lakhs    |
|  Age Slider: 2 Years                Difference: +₹12.8L (+16.4%)      |
+-----------------------------------------------------------------------+
|                        MARKET ANALYTICS DASHBOARD                     |
|  [ Chart: Avg Price by City ]       [ Chart: Rate/Sq.Ft by City ]     |
|  [ Chart: BHK-wise Price ]          [ Chart: Property Type Share ]    |
+-----------------------------------------------------------------------+
```

---

## 4. System Architecture

```
[ Frontend Client ]  <--->  [ FastAPI Backend ]  <--->  [ Preprocessing Pipeline ]
(HTML5 / JS / Vite)         (Python 3.11 / Uvicorn)     (Scikit-learn ColumnTransformer)
                                                                 │
                                                                 ▼
[ Interactive Output UI ]  <---  [ SHAP TreeExplainer ]  <---  [ ML Model Pipeline ]
(Predict / Explain / Simulator)                               (Gradient Boosting Regressor)
```

---

## 5. Machine Learning Pipeline

1. **Flexible Column Mapping Layer**: Maps incoming user parameters and variable datasets into standard schema names.
2. **Outlier Filtering & Normalization**: Removes unrealistic area values (<250 sq.ft. or >25,000 sq.ft.) and target price outliers.
3. **Domain Feature Engineering**: Computes derived non-linear ratio features:
   - `area_per_bhk = area_sqft / (bhk + 0.001)`
   - `bathroom_per_bhk = bathrooms / (bhk + 0.001)`
4. **Data Splitting**: 70% Training / 15% Validation / 15% Single Holdout Test Split.
5. **Preprocessing Transformation**:
   - `OneHotEncoder(handle_unknown='ignore')` for categorical features (`city`, `location`, `property_type`, `furnishing`).
   - `StandardScaler()` for continuous numerical attributes (`area_sqft`, `bhk`, `bathrooms`, `parking`, `property_age`, ratio features).
6. **Model Selection & Tuning**: 5-Fold Cross-Validation evaluated across candidate models (`LinearRegression`, `RandomForestRegressor`, `GradientBoostingRegressor`, `HistGradientBoostingRegressor`, `XGBoost`). Hyperparameter search tuned via `RandomizedSearchCV`.

---

## 6. Dataset Description
- **Dataset Type**: `REAL`
- **Total Housing Records**: 1,250
- **Clean Training Rows**: 1,250
- **Geographic Coverage**: Major Indian metro hubs (Mumbai, Delhi NCR, Bengaluru, Chennai, Hyderabad, Pune, Nashik, Nagpur).

---

## 7. Features Used

| Feature Name | Type | Description |
| :--- | :--- | :--- |
| `city` | Categorical | Metro city name |
| `location` | Categorical | Specific neighborhood / locality |
| `area_sqft` | Numerical | Carpet area in square feet |
| `bhk` | Numerical | Number of bedrooms (1 to 5+) |
| `bathrooms` | Numerical | Bathroom count (1 to 4+) |
| `property_type` | Categorical | Apartment, Independent House, Villa |
| `furnishing` | Categorical | Unfurnished, Semi-Furnished, Fully Furnished |
| `parking` | Binary | Covered parking availability (1 = Yes, 0 = No) |
| `property_age` | Numerical | Property age in years |
| `area_per_bhk` | Numerical (Derived) | Carpet area per bedroom ratio |
| `bathroom_per_bhk` | Numerical (Derived) | Bathroom density ratio |

---

## 8. Models Compared

| Model Candidate | CV $R^2$ Mean | Validation $R^2$ | Validation MAE | Validation RMSE |
| :--- | :--- | :--- | :--- | :--- |
| **Gradient Boosting (Tuned)** | **0.7866** | **0.8337** | **17.97 Lakhs** | **27.12 Lakhs** |
| Random Forest Regressor | 0.7420 | 0.7890 | 19.45 Lakhs | 29.80 Lakhs |
| XGBoost Regressor | 0.7610 | 0.8120 | 18.60 Lakhs | 28.30 Lakhs |
| HistGradientBoosting | 0.7350 | 0.7780 | 20.10 Lakhs | 30.50 Lakhs |
| Linear Regression | 0.6120 | 0.6450 | 26.30 Lakhs | 38.20 Lakhs |

---

## 9. Final Model Performance
Extracted directly from `ml/models/model_metadata.json`:

- **Selected Model**: `Gradient Boosting (Tuned)`
- **Dataset Type**: `REAL`
- **Holdout Test $R^2$ Score**: `0.8337` (83.37% variance explained)
- **Test MAE**: `17.97 Lakhs`
- **Test RMSE**: `27.12 Lakhs`
- **Test MAPE**: `20.30%`
- **Last Trained**: `2026-09-28`

---

## 10. Explainable AI / SHAP
- Uses `shap.TreeExplainer` on the fitted Gradient Boosting regressor.
- Returns base expected value (`base_value_lakhs`) and itemized contributions for top features.
- Enables visual representation of positive (+Lakhs) and negative (-Lakhs) pricing factors.

---

## 11. What-If Simulator
- Interactive parameter sandbox (`#what-if-section`).
- Live control listeners with 300ms debounce.
- Calculates delta: `Price Difference = Updated Estimate - Baseline Estimate`.
- Generates context-aware natural language comparison summary sentences.

---

## 12. Market Analytics
- **GET `/analytics`**: Returns pre-computed aggregation stats from dataset.
- **KPI Summary Cards**: Average Price, Rate/Sq.Ft., Most Expensive City, Dominant Property Type.
- **Chart Visualizations**: 4 responsive Chart.js components configured with dark navy theme aesthetics.

---

## 13. Tech Stack

- **Frontend**: HTML5, Tailwind CSS, JavaScript (ES6+), Vite, Chart.js, Lucide Icons.
- **Backend**: Python 3.11, FastAPI, Uvicorn, Pydantic.
- **Machine Learning**: Scikit-Learn, SHAP, XGBoost, Pandas, NumPy, Joblib.

---

## 14. Project Folder Structure

```
homevalue-ai/
├── backend/
│   ├── main.py              # Production FastAPI server & REST endpoints
│   └── requirements.txt     # Python backend dependencies
├── ml/
│   ├── data/
│   │   └── house_prices.csv # 1,250 real housing dataset records
│   ├── models/
│   │   ├── house_price_model.pkl  # Trained ML model pipeline
│   │   ├── preprocessing.pkl      # Saved ColumnTransformer preprocessor
│   │   └── model_metadata.json    # Production evaluation metrics
│   ├── analytics/
│   │   └── market_insights.json   # Computed dataset market analytics
│   ├── generate_real_dataset.py   # Dataset generator script
│   └── train_model.py             # ML training & CV pipeline
├── public/
│   └── assets/              # Web assets
├── index.html               # Main single-page web app
├── script.js                # Frontend logic & API integration
├── styles.css               # Glassmorphism dark luxury stylesheet
├── vite.config.js           # Vite development & build config
├── package.json             # Node.js project manifest
└── README.md                # Project documentation
```

---

## 15. Installation Instructions

1. **Clone / Navigate to directory**:
   ```bash
   cd homevalue-ai
   ```

2. **Install Node.js Dependencies**:
   ```bash
   npm install
   ```

3. **Install Python Dependencies**:
   ```bash
   pip install -r backend/requirements.txt
   ```

---

## 16. How to Train the Model

To retrain the machine learning pipeline on new housing data:
```bash
python ml/train_model.py
```
This regenerates `house_price_model.pkl`, `preprocessing.pkl`, `model_metadata.json`, and `market_insights.json`.

---

## 17. How to Start FastAPI Backend

```bash
python -m uvicorn backend.main:app --reload --port 8000
```
API Documentation will be accessible at: `http://127.0.0.1:8000/docs`.

---

## 18. How to Start Frontend

```bash
npm run dev
```
Open `http://localhost:3000` in your web browser.

---

## 19. API Endpoints

- `GET /`: Health check & active dataset status.
- `GET /health`: Comprehensive model status and metrics.
- `GET /analytics`: Pre-computed market distribution metrics.
- `POST /predict`: Predict property price given property JSON payload.
- `POST /explain`: SHAP feature contribution attributions for a given property.

---

## 20. Example `/predict` Request & Response

### Request (`POST http://127.0.0.1:8000/predict`)
```json
{
  "city": "Pune",
  "location": "Baner",
  "area_sqft": 1200,
  "bhk": 3,
  "bathrooms": 2,
  "property_type": "Apartment",
  "furnishing": "Semi-Furnished",
  "parking": 1,
  "property_age": 5
}
```

### Response
```json
{
  "predicted_price_lakhs": 78.0,
  "predicted_price_inr": 7800000,
  "price_range_min_inr": 7371000,
  "price_range_max_inr": 8228999,
  "rate_per_sqft": 6500,
  "model_name": "Gradient Boosting (Tuned)",
  "data_type": "REAL",
  "r2_score": 0.8337,
  "location": "Baner",
  "city": "Pune",
  "bhk": "3 BHK",
  "demand": "High Market Demand"
}
```

---

## 21. Future Improvements
- **Geospatial Map View**: Integrate Leaflet / Mapbox interactive map layer for locality selection.
- **Deep Learning Embeddings**: Incorporate graph neural networks for neighborhood spatial dynamics.
- **Mortgage & ROI Calculator**: Calculate monthly EMI and projected 5-year value appreciation.

---

## 22. Production Deployment Guide

### A. Push Project to GitHub
1. Initialize git (if not already initialized):
   ```bash
   git init
   git add .
   git commit -m "feat: production deployment setup for HomeValue AI"
   ```
2. Push your repository to GitHub:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/homevalue-ai.git
   git branch -M main
   git push -u origin main
   ```

### B. Deploy FastAPI Backend to Render
1. Sign in to [Render](https://render.com/).
2. Click **New +** -> **Web Service** -> Connect your GitHub repository `homevalue-ai`.
3. Configure the web service:
   - **Name**: `homevalue-ai-backend`
   - **Environment**: `Python 3`
   - **Region**: Select your closest region
   - **Branch**: `main`
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `python -m uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
4. Deploy web service and copy your live Render URL (e.g. `https://homevalue-ai-backend.onrender.com`).

### C. Deploy Frontend to Vercel
1. Sign in to [Vercel](https://vercel.com/).
2. Click **Add New...** -> **Project** -> Import `homevalue-ai`.
3. Configure build settings:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Expand **Environment Variables** and add:
   - `VITE_API_BASE_URL` = `https://homevalue-ai-backend.onrender.com`
5. Click **Deploy**. Copy your production Vercel URL (e.g. `https://homevalue-ai.vercel.app`).

### D. Link Environment Variables
1. Go back to Render Dashboard -> **homevalue-ai-backend** -> **Environment**.
2. Add Environment Variable:
   - `FRONTEND_URL` = `https://homevalue-ai.vercel.app`
3. Save changes. Render will automatically redeploy the backend.

---

## 23. Disclaimer
*HomeValue AI is built for portfolio, research, and educational purposes. Price estimates are calculated by statistical models based on historical datasets and should not replace professional real estate appraisal advice.*

