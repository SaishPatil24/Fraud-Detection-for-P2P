
import pickle
import pandas as pd
import numpy as np
import json
import sys

def load_model(model_type="isolation_forest"):
    try:
        if model_type == "autoencoder":
            with open("model/autoencoder.pkl", "rb") as f:
                model = pickle.load(f)
            with open("model/scaler_autoencoder.pkl", "rb") as f:
                scaler = pickle.load(f)
        else:
            with open("model/isolation_forest.pkl", "rb") as f:
                model = pickle.load(f)
            with open("model/scaler.pkl", "rb") as f:
                scaler = pickle.load(f)
        return model, scaler
    except Exception as e:
        print(f"Error loading model: {e}", file=sys.stderr)
        return None, None

def score_transaction(transaction, model, scaler, model_type="isolation_forest"):
    try:
        tx_df = pd.DataFrame([transaction])
        tx_scaled = scaler.transform(tx_df)
        if model_type == "autoencoder":
            reconstructed = model.predict(tx_scaled)
            # Anomaly score: mean squared error between input and reconstruction
            mse = np.mean(np.power(tx_scaled - reconstructed, 2), axis=1)
            # Convert to 0-100 score (tune this mapping as needed)
            fraud_score = int(np.clip(mse[0] * 100, 0, 100))
        else:
            score = model.decision_function(tx_scaled)[0]
            fraud_score = int(max(0, min(100, (1 - (score + 0.5)) * 100)))
        return {
            "transaction": transaction,
            "fraud_score": fraud_score,
            "is_fraud": fraud_score > 80
        }
    except Exception as e:
        print(f"Error scoring transaction: {e}", file=sys.stderr)
        return {"error": str(e)}

if __name__ == "__main__":
    # Read transaction + model_type from stdin (backward compatible)
    try:
        input_json = json.loads(sys.stdin.read())
        # Support old as well as new payload shapes
        if isinstance(input_json, dict) and "transaction" in input_json:
            transaction = input_json["transaction"]
            model_type = input_json.get("model_type", "isolation_forest")
        else:
            transaction = input_json
            model_type = input_json.get("model_type", "isolation_forest")
    except Exception as e:
        print(json.dumps({"error": f"Failed to parse input: {str(e)}"}))
        sys.exit(1)

    # Load the correct model
    model, scaler = load_model(model_type)
    if model is None or scaler is None:
        print(json.dumps({"error": "Failed to load model"}))
        sys.exit(1)

    result = score_transaction(transaction, model, scaler, model_type)
    print(json.dumps(result))
