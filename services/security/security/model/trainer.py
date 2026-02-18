import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
import joblib
from pathlib import Path
import logging

# Configure logging
logger = logging.getLogger(__name__)

class PhishingModelTrainer:
    def __init__(self, data_path=None, artifacts_dir=None):
        self.base_dir = Path(__file__).resolve().parent
        
        if data_path is None:
            self.data_path = self.base_dir / "live_features_dataset.csv"
        else:
            self.data_path = Path(data_path)
            
        if artifacts_dir is None:
            self.artifacts_dir = self.base_dir / "artifacts"
        else:
            self.artifacts_dir = Path(artifacts_dir)
            
        self.model_path = self.artifacts_dir / "model.joblib"
        self.feature_names_path = self.artifacts_dir / "model_features.joblib"
        
        # Ensure artifacts directory exists
        self.artifacts_dir.mkdir(parents=True, exist_ok=True)

    def train(self):
        logger.info(f"Loading dataset from {self.data_path}...")
        try:
            df = pd.read_csv(self.data_path)
        except FileNotFoundError:
            logger.error(f"Error: Dataset not found at {self.data_path}")
            raise
            
        # Try to load and combine StealthPhisher dataset if available
        stealth_path = self.base_dir / "StealthPhisher2025.csv"
        if stealth_path.exists():
            logger.info(f"Found additional dataset at {stealth_path}. Combining...")
            try:
                stealth_df = pd.read_csv(stealth_path)
                
                # Map column names from StealthPhisher to our feature set
                # Our features: LengthOfURL, DomainLength, IsDomainIP, TLDLength, NoOfSubDomain, HasHTTPS, 
                # LetterRatio, DigitRatio, SpecialCharRatio, IsUnreachable, HasTitle, HasFavicon, 
                # HasPasswordField, HasSubmitButton, HasIFrame, LineCount
                
                # StealthPhisher has many columns, we need to map the matching ones
                # Mappings based on column inspection:
                # LengthOfURL -> LengthOfURL
                # DomainLength -> DomainLengthOfURL
                # IsDomainIP -> IsDomainIP
                # TLDLength -> TLDLength
                # NoOfSubDomain -> NumberOfSubdomains
                # HasHTTPS -> HasSSL
                # LetterRatio -> URLLetterRatio
                # DigitRatio -> URLDigitRatio
                # SpecialCharRatio -> URLOtherSpclCharRatio
                # IsUnreachable -> IsUnreachable
                # HasTitle -> HasTitle
                # HasFavicon -> HasFavicon
                # HasPasswordField -> HasPasswordFields
                # HasSubmitButton -> HasSubmitButton
                # HasIFrame -> HasIFrame
                # LineCount -> LineOfCode
                
                mapping = {
                    'LengthOfURL': 'LengthOfURL',
                    'DomainLengthOfURL': 'DomainLength',
                    'IsDomainIP': 'IsDomainIP',
                    'TLDLength': 'TLDLength',
                    'NumberOfSubdomains': 'NoOfSubDomain',
                    'HasSSL': 'HasHTTPS',
                    'URLLetterRatio': 'LetterRatio',
                    'URLDigitRatio': 'DigitRatio',
                    'URLOtherSpclCharRatio': 'SpecialCharRatio',
                    'IsUnreachable': 'IsUnreachable',
                    'HasTitle': 'HasTitle',
                    'HasFavicon': 'HasFavicon',
                    'HasPasswordFields': 'HasPasswordField',
                    'HasSubmitButton': 'HasSubmitButton',
                    'HasIFrame': 'HasIFrame',
                    'LineOfCode': 'LineCount',
                    'Label': 'Label',
                    'URL': 'URL'
                }
                
                # Select only columns that exist in mapping and rename them
                # Reverse mapping to find stealth columns
                reverse_mapping = {v: k for k, v in mapping.items()}
                
                # We want to create a DF with 'df.columns'
                # Iterate over target columns (df.columns) and pull from stealth_df using mapping
                
                new_data = {}
                for target_col in df.columns:
                    if target_col in reverse_mapping:
                        source_col = reverse_mapping[target_col]
                        if source_col in stealth_df.columns:
                             new_data[target_col] = stealth_df[source_col]
                        else:
                             new_data[target_col] = 0
                    elif target_col == 'Label':
                         new_data[target_col] = stealth_df['Label'].apply(lambda x: 1 if str(x).lower() == 'phishing' else 0)
                    elif target_col == 'URL':
                         if 'URL' in stealth_df.columns:
                             new_data[target_col] = stealth_df['URL']
                         else:
                             new_data[target_col] = "unknown"
                    else:
                         new_data[target_col] = 0
                
                renamed_df = pd.DataFrame(new_data)
                
                # Ensure numeric types
                # First concat, then convert types on the full dataframe to avoid mismatches
                logger.info(f"Added {len(renamed_df)} samples from StealthPhisher dataset.")
                df = pd.concat([df, renamed_df], ignore_index=True)
                
                # Convert all columns except URL and Label to numeric
                for col in df.columns:
                    if col not in ['URL', 'Label']:
                        # Ensure no string/object types remain
                        df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

                # Ensure Label is int
                df['Label'] = pd.to_numeric(df['Label'], errors='coerce').fillna(0).astype(int)
                
            except Exception as e:
                logger.warning(f"Failed to load or merge StealthPhisher dataset: {e}")

        # Drop non-feature columns
        # Assuming 'URL' and 'Label' are the non-feature columns
        # Check if they exist first to be safe, or just drop
        drop_cols = [col for col in ['URL', 'Label'] if col in df.columns]
        X = df.drop(columns=drop_cols)
        y = df['Label']
        
        # Handle NaNs
        X = X.fillna(0)
        
        # Split
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        logger.info(f"Training Random Forest on {len(X_train)} samples...")
        # Use balanced class weight since our sample is imbalanced
        rf = RandomForestClassifier(n_estimators=100, random_state=42, class_weight='balanced')
        rf.fit(X_train, y_train)
        
        logger.info("Evaluating...")
        y_pred = rf.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        logger.info(f"Accuracy: {accuracy:.4f}")
        logger.info("\n" + classification_report(y_test, y_pred))
        
        logger.info(f"Saving model to {self.model_path}...")
        joblib.dump(rf, self.model_path)
        
        # Save feature names for consistency check
        joblib.dump(list(X.columns), self.feature_names_path)
        logger.info("Training completed successfully.")
        
        return accuracy
