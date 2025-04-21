# ml_model/predict.py
import pickle
import pandas as pd
import numpy as np
import json
import sys
import os
import logging
from fraud_detection import score_transaction, load_model

# Set up logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    # Read transaction + model_type from stdin
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
    except Exception as e:
        print(json.dumps({"error": f"Failed to parse input: {str(e)}"}))
        sys.exit(1)

    # Score the transaction using our enhanced module
    result = score_transaction(transaction, model_type, model_version)
    
    # Ensure backward compatibility with original output format
    if "error" in result:
        print(json.dumps(result))
        sys.exit(1)
    
    # Extract the fraud score and decision
    fraud_score = result["fraud_score"]
    is_fraud = result["is_fraud"]
    
    # Format response to match original format
    response = {
        "transaction": transaction,
        "fraud_score": fraud_score,
        "is_fraud": is_fraud
    }
    
    print(json.dumps(response))
