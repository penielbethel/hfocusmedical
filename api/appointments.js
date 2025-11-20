const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

let cached = global.__mongo;
async function connect() {
  if (cached && cached.readyState === 1) return cached;
  const conn = await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  global.__mongo = conn.connection;
  return global.__mongo;
}

const appointmentSchema = new mongoose.Schema({
  booking_id: { type: String, unique: true },
  unique_id: { type: String, unique: true },
  department: String,
  appointment_date: String,
  appointment_time: String,
  title: String,
  first_name: String,
  last_name: String,
  gender: String,
  dob: String,
  mobile_no: String,
  email: String,
  center_name: String,
  created_at: { type: Date, default: Date.now }
});

const Appointment = mongoose.models.Appointment || mongoose.model('Appointment', appointmentSchema);

function generateUniqueId() {
  return 'HF-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generateBookingId() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BK-${yyyy}${mm}${dd}-${rand}`;
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ status: 0, message: 'Method Not Allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    await connect();

    let uniqueId = generateUniqueId();
    let exists = await Appointment.findOne({ unique_id: uniqueId });
    while (exists) {
      uniqueId = generateUniqueId();
      exists = await Appointment.findOne({ unique_id: uniqueId });
    }
    const bookingId = generateBookingId();

    const newAppointment = new Appointment({
      ...body,
      booking_id: bookingId,
      unique_id: uniqueId
    });
    await newAppointment.save();

    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    const patientMail = {
      from: `"H-Focus Medical Laboratory" <${process.env.EMAIL_USER}>`,
      to: newAppointment.email,
      subject: `Appointment Confirmation - ${newAppointment.department}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h3 style="color:#228B22">Appointment Confirmed</h3>
          <p>Your booking is confirmed.</p>
          <p><strong>Booking ID:</strong> ${newAppointment.booking_id}</p>
          <p><strong>Unique ID:</strong> ${newAppointment.unique_id}</p>
          <p><strong>Date:</strong> ${newAppointment.appointment_date}</p>
          <p><strong>Time:</strong> ${newAppointment.appointment_time}</p>
        </div>`
    };

    const companyMail = {
      from: `"H-Focus Medical Laboratory" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: `New Appointment Booking - ${newAppointment.department}`,
      html: `New appointment booked. Booking ID ${newAppointment.booking_id}, Unique ID ${newAppointment.unique_id}`
    };

    try { await transporter.sendMail(patientMail); } catch (e) {}
    try { await transporter.sendMail(companyMail); } catch (e) {}

    return res.status(200).json({ status: 1, message: 'Appointment saved successfully', data: newAppointment });
  } catch (err) {
    return res.status(500).json({ status: 0, message: 'Error saving appointment', error: err.message });
  }
};