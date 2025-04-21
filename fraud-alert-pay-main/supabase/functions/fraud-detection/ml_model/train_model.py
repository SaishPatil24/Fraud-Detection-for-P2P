
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import pickle
import os
import json

# Function to train an Isolation Forest model on transaction data
def train_isolation_forest():
    # Create or load transaction data
    # In a real system, you would load historical transaction data
    # For now, we'll create synthetic data
    
    np.random.seed(42)
    n_samples = 5000
    
    # Create normal transaction features
    normal_data = {
        'amount': np.random.gamma(shape=2.0, scale=20, size=n_samples-50),
        'hour_of_day': np.random.normal(12, 5, size=n_samples-50),
        'time_since_last_tx': np.random.exponential(24, size=n_samples-50),
        'recipient_frequency': np.random.exponential(0.1, size=n_samples-50),
        'distance_to_recipient_km': np.random.exponential(10, size=n_samples-50)
    }
    
    # Create anomalous transaction features (5% of data)
    anomalous_data = {
        'amount': np.random.gamma(shape=5.0, scale=80, size=50),
        'hour_of_day': np.random.normal(2, 2, size=50),
        'time_since_last_tx': np.random.exponential(1, size=50),
        'recipient_frequency': np.random.exponential(0.01, size=50),
        'distance_to_recipient_km': np.random.exponential(100, size=50)
    }
    
    # Combine normal and anomalous data
    df_normal = pd.DataFrame(normal_data)
    df_anomaly = pd.DataFrame(anomalous_data)
    df = pd.concat([df_normal, df_anomaly])
    
    # Scale features
    scaler = StandardScaler()
    X = scaler.fit_transform(df)
    
    # Train Isolation Forest
    model = IsolationForest(contamination=0.05, random_state=42)
    model.fit(X)
    
    # Save the model and scaler
    os.makedirs("model", exist_ok=True)
    with open("model/isolation_forest.pkl", "wb") as f:
        pickle.dump(model, f)
    
    with open("model/scaler.pkl", "wb") as f:
        pickle.dump(scaler, f)
    
    # Create a function that can be used to evaluate transactions
    def score_transaction(transaction):
        # Convert transaction to DataFrame
        tx_df = pd.DataFrame([transaction])
        # Scale features
        tx_scaled = scaler.transform(tx_df)
        # Get anomaly score (-1 for anomaly, 1 for normal)
        score = model.decision_function(tx_scaled)[0]
        # Convert to probability-like score (0-100)
        fraud_score = int(max(0, min(100, (1 - (score + 0.5)) * 100)))
        return fraud_score
    
    # Test the scoring function on a few examples
    normal_tx = {
        'amount': 30.0,
        'hour_of_day': 14.0,
        'time_since_last_tx': 28.0,
        'recipient_frequency': 0.2,
        'distance_to_recipient_km': 5.0
    }
    
    anomalous_tx = {
        'amount': 500.0,
        'hour_of_day': 2.0,
        'time_since_last_tx': 0.5,
        'recipient_frequency': 0.01,
        'distance_to_recipient_km': 150.0
    }
    
    print(f"Normal transaction fraud score: {score_transaction(normal_tx)}")
    print(f"Anomalous transaction fraud score: {score_transaction(anomalous_tx)}")
    
    print("Model and scaler saved to model/")
    return model, scaler

if __name__ == "__main__":
    train_isolation_forest()
