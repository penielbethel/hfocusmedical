const mongoose = require('mongoose');

function cors(res) {
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

const staffSchema = new mongoose.Schema({
  search_number: String,
  name: String,
  age: String,
  gender: String,
  investigations: Array,
  individual_cost: { type: Number, default: 0 },
  result_ready: { type: Boolean, default: false },
  result_file: String
});

const corpSchema = new mongoose.Schema({
  organization_id: { type: String, unique: true },
  company_name: String,
  contact_person: String,
  company_email: String,
  contact_phone: String,
  department: String,
  staff_members: [staffSchema],
  number_of_employees: Number,
  total_investigation_cost: { type: Number, default: 0 },
  status: { type: String, default: 'pending' },
  additional_info: String,
  investigations: Array,
  created_at: { type: Date, default: Date.now }
});

const CorporateBooking = mongoose.models.CorporateBooking || mongoose.model('CorporateBooking', corpSchema);

function generateOrgId() {
  return 'ORG-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  await connect();
  try {
    if (req.method === 'GET') {
      const list = await CorporateBooking.find().sort({ created_at: -1 });
      return res.status(200).json({ status: 1, data: list });
    }
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const organization_id = body.organization_id || generateOrgId();
      const doc = new CorporateBooking({ organization_id, ...body });
      await doc.save();
      return res.status(200).json({ status: 1, data: doc });
    }
    return res.status(405).json({ status: 0, message: 'Method Not Allowed' });
  } catch (err) {
    return res.status(500).json({ status: 0, message: 'Error', error: err.message });
  }
};