const mongoose = require('mongoose');

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,DELETE,OPTIONS');
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
  await connect();
  try {
    const id = req.query.organizationId || req.url.split('/').pop();
    if (req.method === 'GET') {
      const org = await CorporateBooking.findOne({ organization_id: id });
      if (!org) return res.status(404).json({ status: 0, message: 'Not found' });
      return res.status(200).json({ status: 1, data: org });
    }
    if (req.method === 'DELETE') {
      await CorporateBooking.deleteOne({ organization_id: id });
      return res.status(200).json({ status: 1, message: 'Corporate booking deleted successfully' });
    }
    return res.status(405).json({ status: 0, message: 'Method Not Allowed' });
  } catch (err) {
    return res.status(500).json({ status: 0, message: 'Error', error: err.message });
  }
};