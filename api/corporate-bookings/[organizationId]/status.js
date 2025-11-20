const mongoose = require('mongoose');

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

let cached = global.__mongo;
async function connect() {
  if (cached && cached.readyState === 1) return cached;
  const conn = await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  global.__mongo = conn.connection;
  return global.__mongo;
}

const corpSchema = new mongoose.Schema({ organization_id: String }, { strict: false });
const CorporateBooking = mongoose.models.CorporateBooking || mongoose.model('CorporateBooking', corpSchema);

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'PUT') return res.status(405).json({ status: 0, message: 'Method Not Allowed' });
  try {
    await connect();
    const id = req.query.organizationId || req.url.split('/')[3];
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const status = body.status || 'pending';
    const org = await CorporateBooking.findOneAndUpdate({ organization_id: id }, { status }, { new: true });
    if (!org) return res.status(404).json({ status: 0, message: 'Not found' });
    return res.status(200).json({ status: 1, data: org });
  } catch (err) {
    return res.status(500).json({ status: 0, message: 'Error updating status', error: err.message });
  }
};