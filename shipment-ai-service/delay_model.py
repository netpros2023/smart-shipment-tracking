import numpy as np

def predict_delay_probability(distance, traffic, weather, reliability):
    # Simple weighted logic (can replace with ML later)
    
    score = (
        (distance * 0.002) +
        (traffic * 0.1) +
        (weather * 0.1) -
        (reliability * 0.08)
    )

    probability = 1 / (1 + np.exp(-score))  # sigmoid

    return round(float(probability * 100), 2)