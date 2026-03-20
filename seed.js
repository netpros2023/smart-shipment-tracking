const pool = require('./config/db');

async function seedData() {
  try {
    const defaultSenderPhone = '9876543210';
    const pickupLoc = 'Chennai';
    const deliveryLoc = 'Coimbatore';
    const language = 'EN';

    const expireDate = new Date();
    expireDate.setHours(expireDate.getHours() + 48);
    
    const etaDate1 = new Date(); etaDate1.setDate(etaDate1.getDate() + 2);
    const etaDate2 = new Date(); etaDate2.setDate(etaDate2.getDate() + 1);
    const etaDate3 = new Date(); etaDate3.setDate(etaDate3.getDate() - 1);
    
    // TRK1050 -> In Transit
    await pool.query(`
      INSERT INTO shipments 
      (tracking_id, customer_name, language, status, secure_token, token_expiry, sender, receiver, carrier, pickup_address, delivery_address, eta_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT DO NOTHING
    `, ['TRK1050', 'John Doe', language, 'In Transit', 'token-1050', expireDate, 'Global Supply Inc', 'John Doe', 'FedEx', pickupLoc, deliveryLoc, etaDate1]);

    // TRK1051 -> Out for Delivery
    await pool.query(`
      INSERT INTO shipments 
      (tracking_id, customer_name, language, status, secure_token, token_expiry, sender, receiver, carrier, pickup_address, delivery_address, eta_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT DO NOTHING
    `, ['TRK1051', 'Jane Smith', language, 'Out for Delivery', 'token-1051', expireDate, 'Retail Logistics', 'Jane Smith', 'DHL', pickupLoc, deliveryLoc, etaDate2]);
    
    // TRK1052 -> Delivered
    await pool.query(`
      INSERT INTO shipments 
      (tracking_id, customer_name, language, status, secure_token, token_expiry, sender, receiver, carrier, pickup_address, delivery_address, eta_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT DO NOTHING
    `, ['TRK1052', 'Alpha Corp', language, 'Delivered', 'token-1052', expireDate, 'Tech Distributors', 'Alpha Corp', 'BlueDart', pickupLoc, deliveryLoc, etaDate3]);

    console.log("Demo data successfully seeded.");
  } catch (err) {
    console.error("Failed to seed demo data:", err);
  } finally {
    process.exit(0);
  }
}

seedData();
