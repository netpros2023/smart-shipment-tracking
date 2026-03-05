from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import numpy as np

app = FastAPI()

# 🔹 Load ETA Regression Model
model = joblib.load("eta_model.pkl")


# ============================================
# 🔹 Request Schema
# ============================================
class ETARequest(BaseModel):
    distance: float
    speed: float
    traffic: float
    weather: float
    reliability: float


# ============================================
# 🔹 ETA Prediction Endpoint
# ============================================
@app.post("/predict-eta")
def predict_eta(data: ETARequest):

    features = np.array([
        [
            data.distance,
            data.speed,
            data.traffic,
            data.weather,
            data.reliability
        ]
    ])

    prediction = model.predict(features)

    return {
        "predicted_eta_hours": round(float(prediction[0]), 2)
    }


# ============================================
# 🔹 Delay Probability Logic
# ============================================
def predict_delay_probability(distance, traffic, weather, reliability):

    # Simple weighted score logic (can upgrade to ML later)
    score = (
        (distance * 0.002) +
        (traffic * 0.1) +
        (weather * 0.1) -
        (reliability * 0.08)
    )

    probability = 1 / (1 + np.exp(-score))  # Sigmoid function

    return round(float(probability * 100), 2)


# ============================================
# 🔹 Delay Prediction Endpoint
# ============================================
@app.post("/predict-delay")
def predict_delay(data: ETARequest):

    probability = predict_delay_probability(
        data.distance,
        data.traffic,
        data.weather,
        data.reliability
    )

    return {
        "delay_probability_percent": probability
    }