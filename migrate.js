const pool = require('./config/db');

async function addColumnIfNotExists(tableName, columnName, columnDefinition) {
  const checkColumnQuery = `
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = '${tableName}' AND column_name = '${columnName}'
  `;
  const res = await pool.query(checkColumnQuery);
  if (res.rowCount === 0) {
    console.log(`➕ Adding column [${columnName}] to [${tableName}]...`);
    await pool.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
  }
}

async function migrate() {
  try {
    console.log("🚀 Starting database migration...");

    // 1. Users Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'customer',
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Carriers Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS carriers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        service_type VARCHAR(100),
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Drivers Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS drivers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        status VARCHAR(50) DEFAULT 'available',
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Shipments Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shipments (
        id SERIAL PRIMARY KEY,
        tracking_id VARCHAR(50) UNIQUE NOT NULL,
        customer_name VARCHAR(255),
        customer_email VARCHAR(255),
        language VARCHAR(10) DEFAULT 'EN',
        sender_name VARCHAR(255),
        sender_email VARCHAR(255),
        sender_phone VARCHAR(20),
        receiver_name VARCHAR(255),
        receiver_email VARCHAR(255),
        receiver_phone VARCHAR(20),
        pickup_address TEXT,
        delivery_address TEXT,
        pickup_lat DOUBLE PRECISION,
        pickup_lng DOUBLE PRECISION,
        delivery_lat DOUBLE PRECISION,
        delivery_lng DOUBLE PRECISION,
        package_info TEXT,
        package_type VARCHAR(50),
        weight NUMERIC,
        dimensions VARCHAR(100),
        package_category VARCHAR(100),
        declared_value NUMERIC,
        priority VARCHAR(50) DEFAULT 'Standard',
        service_type VARCHAR(100),
        delivery_type VARCHAR(100),
        special_instructions TEXT,
        cod_amount NUMERIC DEFAULT 0,
        payment_status VARCHAR(50) DEFAULT 'Pending',
        notes TEXT,
        status VARCHAR(50) DEFAULT 'Pending',
        assigned_driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
        carrier_id INTEGER REFERENCES carriers(id) ON DELETE SET NULL,
        predicted_eta TIMESTAMP,
        shipping_cost NUMERIC DEFAULT 0,
        sms_notif BOOLEAN DEFAULT FALSE,
        email_notif BOOLEAN DEFAULT FALSE,
        secure_token VARCHAR(255),
        token_expiry TIMESTAMP,
        current_latitude DOUBLE PRECISION,
        current_longitude DOUBLE PRECISION,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Update Shipments Table for existing instances
    await addColumnIfNotExists('shipments', 'dimensions', 'VARCHAR(100)');
    await addColumnIfNotExists('shipments', 'package_category', 'VARCHAR(100)');
    await addColumnIfNotExists('shipments', 'declared_value', 'NUMERIC');
    await addColumnIfNotExists('shipments', 'service_type', 'VARCHAR(100)');
    await addColumnIfNotExists('shipments', 'delivery_type', 'VARCHAR(100)');
    await addColumnIfNotExists('shipments', 'special_instructions', 'TEXT');
    await addColumnIfNotExists('shipments', 'cod_amount', 'NUMERIC DEFAULT 0');
    await addColumnIfNotExists('shipments', 'payment_status', 'VARCHAR(50) DEFAULT \'Pending\'');
    await addColumnIfNotExists('shipments', 'notes', 'TEXT');

    // 5. Shipment Status History
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shipment_status_history (
        id SERIAL PRIMARY KEY,
        shipment_id INTEGER REFERENCES shipments(id) ON DELETE CASCADE,
        status VARCHAR(100) NOT NULL,
        description TEXT,
        updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 6. Shipment Locations (Real-time tracking)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shipment_locations (
        id SERIAL PRIMARY KEY,
        shipment_id INTEGER REFERENCES shipments(id) ON DELETE CASCADE,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 7. Notifications
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        shipment_id VARCHAR(50),
        message TEXT NOT NULL,
        type VARCHAR(50),
        channel VARCHAR(50),
        status VARCHAR(50) DEFAULT 'sent',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 8. Notification Templates
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notification_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        subject TEXT,
        body TEXT NOT NULL,
        type VARCHAR(50), -- email, sms, whatsapp
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 9. Proof of Delivery
    await pool.query(`
      CREATE TABLE IF NOT EXISTS proof_of_delivery (
        id SERIAL PRIMARY KEY,
        shipment_id INTEGER REFERENCES shipments(id) ON DELETE CASCADE,
        receiver_name VARCHAR(255),
        otp_verified BOOLEAN DEFAULT FALSE,
        image_url TEXT,
        signature_data TEXT,
        delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION
      )
    `);

    // 10. Documents
    await pool.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        shipment_id INTEGER REFERENCES shipments(id) ON DELETE CASCADE,
        file_name VARCHAR(255),
        file_url TEXT NOT NULL,
        file_type VARCHAR(50), -- invoice, label, pod, etc.
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 11. Sensor Logs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sensor_logs (
        id SERIAL PRIMARY KEY,
        shipment_id INTEGER REFERENCES shipments(id) ON DELETE CASCADE,
        temperature NUMERIC,
        humidity NUMERIC,
        shock NUMERIC,
        tilt NUMERIC,
        battery_level NUMERIC,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 12. Support Tickets
    await pool.query(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id SERIAL PRIMARY KEY,
        shipment_id INTEGER REFERENCES shipments(id) ON DELETE SET NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        subject VARCHAR(255),
        issue TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'open',
        priority VARCHAR(50) DEFAULT 'normal',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 13. Audit Logs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(255) NOT NULL,
        resource_type VARCHAR(100),
        resource_id INTEGER,
        details JSONB,
        ip_address VARCHAR(45),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 14. Return Shipments
    await pool.query(`
      CREATE TABLE IF NOT EXISTS return_shipments (
        id SERIAL PRIMARY KEY,
        original_shipment_id INTEGER REFERENCES shipments(id) ON DELETE CASCADE,
        return_tracking_id VARCHAR(50) UNIQUE NOT NULL,
        reason TEXT,
        status VARCHAR(50) DEFAULT 'Requested',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("✅ Migration successful: All tables created.");
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    process.exit(0);
  }
}

migrate();
