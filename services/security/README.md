# URL Security Service

This service provides phishing detection for URLs using a Random Forest model trained on live data.

## Structure

- `security/model/`: Core model logic.
    - `features.py`: Feature extraction logic (16 features).
    - `predictor.py`: `PhishingDetector` class for loading model and predicting.
    - `trainer.py`: `PhishingModelTrainer` class for training the model.
    - `train.py`: Script to train the model.
    - `check_url.py`: Interactive CLI tool.
    - `artifacts/`: Trained models (`model.joblib`).
- `security/worker/`: Kafka worker for asynchronous scanning.

## Running the Worker

The worker listens to `alias.created` Kafka topic and scans URLs concurrently.
Results are produced to `alias.checked` topic.

1. Install dependencies:
   ```bash
   uv sync
   ```

2. Run the worker:
   ```bash
   export PYTHONPATH=$PYTHONPATH:.
   uv run python -m security.worker.worker
   ```

## Training the Model

To retrain the model with new data:

1. Update `security/model/live_features_dataset.csv` or `StealthPhisher2025.csv` if needed.
2. Run training:
   ```bash
   export PYTHONPATH=$PYTHONPATH:.
   uv run python security/model/train.py
   ```

## Checking a URL

To manually check a URL:

```bash
export PYTHONPATH=$PYTHONPATH:.
uv run python security/model/check_url.py google.com
```
