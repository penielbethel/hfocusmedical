const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { username, password } = body;
    if (!username || !password) return res.status(400).json({ status: 0, message: 'Missing username or password' });
    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(401).json({ status: 0, message: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, admin.password);
    if (!ok) return res.status(401).json({ status: 0, message: 'Invalid credentials' });
    const token = jwt.sign({ sub: admin._id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return res.status(200).json({ status: 1, token });
  } catch (err) {
    return res.status(500).json({ status: 0, message: 'Error during login', error: err.message });
  }
};