const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Busboy = require('busboy');
const cloudinary = require('cloudinary').v2;
const { jsPDF } = require('jspdf');

function cors(req, res) {
  const origin = req.headers.origin || '';
  const allowlist = new Set([
    'http://localhost:3000',
    'https://hfocusmedical.com',
    'https://www.hfocusmedical.com',
    'https://hfocusmedical.vercel.app'
  ]);
  const allowedOrigin = allowlist.has(origin) ? origin : '*';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');
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
  weight: Number,
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

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
  role: { type: String, default: 'admin' },
  created_at: { type: Date, default: Date.now }
});
const User = mongoose.models.User || mongoose.model('User', userSchema);
const registerTokenSchema = new mongoose.Schema({ token: { type: String, unique: true }, used: { type: Boolean, default: false }, createdAt: { type: Date, default: Date.now, expires: '1h' } });
const activeTokenSchema = new mongoose.Schema({ token: String, createdAt: { type: Date, default: Date.now, expires: '1h' } });
const RegisterToken = mongoose.models.RegisterToken || mongoose.model('RegisterToken', registerTokenSchema);
const ActiveToken = mongoose.models.ActiveToken || mongoose.model('ActiveToken', activeTokenSchema);

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
async function reconcileAdmins() { try { const legacy = await Admin.find({}, { username: 1, password: 1, created_at: 1 }).lean(); for (const a of legacy) { const exists = await User.findOne({ username: a.username }); if (!exists) { await User.create({ username: a.username, password: a.password, role: 'admin', created_at: a.created_at || new Date() }); } } } catch { } }
// function seedPenieAdmin() removed
function requireActiveToken(req) { const authHeader = req.headers['authorization'] || ''; const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''; if (!token) return { ok: false }; try { jwt.verify(token, process.env.JWT_SECRET); } catch { return { ok: false }; } return { ok: true, token }; }

function generateUniqueId() {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return 'HFML' + randomNum;
}
function generateBookingId() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BK-${yyyy}${mm}${dd}-${rand}`;
}

async function sendMail(options) {
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  });
  const defaults = { from: `"H-Focus Medical Laboratory" <${process.env.EMAIL_USER}>` };
  await transporter.sendMail({ ...defaults, ...options });
}

function generateAppointmentPDF(appointmentData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true, precision: 2 });
  doc.setFillColor(34, 139, 34);
  doc.rect(0, 0, 210, 50, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('H-FOCUS MEDICAL LABORATORY', 105, 25, null, null, 'center');
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text('Quality and Precise Medical Lab Services', 105, 35, null, null, 'center');
  doc.text('havefocusgroups@gmail.com | www.hfocusmedical.com', 105, 42, null, null, 'center');
  doc.setTextColor(0, 0, 0);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(15, 60, 180, 120, 5, 5, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.roundedRect(15, 60, 180, 120, 5, 5, 'S');
  doc.setFillColor(34, 139, 34);
  doc.roundedRect(25, 70, 160, 15, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('APPOINTMENT CONFIRMATION', 105, 80, null, null, 'center');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  let yPos = 95;
  doc.text(`Booking ID: ${appointmentData.booking_id}`, 30, yPos);
  doc.text(`Unique ID: ${appointmentData.unique_id}`, 30, yPos + 8);
  doc.text(`Patient: ${appointmentData.first_name} ${appointmentData.last_name}`, 30, yPos + 16);
  doc.text(`Department: ${appointmentData.department}`, 30, yPos + 24);
  doc.text(`Date: ${appointmentData.booking_date}`, 30, yPos + 32);
  doc.text(`Time: ${appointmentData.booking_time}`, 30, yPos + 40);
  doc.text(`Email: ${appointmentData.email}`, 30, yPos + 48);
  doc.text(`Mobile: ${appointmentData.mobile}`, 30, yPos + 56);
  doc.setFillColor(255, 243, 205);
  doc.roundedRect(25, 190, 160, 20, 3, 3, 'F');
  doc.setFontSize(8);
  doc.setFont(undefined, 'bold');
  doc.text('IMPORTANT: Please bring this confirmation on appointment day', 105, 202, null, null, 'center');
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(7);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 270, null, null, 'center');
  return doc.output('arraybuffer');
}

function getPatientEmailTemplate(appointment, pdfBuffer) {
  return {
    from: `"H-Focus Medical Laboratory" <${process.env.EMAIL_USER}>`,
    to: appointment.email,
    subject: 'Appointment Confirmation - H-Focus Medical Laboratory',
    replyTo: process.env.EMAIL_USER,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h2 style="color: #228B22; margin: 0;">H-Focus Medical Laboratory</h2>
          <p style="color: #666; margin: 5px 0;">Your Health, Our Priority</p>
        </div>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #228B22; margin-top: 0;">🎉 Appointment Confirmed!</h3>
          <p>Dear <strong>${appointment.title} ${appointment.first_name} ${appointment.last_name}</strong>,</p>
          <p>Your appointment has been successfully booked. Here are your appointment details:</p>
        </div>
        <div style="background-color: #fff; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;"><strong>Booking ID:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1; color: #228B22;"><strong>${appointment.booking_id}</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;"><strong>Unique ID:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1; color: #dc3545;"><strong>${appointment.unique_id}</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;"><strong>Department:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;">${appointment.department}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;"><strong>Date:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;">${appointment.appointment_date}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;"><strong>Time:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;">${appointment.appointment_time}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Center:</strong></td>
              <td style="padding: 8px 0;">${appointment.center_name}</td>
            </tr>
          </table>
        </div>
        <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
          <h4 style="color: #155724; margin-top: 0;">📎 PDF Confirmation Attached</h4>
          <p style="color: #155724; margin: 0;">Your appointment confirmation PDF is attached to this email. Please download and print it to bring on your appointment day.</p>
        </div>
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
          <h4 style="color: #856404; margin-top: 0;">📋 Important Instructions:</h4>
          <ul style="color: #856404; margin: 0; padding-left: 20px;">
            <li>Please arrive 15 minutes before your appointment time</li>
            <li>Bring a valid ID and the attached PDF confirmation</li>
            <li>Keep your <strong>Unique ID (${appointment.unique_id})</strong> safe for result checking</li>
            <li>Fast for 8-12 hours if required for your test</li>
          </ul>
        </div>
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
          <p style="color: #666; margin: 5px 0;">📞 Contact: 0700 225 4365, 0700 CAL HFML</p>
          <p style="color: #666; margin: 5px 0;">📧 Email: support@hfocusmedical.com</p>
          <p style="color: #666; margin: 5px 0; font-size: 12px;">Registration: OG/MOH/HS TTD/05/904C/1123</p>
          <p style="margin: 10px 0 0 0; font-size: 10px; color: #cccccc;">This is an automated message. Please do not reply to this email.</p>
          <p style="margin: 5px 0 0 0; font-size: 10px;"><a href="mailto:${process.env.EMAIL_USER}?subject=Unsubscribe" style="color: #cccccc; text-decoration: underline;">Unsubscribe from notifications</a></p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: `H-Focus_Appointment_${appointment.unique_id}.pdf`,
        content: Buffer.from(pdfBuffer),
        contentType: 'application/pdf'
      }
    ]
  };
}

function getCompanyEmailTemplate(appointment) {
  return {
    from: `"H-Focus Medical Laboratory" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    subject: `New Appointment Booking Notification - ${appointment.department}`,
    replyTo: process.env.EMAIL_USER,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h2 style="color: #228B22; margin: 0;">H-Focus Medical Laboratory</h2>
          <p style="color: #666; margin: 5px 0;">New Appointment Notification</p>
        </div>
        <div style="background-color: #e7f3ff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #0066cc; margin-top: 0;">🔔 New Appointment Booked</h3>
          <p>A new appointment has been booked on your system. Please review the details below:</p>
        </div>
        <div style="background-color: #fff; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h4 style="color: #333; margin-top: 0;">Patient Information:</h4>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;"><strong>Name:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;">${appointment.title} ${appointment.first_name} ${appointment.last_name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;"><strong>Gender:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;">${appointment.gender}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;"><strong>DOB:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;">${appointment.dob}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;"><strong>Mobile:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;">${appointment.mobile_no}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;"><strong>Email:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;">${appointment.email}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Weight:</strong></td>
              <td style="padding: 8px 0;">${appointment.weight} kg</td>
            </tr>
          </table>
        </div>
        <div style="background-color: #fff; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h4 style="color: #333; margin-top: 0;">Appointment Details:</h4>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;"><strong>Booking ID:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1; color: #228B22;"><strong>${appointment.booking_id}</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;"><strong>Unique ID:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1; color: #dc3545;"><strong>${appointment.unique_id}</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;"><strong>Department:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;">${appointment.department}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;"><strong>Date:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;">${appointment.appointment_date}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;"><strong>Time:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;">${appointment.appointment_time}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Center:</strong></td>
              <td style="padding: 8px 0;">${appointment.center_name}</td>
            </tr>
          </table>
        </div>
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
          <p style="color: #666; margin: 5px 0; font-size: 12px;">Booked on: ${new Date().toLocaleString()}</p>
          <p style="color: #666; margin: 5px 0; font-size: 12px;">System: H-Focus Medical Lab Management</p>
        </div>
      </div>
    `
  };
}

function jsonBody(req) {
  if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
    try { return typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); } catch { return {}; }
  }
  // Fallback: attempt to parse URL-encoded
  try { return typeof req.body === 'string' ? Object.fromEntries(new URLSearchParams(req.body)) : (req.body || {}); } catch { return {}; }
}

module.exports = async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  try { await connect(); if (!global.__seeded) { await reconcileAdmins(); global.__seeded = true; } } catch { }

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
        html: `
          <div style="font-family:Arial, sans-serif; max-width:640px; margin:auto; border:1px solid #e5e5e5; border-radius:10px; overflow:hidden;">
            <div style="background:#228B22; color:#fff; padding:12px 18px;">
              <h3 style="margin:0; font-size:18px;">H-Focus Medical Laboratory</h3>
              <div style="font-size:13px; opacity:0.9;">New Contact Submission</div>
            </div>
            <div style="padding:18px;">
              <table style="width:100%; border-collapse:collapse; font-size:14px;">
                <tr><td style="padding:6px 8px; font-weight:600;">Name</td><td style="padding:6px 8px;">${firstName} ${lastName}</td></tr>
                <tr><td style="padding:6px 8px; font-weight:600;">Email</td><td style="padding:6px 8px;">${email}</td></tr>
                <tr><td style="padding:6px 8px; font-weight:600;">Phone</td><td style="padding:6px 8px;">${phone}</td></tr>
                <tr><td style="padding:6px 8px; font-weight:600;">Subject</td><td style="padding:6px 8px;">${subject}</td></tr>
              </table>
              <div style="margin-top:12px; font-size:14px;"><strong>Message:</strong><br/>${message}</div>
              <div style="margin-top:12px; font-size:12px; color:#555;">Submitted on ${new Date().toLocaleString()}</div>
            </div>
          </div>`
      });
      return res.status(200).json({ status: 1, message: 'Message sent successfully' });
    }

    // APPOINTMENTS
    if (segments[0] === 'appointments' && segments.length === 1 && req.method === 'GET') {
      const ck = requireActiveToken(req);
      if (!ck.ok) return res.status(401).json({ status: 0, message: 'Unauthorized' });
      const exists = await ActiveToken.findOne({ token: ck.token });
      if (!exists) return res.status(401).json({ status: 0, message: 'Unauthorized' });
      const list = await Appointment.find().sort({ created_at: -1 });
      return res.status(200).json({ status: 1, data: list });
    }
    if (segments[0] === 'appointments' && segments.length === 1) {
      if (req.method !== 'POST') return res.status(405).json({ status: 0, message: 'Method Not Allowed' });
      await connect();
      const body = jsonBody(req);
      let uniqueId = generateUniqueId();
      while (await Appointment.findOne({ unique_id: uniqueId })) uniqueId = generateUniqueId();
      const bookingId = generateBookingId();
      const newAppointment = new Appointment({ ...body, booking_id: bookingId, unique_id: uniqueId });
      await newAppointment.save();
      let pdfBuffer;
      try {
        pdfBuffer = generateAppointmentPDF({
          booking_id: newAppointment.booking_id,
          unique_id: newAppointment.unique_id,
          first_name: newAppointment.first_name || '',
          last_name: newAppointment.last_name || '',
          department: newAppointment.department || '',
          booking_date: newAppointment.appointment_date || '',
          booking_time: newAppointment.appointment_time || '',
          email: newAppointment.email || '',
          mobile: newAppointment.mobile_no || ''
        });
      } catch { }
      try {
        if (pdfBuffer) {
          await sendMail(getPatientEmailTemplate(newAppointment, pdfBuffer));
        } else {
          await sendMail({
            to: newAppointment.email,
            subject: `Appointment Confirmation - ${newAppointment.department}`,
            html: `<div style="font-family:Arial, sans-serif; max-width:640px; margin:auto; border:1px solid #e5e5e5; border-radius:10px; overflow:hidden;"><div style="background:#228B22; color:#fff; padding:12px 18px;"><h3 style="margin:0; font-size:18px;">H-Focus Medical Laboratory</h3><div style="font-size:13px; opacity:0.9;">Appointment Confirmation</div></div><div style="padding:18px;"><table style="width:100%; border-collapse:collapse; font-size:14px;"><tr><td style="padding:6px 8px; font-weight:600;">Booking ID</td><td style="padding:6px 8px;">${newAppointment.booking_id}</td></tr><tr><td style="padding:6px 8px; font-weight:600;">Unique ID</td><td style="padding:6px 8px;">${newAppointment.unique_id}</td></tr><tr><td style="padding:6px 8px; font-weight:600;">Department</td><td style="padding:6px 8px;">${newAppointment.department || ''}</td></tr><tr><td style="padding:6px 8px; font-weight:600;">Center</td><td style="padding:6px 8px;">${newAppointment.center_name || ''}</td></tr><tr><td style="padding:6px 8px; font-weight:600;">Date</td><td style="padding:6px 8px;">${newAppointment.appointment_date || ''}</td></tr><tr><td style="padding:6px 8px; font-weight:600;">Time</td><td style="padding:6px 8px;">${newAppointment.appointment_time || ''}</td></tr><tr><td style="padding:6px 8px; font-weight:600;">Title</td><td style="padding:6px 8px;">${newAppointment.title || ''}</td></tr><tr><td style="padding:6px 8px; font-weight:600;">Patient</td><td style="padding:6px 8px;">${newAppointment.first_name || ''} ${newAppointment.last_name || ''}</td></tr><tr><td style="padding:6px 8px; font-weight:600;">Gender</td><td style="padding:6px 8px;">${newAppointment.gender || ''}</td></tr><tr><td style="padding:6px 8px; font-weight:600;">DOB</td><td style="padding:6px 8px;">${newAppointment.dob || ''}</td></tr><tr><td style="padding:6px 8px; font-weight:600;">Mobile</td><td style="padding:6px 8px;">${newAppointment.mobile_no || ''}</td></tr><tr><td style="padding:6px 8px; font-weight:600;">Email</td><td style="padding:6px 8px;">${newAppointment.email || ''}</td></tr><tr><td style="padding:6px 8px; font-weight:600;">Weight</td><td style="padding:6px 8px;">${newAppointment.weight || ''}</td></tr></table><div style="margin-top:12px; font-size:12px; color:#555;">Please keep your Unique ID for result checking.</div></div></div>`
          });
        }
      } catch { }
      try {
        await sendMail(getCompanyEmailTemplate(newAppointment));
      } catch { }
      return res.status(200).json({ status: 1, message: 'Appointment saved successfully', data: newAppointment });
    }

    if (segments[0] === 'appointments' && segments[1] && req.method === 'DELETE') {
      const ck = requireActiveToken(req);
      if (!ck.ok) return res.status(401).json({ status: 0, message: 'Unauthorized' });
      const exists = await ActiveToken.findOne({ token: ck.token });
      if (!exists) return res.status(401).json({ status: 0, message: 'Unauthorized' });
      const id = segments[1];
      const appointment = await Appointment.findOneAndDelete({ unique_id: id });
      if (!appointment) return res.status(404).json({ status: 0, message: 'Appointment not found' });
      return res.status(200).json({ status: 1, message: 'Appointment deleted successfully' });
    }
    if (segments[0] === 'appointments' && segments[1]) {
      if (req.method !== 'GET') return res.status(405).json({ status: 0, message: 'Method Not Allowed' });
      await connect();
      const rawId = segments[1];
      const id = decodeURIComponent(rawId).trim();
      let appointment = await Appointment.findOne({ unique_id: id });
      if (!appointment) appointment = await Appointment.findOne({ unique_id: { $regex: `^${id}$`, $options: 'i' } });
      if (!appointment) appointment = await Appointment.findOne({ booking_id: id });
      if (!appointment) appointment = await Appointment.findOne({ booking_id: { $regex: `^${id}$`, $options: 'i' } });
      if (!appointment) return res.status(200).json({ status: 0, message: 'No record found' });
      return res.status(200).json({ status: 1, data: appointment });
    }

    if (segments[0] === 'appointments' && segments[1] === 'upload' && segments[2]) {
      if (req.method !== 'POST') return res.status(405).json({ status: 0, message: 'Method Not Allowed' });
      const ck = requireActiveToken(req);
      if (!ck.ok) return res.status(401).json({ status: 0, message: 'Unauthorized' });
      const exists = await ActiveToken.findOne({ token: ck.token });
      if (!exists) return res.status(401).json({ status: 0, message: 'Unauthorized' });
      const uniqueId = segments[2];
      const busboy = Busboy({ headers: req.headers });
      let uploadUrl = null;
      busboy.on('file', (name, file, info) => {
        const chunks = [];
        file.on('data', data => chunks.push(data));
        file.on('end', async () => {
          try {
            const buffer = Buffer.concat(chunks);
            const result = await new Promise((resolve, reject) => {
              const stream = cloudinary.uploader.upload_stream({ resource_type: 'auto', folder: 'hfocus-results', use_filename: true }, (err, resu) => err ? reject(err) : resolve(resu));
              stream.end(buffer);
            });
            uploadUrl = result.secure_url;
          } catch (e) { uploadUrl = null; }
        });
      });
      busboy.on('finish', async () => {
        const appo = await Appointment.findOne({ unique_id: uniqueId });
        if (!appo) return res.status(404).json({ status: 0, message: 'Appointment not found' });
        appo.result_ready = true;
        appo.result_file = uploadUrl;
        await appo.save();
        return res.status(200).json({ status: 1, message: 'Result uploaded', url: uploadUrl });
      });
      req.pipe(busboy);
      return;
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
      const allSlots = ['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'];
      return res.status(200).json({ status: 1, date, department, slots: allSlots });
    }

    // AUTH
    if (segments[0] === 'auth' && segments[1] === 'login') {
      if (req.method !== 'POST') return res.status(405).json({ status: 0, message: 'Method Not Allowed' });
      const { username, password } = jsonBody(req);
      const uname = (username || '').trim();
      const pword = (password || '').trim();
      const envUser = (process.env.SUPERADMIN_USER || '').trim();
      const envPass = ((process.env.SUPERADMIN_PASS || '').replace(/^"|"$/g, '')).trim();
      if (uname && pword && uname === envUser && pword === envPass) {
        const token = jwt.sign({ sub: 'env-superadmin', role: 'superadmin', username: envUser }, process.env.JWT_SECRET, { expiresIn: '1h' });
        await ActiveToken.create({ token });
        return res.status(200).json({ status: 1, token, role: 'superadmin' });
      }
      let user = await User.findOne({ username: uname });
      if (!user) user = await User.findOne({ username: { $regex: `^${uname}$`, $options: 'i' } });
      if (!user) user = await Admin.findOne({ username: uname });
      if (!user) user = await Admin.findOne({ username: { $regex: `^${uname}$`, $options: 'i' } });
      if (!user) return res.status(401).json({ status: 0, message: 'User not found' });
      let ok = false;
      try { ok = await bcrypt.compare(pword, user.password); } catch { }
      if (!ok) {
        if (pword === user.password) ok = true; // compatibility fallback for legacy plaintext
      }
      if (!ok) return res.status(401).json({ status: 0, message: 'Invalid credentials' });
      const role = user.role || 'admin';
      const token = jwt.sign({ sub: user._id, role, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });
      await ActiveToken.create({ token });
      return res.status(200).json({ status: 1, token, role });
    }
    if (segments[0] === 'auth' && segments[1] === 'logout') {
      const authHeader = req.headers['authorization'] || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
      if (token) { await ActiveToken.deleteOne({ token }); }
      return res.status(200).json({ status: 1, message: 'Logged out successfully' });
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
      const ck = requireActiveToken(req);
      if (!ck.ok) return res.status(401).json({ status: 0, message: 'Unauthorized' });
      const decoded = jwt.decode(ck.token);
      if (!decoded || decoded.role !== 'superadmin') return res.status(403).json({ status: 0, message: 'Forbidden' });

      const newToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
      await RegisterToken.create({ token: newToken });
      return res.status(200).json({ status: 1, token: newToken });
    }
    if (segments[0] === 'auth' && segments[1] === 'tokens') {
      if (req.method !== 'GET') return res.status(405).json({ status: 0, message: 'Method Not Allowed' });
      const ck = requireActiveToken(req);
      if (!ck.ok) return res.status(401).json({ status: 0, message: 'Unauthorized' });
      const decoded = jwt.decode(ck.token);
      if (!decoded || decoded.role !== 'superadmin') return res.status(403).json({ status: 0, message: 'Forbidden' });

      await connect();
      const tokens = await RegisterToken.find({ used: false }).sort({ createdAt: -1 });
      return res.status(200).json({ status: 1, tokens: tokens });
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
        let organization_id = body.organization_id || ('ORG' + Math.floor(100000 + Math.random() * 900000));
        let staff_members = Array.isArray(body.staff_members) ? body.staff_members : (Array.isArray(body.staff_data) ? body.staff_data : []);
        if (staff_members.length > 0) {
          staff_members = staff_members.map(staff => {
            const invs = Array.isArray(staff.investigations) ? staff.investigations.map(inv => ({ test_name: inv.test_name || inv.name || inv, price: inv.price || 0, category: inv.category || 'General' })) : [];
            return { ...staff, investigations: invs };
          });
        }
        const investigationMap = new Map();
        for (const staff of staff_members) {
          if (Array.isArray(staff.investigations)) {
            for (const inv of staff.investigations) {
              const key = `${inv.test_name}_${inv.category}`;
              if (investigationMap.has(key)) investigationMap.get(key).count += 1; else investigationMap.set(key, { test_name: inv.test_name, category: inv.category, price: inv.price, count: 1 });
            }
          }
        }
        const investigations = [];
        investigationMap.forEach(inv => { investigations.push({ test_name: inv.test_name, category: inv.category, price: inv.price }); });
        const bookingData = {
          organization_id,
          company_name: body.company_name,
          contact_person: body.contact_person,
          company_email: body.company_email,
          contact_phone: body.company_phone || body.contact_phone,
          department: body.service_type || body.department,
          number_of_employees: body.estimated_employees || body.number_of_employees,
          additional_info: body.message || body.additional_info,
          staff_members,
          investigations
        };
        const doc = new CorporateBooking(bookingData);
        let total = 0;
        if (Array.isArray(doc.staff_members)) { for (const staff of doc.staff_members) total += Number(staff.individual_cost) || 0; }
        doc.total_investigation_cost = total;
        doc.staff_count = Array.isArray(doc.staff_members) ? doc.staff_members.length : 0;
        await doc.save();
        try {
          await sendMail({
            to: doc.company_email,
            subject: 'Corporate Booking Confirmation - H-Focus Medical Laboratory',
            replyTo: process.env.EMAIL_USER,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <h2 style="color: #228B22; margin: 0;">H-Focus Medical Laboratory</h2>
                  <p style="color: #666; margin: 5px 0;">Corporate Health Services</p>
                </div>
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                  <h3 style="color: #228B22; margin-top: 0;">🎉 Corporate Booking Confirmed!</h3>
                  <p>Dear <strong>${doc.contact_person || ''}</strong>,</p>
                  <p>Your corporate booking request has been successfully submitted. Here are your booking details:</p>
                </div>
                <div style="background-color: #fff; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;"><strong>Organization ID:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1; color: #228B22;"><strong>${doc.organization_id}</strong></td></tr>
                    <tr><td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;"><strong>Company:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;">${doc.company_name || ''}</td></tr>
                    <tr><td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;"><strong>Contact Person:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;">${doc.contact_person || ''}</td></tr>
                    <tr><td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;"><strong>Department/Service:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;">${doc.department || ''}</td></tr>
                    <tr><td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;"><strong>Number of Employees:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;">${doc.number_of_employees || 'Not specified'}</td></tr>
                    ${Array.isArray(doc.investigations) && doc.investigations.length > 0 ? `
                    <tr><td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;"><strong>Selected Investigations:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;">${doc.investigations.length} test(s) selected</td></tr>
                    <tr><td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;"><strong>Investigation Details & Pricing:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;"><div style="background-color: #f8f9fa; padding: 10px; border-radius: 5px; margin: 5px 0;">${doc.investigations.map(inv => `<div style=\"display:flex; justify-content:space-between; align-items:center; padding:5px 0; border-bottom:1px solid #e9ecef;\"><span><strong>${inv.test_name}</strong> <small style=\"color:#666;\">(${inv.category})</small></span><span style=\"color:#228B22; font-weight:bold;\">₦${(inv.price || 0).toLocaleString()}</span></div>`).join('')}</div></td></tr>
                    <tr><td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;"><strong>Total Investigation Cost:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1; color: #228B22;"><strong>₦${(doc.total_investigation_cost || 0).toLocaleString()}</strong></td></tr>
                    ` : ''}
                  </table>
                </div>
                <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                  <h4 style="color: #155724; margin-top: 0;">📋 Next Steps:</h4>
                  <ul style="color: #155724; margin: 0; padding-left: 20px;">
                    <li>Our team will contact you within 24 hours to confirm your booking</li>
                    <li>Keep your <strong>Organization ID (${doc.organization_id})</strong> safe for future reference</li>
                    <li>Use your Organization ID to check results online</li>
                  </ul>
                </div>
                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                  <p style="color: #666; margin: 5px 0;">📞 Contact: 0700 225 4365, 0700 CAL HFML</p>
                  <p style="color: #666; margin: 5px 0;">📧 Email: support@hfocusmedical.com</p>
                  <p style="color: #666; margin: 5px 0; font-size: 12px;">Registration: OG/MOH/HS TTD/05/904C/1123</p>
                </div>
              </div>
            `
          });
        } catch { }
        try {
          await sendMail({
            to: process.env.EMAIL_USER,
            subject: `New Corporate Booking - ${doc.company_name || ''}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #228B22;">New Corporate Booking Received</h2>
                <p><strong>Organization ID:</strong> ${doc.organization_id}</p>
                <p><strong>Company:</strong> ${doc.company_name || ''}</p>
                <p><strong>Contact Person:</strong> ${doc.contact_person || ''}</p>
                <p><strong>Email:</strong> ${doc.company_email || ''}</p>
                <p><strong>Phone:</strong> ${doc.contact_phone || ''}</p>
                <p><strong>Department:</strong> ${doc.department || ''}</p>
                <p><strong>Employees:</strong> ${doc.number_of_employees || 'Not specified'}</p>
                ${Array.isArray(doc.investigations) && doc.investigations.length > 0 ? `
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
                  <p><strong>Selected Investigations:</strong> ${doc.investigations.length} test(s) selected</p>
                  <div style="background-color: #fff; padding: 10px; border-radius: 5px; border: 1px solid #e9ecef;">
                    <h4 style="color: #228B22; margin-top: 0;">📋 Investigation Details & Pricing:</h4>
                    ${doc.investigations.map(inv => `<div style=\"display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #f1f1f1;\"><span><strong>${inv.test_name}</strong> <small style=\"color:#666;\">(${inv.category})</small></span><span style=\"color:#228B22; font-weight:bold; font-size:16px;\">₦${(inv.price || 0).toLocaleString()}</span></div>`).join('')}
                    <div style="margin-top: 15px; padding-top: 10px; border-top: 2px solid #228B22;">
                      <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 18px; font-weight: bold;">Total Investigation Cost:</span>
                        <span style="color: #228B22; font-weight: bold; font-size: 20px;">₦${(doc.total_investigation_cost || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
                ` : ''}
                <p><strong>Additional Info:</strong> ${doc.additional_info || 'None'}</p>
                <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
              </div>
            `
          });
        } catch { }
        return res.status(200).json({ status: 1, data: doc });
      }
      return res.status(405).json({ status: 0, message: 'Method Not Allowed' });
    }
    if (segments[0] === 'corporate-bookings' && segments[1] && !segments[2]) {
      await connect();
      const id = decodeURIComponent(segments[1]).trim();
      if (req.method === 'GET') {
        let org = await CorporateBooking.findOne({ organization_id: id });
        if (!org) org = await CorporateBooking.findOne({ organization_id: { $regex: `^${id}$`, $options: 'i' } });
        if (!org) org = await CorporateBooking.findOne({
          $or: [
            { 'staff_members.search_number': id },
            { 'staff_members.searchNumber': id },
            { 'staff_members.unique_id': id },
            { 'staff_members.search_number': { $regex: `^${id}$`, $options: 'i' } },
            { 'staff_members.searchNumber': { $regex: `^${id}$`, $options: 'i' } },
            { 'staff_members.unique_id': { $regex: `^${id}$`, $options: 'i' } }
          ]
        });
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