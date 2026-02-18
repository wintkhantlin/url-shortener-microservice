from .predictor import PhishingDetector
from .trainer import PhishingModelTrainer

# Lazy import for scripts to avoid circular dependencies or import errors in worker
# interactive_check and train_model are only needed for CLI scripts, not for worker/inference

__all__ = ["PhishingDetector", "PhishingModelTrainer"]
