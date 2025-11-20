function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ status: 0, message: 'Method Not Allowed' });
  try {
    const department = req.query.department || (req.url.split('/').pop());
    const today = new Date();
    const dates = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      if (d.getDay() === 0) continue; // skip Sundays
      dates.push(d.toISOString().split('T')[0]);
    }
    return res.status(200).json({ status: 1, department, dates });
  } catch (err) {
    return res.status(500).json({ status: 0, message: 'Error fetching dates', error: err.message });
  }
};