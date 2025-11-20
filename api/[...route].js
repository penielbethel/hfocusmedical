const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Busboy = require('busboy');
const cloudinary = require('cloudinary').v2;

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

let cached = global.__mongo;
async function connect() {
  if (cached && cached.readyState === 1) return cached;
  const conn = await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  global.__mongo = conn.connection;
  return global.__mongo;
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const appointmentSchema = new mongoose.Schema({
  booking_id: { type: String, unique: true },
  unique_id: { type: String, unique: true },
  department: String,
  appointment_date: String,
  appointment_time: String,
  title: String,
  first_name: String,
  last_name: String,
  gender: String,
  dob: String,
  mobile_no: String,
  email: String,
  center_name: String,
  result_ready: Boolean,
  result_file: String,
  created_at: { type: Date, default: Date.now }
});
const Appointment = mongoose.models.Appointment || mongoose.model('Appointment', appointmentSchema);

const adminSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
  created_at: { type: Date, default: Date.now }
});
const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);

const staffSchema = new mongoose.Schema({
  search_number: String,
  name: String,
  age: String,
  gender: String,
  investigations: Array,
  individual_cost: { type: Number, default: 0 },
  result_ready: { type: Boolean, default: false },
  result_file: String
});
const corpSchema = new mongoose.Schema({
  organization_id: { type: String, unique: true },
  company_name: String,
  contact_person: String,
  company_email: String,
  contact_phone: String,
  department: String,
  staff_members: [staffSchema],
  number_of_employees: Number,
  total_investigation_cost: { type: Number, default: 0 },
  status: { type: String, default: 'pending' },
  additional_info: String,
  investigations: Array,
  created_at: { type: Date, default: Date.now }
});
const CorporateBooking = mongoose.models.CorporateBooking || mongoose.model('CorporateBooking', corpSchema);

function generateUniqueId() {
  return 'HF-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}
function generateBookingId() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BK-${yyyy}${mm}${dd}-${rand}`;
}

async function sendMail({ to, subject, html, replyTo }) {
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  });
  await transporter.sendMail({ from: `"H-Focus Medical Laboratory" <${process.env.EMAIL_USER}>`, to, subject, html, replyTo });
}

function jsonBody(req) {
  if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
    try { return typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); } catch { return {}; }
  }
  // Fallback: attempt to parse URL-encoded
  try { return typeof req.body === 'string' ? Object.fromEntries(new URLSearchParams(req.body)) : (req.body || {}); } catch { return {}; }
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = new URL(req.url, 'http://dummy');
  const path = url.pathname.replace(/^\/api\/?/, '');
  const segments = path.split('/').filter(Boolean);

  try {
    // CONTACT
    if (segments[0] === 'contact') {
      if (req.method !== 'POST') return res.status(405).json({ status: 0, message: 'Method Not Allowed' });
      const body = jsonBody(req);
      const firstName = body['First Name'] || body.firstName || body.first_name || '';
      const lastName = body['Last Name'] || body.lastName || body.last_name || '';
      const email = body.Email || body.email || '';
      const phone = body.Phone || body.phone || '';
      const subject = body.Subject || body.subject || 'Contact Form Inquiry';
      const message = body.Message || body.message || '';
      if (!firstName || !email || !message) return res.status(400).json({ status: 0, message: 'Please fill required fields' });
      await sendMail({
        to: 'info@hfocusmedical.com',
        replyTo: email,
        subject: `New Contact Message: ${subject}`,
        html: `<h3 style=\"color:#228B22\">Contact Form Submission</h3><p><strong>Name:</strong> ${firstName} ${lastName}</p><p><strong>Email:</strong> ${email}</p><p><strong>Phone:</strong> ${phone}</p><p><strong>Subject:</strong> ${subject}</p><p><strong>Message:</strong><br/>${message}</p>`
      });
      return res.status(200).json({ status: 1, message: 'Message sent successfully' });
    }

    // APPOINTMENTS
    if (segments[0] === 'appointments' && segments.length === 1) {
      if (req.method !== 'POST') return res.status(405).json({ status: 0, message: 'Method Not Allowed' });
      await connect();
      const body = jsonBody(req);
      let uniqueId = generateUniqueId();
      while (await Appointment.findOne({ unique_id: uniqueId })) uniqueId = generateUniqueId();
      const bookingId = generateBookingId();
      const newAppointment = new Appointment({ ...body, booking_id: bookingId, unique_id: uniqueId });
      await newAppointment.save();
      try { await sendMail({ to: newAppointment.email, subject: `Appointment Confirmation - ${newAppointment.department}`, html: `<h3 style=\"color:#228B22\">Appointment Confirmed</h3><p><strong>Booking ID:</strong> ${newAppointment.booking_id}</p><p><strong>Unique ID:</strong> ${newAppointment.unique_id}</p><p><strong>Date:</strong> ${newAppointment.appointment_date}</p><p><strong>Time:</strong> ${newAppointment.appointment_time}</p>` }); } catch {}
      try { await sendMail({ to: process.env.EMAIL_USER, subject: `New Appointment Booking - ${newAppointment.department}`, html: `Booking ID ${newAppointment.booking_id}, Unique ID ${newAppointment.unique_id}` }); } catch {}
      return res.status(200).json({ status: 1, message: 'Appointment saved successfully', data: newAppointment });
    }

    if (segments[0] === 'appointments' && segments[1]) {
      if (req.method !== 'GET') return res.status(405).json({ status: 0, message: 'Method Not Allowed' });
      await connect();
      const id = segments[1];
      const appointment = await Appointment.findOne({ unique_id: id });
      if (!appointment) return res.status(200).json({ status: 0, message: 'No record found' });
      return res.status(200).json({ status: 1, data: appointment });
    }

    // PUBLIC APPOINTMENTS
    if (segments[0] === 'public' && segments[1] === 'appointments' && segments[2] === 'available-dates') {
      if (req.method !== 'GET') return res.status(405).json({ status: 0, message: 'Method Not Allowed' });
      const department = decodeURIComponent(segments[3] || '');
      const today = new Date();
      const dates = [];
      for (let i = 0; i < 14; i++) {
        const d = new Date();
        d.setDate(today.getDate() + i);
        if (d.getDay() === 0) continue;
        dates.push(d.toISOString().split('T')[0]);
      }
      return res.status(200).json({ status: 1, department, dates });
    }
    if (segments[0] === 'public' && segments[1] === 'appointments' && segments[2] === 'slots') {
      if (req.method !== 'GET') return res.status(405).json({ status: 0, message: 'Method Not Allowed' });
      const params = url.searchParams;
      const date = params.get('date');
      const department = params.get('department');
      if (!date || !department) return res.status(400).json({ status: 0, message: 'Missing date or department' });
      const allSlots = ['09:00 AM','10:00 AM','11:00 AM','12:00 PM','01:00 PM','02:00 PM','03:00 PM','04:00 PM'];
      return res.status(200).json({ status: 1, date, department, slots: allSlots });
    }

    // AUTH
    if (segments[0] === 'auth' && segments[1] === 'login') {
      if (req.method !== 'POST') return res.status(405).json({ status: 0, message: 'Method Not Allowed' });
      await connect();
      const { username, password } = jsonBody(req);
      const admin = await Admin.findOne({ username });
      if (!admin) return res.status(401).json({ status: 0, message: 'Invalid credentials' });
      const ok = await bcrypt.compare(password, admin.password);
      if (!ok) return res.status(401).json({ status: 0, message: 'Invalid credentials' });
      const token = jwt.sign({ sub: admin._id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '7d' });
      return res.status(200).json({ status: 1, token });
    }
    if (segments[0] === 'auth' && segments[1] === 'register') {
      if (req.method !== 'POST') return res.status(405).json({ status: 0, message: 'Method Not Allowed' });
      await connect();
      const authHeader = req.headers['authorization'] || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
      if (!token || token !== process.env.ADMIN_REG_TOKEN) return res.status(401).json({ status: 0, message: 'Unauthorized' });
      const { username, password } = jsonBody(req);
      if (!username || !password) return res.status(400).json({ status: 0, message: 'Missing username or password' });
      const hash = await bcrypt.hash(password, 10);
      const admin = new Admin({ username, password: hash });
      await admin.save();
      return res.status(200).json({ status: 1, message: 'Admin registered successfully' });
    }
    if (segments[0] === 'auth' && segments[1] === 'generate-token') {
      if (req.method !== 'POST') return res.status(405).json({ status: 0, message: 'Method Not Allowed' });
      const authHeader = req.headers['authorization'] || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
      if (!token || token !== process.env.SUPERADMIN_MASTER_TOKEN) return res.status(401).json({ status: 0, message: 'Unauthorized' });
      const newToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
      return res.status(200).json({ status: 1, token: newToken });
    }
    if (segments[0] === 'auth' && segments[1] === 'tokens') {
      if (req.method !== 'GET') return res.status(405).json({ status: 0, message: 'Method Not Allowed' });
      const authHeader = req.headers['authorization'] || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
      if (!token || token !== process.env.SUPERADMIN_MASTER_TOKEN) return res.status(401).json({ status: 0, message: 'Unauthorized' });
      return res.status(200).json({ status: 1, data: [] });
    }

    // ADMINS
    if (segments[0] === 'admins' && segments.length === 1) {
      if (req.method !== 'GET') return res.status(405).json({ status: 0, message: 'Method Not Allowed' });
      await connect();
      const admins = await Admin.find({}, { username: 1, created_at: 1 });
      return res.status(200).json({ status: 1, data: admins });
    }
    if (segments[0] === 'admins' && segments[1]) {
      if (req.method !== 'DELETE') return res.status(405).json({ status: 0, message: 'Method Not Allowed' });
      await connect();
      const id = segments[1];
      await Admin.findByIdAndDelete(id);
      return res.status(200).json({ status: 1, message: 'Admin deleted successfully' });
    }

    // CORPORATE BOOKINGS
    if (segments[0] === 'corporate-bookings' && segments.length === 1) {
      await connect();
      if (req.method === 'GET') {
        const list = await CorporateBooking.find().sort({ created_at: -1 });
        return res.status(200).json({ status: 1, data: list });
      }
      if (req.method === 'POST') {
        const body = jsonBody(req);
        const organization_id = body.organization_id || ('ORG-' + Math.random().toString(36).substring(2, 8).toUpperCase());
        const doc = new CorporateBooking({ organization_id, ...body });
        await doc.save();
        return res.status(200).json({ status: 1, data: doc });
      }
      return res.status(405).json({ status: 0, message: 'Method Not Allowed' });
    }
    if (segments[0] === 'corporate-bookings' && segments[1] && !segments[2]) {
      await connect();
      const id = segments[1];
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
    }
    if (segments[0] === 'corporate-bookings' && segments[2] === 'status') {
      if (req.method !== 'PUT') return res.status(405).json({ status: 0, message: 'Method Not Allowed' });
      await connect();
      const id = segments[1];
      const body = jsonBody(req);
      const status = body.status || 'pending';
      const org = await CorporateBooking.findOneAndUpdate({ organization_id: id }, { status }, { new: true });
      if (!org) return res.status(404).json({ status: 0, message: 'Not found' });
      return res.status(200).json({ status: 1, data: org });
    }
    if (segments[0] === 'corporate-bookings' && segments[2] === 'staff' && segments[4] === 'result') {
      if (req.method !== 'PUT') return res.status(405).json({ status: 0, message: 'Method Not Allowed' });
      await connect();
      const organizationId = segments[1];
      const staffIndex = parseInt(segments[3], 10);
      const busboy = Busboy({ headers: req.headers });
      let uploadUrl = null;
      busboy.on('file', (name, file, info) => {
        const chunks = [];
        file.on('data', data => chunks.push(data));
        file.on('end', async () => {
          try {
            const buffer = Buffer.concat(chunks);
            const result = await new Promise((resolve, reject) => {
              const stream = cloudinary.uploader.upload_stream({ resource_type: 'auto', folder: 'hfocus-corporate-results', use_filename: true }, (err, resu) => err ? reject(err) : resolve(resu));
              stream.end(buffer);
            });
            uploadUrl = result.secure_url;
          } catch (e) { uploadUrl = null; }
        });
      });
      busboy.on('finish', async () => {
        const org = await CorporateBooking.findOne({ organization_id: organizationId });
        if (!org || !Array.isArray(org.staff_members) || !org.staff_members[staffIndex]) return res.status(404).json({ status: 0, message: 'Organization or staff not found' });
        org.staff_members[staffIndex].result_ready = true;
        org.staff_members[staffIndex].result_file = uploadUrl;
        await org.save();
        return res.status(200).json({ status: 1, message: 'Result uploaded', url: uploadUrl });
      });
      req.pipe(busboy);
      return; // response handled in finish
    }
    if (segments[0] === 'corporate-bookings' && segments[1] === 'recalculate-costs') {
      if (req.method !== 'POST') return res.status(405).json({ status: 0, message: 'Method Not Allowed' });
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
    }

    return res.status(404).json({ status: 0, message: 'Route not found' });
  } catch (err) {
    return res.status(500).json({ status: 0, message: 'Server error', error: err.message });
  }
};