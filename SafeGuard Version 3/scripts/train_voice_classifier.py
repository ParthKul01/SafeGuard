#!/usr/bin/env python3
"""Train and export the SafeGuard transcript classifier from a labeled CSV."""
import argparse, csv, json, os, platform
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
import numpy as np
import sklearn
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.pipeline import FeatureUnion, Pipeline

CLASSES = ("NORMAL", "DISTRESS", "THREAT")
LABEL_IDS = {"NORMAL": "0", "DISTRESS": "1", "THREAT": "2"}
SEED, CHAR_WEIGHT, C = 42, 0.6, 2.0


def load_data(path):
    raw_rows = blank_rows = duplicate_rows = 0
    raw_counts, seen = Counter(), {}
    texts, labels = [], []
    with path.open("r", encoding="utf-8-sig", newline="") as source:
        reader = csv.DictReader(source)
        if not {"text", "label"}.issubset(set(reader.fieldnames or ())):
            raise ValueError("CSV must have 'text' and 'label' columns.")
        for line_number, row in enumerate(reader, start=2):
            raw_rows += 1
            label = (row.get("label") or "").strip().upper()
            text = (row.get("text") or "").strip()
            if label not in CLASSES:
                raise ValueError(f"Unknown label on CSV line {line_number}: {label!r}")
            raw_counts[label] += 1
            label_id = (row.get("label_id") or "").strip()
            if label_id and label_id != LABEL_IDS[label]:
                raise ValueError(f"label_id mismatch on CSV line {line_number}.")
            if not text:
                blank_rows += 1
                continue
            key = " ".join(text.split()).casefold()
            if key in seen:
                if seen[key] != label:
                    raise ValueError(f"Duplicate text has conflicting labels near CSV line {line_number}.")
                duplicate_rows += 1
                continue
            seen[key] = label
            texts.append(text)
            labels.append(label)
    unique_counts = Counter(labels)
    if set(unique_counts) != set(CLASSES):
        raise ValueError("Dataset must contain NORMAL, DISTRESS, and THREAT examples.")
    summary = {
        "rowsRead": raw_rows, "blankRowsSkipped": blank_rows,
        "duplicateRowsRemoved": duplicate_rows, "uniqueTranscripts": len(texts),
        "rawRowsByClass": {name: raw_counts[name] for name in CLASSES},
        "uniqueTranscriptsByClass": {name: unique_counts[name] for name in CLASSES},
    }
    return texts, labels, summary


def make_pipeline():
    features = FeatureUnion(
        [
            ("word", TfidfVectorizer(ngram_range=(1, 2), min_df=2, sublinear_tf=True)),
            ("char", TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), min_df=2, sublinear_tf=True)),
        ],
        transformer_weights={"word": 1.0, "char": CHAR_WEIGHT},
    )
    classifier = LogisticRegression(C=C, class_weight="balanced", max_iter=1500, solver="lbfgs", random_state=SEED)
    return Pipeline([("features", features), ("classifier", classifier)])


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    with temporary.open("w", encoding="utf-8", newline="\n") as output:
        json.dump(value, output, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
        output.write("\n")
    os.replace(temporary, path)


def main():
    root = Path(__file__).resolve().parents[1]
    voice_dir = root / "backend" / "src" / "ml" / "voice"
    parser = argparse.ArgumentParser(description="Train the SafeGuard transcript classifier.")
    parser.add_argument("--data", required=True, type=Path, help="CSV with text,label[,label_id] columns")
    parser.add_argument("--model", type=Path, default=voice_dir / "trainedModel.json")
    parser.add_argument("--report", type=Path, default=voice_dir / "training_report.json")
    args = parser.parse_args()

    texts, labels, data_summary = load_data(args.data)
    x_train, x_test, y_train, y_test = train_test_split(
        texts, labels, test_size=0.20, random_state=SEED, stratify=labels
    )
    evaluator = make_pipeline()
    evaluator.fit(x_train, y_train)
    predictions = evaluator.predict(x_test)
    probabilities = evaluator.predict_proba(x_test)
    eval_classifier = evaluator.named_steps["classifier"]
    metrics = classification_report(
        y_test, predictions, labels=CLASSES, target_names=CLASSES,
        output_dict=True, zero_division=0
    )
    one_hot = np.equal(np.asarray(y_test)[:, None], eval_classifier.classes_[None, :]).astype(float)
    brier = float(np.mean(np.sum((probabilities - one_hot) ** 2, axis=1)))

    # Preserve the held-out evaluation, then refit the deployed artifact on all unique text.
    model = make_pipeline()
    model.fit(texts, labels)
    classifier = model.named_steps["classifier"]
    union = model.named_steps["features"]
    word_vec, char_vec = union.transformer_list[0][1], union.transformer_list[1][1]
    word_size = len(word_vec.vocabulary_)
    report = {
        "model": "TF-IDF word and character n-grams with multinomial logistic regression",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "pythonVersion": platform.python_version(), "sklearnVersion": sklearn.__version__,
        "seed": SEED,
        "splitMethod": "Deduplicate normalized transcripts before stratified 80/20 train/test split",
        "trainSize": len(x_train), "testSize": len(x_test), "data": data_summary,
        "hyperparameters": {"C": C, "classWeight": "balanced", "wordNgrams": [1, 2],
                            "charWbNgrams": [3, 5], "characterBlockWeight": CHAR_WEIGHT},
        "test": {
            "accuracy": round(float(metrics["accuracy"]), 6),
            "macroF1": round(float(metrics["macro avg"]["f1-score"]), 6),
            "macroPrecision": round(float(metrics["macro avg"]["precision"]), 6),
            "macroRecall": round(float(metrics["macro avg"]["recall"]), 6),
            "multiclassBrierScore": round(brier, 6),
            "classMetrics": {label: {
                "precision": round(float(metrics[label]["precision"]), 6),
                "recall": round(float(metrics[label]["recall"]), 6),
                "f1": round(float(metrics[label]["f1-score"]), 6),
                "support": int(metrics[label]["support"]),
            } for label in CLASSES},
            "confusionMatrixLabels": list(CLASSES),
            "confusionMatrix": confusion_matrix(y_test, predictions, labels=CLASSES).tolist(),
        },
        "features": {"wordVocabularySize": word_size, "charVocabularySize": len(char_vec.vocabulary_)},
        "caveats": [
            "Evaluation uses distinct transcripts so duplicate text cannot leak across splits.",
            "Metrics measure agreement with supplied labels, not real-world danger detection.",
            "Confidence values are model estimates, not calibrated safety probabilities.",
        ],
    }
    artifact = {
        "format": "safeguard-tfidf-logreg-v1", "createdAt": report["createdAt"],
        "classes": [str(label) for label in classifier.classes_],
        "intercepts": [round(float(value), 8) for value in classifier.intercept_],
        "coefficients": [[round(float(value), 8) for value in row] for row in classifier.coef_],
        "featureBlocks": [
            {"name": "word", "offset": 0, "weight": 1.0,
             "vocabulary": word_vec.vocabulary_,
             "idf": [round(float(value), 8) for value in word_vec.idf_]},
            {"name": "char", "offset": word_size, "weight": CHAR_WEIGHT,
             "vocabulary": char_vec.vocabulary_,
             "idf": [round(float(value), 8) for value in char_vec.idf_]},
        ],
        "trainingSummary": {
            "uniqueTranscripts": data_summary["uniqueTranscripts"],
            "testMacroF1": round(float(metrics["macro avg"]["f1-score"]), 6),
        },
    }
    write_json(args.model, artifact)
    write_json(args.report, report)
    print(json.dumps({"modelPath": str(args.model), "reportPath": str(args.report), "report": report}, indent=2))


if __name__ == "__main__":
    main()
