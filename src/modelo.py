"""
PASO 3 — Entrenamiento del modelo ML
Predice qué zonas de Mérida tienen mayor potencial de formalización.

Modelos usados:
1. Random Forest — robusto, interpreta importancia de variables
2. XGBoost — mejor precisión en datos desbalanceados
"""

import os
import pickle
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import (
    classification_report, confusion_matrix, roc_auc_score,
    roc_curve, ConfusionMatrixDisplay
)
from sklearn.utils.class_weight import compute_class_weight
import xgboost as xgb

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.config import DATA_PROC, MAPAS_DIR
from src.features import preparar_para_modelo


def entrenar_modelo(X, y, columnas_x):
    """
    Entrena Random Forest y XGBoost, compara resultados.
    """
    print("\n=== ENTRENANDO MODELOS ===")

    # Split entrenamiento / prueba (80/20)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"  Entrenamiento: {len(X_train):,} | Prueba: {len(X_test):,}")

    # Manejo de clases desbalanceadas
    clases = np.unique(y)
    if len(clases) < 2:
        print("[ERROR] El target solo tiene una clase — no hay nada que aprender.")
        print("        Revisa la definición de 'alta_formalizacion' en features.py")
        return None, None, None, None
    pesos = compute_class_weight("balanced", classes=clases, y=y)
    class_weight = dict(zip(clases, pesos))
    print(f"  Peso clase 0: {class_weight[0]:.2f} | Peso clase 1: {class_weight[1]:.2f}")

    resultados = {}

    # ---- Modelo 1: Random Forest ----
    print("\n[1/2] Entrenando Random Forest...")
    rf = RandomForestClassifier(
        n_estimators=300,
        max_depth=8,
        min_samples_leaf=5,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1
    )
    rf.fit(X_train, y_train)

    y_pred_rf = rf.predict(X_test)
    y_prob_rf = rf.predict_proba(X_test)[:, 1]
    auc_rf = roc_auc_score(y_test, y_prob_rf)
    print(f"  AUC-ROC Random Forest: {auc_rf:.4f}")
    print(classification_report(y_test, y_pred_rf, target_names=["Baja formal.", "Alta formal."]))
    resultados["RandomForest"] = {"modelo": rf, "auc": auc_rf, "proba": y_prob_rf}

    # ---- Modelo 2: XGBoost ----
    print("[2/2] Entrenando XGBoost...")
    scale_pos = (y == 0).sum() / max((y == 1).sum(), 1)
    xgb_model = xgb.XGBClassifier(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=scale_pos,
        random_state=42,
        eval_metric="logloss",
        verbosity=0
    )
    xgb_model.fit(X_train, y_train)

    y_pred_xgb = xgb_model.predict(X_test)
    y_prob_xgb = xgb_model.predict_proba(X_test)[:, 1]
    auc_xgb = roc_auc_score(y_test, y_prob_xgb)
    print(f"  AUC-ROC XGBoost: {auc_xgb:.4f}")
    print(classification_report(y_test, y_pred_xgb, target_names=["Baja formal.", "Alta formal."]))
    resultados["XGBoost"] = {"modelo": xgb_model, "auc": auc_xgb, "proba": y_prob_xgb}

    # ---- Seleccionar el mejor ----
    mejor_nombre = max(resultados, key=lambda k: resultados[k]["auc"])
    mejor = resultados[mejor_nombre]
    print(f"\n[GANADOR] {mejor_nombre} con AUC = {mejor['auc']:.4f}")

    # Guardar modelos
    os.makedirs(DATA_PROC, exist_ok=True)
    for nombre, res in resultados.items():
        ruta = os.path.join(DATA_PROC, f"modelo_{nombre.lower()}.pkl")
        with open(ruta, "wb") as f:
            pickle.dump(res["modelo"], f)
        print(f"  Guardado: {ruta}")

    # ---- Graficar importancia de variables (Random Forest) ----
    graficar_importancia(rf, columnas_x)

    # ---- Curva ROC ----
    graficar_roc(y_test, resultados)

    return mejor["modelo"], mejor_nombre, X_test, y_test


def graficar_importancia(modelo, columnas):
    """Gráfica de importancia de variables del Random Forest."""
    importancias = modelo.feature_importances_
    df_imp = pd.DataFrame({
        "variable": columnas,
        "importancia": importancias
    }).sort_values("importancia", ascending=True)

    fig, ax = plt.subplots(figsize=(8, 6))
    bars = ax.barh(df_imp["variable"], df_imp["importancia"], color="steelblue")
    ax.set_xlabel("Importancia")
    ax.set_title("¿Qué variables predicen mejor la formalización?\n(Random Forest)", fontsize=13)
    ax.bar_label(bars, fmt="%.3f", padding=3, fontsize=9)
    plt.tight_layout()

    ruta = os.path.join(MAPAS_DIR, "importancia_variables.png")
    os.makedirs(MAPAS_DIR, exist_ok=True)
    plt.savefig(ruta, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"[OK] Gráfica importancia: {ruta}")


def graficar_roc(y_test, resultados):
    """Curva ROC comparando modelos."""
    fig, ax = plt.subplots(figsize=(7, 6))
    colores = {"RandomForest": "steelblue", "XGBoost": "tomato"}

    for nombre, res in resultados.items():
        fpr, tpr, _ = roc_curve(y_test, res["proba"])
        ax.plot(fpr, tpr, label=f"{nombre} (AUC={res['auc']:.3f})",
                color=colores.get(nombre, "gray"), linewidth=2)

    ax.plot([0, 1], [0, 1], "k--", linewidth=1, label="Aleatorio (AUC=0.5)")
    ax.set_xlabel("Tasa Falsos Positivos")
    ax.set_ylabel("Tasa Verdaderos Positivos")
    ax.set_title("Curva ROC — Predicción de Formalización\nMérida, Yucatán", fontsize=13)
    ax.legend()
    ax.grid(alpha=0.3)

    ruta = os.path.join(MAPAS_DIR, "curva_roc.png")
    plt.savefig(ruta, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"[OK] Curva ROC: {ruta}")


def predecir_todas_las_zonas(modelo, df_features, columnas_x, scaler):
    """
    Aplica el modelo a TODAS las zonas de Mérida para generar el mapa de predicciones.
    Devuelve df_features con columna 'prob_formalizacion' (0-100%).
    """
    print("\nGenerando predicciones para todas las zonas...")

    df = df_features[columnas_x + ["zona_id", "lat_centro", "lon_centro"]].dropna().copy()

    X = scaler.transform(df[columnas_x].values)
    df["prob_formalizacion"] = modelo.predict_proba(X)[:, 1]
    df["score_100"] = (df["prob_formalizacion"] * 100).round(1)
    df["nivel"] = pd.cut(
        df["prob_formalizacion"],
        bins=[0, 0.25, 0.5, 0.75, 1.0],
        labels=["Bajo", "Medio", "Alto", "Muy alto"]
    )

    ruta = os.path.join(DATA_PROC, "predicciones_zonas.csv")
    df.to_csv(ruta, index=False)
    print(f"[OK] Predicciones guardadas: {ruta}")
    print(f"  Zonas con potencial ALTO o MUY ALTO: {(df['prob_formalizacion'] >= 0.5).sum()}")

    return df


def main():
    ruta_feat = os.path.join(DATA_PROC, "features_zonas.csv")
    if not os.path.exists(ruta_feat):
        print("[ERROR] Primero ejecuta: python src/features.py")
        return

    df_features = pd.read_csv(ruta_feat)
    X, y, df_modelo, columnas, scaler = preparar_para_modelo(df_features)

    if X.shape[0] < 50:
        print("[ERROR] Muy pocos datos para entrenar. Revisa la descarga del DENUE.")
        return

    mejor_modelo, nombre, X_test, y_test = entrenar_modelo(X, y, columnas)

    # Predicciones finales
    df_pred = predecir_todas_las_zonas(mejor_modelo, df_features, columnas, scaler)

    print("\n=== TOP 10 ZONAS CON MAYOR POTENCIAL DE FORMALIZACIÓN ===")
    top10 = df_pred.nlargest(10, "prob_formalizacion")[
        ["zona_id", "lat_centro", "lon_centro", "score_100", "nivel"]
    ]
    print(top10.to_string(index=False))


if __name__ == "__main__":
    main()
