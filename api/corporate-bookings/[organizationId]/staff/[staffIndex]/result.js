const mongoose = require('mongoose');
const Busboy = require('busboy');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

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
  await connect();
  try {
    const parts = req.url.split('/');
    const organizationId = parts[3];
    const staffIndex = parseInt(parts[5], 10);

    const busboy = Busboy({ headers: req.headers });
    let uploadUrl = null;

    busboy.on('file', (name, file, info) => {
      const { filename, mimeType } = info;
      const chunks = [];
      file.on('data', data => chunks.push(data));
      file.on('end', async () => {
        try {
          const buffer = Buffer.concat(chunks);
          const result = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream({
              resource_type: 'auto', folder: 'hfocus-corporate-results', use_filename: true
            }, (err, resu) => err ? reject(err) : resolve(resu));
            stream.end(buffer);
          });
          uploadUrl = result.secure_url;
        } catch (e) {
          uploadUrl = null;
        }
      });
    });

    busboy.on('finish', async () => {
      const org = await CorporateBooking.findOne({ organization_id: organizationId });
      if (!org || !Array.isArray(org.staff_members) || !org.staff_members[staffIndex]) {
        return res.status(404).json({ status: 0, message: 'Organization or staff not found' });
      }
      org.staff_members[staffIndex].result_ready = true;
      org.staff_members[staffIndex].result_file = uploadUrl;
      await org.save();
      return res.status(200).json({ status: 1, message: 'Result uploaded', url: uploadUrl });
    });

    req.pipe(busboy);
  } catch (err) {
    return res.status(500).json({ status: 0, message: 'Error uploading result', error: err.message });
  }
};