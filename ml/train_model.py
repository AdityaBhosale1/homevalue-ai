"""
HomeValue AI - Production ML Model Training Pipeline
Comprehensive pipeline for Real Housing Datasets:
- Flexible Column Mapping Layer
- Robust Outlier Cleaning & Normalization
- Feature Engineering (area_per_bhk, bathroom_per_bhk)
- 3-Way Split (Train / Validation / Test)
- 5-Fold Cross-Validation & Hyperparameter Tuning
- Model Metadata JSON & Market Analytics Export
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime

from sklearn.model_selection import train_test_split, KFold, cross_validate, RandomizedSearchCV
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error, mean_absolute_percentage_error

# Regressors
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor, HistGradientBoostingRegressor

try:
    from xgboost import XGBRegressor
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False

# Column Name Synonyms Mapping Layer
COLUMN_MAPPING = {
    'price': 'price_lakhs',
    'price_in_lakhs': 'price_lakhs',
    'total_price': 'price_lakhs',
    'sqft': 'area_sqft',
    'total_sqft': 'area_sqft',
    'area': 'area_sqft',
    'beds': 'bhk',
    'bedrooms': 'bhk',
    'size': 'bhk',
    'bath': 'bathrooms',
    'type': 'property_type',
    'furnish_status': 'furnishing',
    'age': 'property_age',
    'location_name': 'location'
}

TARGET_SCHEMA = ['city', 'location', 'area_sqft', 'bhk', 'bathrooms', 'property_type', 'furnishing', 'parking', 'property_age', 'price_lakhs']

def load_and_preprocess_dataset(csv_path):
    print(f"[INFO] Loading dataset from: {csv_path}")
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Dataset missing at {csv_path}")

    # Read CSV skipping header comments
    df = pd.read_csv(csv_path, comment='#')
    initial_count = len(df)
    print(f"[INFO] Initial rows loaded: {initial_count}")

    # Apply Column Mapping Layer
    rename_dict = {}
    for col in df.columns:
        clean_col = col.strip().lower()
        if clean_col in COLUMN_MAPPING:
            rename_dict[col] = COLUMN_MAPPING[clean_col]
        else:
            rename_dict[col] = clean_col
    df = df.rename(columns=rename_dict)

    # Validate presence of schema columns
    missing_cols = [c for c in TARGET_SCHEMA if c not in df.columns]
    if missing_cols:
        print(f"[WARNING] Missing columns in dataset: {missing_cols}. Filling sensible defaults.")
        if 'parking' in missing_cols: df['parking'] = 1
        if 'property_age' in missing_cols: df['property_age'] = 5
        if 'city' in missing_cols: df['city'] = 'Pune'

    # Deduplicate
    df = df.drop_duplicates()

    # Outlier Removal & Invalid Value Filtering
    df = df[
        (df['area_sqft'] >= 250) & (df['area_sqft'] <= 25000) &
        (df['price_lakhs'] >= 5.0) & (df['price_lakhs'] <= 10000.0) &
        (df['bhk'] >= 1) & (df['bhk'] <= 10) &
        (df['bathrooms'] >= 1) & (df['bathrooms'] <= 10) &
        (df['property_age'] >= 0) & (df['property_age'] <= 80)
    ]

    # Handle High-Cardinality Locations (Group rare locations < 3 into 'Other')
    loc_counts = df['location'].value_counts()
    rare_locs = loc_counts[loc_counts < 3].index
    df['location'] = df['location'].apply(lambda x: 'Other' if x in rare_locs else x)

    clean_count = len(df)
    print(f"[INFO] Rows after cleaning & outlier removal: {clean_count} (Filtered: {initial_count - clean_count})")
    
    return df, initial_count, clean_count

def feature_engineering(df):
    """Adds domain features while strictly avoiding target leakage."""
    df_feat = df.copy()
    
    # Area per BHK & Bathroom per BHK ratio features
    df_feat['area_per_bhk'] = (df_feat['area_sqft'] / (df_feat['bhk'] + 0.001)).round(2)
    df_feat['bathroom_per_bhk'] = (df_feat['bathrooms'] / (df_feat['bhk'] + 0.001)).round(2)

    return df_feat

def generate_analytics_data(df, output_dir):
    """Computes market insights for real-time dashboard analytics."""
    os.makedirs(output_dir, exist_ok=True)
    
    df_temp = df.copy()
    df_temp['price_inr'] = df_temp['price_lakhs'] * 100000
    df_temp['rate_per_sqft'] = df_temp['price_inr'] / df_temp['area_sqft']

    city_insights = df_temp.groupby('city').agg(
        avg_price_lakhs=('price_lakhs', 'mean'),
        avg_rate_sqft=('rate_per_sqft', 'mean'),
        total_properties=('price_lakhs', 'count')
    ).round(2).to_dict(orient='index')

    bhk_insights = df_temp.groupby('bhk').agg(
        avg_price_lakhs=('price_lakhs', 'mean'),
        avg_area_sqft=('area_sqft', 'mean')
    ).round(2).to_dict(orient='index')

    prop_type_dist = df_temp['property_type'].value_counts(normalize=True).round(4).to_dict()

    insights_payload = {
        "city_insights": city_insights,
        "bhk_insights": bhk_insights,
        "property_type_distribution": prop_type_dist,
        "overall_avg_rate_sqft": round(df_temp['rate_per_sqft'].mean(), 2),
        "total_analyzed_properties": len(df_temp)
    }

    insights_file = os.path.join(output_dir, 'market_insights.json')
    with open(insights_file, 'w', encoding='utf-8') as f:
        json.dump(insights_payload, f, indent=2)

    print(f"[SUCCESS] Saved analytics insights -> {insights_file}")

def train_production_pipeline():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_path = os.path.join(base_dir, 'data', 'house_prices.csv')
    models_dir = os.path.join(base_dir, 'models')
    analytics_dir = os.path.join(base_dir, 'analytics')
    os.makedirs(models_dir, exist_ok=True)

    # 1. Load & Clean Data
    df, initial_rows, clean_rows = load_and_preprocess_dataset(data_path)

    # 2. Generate Market Analytics Artifacts
    generate_analytics_data(df, analytics_dir)

    # 3. Feature Engineering
    df_feat = feature_engineering(df)

    feature_cols = ['city', 'location', 'area_sqft', 'bhk', 'bathrooms', 'property_type', 'furnishing', 'parking', 'property_age', 'area_per_bhk', 'bathroom_per_bhk']
    X = df_feat[feature_cols]
    y = df_feat['price_lakhs']

    # 4. 3-Way Data Split (70% Train, 15% Validation, 15% Holdout Test)
    X_train_full, X_test, y_train_full, y_test = train_test_split(X, y, test_size=0.15, random_state=42)
    X_train, X_val, y_train, y_val = train_test_split(X_train_full, y_train_full, test_size=0.1765, random_state=42)

    print(f"[INFO] Data Split -> Train: {len(X_train)}, Val: {len(X_val)}, Holdout Test: {len(X_test)}")

    # 5. Preprocessor Setup
    cat_cols = ['city', 'location', 'property_type', 'furnishing']
    num_cols = ['area_sqft', 'bhk', 'bathrooms', 'parking', 'property_age', 'area_per_bhk', 'bathroom_per_bhk']

    preprocessor = ColumnTransformer(
        transformers=[
            ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), cat_cols),
            ('num', StandardScaler(), num_cols)
        ]
    )

    # 6. Model Candidates & 5-Fold Cross Validation
    candidate_models = {
        "Linear Regression": LinearRegression(),
        "Random Forest": RandomForestRegressor(n_estimators=100, random_state=42),
        "Gradient Boosting": GradientBoostingRegressor(n_estimators=100, random_state=42),
        "HistGradientBoosting": HistGradientBoostingRegressor(random_state=42)
    }

    if HAS_XGBOOST:
        candidate_models["XGBoost"] = XGBRegressor(n_estimators=120, learning_rate=0.08, random_state=42)

    print("\n" + "=" * 80)
    print(f"{'5-FOLD CROSS-VALIDATION & MODEL EVALUATION':^80}")
    print("=" * 80)
    print(f"{'Model Name':<22} | {'CV R2 Mean':<12} | {'Val R2':<10} | {'Val MAE':<12} | {'Val RMSE':<10}")
    print("-" * 80)

    kf = KFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = {}

    for name, model in candidate_models.items():
        pipeline = Pipeline([('preprocessor', preprocessor), ('regressor', model)])
        
        # 5-Fold CV on Training Set
        cv_results = cross_validate(pipeline, X_train, y_train, cv=kf, scoring='r2')
        cv_r2_mean = cv_results['test_score'].mean()

        # Evaluate on Validation set
        pipeline.fit(X_train, y_train)
        val_preds = pipeline.predict(X_val)
        val_r2 = r2_score(y_val, val_preds)
        val_mae = mean_absolute_error(y_val, val_preds)
        val_rmse = np.sqrt(mean_squared_error(y_val, val_preds))

        cv_scores[name] = {
            'cv_r2_mean': cv_r2_mean,
            'val_r2': val_r2,
            'val_mae': val_mae,
            'val_rmse': val_rmse,
            'model': model
        }

        print(f"{name:<22} | {cv_r2_mean:<12.4f} | {val_r2:<10.4f} | {val_mae:<12.4f} | {val_rmse:<10.4f}")

    # Select Best Model based on Validation & CV performance
    best_candidate_name = max(cv_scores, key=lambda k: cv_scores[k]['val_r2'])
    print("-" * 80)
    print(f"Top Model Candidate Selected: {best_candidate_name}")

    # 7. Hyperparameter Tuning using RandomizedSearchCV
    print(f"\n[INFO] Tuning Hyperparameters for {best_candidate_name}...")
    
    if best_candidate_name == "XGBoost" and HAS_XGBOOST:
        param_grid = {
            'regressor__n_estimators': [100, 150, 200],
            'regressor__max_depth': [3, 5, 7],
            'regressor__learning_rate': [0.03, 0.08, 0.12],
            'regressor__subsample': [0.8, 1.0]
        }
        base_reg = XGBRegressor(random_state=42)
    elif best_candidate_name == "Random Forest":
        param_grid = {
            'regressor__n_estimators': [100, 150, 200],
            'regressor__max_depth': [10, 20, None],
            'regressor__min_samples_split': [2, 5]
        }
        base_reg = RandomForestRegressor(random_state=42)
    else:
        param_grid = {
            'regressor__n_estimators': [100, 150, 200],
            'regressor__learning_rate': [0.03, 0.08, 0.12],
            'regressor__max_depth': [3, 5]
        }
        base_reg = GradientBoostingRegressor(random_state=42)

    tune_pipeline = Pipeline([('preprocessor', preprocessor), ('regressor', base_reg)])
    search = RandomizedSearchCV(tune_pipeline, param_grid, n_iter=6, cv=3, scoring='r2', random_state=42, n_jobs=-1)
    search.fit(X_train_full, y_train_full)

    final_best_pipeline = search.best_estimator_
    print(f"[INFO] Hyperparameter Tuning Complete. Best Params: {search.best_params_}")

    # 8. Single Holdout Test Set Final Evaluation
    final_test_preds = final_best_pipeline.predict(X_test)
    test_r2 = r2_score(y_test, final_test_preds)
    test_mae = mean_absolute_error(y_test, final_test_preds)
    test_rmse = np.sqrt(mean_squared_error(y_test, final_test_preds))
    test_mape = mean_absolute_percentage_error(y_test, final_test_preds) * 100

    print("\n" + "=" * 80)
    print(f"{'FINAL HOLDOUT TEST EVALUATION REPORT':^80}")
    print("=" * 80)
    print(f"  * Final Selected Model  : {best_candidate_name} (Tuned)")
    print(f"  * Final Test R2 Score   : {test_r2:.4f}")
    print(f"  * Final Test MAE        : {test_mae:.4f} Lakhs")
    print(f"  * Final Test RMSE       : {test_rmse:.4f} Lakhs")
    print(f"  * Final Test MAPE       : {test_mape:.2f}%")
    print("=" * 80)

    # 9. Save Artifacts & Metadata JSON
    model_path = os.path.join(models_dir, 'house_price_model.pkl')
    preproc_path = os.path.join(models_dir, 'preprocessing.pkl')
    meta_path = os.path.join(models_dir, 'model_metadata.json')

    joblib.dump(final_best_pipeline, model_path)
    joblib.dump(final_best_pipeline.named_steps['preprocessor'], preproc_path)

    metadata_payload = {
        "model_name": f"{best_candidate_name} (Tuned)",
        "training_date": datetime.now().isoformat(),
        "dataset_type": "REAL",
        "total_rows": initial_rows,
        "clean_rows": clean_rows,
        "features": feature_cols,
        "cv_r2_mean": round(float(cv_scores[best_candidate_name]['cv_r2_mean']), 4),
        "test_r2": round(float(test_r2), 4),
        "test_mae": round(float(test_mae), 2),
        "test_rmse": round(float(test_rmse), 2),
        "test_mape": round(float(test_mape), 2)
    }

    with open(meta_path, 'w', encoding='utf-8') as f:
        json.dump(metadata_payload, f, indent=2)

    print(f"\n[SUCCESS] Model Pipeline saved -> {model_path}")
    print(f"[SUCCESS] Preprocessor saved     -> {preproc_path}")
    print(f"[SUCCESS] Metadata JSON saved     -> {meta_path}\n")

if __name__ == '__main__':
    train_production_pipeline()
