const nodemailer = require("nodemailer");
const twilio = require("twilio");
require("dotenv").config();

/* ============================================
   🔹 EMAIL CONFIG
============================================ */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/* ============================================
   🔹 TWILIO CONFIG
============================================ */
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);

/* ============================================
   🔹 SEND EMAIL
============================================ */
const sendEmail = async (to, subject, message) => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject,
    text: message,
  });
};

/* ============================================
   🔹 SEND SMS
============================================ */
const sendSMS = async (to, message) => {
  await client.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE,
    to,
  });
};

/* ============================================
   🔹 SEND WHATSAPP
============================================ */
const sendWhatsApp = async (to, message) => {
  await client.messages.create({
    body: message,
    from: "whatsapp:" + process.env.TWILIO_PHONE,
    to: "whatsapp:" + to,
  });
};

module.exports = {
  sendEmail,
  sendSMS,
  sendWhatsApp,
};
