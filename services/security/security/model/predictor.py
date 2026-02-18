import logging
import joblib
import numpy as np
from pathlib import Path
from typing import Tuple, Optional

from security.model.features import extract_features

# Configure logging
logger = logging.getLogger(__name__)

class PhishingDetector:
    def __init__(self, model_path: Optional[Path] = None):
        """
        Initialize the PhishingDetector with a trained model.
        
        Args:
            model_path: Path to the trained .joblib model file. 
                        If None, tries to find it in the default location.
        """
        if model_path is None:
            base_dir = Path(__file__).resolve().parent
            model_path = base_dir / "artifacts" / "model.joblib"
            
        self.model_path = model_path
        self.model = None
        self._load_model()

    def _load_model(self):
        """Loads the model from disk."""
        if not self.model_path.exists():
            logger.warning(f"Model file not found at {self.model_path}. Prediction will be disabled.")
            return

        try:
            logger.info(f"Loading model from {self.model_path}...")
            self.model = joblib.load(self.model_path)
            logger.info("Model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            self.model = None

    def predict(self, url: str) -> Tuple[bool, float]:
        """
        Predict if a URL is phishing.

        Args:
            url: The URL to check.

        Returns:
            Tuple containing:
            - is_phishing (bool): True if phishing, False if legitimate.
            - confidence (float): Probability of the predicted class (0.0 to 1.0).
            
            Returns (False, 0.0) if model is not loaded or error occurs.
        """
        if self.model is None:
            logger.warning("Model not loaded. Returning default safe prediction.")
            return False, 0.0

        try:
            # Extract features
            features = extract_features(url)
            
            # Predict
            # Class 1 = Phishing, Class 0 = Legitimate
            pred = self.model.predict(features)[0]
            probs = self.model.predict_proba(features)[0]
            
            is_phishing = bool(pred == 1)
            confidence = float(probs[1] if is_phishing else probs[0])
            
            return is_phishing, confidence

        except Exception as e:
            logger.error(f"Error predicting URL {url}: {e}")
            return False, 0.0

    def get_phishing_score(self, url: str) -> float:
        """
        Get the raw probability of the URL being phishing.
        
        Returns:
            float: Probability between 0.0 and 1.0.
        """
        if self.model is None:
            return 0.0
            
        try:
            features = extract_features(url)
            probs = self.model.predict_proba(features)[0]
            # Assuming index 1 is the positive class (Phishing)
            return float(probs[1])
        except Exception as e:
            logger.error(f"Error getting score for URL {url}: {e}")
            return 0.0
