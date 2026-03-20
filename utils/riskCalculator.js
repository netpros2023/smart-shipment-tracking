function calculateRisk(delay, weather, carrier) {
  const score = delay * 0.4 + weather * 0.3 + carrier * 0.3;

  return Math.round(score);
}

function getRiskLevel(score) {
  if (score < 30) return "LOW";

  if (score < 70) return "MEDIUM";

  return "HIGH";
}

module.exports = { calculateRisk, getRiskLevel };
