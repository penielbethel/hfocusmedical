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
    const url = new URL(req.url, 'http://dummy');
    const date = url.searchParams.get('date');
    const department = url.searchParams.get('department');
    if (!date || !department) {
      return res.status(400).json({ status: 0, message: 'Missing date or department' });
    }
    const allSlots = [
      '09:00 AM','10:00 AM','11:00 AM',
      '12:00 PM','01:00 PM','02:00 PM',
      '03:00 PM','04:00 PM'
    ];
    return res.status(200).json({ status: 1, date, department, slots: allSlots });
  } catch (err) {
    return res.status(500).json({ status: 0, message: 'Error fetching slots', error: err.message });
  }
};