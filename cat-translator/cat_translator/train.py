from pathlib import Path

import joblib
import numpy as np
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GroupKFold
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.svm import SVC

from .dataset import CLASSES, load_dataset
from .features import extract_aggregated

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"


def train(output_dir: str | None = None):
    if output_dir is None:
        output_dir = str(MODELS_DIR)
    Path(output_dir).mkdir(parents=True, exist_ok=True)

    print("Loading dataset...")
    samples = load_dataset()
    if not samples:
        print("No samples found. Run `meowtranslate download` first.")
        return

    print(f"Extracting features from {len(samples)} samples...")
    X, y, groups = [], [], []
    for fpath, label, cat_id in samples:
        feats = extract_aggregated(fpath)
        X.append(feats)
        y.append(label)
        groups.append(cat_id)

    X = np.array(X)
    y = np.array(y)
    groups = np.array(groups)

    le = LabelEncoder()
    y_enc = le.fit_transform(y)

    print(f"Feature dimension: {X.shape[1]}")
    print(f"Classes: {list(le.classes_)}")
    print(f"Unique cats: {len(set(groups))}")

    models = {
        "SVM (RBF)": CalibratedClassifierCV(
            SVC(kernel="rbf", C=10, gamma="scale", random_state=42),
            cv=3,
        ),
        "SVM (RBF, C=1)": CalibratedClassifierCV(
            SVC(kernel="rbf", C=1, gamma="scale", random_state=42), cv=3
        ),
        "SVM (RBF, C=100)": CalibratedClassifierCV(
            SVC(kernel="rbf", C=100, gamma="scale", random_state=42), cv=3
        ),
        "RandomForest": RandomForestClassifier(
            n_estimators=200, max_depth=10, random_state=42
        ),
        "LogisticRegression": LogisticRegression(
            max_iter=1000, C=1.0, random_state=42
        ),
    }

    gkf = GroupKFold(n_splits=5)
    best_name, best_score, best_clf = None, 0.0, None

    for name, clf in models.items():
        fold_scores = []
        for train_idx, test_idx in gkf.split(X, y_enc, groups):
            X_train, X_test = X[train_idx], X[test_idx]
            y_train, y_test = y_enc[train_idx], y_enc[test_idx]

            scaler = StandardScaler()
            X_train_s = scaler.fit_transform(X_train)
            X_test_s = scaler.transform(X_test)

            clf.fit(X_train_s, y_train)
            score = clf.score(X_test_s, y_test)
            fold_scores.append(score)

        mean_score = np.mean(fold_scores)
        std_score = np.std(fold_scores)
        print(f"\n{name}:")
        print(f"  Fold scores: {[f'{s:.2%}' for s in fold_scores]}")
        print(f"  Mean \u00b1 std: {mean_score:.2%} \u00b1 {std_score:.2%}")

        if mean_score > best_score:
            best_score = mean_score
            best_name = name
            best_clf = clf

    print(f"\nBest model: {best_name} ({best_score:.2%})")

    print("Retraining on full dataset...")
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    best_clf.fit(X_scaled, y_enc)

    joblib.dump(scaler, str(Path(output_dir) / "scaler.joblib"))
    joblib.dump(best_clf, str(Path(output_dir) / "model.joblib"))
    joblib.dump(le, str(Path(output_dir) / "label_encoder.joblib"))

    print(f"Model saved to {output_dir}")
    print("Done!")


if __name__ == "__main__":
    train()
