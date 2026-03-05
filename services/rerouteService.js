const axios = require("axios");

/* ============================================
   ALTERNATIVE ROUTE ENGINE (SIMULATION)
============================================ */

exports.getAlternativeRoute = async (origin, destination) => {
  try {
    console.log("Checking alternative routes...");
    console.log("Origin:", origin);
    console.log("Destination:", destination);

    /* 
    Since we are not using Google Maps API
    we simulate alternate route suggestions
    */

    const routes = [
      {
        summary: "NH544 Highway Route",
        distance: "210 km",
        duration: "3 hours 40 minutes",
      },
      {
        summary: "City Bypass Route",
        distance: "195 km",
        duration: "4 hours 10 minutes",
      },
      {
        summary: "Express Toll Road",
        distance: "205 km",
        duration: "3 hours 25 minutes",
      },
    ];

    /* randomly choose a better route */

    const selectedRoute = routes[Math.floor(Math.random() * routes.length)];

    console.log("Suggested Route:", selectedRoute);

    return selectedRoute;
  } catch (error) {
    console.log("Reroute service error:", error.message);
    return null;
  }
};
