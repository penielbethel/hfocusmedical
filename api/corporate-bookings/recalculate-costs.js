const mongoose = require('mongoose');

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

const corpSchema = new mongoose.Schema({ organization_id: String }, { strict: false });
const CorporateBooking = mongoose.models.CorporateBooking || mongoose.model('CorporateBooking', corpSchema);

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ status: 0, message: 'Method Not Allowed' });
  try {
    await connect();
    const orgs = await CorporateBooking.find();
    let updated = 0;
    for (const org of orgs) {
      let total = 0;
      if (Array.isArray(org.staff_members)) {
        for (const staff of org.staff_members) {
          if (Array.isArray(staff.investigations)) {
            for (const inv of staff.investigations) {
              if (typeof inv === 'object' && inv.price) total += Number(inv.price) || 0;
            }
          }
          if (staff.individual_cost) total += Number(staff.individual_cost) || 0;
        }
      }
      org.total_investigation_cost = total;
      await org.save();
      updated++;
    }
    return res.status(200).json({ status: 1, updated_count: updated });
  } catch (err) {
    return res.status(500).json({ status: 0, message: 'Error recalculating costs', error: err.message });
  }
};