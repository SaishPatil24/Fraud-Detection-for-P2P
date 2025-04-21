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
)

// Transaction represents a P2P payment transaction
type Transaction struct {
	ID                   string  `json:"id"`
	SenderID             string  `json:"sender_id"`
	RecipientID          string  `json:"recipient_id"`
	Amount               float64 `json:"amount"`
	HourOfDay            float64 `json:"hour_of_day"`
	TimeSinceLastTx      float64 `json:"time_since_last_tx"`
	RecipientFrequency   float64 `json:"recipient_frequency"`
	DistanceToRecipientKm float64 `json:"distance_to_recipient_km"`
	Date                 string  `json:"date"`
	Status               string  `json:"status"`
	FraudScore           int     `json:"fraud_score"`
}

// FraudResponse represents the response from the ML model
type FraudResponse struct {
	Transaction Transaction `json:"transaction"`
	FraudScore  int         `json:"fraud_score"`
	IsFraud     bool        `json:"is_fraud"`
	Error       string      `json:"error,omitempty"`
}

// ProcessTransaction processes a payment transaction and returns fraud assessment
func ProcessTransaction(tx Transaction, modelType string) (*FraudResponse, error) {
	features := map[string]float64{
		"amount":                 tx.Amount,
		"hour_of_day":            tx.HourOfDay,
		"time_since_last_tx":     tx.TimeSinceLastTx,
		"recipient_frequency":    tx.RecipientFrequency,
		"distance_to_recipient_km": tx.DistanceToRecipientKm,
	}

	// Prepare the payload: include model_type key for backend selection
	requestPayload := map[string]interface{}{
		"transaction": features,
		"model_type":  modelType,
	}
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

	tx.FraudScore = response.FraudScore

	if response.IsFraud {
		tx.Status = "flagged"
	} else {
		tx.Status = "completed"
	}

	response.Transaction = tx

	return &response, nil
}

// Handler for processing payment transactions
func processPaymentHandler(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	// Handle preflight requests
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Only allow POST requests
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse request with optional model_type
	var reqBody struct {
		Transaction Transaction `json:"transaction"`
		ModelType   string      `json:"model_type"`
	}
	err := json.NewDecoder(r.Body).Decode(&reqBody)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	tx := reqBody.Transaction
	modelType := reqBody.ModelType
	if modelType != "autoencoder" {
		modelType = "isolation_forest"
	}
	
	// Generate a transaction ID if not provided
	if tx.ID == "" {
		tx.ID = fmt.Sprintf("TX%d", rand.Intn(900000)+100000)
	}
	
	// Set current date if not provided
	if tx.Date == "" {
		tx.Date = time.Now().Format(time.RFC3339)
	}

	// Process the transaction
	response, err := ProcessTransaction(tx, modelType)
	if err != nil {
		log.Printf("Error processing transaction: %v", err)
		http.Error(w, "Error processing transaction", http.StatusInternalServerError)
		return
	}

	// Return the processed transaction
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func main() {
	// Seed the random number generator
	rand.Seed(time.Now().UnixNano())

	// Set up the HTTP server
	http.HandleFunc("/process-payment", processPaymentHandler)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Starting payment service on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
