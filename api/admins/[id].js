const mongoose = require('mongoose');

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

let cached = global.__mongo;
async function connect() {
  if (cached && cached.readyState === 1) return cached;
  const conn = await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  global.__mongo = conn.connection;
  return global.__mongo;
}

const adminSchema = new mongoose.Schema({ username: String });
const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'DELETE') return res.status(405).json({ status: 0, message: 'Method Not Allowed' });
  try {
    await connect();
    const id = req.query.id || req.url.split('/').pop();
    await Admin.findByIdAndDelete(id);
    return res.status(200).json({ status: 1, message: 'Admin deleted successfully' });
  } catch (err) {
    return res.status(500).json({ status: 0, message: 'Error deleting admin', error: err.message });
  }
};