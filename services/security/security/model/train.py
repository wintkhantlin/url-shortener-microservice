import sys
from pathlib import Path
import logging

# Add project root to sys.path to allow imports
try:
    from security.model.trainer import PhishingModelTrainer
except ImportError:
    sys.path.append(str(Path(__file__).resolve().parent.parent.parent))
    from security.model.trainer import PhishingModelTrainer

# Configure logging
logging.basicConfig(level=logging.INFO)

def train_model():
    trainer = PhishingModelTrainer()
    try:
        trainer.train()
    except Exception as e:
        logging.error(f"Failed to train model: {e}")

if __name__ == "__main__":
    train_model()
