package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"os/exec"
	"time"
	"strings"
	"github.com/sony/gobreaker"  // You'll need to add this dependency
)

// Transaction represents a P2P payment transaction
type Transaction struct {
	ID                     string  `json:"id"`
	SenderID               string  `json:"sender_id"`
	RecipientID            string  `json:"recipient_id"`
	Amount                 float64 `json:"amount"`
	HourOfDay              float64 `json:"hour_of_day"`
	TimeSinceLastTx        float64 `json:"time_since_last_tx"`
	RecipientFrequency     float64 `json:"recipient_frequency"`
	DistanceToRecipientKm  float64 `json:"distance_to_recipient_km"`
	UserAccountAgeDays     float64 `json:"user_account_age_days,omitempty"`
	RecipientAccountAgeDays float64 `json:"recipient_account_age_days,omitempty"`
	IsForeignTransaction   int     `json:"is_foreign_transaction,omitempty"`
	Date                   string  `json:"date"`
	Status                 string  `json:"status"`
	FraudScore             int     `json:"fraud_score"`
	ModelType              string  `json:"model_type,omitempty"`
	ModelVersion           string  `json:"model_version,omitempty"`
}

// FraudResponse represents the response from the ML model
type FraudResponse struct {
	Transaction   map[string]interface{} `json:"transaction"`
	FraudScore    int                    `json:"fraud_score"`
	IsFraud       bool                   `json:"is_fraud"`
	ModelType     string                 `json:"model_type,omitempty"`
	ModelVersion  string                 `json:"model_version,omitempty"`
	Error         string                 `json:"error,omitempty"`
}

// CircuitBreakers holds all circuit breakers
var CircuitBreakers = struct {
	MLModel *gobreaker.CircuitBreaker
}{}

func init() {
	// Initialize circuit breakers
	CircuitBreakers.MLModel = gobreaker.NewCircuitBreaker(gobreaker.Settings{
		Name:        "ml-model",
		MaxRequests: 5,
		Interval:    time.Minute,
		Timeout:     30 * time.Second,
		ReadyToTrip: func(counts gobreaker.Counts) bool {
			failureRatio := float64(counts.TotalFailures) / float64(counts.Requests)
			return counts.Requests >= 3 && failureRatio >= 0.6
		},
		OnStateChange: func(name string, from gobreaker.State, to gobreaker.State) {
			log.Printf("Circuit breaker %s changed from %s to %s", name, from, to)
		},
	})
}

// ProcessTransaction processes a payment transaction and returns fraud assessment
func ProcessTransaction(tx Transaction, modelType string, modelVersion string) (*FraudResponse, error) {
	// Try to generate missing features that might improve fraud detection
	enrichTransactionFeatures(&tx)

	// Extract relevant features for the ML model
	features := map[string]interface{}{
		"amount":                  tx.Amount,
		"hour_of_day":             tx.HourOfDay,
		"time_since_last_tx":      tx.TimeSinceLastTx,
		"recipient_frequency":     tx.RecipientFrequency,
		"distance_to_recipient_km": tx.DistanceToRecipientKm,
	}

	// Add additional features if available
	if tx.UserAccountAgeDays > 0 {
		features["user_account_age_days"] = tx.UserAccountAgeDays
	}
	if tx.RecipientAccountAgeDays > 0 {
		features["recipient_account_age_days"] = tx.RecipientAccountAgeDays
	}
	if tx.IsForeignTransaction >= 0 {
		features["is_foreign_transaction"] = tx.IsForeignTransaction
	}

	// Prepare the payload with model selection
	requestPayload := map[string]interface{}{
		"transaction":  features,
		"model_type":   modelType,
		"model_version": modelVersion,
	}

	// Use circuit breaker to prevent cascading failures
	result, err := CircuitBreakers.MLModel.Execute(func() (interface{}, error) {
		return callMLModel(requestPayload)
	})

	if err != nil {
		log.Printf("Circuit breaker error: %v", err)
		return nil, fmt.Errorf("error calling ML model service: %v", err)
	}

	response := result.(*FraudResponse)

	// Update the transaction with fraud results
	tx.FraudScore = response.FraudScore
	tx.ModelType = response.ModelType
	tx.ModelVersion = response.ModelVersion

	if response.IsFraud {
		tx.Status = "flagged"
	} else {
		tx.Status = "completed"
	}

	// Convert transaction back to map format for consistency with the response
	txJson, _ := json.Marshal(tx)
	var txMap map[string]interface{}
	json.Unmarshal(txJson, &txMap)
	response.Transaction = txMap

	return response, nil
}

// callMLModel executes the Python ML model and returns the result
func callMLModel(requestPayload map[string]interface{}) (*FraudResponse, error) {
	featuresJSON, err := json.Marshal(requestPayload)
	if err != nil {
		return nil, fmt.Errorf("error marshaling features: %v", err)
	}

	cmd := exec.Command("python3", "ml_model/predict.py")
	cmd.Stdin = bytes.NewBuffer(featuresJSON)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err = cmd.Run()
	if err != nil {
		log.Printf("Error running ML model: %v\nStderr: %s", err, stderr.String())
		return nil, fmt.Errorf("error running ML model: %v", err)
	}

	var response FraudResponse
	err = json.Unmarshal(stdout.Bytes(), &response)
	if err != nil {
		return nil, fmt.Errorf("error parsing ML model response: %v", err)
	}

	return &response, nil
}

// enrichTransactionFeatures adds derived features that might help fraud detection
func enrichTransactionFeatures(tx *Transaction) {
	// If account age not provided, generate reasonable values
	if tx.UserAccountAgeDays == 0 {
		// Generate a random value - in production, this would come from a database
		tx.UserAccountAgeDays = rand.Float64() * 1000
	}

	if tx.RecipientAccountAgeDays == 0 {
		tx.RecipientAccountAgeDays = rand.Float64() * 1000
	}

	// If foreign transaction flag not set, determine based on IDs
	if tx.IsForeignTransaction < 0 {
		// Simple heuristic: if recipient ID has different prefix than sender ID
		// In production, this would use actual country codes or bank identifiers
		senderPrefix := strings.Split(tx.SenderID, "-")[0]
		recipientPrefix := strings.Split(tx.RecipientID, "-")[0]
		
		if senderPrefix != recipientPrefix {
			tx.IsForeignTransaction = 1
		} else {
			tx.IsForeignTransaction = 0
		}
	}
}

// Health check endpoint
func healthCheckHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
}

// Fraud detection API endpoint handler
func fraudDetectionHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Only POST method is allowed", http.StatusMethodNotAllowed)
		return
	}

	var tx Transaction
	err := json.NewDecoder(r.Body).Decode(&tx)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Extract model type and version from request headers or use defaults
	modelType := r.Header.Get("X-Model-Type")
	if modelType == "" {
		modelType = "xgboost" // Default model type
	}

	modelVersion := r.Header.Get("X-Model-Version")
	if modelVersion == "" {
		modelVersion = "v1" // Default model version
	}

	// Process the transaction
	response, err := ProcessTransaction(tx, modelType, modelVersion)
	if err != nil {
		log.Printf("Error processing transaction: %v", err)
		http.Error(w, "Error processing transaction", http.StatusInternalServerError)
		return
	}

	// Return the fraud detection results
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func main() {
	// Initialize random seed
	rand.Seed(time.Now().UnixNano())

	// Get port from environment or use default
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Register HTTP handlers
	http.HandleFunc("/health", healthCheckHandler)
	http.HandleFunc("/api/v1/detect-fraud", fraudDetectionHandler)

	// Start the server
	log.Printf("Starting fraud detection service on port %s", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
