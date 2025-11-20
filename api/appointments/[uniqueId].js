const mongoose = require('mongoose');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
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
  booking_id: String,
  unique_id: String,
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
  result_ready: Boolean,
  result_file: String,
});

const Appointment = mongoose.models.Appointment || mongoose.model('Appointment', appointmentSchema);

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ status: 0, message: 'Method Not Allowed' });
  try {
    await connect();
    const id = req.query.uniqueId || req.url.split('/').pop();
    const appointment = await Appointment.findOne({ unique_id: id });
    if (!appointment) return res.status(200).json({ status: 0, message: 'No record found' });
    return res.status(200).json({ status: 1, data: appointment });
  } catch (err) {
    return res.status(500).json({ status: 0, message: 'Error fetching record', error: err.message });
  }
};