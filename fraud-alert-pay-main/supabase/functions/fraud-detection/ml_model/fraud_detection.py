# ml_model/fraud_detection.py
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
import tensorflow as tf
from datetime import datetime
import pickle
import os
import json
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def generate_synthetic_data(n_samples=5000, fraud_ratio=0.05):
    """Generate synthetic transaction data with normal and fraudulent patterns."""
    np.random.seed(42)
    
    n_fraudulent = int(n_samples * fraud_ratio)
    n_normal = n_samples - n_fraudulent
    
    # Create normal transaction features
    normal_data = {
        'amount': np.random.gamma(shape=2.0, scale=20, size=n_normal),
        'hour_of_day': np.random.normal(12, 5, size=n_normal),
        'time_since_last_tx': np.random.exponential(24, size=n_normal),
        'recipient_frequency': np.random.exponential(0.1, size=n_normal),
        'distance_to_recipient_km': np.random.exponential(10, size=n_normal),
        'user_account_age_days': np.random.normal(500, 200, size=n_normal),
        'recipient_account_age_days': np.random.normal(500, 200, size=n_normal),
        'is_foreign_transaction': np.random.choice([0, 1], size=n_normal, p=[0.9, 0.1])
    }
    
    # Create anomalous transaction features
    fraud_data = {
        'amount': np.random.gamma(shape=5.0, scale=80, size=n_fraudulent),
        'hour_of_day': np.random.normal(2, 2, size=n_fraudulent),
        'time_since_last_tx': np.random.exponential(1, size=n_fraudulent),
        'recipient_frequency': np.random.exponential(0.01, size=n_fraudulent),
        'distance_to_recipient_km': np.random.exponential(100, size=n_fraudulent),
        'user_account_age_days': np.random.normal(50, 40, size=n_fraudulent),
        'recipient_account_age_days': np.random.normal(20, 10, size=n_fraudulent),
        'is_foreign_transaction': np.random.choice([0, 1], size=n_fraudulent, p=[0.5, 0.5])
    }
    
    # Create labels (0 for normal, 1 for fraud)
    normal_labels = np.zeros(n_normal)
    fraud_labels = np.ones(n_fraudulent)
    
    # Combine data
    df_normal = pd.DataFrame(normal_data)
    df_fraud = pd.DataFrame(fraud_data)
    
    df = pd.concat([df_normal, df_fraud])
    labels = np.concatenate([normal_labels, fraud_labels])
    
    return df, labels

def train_isolation_forest(contamination=0.05, model_dir="model", model_version=None):
    """Train an Isolation Forest model on transaction data."""
    try:
        logger.info("Starting Isolation Forest model training")
        
        # Generate or load data
        df, true_labels = generate_synthetic_data(n_samples=5000, fraud_ratio=contamination)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            df, true_labels, test_size=0.3, random_state=42, stratify=true_labels
        )
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Train model with hyperparameters
        model = IsolationForest(
            contamination=contamination, 
            n_estimators=100, 
            max_samples='auto',
            random_state=42
        )
        model.fit(X_train_scaled)
        
        # Make predictions
        # Note: Isolation Forest returns 1 for inliers and -1 for outliers
        # We need to convert this to match our labels (0=normal, 1=fraud)
        y_pred = (model.predict(X_test_scaled) == -1).astype(int)
        
        # Evaluate model
        report = classification_report(y_test, y_pred, output_dict=True)
        logger.info(f"Model Performance:\n{classification_report(y_test, y_pred)}")
        
        # Create version if not provided
        if model_version is None:
            model_version = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Create directory for model
        model_path = os.path.join(model_dir, model_version)
        os.makedirs(model_path, exist_ok=True)
        
        # Save model and artifacts
        with open(os.path.join(model_path, "isolation_forest.pkl"), "wb") as f:
            pickle.dump(model, f)
        
        with open(os.path.join(model_path, "scaler.pkl"), "wb") as f:
            pickle.dump(scaler, f)
        
        # Save feature names for later validation
        with open(os.path.join(model_path, "feature_names.json"), "w") as f:
            json.dump({"features": list(df.columns)}, f)
        
        # Save metadata
        metadata = {
            "model_type": "IsolationForest",
            "training_date": datetime.now().isoformat(),
            "contamination": contamination,
            "n_samples": len(df),
            "features": list(df.columns),
            "performance": report,
            "version": model_version
        }
        
        with open(os.path.join(model_path, "metadata.json"), "w") as f:
            json.dump(metadata, f, indent=2)
        
        # Create symlink to latest model
        current_symlink = os.path.join(model_dir, "current")
        if os.path.exists(current_symlink) and os.path.islink(current_symlink):
            os.unlink(current_symlink)
        os.symlink(model_version, current_symlink)
        
        logger.info(f"Model and artifacts saved to {model_path}")
        
        # Add backward compatibility by copying files to root model directory
        with open(os.path.join(model_dir, "isolation_forest.pkl"), "wb") as f:
            pickle.dump(model, f)
        
        with open(os.path.join(model_dir, "scaler.pkl"), "wb") as f:
            pickle.dump(scaler, f)
        
        # Test the model on sample transactions
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
        
        # Scale and predict
        normal_df = pd.DataFrame([normal_tx])
        anomalous_df = pd.DataFrame([anomalous_tx])
        
        normal_scaled = scaler.transform(normal_df)
        anomalous_scaled = scaler.transform(anomalous_df)
        
        normal_score = model.decision_function(normal_scaled)[0]
        anomalous_score = model.decision_function(anomalous_scaled)[0]
        
        # Convert to fraud score (0-100)
        normal_fraud_score = int(max(0, min(100, (1 - (normal_score + 0.5)) * 100)))
        anomalous_fraud_score = int(max(0, min(100, (1 - (anomalous_score + 0.5)) * 100)))
        
        logger.info(f"Normal transaction fraud score: {normal_fraud_score}")
        logger.info(f"Anomalous transaction fraud score: {anomalous_fraud_score}")
        
        return model, scaler, model_path
        
    except Exception as e:
        logger.error(f"Error training model: {str(e)}")
        raise

def build_autoencoder(input_dim):
    """Build an autoencoder model for anomaly detection."""
    # Define the encoder
    input_layer = tf.keras.layers.Input(shape=(input_dim,))
    encoder = tf.keras.layers.Dense(32, activation="relu")(input_layer)
    encoder = tf.keras.layers.Dense(16, activation="relu")(encoder)
    encoder = tf.keras.layers.Dense(8, activation="relu")(encoder)
    
    # Define the decoder
    decoder = tf.keras.layers.Dense(16, activation="relu")(encoder)
    decoder = tf.keras.layers.Dense(32, activation="relu")(decoder)
    decoder = tf.keras.layers.Dense(input_dim, activation="linear")(decoder)
    
    # Define the model
    autoencoder = tf.keras.models.Model(inputs=input_layer, outputs=decoder)
    autoencoder.compile(optimizer="adam", loss="mse")
    
    return autoencoder

def train_autoencoder(contamination=0.05, model_dir="model", model_version=None):
    """Train an Autoencoder model for anomaly detection."""
    try:
        logger.info("Starting Autoencoder model training")
        
        # Generate or load data
        df, true_labels = generate_synthetic_data(n_samples=5000, fraud_ratio=contamination)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            df, true_labels, test_size=0.3, random_state=42, stratify=true_labels
        )
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Build and train autoencoder
        autoencoder = build_autoencoder(X_train_scaled.shape[1])
        autoencoder.fit(
            X_train_scaled, 
            X_train_scaled,
            epochs=50,
            batch_size=32,
            validation_data=(X_test_scaled, X_test_scaled),
            verbose=0
        )
        
        # Calculate reconstruction error
        reconstructed = autoencoder.predict(X_test_scaled)
        mse = np.mean(np.power(X_test_scaled - reconstructed, 2), axis=1)
        
        # Determine threshold (95th percentile)
        threshold = np.percentile(mse, 95)
        
        # Classify based on threshold
        y_pred = (mse > threshold).astype(int)
        
        # Evaluate model
        report = classification_report(y_test, y_pred, output_dict=True)
        logger.info(f"Autoencoder Performance:\n{classification_report(y_test, y_pred)}")
        
        # Create version if not provided
        if model_version is None:
            model_version = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Create directory for model
        model_path = os.path.join(model_dir, model_version)
        os.makedirs(model_path, exist_ok=True)
        
        # Save model and artifacts
        # Note: For TF models, we save the model and also pickle it for compatibility
        autoencoder.save(os.path.join(model_path, "autoencoder_tf"))
        
        # Also save as pickle for compatibility with existing code
        with open(os.path.join(model_path, "autoencoder.pkl"), "wb") as f:
            pickle.dump(autoencoder, f)
        
        with open(os.path.join(model_path, "scaler_autoencoder.pkl"), "wb") as f:
            pickle.dump(scaler, f)
        
        with open(os.path.join(model_path, "threshold.json"), "w") as f:
            json.dump({"threshold": float(threshold)}, f)
        
        # Save metadata
        metadata = {
            "model_type": "Autoencoder",
            "training_date": datetime.now().isoformat(),
            "threshold": float(threshold),
            "n_samples": len(df),
            "features": list(df.columns),
            "performance": report,
            "version": model_version
        }
        
        with open(os.path.join(model_path, "metadata.json"), "w") as f:
            json.dump(metadata, f, indent=2)
        
        logger.info(f"Autoencoder model and artifacts saved to {model_path}")
        
        # Add backward compatibility by copying files to root model directory
        with open(os.path.join(model_dir, "autoencoder.pkl"), "wb") as f:
            pickle.dump(autoencoder, f)
        
        with open(os.path.join(model_dir, "scaler_autoencoder.pkl"), "wb") as f:
            pickle.dump(scaler, f)
        
        return autoencoder, scaler, threshold, model_path
        
    except Exception as e:
        logger.error(f"Error training autoencoder: {str(e)}")
        raise

def load_model(model_type="isolation_forest", model_version="latest", model_dir="model"):
    """Load a trained model and scaler."""
    try:
        if model_version == "latest":
            # Try to use the current symlink
            current_symlink = os.path.join(model_dir, "current")
            if os.path.exists(current_symlink) and os.path.islink(current_symlink):
                model_version = os.readlink(current_symlink)
            else:
                # Fall back to using files in the root directory
                model_version = None
        
        if model_version:
            model_path = os.path.join(model_dir, model_version)
        else:
            model_path = model_dir
        
        if model_type == "autoencoder":
            # First try to load TF model
            try:
                model = tf.keras.models.load_model(os.path.join(model_path, "autoencoder_tf"))
            except:
                # Fall back to pickle
                with open(os.path.join(model_path, "autoencoder.pkl"), "rb") as f:
                    model = pickle.load(f)
            
            with open(os.path.join(model_path, "scaler_autoencoder.pkl"), "rb") as f:
                scaler = pickle.load(f)
            
            try:
                with open(os.path.join(model_path, "threshold.json"), "r") as f:
                    threshold = json.load(f)["threshold"]
            except:
                # Default threshold if not found
                threshold = 0.05
            
            return model, scaler, threshold
        else:
            with open(os.path.join(model_path, "isolation_forest.pkl"), "rb") as f:
                model = pickle.load(f)
            
            with open(os.path.join(model_path, "scaler.pkl"), "rb") as f:
                scaler = pickle.load(f)
            
            try:
                with open(os.path.join(model_path, "metadata.json"), "r") as f:
                    metadata = json.load(f)
                    # Attach version to model for reference
                    model.version = metadata.get("version", "unknown")
            except:
                model.version = "unknown"
            
            return model, scaler, model.version
        
    except Exception as e:
        logger.error(f"Error loading model: {str(e)}")
        if os.path.exists(os.path.join(model_dir, "isolation_forest.pkl")):
            # Fall back to default files
            logger.info("Falling back to default model files")
            if model_type == "autoencoder":
                with open(os.path.join(model_dir, "autoencoder.pkl"), "rb") as f:
                    model = pickle.load(f)
                
                with open(os.path.join(model_dir, "scaler_autoencoder.pkl"), "rb") as f:
                    scaler = pickle.load(f)
                
                return model, scaler, 0.05
            else:
                with open(os.path.join(model_dir, "isolation_forest.pkl"), "rb") as f:
                    model = pickle.load(f)
                
                with open(os.path.join(model_dir, "scaler.pkl"), "rb") as f:
                    scaler = pickle.load(f)
                
                return model, scaler, "unknown"
        else:
            raise

def score_transaction(transaction, model_type="isolation_forest", model_version="latest"):
    """Score a transaction for fraud probability."""
    try:
        # Handle missing fields by using defaults
        required_fields = [
            'amount', 'hour_of_day', 'time_since_last_tx', 
            'recipient_frequency', 'distance_to_recipient_km'
        ]
        
        # Check if we have the minimum required fields
        for field in required_fields:
            if field not in transaction:
                raise ValueError(f"Missing required field: {field}")
        
        # Load the appropriate model
        if model_type == "autoencoder":
            model, scaler, threshold = load_model(model_type, model_version)
            
            # Convert transaction to DataFrame
            tx_df = pd.DataFrame([transaction])
            
            # Scale features
            tx_scaled = scaler.transform(tx_df)
            
            # Get reconstruction
            reconstructed = model.predict(tx_scaled)
            
            # Calculate reconstruction error (anomaly score)
            mse = np.mean(np.power(tx_scaled - reconstructed, 2), axis=1)[0]
            
            # Convert to 0-100 score
            fraud_score = int(np.clip(mse * 100, 0, 100))
            
            is_fraud = fraud_score > 80  # Configurable threshold
            
        else:  # isolation_forest
            model, scaler, model_version = load_model("isolation_forest", model_version)
            
            # Convert transaction to DataFrame
            tx_df = pd.DataFrame([transaction])
            
            # Scale features
            tx_scaled = scaler.transform(tx_df)
            
            # Get anomaly score (-1 for anomaly, 1 for normal)
            score = model.decision_function(tx_scaled)[0]
            
            # Convert to 0-100 score
            fraud_score = int(max(0, min(100, (1 - (score + 0.5)) * 100)))
            
            is_fraud = fraud_score > 80  # Configurable threshold
        
        return {
            "transaction": transaction,
            "fraud_score": fraud_score,
            "is_fraud": is_fraud,
            "model_type": model_type,
            "model_version": model_version
        }
        
    except Exception as e:
        logger.error(f"Error scoring transaction: {str(e)}")
        return {"error": str(e)}

def train_models():
    """Train both Isolation Forest and Autoencoder models."""
    model_dir = "model"
    os.makedirs(model_dir, exist_ok=True)
    
    # Train Isolation Forest
    isolation_version = datetime.now().strftime("%Y%m%d_%H%M%S_isolation")
    train_isolation_forest(model_dir=model_dir, model_version=isolation_version)
    
    # Train Autoencoder
    autoencoder_version = datetime.now().strftime("%Y%m%d_%H%M%S_autoencoder")
    train_autoencoder(model_dir=model_dir, model_version=autoencoder_version)
    
    logger.info("Both models trained and saved successfully")

if __name__ == "__main__":
    import sys
    
    # Check for command line arguments
    if len(sys.argv) > 1 and sys.argv[1] == "train":
        train_models()
    else:
        # Read transaction from stdin and score it
        try:
            input_json = json.loads(sys.stdin.read())
            # Support old as well as new payload shapes
            if isinstance(input_json, dict) and "transaction" in input_json:
                transaction = input_json["transaction"]
                model_type = input_json.get("model_type", "isolation_forest")
                model_version = input_json.get("model_version", "latest")
            else:
                transaction = input_json
                model_type = "isolation_forest"
                model_version = "latest"
                
            result = score_transaction(transaction, model_type, model_version)
            print(json.dumps(result))
        except Exception as e:
            print(json.dumps({"error": f"Failed to process input: {str(e)}"}))
            sys.exit(1)
