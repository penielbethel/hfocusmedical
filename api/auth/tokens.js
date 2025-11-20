function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ status: 0, message: 'Method Not Allowed' });
  try {
    const auth = req.headers['authorization'] || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token || token !== process.env.SUPERADMIN_MASTER_TOKEN) {
      return res.status(401).json({ status: 0, message: 'Unauthorized' });
    }
    return res.status(200).json({ status: 1, data: [] });
  } catch (err) {
    return res.status(500).json({ status: 0, message: 'Error fetching tokens', error: err.message });
  }
};