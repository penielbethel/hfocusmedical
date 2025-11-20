const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

let cached = global.__mongo;
async function connect() {
  if (cached && cached.readyState === 1) return cached;
  const conn = await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  global.__mongo = conn.connection;
  return global.__mongo;
}

const adminSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
  created_at: { type: Date, default: Date.now }
});
const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ status: 0, message: 'Method Not Allowed' });
  try {
    await connect();
    const auth = req.headers['authorization'] || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token || token !== process.env.ADMIN_REG_TOKEN) {
      return res.status(401).json({ status: 0, message: 'Unauthorized' });
    }
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { username, password } = body;
    if (!username || !password) return res.status(400).json({ status: 0, message: 'Missing username or password' });
    const hash = await bcrypt.hash(password, 10);
    const admin = new Admin({ username, password: hash });
    await admin.save();
    return res.status(200).json({ status: 1, message: 'Admin registered successfully' });
  } catch (err) {
    return res.status(500).json({ status: 0, message: 'Error during registration', error: err.message });
  }
};