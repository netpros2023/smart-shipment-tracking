import pandas as pd
from sklearn.linear_model import LinearRegression
import joblib
import numpy as np

# Fake training data
data = {
    "distance": [100, 200, 150, 300, 250],
    "speed": [60, 50, 55, 70, 65],
    "traffic": [2, 5, 3, 4, 6],
    "weather": [1, 3, 2, 4, 2],
    "reliability": [8, 6, 7, 5, 9],
}

df = pd.DataFrame(data)

# ETA target (dummy formula)
df["eta"] = (
    df["distance"] / df["speed"]
    + df["traffic"] * 0.5
    + df["weather"] * 0.3
    - df["reliability"] * 0.2
)

X = df[["distance", "speed", "traffic", "weather", "reliability"]]
y = df["eta"]

model = LinearRegression()
model.fit(X, y)

joblib.dump(model, "eta_model.pkl")

print("Model trained and saved!")