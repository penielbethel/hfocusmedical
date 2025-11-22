require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require('nodemailer');
const { jsPDF } = require('jspdf');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;

// SuperAdmin from .env
const SUPERADMIN_USER = process.env.SUPERADMIN_USER;
const SUPERADMIN_PASS = process.env.SUPERADMIN_PASS;

// Enhanced email configuration for better deliverability
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Function to generate PDF appointment confirmation
function generateAppointmentPDF(appointmentData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
    precision: 2
  });

  // Header with logo area
  doc.setFillColor(34, 139, 34);
  doc.rect(0, 0, 210, 50, 'F');
  
  // Company name and details
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text("H-FOCUS MEDICAL LABORATORY", 105, 25, null, null, "center");
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text("Quality and Precise Medical Lab Services", 105, 35, null, null, "center");
  doc.text("havefocusgroups@gmail.com | www.hfocusmedical.com", 105, 42, null, null, "center");

  // Main content area
  doc.setTextColor(0, 0, 0);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(15, 60, 180, 120, 5, 5, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.roundedRect(15, 60, 180, 120, 5, 5, 'S');

  // Title
  doc.setFillColor(34, 139, 34);
  doc.roundedRect(25, 70, 160, 15, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text("APPOINTMENT CONFIRMATION", 105, 80, null, null, "center");

  // Patient details
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

  // Important notice
  doc.setFillColor(255, 243, 205);
  doc.roundedRect(25, 190, 160, 20, 3, 3, 'F');
  doc.setFontSize(8);
  doc.setFont(undefined, 'bold');
  doc.text("IMPORTANT: Please bring this confirmation on appointment day", 105, 202, null, null, "center");

  // Footer
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(7);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 270, null, null, "center");

  return doc.output('arraybuffer');
}

// Email Templates
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

// Middleware - Configure CORS for production
const corsOptions = {
  origin: [
    'https://hfocusmedical.com',
    'https://www.hfocusmedical.com',
    'https://hfocusmedical.vercel.app',
    'http://localhost:3000', // For local development
    'http://localhost:5000'  // For local development
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// -------------------- SCHEMAS --------------------
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
  result_ready: { type: Boolean, default: false },
  result_file: { type: String, default: null },
  created_at: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  email: { type: String, default: null },
  password: String,
  role: { type: String, enum: ["admin", "superadmin"], default: "admin" },
  created_at: { type: Date, default: Date.now }
});

// Legacy admin collection support (for deployments that used a different model)
const adminLegacySchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
  created_at: { type: Date, default: Date.now }
});

const registerTokenSchema = new mongoose.Schema({
  token: { type: String, unique: true },
  used: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, expires: "1h" }
});

const activeTokenSchema = new mongoose.Schema({
  token: String,
  createdAt: { type: Date, default: Date.now, expires: "1h" }
});

const corporateBookingSchema = new mongoose.Schema({
  organization_id: { type: String, unique: true },
  company_name: String,
  contact_person: String,
  company_email: String,
  contact_phone: String,
  department: String,
  number_of_employees: Number,
  additional_info: String,
  investigations: [{
    category: String,
    test_name: String,
    price: Number
  }],
  staff_members: [{
    name: String,
    search_number: String,
    age: Number,
    gender: String,
    investigations: [{
      category: String,
      test_name: String,
      price: Number
    }],
    individual_cost: { type: Number, default: 0 },
    appointment_date: String,
    appointment_time: String,
    result_ready: { type: Boolean, default: false },
    result_file: { type: String, default: null }
  }],
  staff_count: { type: Number, default: 0 },
  total_investigation_cost: { type: Number, default: 0 },
  status: { type: String, enum: ["pending", "confirmed", "completed", "cancelled"], default: "pending" },
  employees: [{
    employee_id: String,
    name: String,
    email: String,
    phone: String,
    department: String,
    age: Number,
    gender: String,
    appointment_date: String,
    appointment_time: String,
    result_ready: { type: Boolean, default: false },
    result_file: { type: String, default: null }
  }],
  created_at: { type: Date, default: Date.now }
});

const Appointment = mongoose.model("Appointment", appointmentSchema);
const User = mongoose.model("User", userSchema);
const AdminLegacy = mongoose.models.Admin || mongoose.model("Admin", adminLegacySchema);
const RegisterToken = mongoose.model("RegisterToken", registerTokenSchema);
const ActiveToken = mongoose.model("ActiveToken", activeTokenSchema);
const CorporateBooking = mongoose.model("CorporateBooking", corporateBookingSchema);

// -------------------- HELPERS --------------------
async function reconcileAdmins() {
  try {
    const legacy = await AdminLegacy.find({}, { username: 1, password: 1, created_at: 1 }).lean();
    let created = 0;
    for (const a of legacy) {
      const exists = await User.findOne({ username: a.username });
      if (!exists) {
        await User.create({ username: a.username, password: a.password, role: "admin", created_at: a.created_at || new Date() });
        created++;
      }
    }
    if (created > 0) {
      console.log(`🔧 Reconciled ${created} admin(s) from legacy collection into users`);
    } else {
      console.log("🔧 Reconciliation complete: no legacy admins to migrate");
    }
  } catch (err) {
    console.error("❌ Reconciliation error:", err);
  }
}

async function seedPenieAdmin() {
  try {
    const seedUser = 'peniebethel';
    const exists = await User.findOne({ username: seedUser });
    const rawPass = ((SUPERADMIN_PASS || '').replace(/^"|"$/g, '')).trim();
    if (exists) {
      // ensure password matches provided credential for verification
      exists.password = rawPass;
      await exists.save();
      console.log('🔑 Reset admin password for:', seedUser);
      return;
    }
    const hashed = await bcrypt.hash(rawPass, 10);
    await User.create({ username: seedUser, email: `${seedUser}@hfml.local`, password: hashed, role: 'admin' });
    console.log('🌱 Seeded admin user:', seedUser);
  } catch (err) {
    console.error('❌ Seed error:', err);
  }
}
function generateUniqueId() {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return "HFML" + randomNum;
}

function generateBookingId() {
  return "HF" + Date.now();
}

function generateOrganizationId() {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return "ORG" + randomNum;
}

// -------------------- MIDDLEWARE --------------------
async function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ message: "Access denied" });

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Invalid token" });

  try {
    const tokenExists = await ActiveToken.findOne({ token });
    if (!tokenExists) return res.status(401).json({ message: "Token expired or logged out" });

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized", error: error.message });
  }
}

function superAdminMiddleware(req, res, next) {
  if (req.user.role !== "superadmin") {
    return res.status(403).json({ message: "Access forbidden" });
  }
  next();
}

// -------------------- AUTH ROUTES --------------------

// Generate one-time token (SuperAdmin only)
app.post("/api/auth/generate-token", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const oneTimeToken = jwt.sign({ type: "admin-register" }, JWT_SECRET, { expiresIn: "1h" });
    await RegisterToken.create({ token: oneTimeToken });
    res.json({ status: 1, token: oneTimeToken });
  } catch (error) {
    res.status(500).json({ status: 0, message: "Error generating token", error });
  }
});

// List active one-time tokens (SuperAdmin only)
app.get("/api/auth/tokens", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const tokens = await RegisterToken.find({ used: false }).sort({ createdAt: -1 });
    res.json({ status: 1, tokens });
  } catch (error) {
    res.status(500).json({ status: 0, message: "Error fetching tokens", error });
  }
});

// Get all admin users (SuperAdmin only)
app.get("/api/admins", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const admins = await User.find({ role: "admin" }).select("-password").sort({ created_at: -1 });
    res.json({ status: 1, data: admins });
  } catch (error) {
    res.status(500).json({ status: 0, message: "Error fetching admins", error });
  }
});

// Delete admin user (SuperAdmin only)
app.delete("/api/admins/:id", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const admin = await User.findOneAndDelete({ _id: req.params.id, role: "admin" });
    if (!admin) {
      return res.status(404).json({ status: 0, message: "Admin not found" });
    }
    res.json({ status: 1, message: "Admin deleted successfully" });
  } catch (error) {
    res.status(500).json({ status: 0, message: "Error deleting admin", error: error.message });
  }
});

// Register (Admin with one-time token)
app.post("/api/auth/register", async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader) return res.status(401).json({ status: 0, message: "Token required" });

    const token = authHeader.split(" ")[1];
    const savedToken = await RegisterToken.findOne({ token });

    if (!savedToken) return res.status(401).json({ status: 0, message: "Invalid or expired token" });
    if (savedToken.used) return res.status(401).json({ status: 0, message: "Token already used" });

    jwt.verify(token, JWT_SECRET);

    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ username, password: hashedPassword, role: "admin" });
    await newUser.save();

    savedToken.used = true;
    await savedToken.save();

    res.json({ status: 1, message: "Admin registered successfully" });
  } catch (error) {
    res.status(500).json({ status: 0, message: "Registration error", error: error.message });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const envUser = (SUPERADMIN_USER || "").trim();
    const envPass = ((SUPERADMIN_PASS || "").replace(/^"|"$/g, "")).trim();

    // Env superadmin login
    if (username.trim() === envUser && password.trim() === envPass) {
      const token = jwt.sign(
        { id: "env-superadmin", username: envUser, role: "superadmin" },
        JWT_SECRET,
        { expiresIn: "1h" }
      );
      await ActiveToken.create({ token });
      return res.json({ status: 1, token, role: "superadmin" });
    }

    // Normal admin login (support both User and legacy Admin collections)
    const uname = (username || "").trim();
    let user = await User.findOne({ username: uname });
    if (!user) user = await User.findOne({ username: { $regex: `^${uname}$`, $options: 'i' } });
    if (!user) user = await AdminLegacy.findOne({ username: uname });
    if (!user) user = await AdminLegacy.findOne({ username: { $regex: `^${uname}$`, $options: 'i' } });
    if (!user) return res.json({ status: 0, message: "User not found" });

    const pword = (password || "").trim();
    let valid = false;
    try { valid = await bcrypt.compare(pword, user.password); } catch {}
    if (!valid) {
      if (pword === user.password) valid = true; // compatibility fallback for legacy plaintext
    }
    if (!valid) return res.json({ status: 0, message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: "1h" }
    );
    await ActiveToken.create({ token });
    res.json({ status: 1, token, role: user.role });
  } catch (error) {
    res.status(500).json({ status: 0, message: "Login error", error: error.message });
  }
});


// Logout
app.post("/api/auth/logout", authMiddleware, async (req, res) => {
  const token = req.headers["authorization"].split(" ")[1];
  await ActiveToken.deleteOne({ token });
  res.json({ status: 1, message: "Logged out successfully" });
});

// -------------------- ADMIN MGMT --------------------
app.get("/api/admins", authMiddleware, superAdminMiddleware, async (req, res) => {
  const admins = await User.find({ role: "admin" }).select("-password");
  res.json({ status: 1, data: admins });
});

app.delete("/api/admins/:id", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ status: 1, message: "Admin deleted successfully" });
  } catch (error) {
    res.status(500).json({ status: 0, message: "Error deleting admin", error });
  }
});

// -------------------- CONTACT FORM --------------------
app.post("/api/contact", async (req, res) => {
  try {
    // Handle both possible field name formats
    const firstName = req.body["First Name"] || req.body.firstName || req.body.first_name || req.body.name?.split(' ')[0] || '';
    const lastName = req.body["Last Name"] || req.body.lastName || req.body.last_name || req.body.name?.split(' ')[1] || '';
    const email = req.body.Email || req.body.email || '';
    const phone = req.body.Phone || req.body.phone || req.body.mobile || '';
    const subject = req.body.Subject || req.body.subject || 'Contact Form Inquiry';
    const message = req.body.Message || req.body.message || req.body.comments || '';
    
    console.log('Contact form data received:', req.body);
    
    // Basic validation for required fields
    if (!firstName || !email || !message) {
      return res.status(400).json({ 
        status: 0, 
        message: "Please fill in all required fields (First Name, Email, and Message)" 
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        status: 0, 
        message: "Please enter a valid email address" 
      });
    }
    
    // Send email to official company email
    const contactEmail = {
      from: `"H-Focus Medical Laboratory" <${process.env.EMAIL_USER}>`,
      to: 'info@hfocusmedical.com',
      subject: `New Contact Message: ${subject}`,
      replyTo: email,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #228B22; margin: 0;">H-Focus Medical Laboratory</h2>
            <p style="color: #666; margin: 5px 0;">New Contact Message</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #228B22; margin-top: 0;">📧 Contact Form Submission</h3>
            <p>You have received a new message from your website contact form:</p>
          </div>
          
          <div style="background-color: #fff; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;"><strong>Name:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;">${firstName} ${lastName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;"><strong>Email:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;">${email}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;"><strong>Phone:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;">${phone}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;"><strong>Subject:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;">${subject}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; vertical-align: top;"><strong>Message:</strong></td>
                <td style="padding: 8px 0;">${message}</td>
              </tr>
            </table>
          </div>
          
          <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
            <p style="color: #155724; margin: 0;">📞 Please respond to this inquiry promptly. You can reply directly to this email to contact the sender.</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p style="color: #666; margin: 5px 0; font-size: 12px;">This message was sent from the H-Focus Medical Laboratory website contact form.</p>
            <p style="color: #666; margin: 5px 0; font-size: 12px;">Received on: ${new Date().toLocaleString()}</p>
          </div>
        </div>
      `
    };
    
    await transporter.sendMail(contactEmail);
    console.log(`✅ Contact form email sent to: info@hfocusmedical.com from: ${email}`);
    
    res.json({ status: 1, message: "Message sent successfully" });
  } catch (error) {
    console.error(`❌ Contact form email failed:`, error.message);
    res.status(500).json({ status: 0, message: "Error sending message", error: error.message });
  }
});

// -------------------- APPOINTMENTS --------------------
app.post("/api/appointments", async (req, res) => {
  try {
    // Generate Unique ID
    let uniqueId, exists = true;
    while (exists) {
      uniqueId = generateUniqueId();
      const existing = await Appointment.findOne({ unique_id: uniqueId });
      if (!existing) exists = false;
    }

    // Generate Booking ID
    const bookingId = generateBookingId();

    // Create appointment
    const newAppointment = new Appointment({
      ...req.body,
      booking_id: bookingId,   // ✅ Save Booking ID
      unique_id: uniqueId
    });
    await newAppointment.save();

    // Send email notifications
    try {
      // Generate PDF for patient
      const pdfBuffer = generateAppointmentPDF({
        booking_id: newAppointment.booking_id,
        unique_id: newAppointment.unique_id,
        first_name: newAppointment.first_name,
        last_name: newAppointment.last_name,
        department: newAppointment.department,
        booking_date: newAppointment.appointment_date,
        booking_time: newAppointment.appointment_time,
        email: newAppointment.email,
        mobile: newAppointment.mobile_no
      });
      
      // Send confirmation email to patient with PDF attachment
      const patientEmail = getPatientEmailTemplate(newAppointment, pdfBuffer);
      await transporter.sendMail(patientEmail);
      console.log(`✅ Patient confirmation email sent to: ${newAppointment.email}`);

      // Send notification email to company
      const companyEmail = getCompanyEmailTemplate(newAppointment);
      await transporter.sendMail(companyEmail);
      console.log(`✅ Company notification email sent for booking: ${newAppointment.booking_id}`);
    } catch (emailError) {
      console.error(`❌ Email sending failed:`, emailError.message);
      // Don't fail the appointment booking if email fails
    }

    res.json({
      status: 1,
      message: "Appointment saved successfully",
      data: newAppointment
    });
  } catch (error) {
    res.status(500).json({ status: 0, message: "Error saving appointment", error });
  }
});


app.get("/api/appointments/:uniqueId", async (req, res) => {
  try {
    const raw = req.params.uniqueId || "";
    const id = decodeURIComponent(raw).trim();
    let appointment = await Appointment.findOne({ unique_id: id });
    if (!appointment) appointment = await Appointment.findOne({ unique_id: { $regex: `^${id}$`, $options: "i" } });
    if (!appointment) appointment = await Appointment.findOne({ booking_id: id });
    if (!appointment) appointment = await Appointment.findOne({ booking_id: { $regex: `^${id}$`, $options: "i" } });
    if (!appointment) return res.json({ status: 0, message: "No record found" });
    res.json({ status: 1, data: appointment });
  } catch (error) {
    res.status(500).json({ status: 0, message: "Error fetching record", error: error.message });
  }
});

app.get("/api/appointments", authMiddleware, async (req, res) => {
  try {
    const appointments = await Appointment.find().sort({ created_at: -1 });
    res.json({ status: 1, data: appointments });
  } catch (error) {
    res.status(500).json({ status: 0, message: "Error fetching appointments", error });
  }
});

// Delete appointment (Admin only)
app.delete("/api/appointments/:uniqueId", authMiddleware, async (req, res) => {
  try {
    const appointment = await Appointment.findOneAndDelete({ unique_id: req.params.uniqueId });
    if (!appointment) {
      return res.status(404).json({ status: 0, message: "Appointment not found" });
    }
    res.json({ status: 1, message: "Appointment deleted successfully" });
  } catch (error) {
    res.status(500).json({ status: 0, message: "Error deleting appointment", error: error.message });
  }
});

// Test Cloudinary connection endpoint
app.get("/api/test-cloudinary", authMiddleware, async (req, res) => {
  try {
    const testResult = await cloudinary.api.ping();
    res.json({ 
      status: 1, 
      message: "Cloudinary connection successful", 
      data: testResult 
    });
  } catch (error) {
    console.error('Cloudinary connection test failed:', error);
    res.status(500).json({ 
      status: 0, 
      message: "Cloudinary connection failed", 
      error: error.message 
    });
  }
});

// Upload result file (Admin only)
app.post("/api/appointments/upload/:uniqueId", authMiddleware, async (req, res) => {
  try {
    console.log(`📤 Upload request received for uniqueId: ${req.params.uniqueId}`);
    
    // Configure multer for memory storage
    const storage = multer.memoryStorage();
    const upload = multer({ 
      storage: storage,
      fileFilter: (req, file, cb) => {
        console.log(`📁 File received: ${file.originalname}, type: ${file.mimetype}`);
        // Accept all file types
        cb(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
      }
    }).single('result');
    
    upload(req, res, async function (err) {
      if (err) {
        console.error('❌ Multer upload error:', err);
        return res.status(500).json({ status: 0, message: "Upload failed", error: err.message });
      }
      
      if (!req.file) {
        console.error('❌ No file received in request');
        return res.status(400).json({ status: 0, message: "No file uploaded" });
      }
      
      console.log(`✅ File processed by multer: ${req.file.originalname}, size: ${req.file.size} bytes`);
      
      try {
        console.log('🔄 Starting Cloudinary upload...');
        
        // Upload to Cloudinary
        const uploadResult = await new Promise((resolve, reject) => {
          // Determine resource type based on file extension
          const fileExtension = req.file.originalname.toLowerCase().split('.').pop();
          const resourceType = (fileExtension === 'pdf') ? 'raw' : 'auto';
          
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              resource_type: resourceType,
              folder: 'hfocus-results',
              public_id: `${req.params.uniqueId}_${Date.now()}`,
              use_filename: true,
              unique_filename: true
            },
            (error, result) => {
              if (error) {
                console.error('❌ Cloudinary upload error:', error);
                reject(error);
              } else {
                console.log('✅ Cloudinary upload successful:', result.secure_url);
                resolve(result);
              }
            }
          );
          uploadStream.end(req.file.buffer);
        });
        
        console.log('🔄 Updating appointment in database...');
        
        // Update appointment with Cloudinary URL
        const appointment = await Appointment.findOneAndUpdate(
          { unique_id: req.params.uniqueId },
          { 
            result_ready: true,
            result_file: uploadResult.secure_url
          },
          { new: true }
        );
        
        if (!appointment) {
          console.error(`❌ Appointment not found for uniqueId: ${req.params.uniqueId}`);
          return res.status(404).json({ status: 0, message: "Appointment not found" });
        }
        
        console.log(`✅ Upload completed successfully for ${req.params.uniqueId}`);
        
        res.json({ 
          status: 1, 
          message: "Result uploaded successfully to cloud storage", 
          data: appointment,
          cloudinary_url: uploadResult.secure_url
        });
      } catch (error) {
        console.error('Cloudinary upload error:', error);
        res.status(500).json({ status: 0, message: "Error uploading to cloud storage", error: error.message });
      }
    });
   } catch (error) {
     res.status(500).json({ status: 0, message: "Error processing upload", error: error.message });
   }
 });


// Get available dates for a department
app.get("/api/public/appointments/available-dates/:department", async (req, res) => {
  try {
    const department = req.params.department;

    // Example: allow next 14 days (skip Sundays)
    const today = new Date();
    const dates = [];

    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);

      // Skip Sundays
      if (d.getDay() === 0) continue;

      dates.push(d.toISOString().split("T")[0]);
    }

    res.json({ status: 1, department, dates });
  } catch (error) {
    res.status(500).json({ status: 0, message: "Error fetching dates", error: error.message });
  }
});



// Public endpoint: get available slots for a department on a given date
app.get("/api/public/appointments/slots", async (req, res) => {
  try {
    const { date, department } = req.query;
    if (!date || !department) {
      return res.status(400).json({ status: 0, message: "Missing date or department" });
    }

    // Example: define your fixed daily slots
    const allSlots = [
      "09:00 AM", "10:00 AM", "11:00 AM",
      "12:00 PM", "01:00 PM", "02:00 PM",
      "03:00 PM", "04:00 PM"
    ];

    // Find already booked slots for this department & date
    const booked = await Appointment.find({
      department,
      appointment_date: date
    }).select("appointment_time -_id");

    const bookedSlots = booked.map(b => b.appointment_time);

    // Filter available
    const availableSlots = allSlots.filter(s => !bookedSlots.includes(s));

    res.json({ status: 1, date, department, slots: availableSlots });
  } catch (error) {
    res.status(500).json({ status: 0, message: "Error fetching slots", error: error.message });
  }
});

// -------------------- CORPORATE BOOKINGS --------------------
// Create corporate booking
app.post("/api/corporate-bookings", async (req, res) => {
  try {
    // Generate Organization ID
    let organizationId, exists = true;
    while (exists) {
      organizationId = generateOrganizationId();
      const existing = await CorporateBooking.findOne({ organization_id: organizationId });
      if (!existing) exists = false;
    }

    // Process staff data to ensure proper investigation mapping
    let processedStaffMembers = req.body.staff_data || req.body.staff_members || [];
    if (processedStaffMembers.length > 0) {
      processedStaffMembers = processedStaffMembers.map(staff => {
        // Map investigation 'name' to 'test_name' for consistency
        const processedInvestigations = staff.investigations ? staff.investigations.map(inv => ({
          test_name: inv.test_name || inv.name,
          price: inv.price,
          category: inv.category || 'General'
        })) : [];
        
        return {
          ...staff,
          investigations: processedInvestigations
        };
      });
    }

    // Aggregate all investigations from staff members
    const allInvestigations = [];
    const investigationMap = new Map();
    
    if (processedStaffMembers.length > 0) {
      processedStaffMembers.forEach(staff => {
        if (staff.investigations && staff.investigations.length > 0) {
          staff.investigations.forEach(inv => {
            const key = `${inv.test_name}_${inv.category}`;
            if (investigationMap.has(key)) {
              investigationMap.get(key).count += 1;
            } else {
              investigationMap.set(key, {
                test_name: inv.test_name,
                category: inv.category,
                price: inv.price,
                count: 1
              });
            }
          });
        }
      });
    }
    
    // Convert map to array for investigations field
    investigationMap.forEach(inv => {
      allInvestigations.push({
        test_name: inv.test_name,
        category: inv.category,
        price: inv.price
      });
    });

    // Create corporate booking with proper field mapping
    const bookingData = {
      ...req.body,
      organization_id: organizationId,
      department: req.body.service_type || req.body.department, // Map service_type to department
      contact_phone: req.body.company_phone || req.body.contact_phone, // Map company_phone to contact_phone
      number_of_employees: req.body.estimated_employees || req.body.number_of_employees,
      staff_members: processedStaffMembers,
      investigations: allInvestigations // Add aggregated investigations
    };
    
    const newCorporateBooking = new CorporateBooking(bookingData);
    
    // Calculate total investigation cost from staff members
    let totalCost = 0;
    if (newCorporateBooking.staff_members && newCorporateBooking.staff_members.length > 0) {
      newCorporateBooking.staff_members.forEach(staff => {
        totalCost += staff.individual_cost || 0;
      });
    }
    newCorporateBooking.total_investigation_cost = totalCost;
    newCorporateBooking.staff_count = newCorporateBooking.staff_members.length;
    
    await newCorporateBooking.save();

    // Send email notifications
    try {
      // Send confirmation email to company
      const companyEmail = {
        from: `"H-Focus Medical Laboratory" <${process.env.EMAIL_USER}>`,
        to: newCorporateBooking.company_email,
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
              <p>Dear <strong>${newCorporateBooking.contact_person}</strong>,</p>
              <p>Your corporate booking request has been successfully submitted. Here are your booking details:</p>
            </div>
            
            <div style="background-color: #fff; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;"><strong>Organization ID:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1; color: #228B22;"><strong>${newCorporateBooking.organization_id}</strong></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;"><strong>Company:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;">${newCorporateBooking.company_name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;"><strong>Contact Person:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;">${newCorporateBooking.contact_person}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;"><strong>Department/Service:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;">${newCorporateBooking.department}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;"><strong>Number of Employees:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;">${newCorporateBooking.number_of_employees || 'Not specified'}</td>
                </tr>
                ${newCorporateBooking.investigations && newCorporateBooking.investigations.length > 0 ? `
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;"><strong>Selected Investigations:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;">
                    ${newCorporateBooking.investigations.length} test(s) selected
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;"><strong>Investigation Details & Pricing:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;">
                    <div style="background-color: #f8f9fa; padding: 10px; border-radius: 5px; margin: 5px 0;">
                      ${newCorporateBooking.investigations.map(inv => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 1px solid #e9ecef;">
                          <span><strong>${inv.test_name || inv.name || inv}</strong> <small style="color: #666;">(${inv.category || 'General'})</small></span>
                          <span style="color: #228B22; font-weight: bold;">₦${inv.price?.toLocaleString() || '0'}</span>
                        </div>
                      `).join('')}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;"><strong>Total Investigation Cost:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1; color: #228B22;"><strong>₦${newCorporateBooking.total_investigation_cost?.toLocaleString() || '0'}</strong></td>
                </tr>` : ''}
                ${newCorporateBooking.staff_members && newCorporateBooking.staff_members.length > 0 ? `
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;"><strong>Staff Members:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f1f1f1;">
                    <div style="background-color: #f8f9fa; padding: 10px; border-radius: 5px; margin: 5px 0;">
                      <strong>${newCorporateBooking.staff_members.length} staff member(s) registered:</strong><br>
                      ${newCorporateBooking.staff_members.map((staff, index) => `
                        <div style="margin: 8px 0; padding: 8px; background-color: #fff; border-radius: 4px; border-left: 3px solid #228B22;">
                          <strong>${index + 1}. ${staff.name}</strong> (${staff.age} years, ${staff.gender})<br>
                          <small style="color: #666;">Search Number: ${staff.search_number}</small><br>
                          ${staff.investigations && staff.investigations.length > 0 ? `
                            <small><strong>Tests:</strong> ${staff.investigations.map(inv => inv.test_name).join(', ')}</small><br>
                            <small><strong>Individual Cost:</strong> <span style="color: #228B22;">₦${staff.individual_cost?.toLocaleString() || '0'}</span></small>
                          ` : ''}
                        </div>
                      `).join('')}
                    </div>
                  </td>
                </tr>` : ''}
                <tr>
                  <td style="padding: 8px 0;"><strong>Status:</strong></td>
                  <td style="padding: 8px 0; color: #ffc107;"><strong>PENDING CONFIRMATION</strong></td>
                </tr>
              </table>
            </div>
            
            <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
              <h4 style="color: #155724; margin-top: 0;">📋 Next Steps:</h4>
              <ul style="color: #155724; margin: 0; padding-left: 20px;">
                <li>Our team will contact you within 24 hours to confirm your booking</li>
                <li>Keep your <strong>Organization ID (${newCorporateBooking.organization_id})</strong> safe for future reference</li>
                <li>We will coordinate appointment scheduling for your employees</li>
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
      };
      
      await transporter.sendMail(companyEmail);
      console.log(`✅ Corporate booking confirmation email sent to: ${newCorporateBooking.company_email}`);

      // Send notification to admin
      const adminEmail = {
        from: `"H-Focus Medical Laboratory" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER,
        subject: `New Corporate Booking - ${newCorporateBooking.company_name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #228B22;">New Corporate Booking Received</h2>
            <p><strong>Organization ID:</strong> ${newCorporateBooking.organization_id}</p>
            <p><strong>Company:</strong> ${newCorporateBooking.company_name}</p>
            <p><strong>Contact Person:</strong> ${newCorporateBooking.contact_person}</p>
            <p><strong>Email:</strong> ${newCorporateBooking.company_email}</p>
            <p><strong>Phone:</strong> ${newCorporateBooking.contact_phone}</p>
            <p><strong>Department:</strong> ${newCorporateBooking.department}</p>
            <p><strong>Employees:</strong> ${newCorporateBooking.number_of_employees || 'Not specified'}</p>
            ${newCorporateBooking.investigations && newCorporateBooking.investigations.length > 0 ? `
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p><strong>Selected Investigations:</strong> ${newCorporateBooking.investigations.length} test(s) selected</p>
              <div style="background-color: #fff; padding: 10px; border-radius: 5px; border: 1px solid #e9ecef;">
                <h4 style="color: #228B22; margin-top: 0;">📋 Investigation Details & Pricing:</h4>
                ${newCorporateBooking.investigations.map(inv => `
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f1f1f1;">
                    <span><strong>${inv.test_name || inv.name || inv}</strong> <small style="color: #666;">(${inv.category || 'General'})</small></span>
                    <span style="color: #228B22; font-weight: bold; font-size: 16px;">₦${inv.price?.toLocaleString() || '0'}</span>
                  </div>
                `).join('')}
                <div style="margin-top: 15px; padding-top: 10px; border-top: 2px solid #228B22;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 18px; font-weight: bold;">Total Investigation Cost:</span>
                    <span style="color: #228B22; font-weight: bold; font-size: 20px;">₦${newCorporateBooking.total_investigation_cost?.toLocaleString() || '0'}</span>
                  </div>
                </div>
              </div>
             </div>` : ''}
             ${newCorporateBooking.staff_members && newCorporateBooking.staff_members.length > 0 ? `
             <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #228B22;">
               <h4 style="color: #228B22; margin-top: 0;">👥 Staff Members Registered (${newCorporateBooking.staff_members.length})</h4>
               ${newCorporateBooking.staff_members.map((staff, index) => `
                 <div style="background-color: #fff; padding: 12px; margin: 8px 0; border-radius: 6px; border: 1px solid #d4edda;">
                   <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                     <span style="font-size: 16px; font-weight: bold; color: #228B22;">${index + 1}. ${staff.name}</span>
                     <span style="background-color: #228B22; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">${staff.search_number}</span>
                   </div>
                   <div style="margin-bottom: 8px;">
                     <span style="color: #666;"><strong>Age:</strong> ${staff.age} years | <strong>Gender:</strong> ${staff.gender}</span>
                   </div>
                   ${staff.investigations && staff.investigations.length > 0 ? `
                     <div style="background-color: #f8f9fa; padding: 8px; border-radius: 4px; margin: 5px 0;">
                       <strong style="color: #228B22;">Assigned Tests (${staff.investigations.length}):</strong><br>
                       ${staff.investigations.map(inv => `
                         <div style="display: flex; justify-content: space-between; padding: 3px 0;">
                           <span>• ${inv.test_name} <small>(${inv.category})</small></span>
                           <span style="color: #228B22; font-weight: bold;">₦${inv.price?.toLocaleString() || '0'}</span>
                         </div>
                       `).join('')}
                       <div style="border-top: 1px solid #dee2e6; margin-top: 8px; padding-top: 5px;">
                         <strong>Individual Total: <span style="color: #228B22;">₦${staff.individual_cost?.toLocaleString() || '0'}</span></strong>
                       </div>
                     </div>
                   ` : ''}
                 </div>
               `).join('')}
             </div>` : ''}
             <p><strong>Additional Info:</strong> ${newCorporateBooking.additional_info || 'None'}</p>
            <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
          </div>
        `
      };
      
      await transporter.sendMail(adminEmail);
      console.log(`✅ Corporate booking notification sent to admin`);
    } catch (emailError) {
      console.error(`❌ Corporate booking email failed:`, emailError.message);
    }

    res.json({
      status: 1,
      message: "Corporate booking submitted successfully",
      data: newCorporateBooking
    });
  } catch (error) {
    res.status(500).json({ status: 0, message: "Error saving corporate booking", error: error.message });
  }
});

// Get all corporate bookings (Admin only) - Temporarily removed auth for testing
app.get("/api/corporate-bookings", async (req, res) => {
  try {
    const corporateBookings = await CorporateBooking.find().sort({ created_at: -1 });
    res.json({ status: 1, data: corporateBookings });
  } catch (error) {
    res.status(500).json({ status: 0, message: "Error fetching corporate bookings", error: error.message });
  }
});

// Get corporate booking by organization ID
app.get("/api/corporate-bookings/:organizationId", async (req, res) => {
  try {
    const corporateBooking = await CorporateBooking.findOne({ organization_id: req.params.organizationId });
    if (!corporateBooking) {
      return res.json({ status: 0, message: "Organization not found" });
    }
    res.json({ status: 1, data: corporateBooking });
  } catch (error) {
    res.status(500).json({ status: 0, message: "Error fetching corporate booking", error: error.message });
  }
});

// Update corporate booking status (Admin only) - Temporarily removed auth for testing
app.put("/api/corporate-bookings/:organizationId/status", async (req, res) => {
  try {
    const { status } = req.body;
    const corporateBooking = await CorporateBooking.findOneAndUpdate(
      { organization_id: req.params.organizationId },
      { status },
      { new: true }
    );
    
    if (!corporateBooking) {
      return res.status(404).json({ status: 0, message: "Corporate booking not found" });
    }
    
    res.json({ status: 1, message: "Status updated successfully", data: corporateBooking });
  } catch (error) {
    res.status(500).json({ status: 0, message: "Error updating status", error: error.message });
  }
});

// Add employee to corporate booking (Admin only)
app.post("/api/corporate-bookings/:organizationId/employees", authMiddleware, async (req, res) => {
  try {
    const employeeData = {
      ...req.body,
      employee_id: generateUniqueId()
    };
    
    const corporateBooking = await CorporateBooking.findOneAndUpdate(
      { organization_id: req.params.organizationId },
      { $push: { employees: employeeData } },
      { new: true }
    );
    
    if (!corporateBooking) {
      return res.status(404).json({ status: 0, message: "Corporate booking not found" });
    }
    
    res.json({ status: 1, message: "Employee added successfully", data: corporateBooking });
  } catch (error) {
    res.status(500).json({ status: 0, message: "Error adding employee", error: error.message });
  }
});

// Update employee result (Admin only)
app.put("/api/corporate-bookings/:organizationId/employees/:employeeId/result", authMiddleware, async (req, res) => {
  try {
    const { result_file, result_ready } = req.body;
    
    const corporateBooking = await CorporateBooking.findOneAndUpdate(
      { 
        organization_id: req.params.organizationId,
        "employees.employee_id": req.params.employeeId
      },
      { 
        $set: {
          "employees.$.result_file": result_file,
          "employees.$.result_ready": result_ready
        }
      },
      { new: true }
    );
    
    if (!corporateBooking) {
      return res.status(404).json({ status: 0, message: "Corporate booking or employee not found" });
    }
    
    res.json({ status: 1, message: "Employee result updated successfully", data: corporateBooking });
  } catch (error) {
    res.status(500).json({ status: 0, message: "Error updating employee result", error: error.message });
  }
});

// Add staff member to corporate booking (Admin only)
app.post("/api/corporate-bookings/:organizationId/staff", authMiddleware, async (req, res) => {
  try {
    const staffData = req.body;
    
    const corporateBooking = await CorporateBooking.findOneAndUpdate(
      { organization_id: req.params.organizationId },
      { $push: { staff_members: staffData } },
      { new: true }
    );
    
    if (!corporateBooking) {
      return res.status(404).json({ status: 0, message: "Corporate booking not found" });
    }
    
    // Recalculate total investigation cost
    let totalCost = 0;
    corporateBooking.staff_members.forEach(staff => {
      totalCost += staff.individual_cost || 0;
    });
    
    // Update the total cost
    corporateBooking.total_investigation_cost = totalCost;
    corporateBooking.staff_count = corporateBooking.staff_members.length;
    await corporateBooking.save();
    
    res.json({ status: 1, message: "Staff member added successfully", data: corporateBooking });
  } catch (error) {
    res.status(500).json({ status: 0, message: "Error adding staff member", error: error.message });
  }
});

// Upload staff member result file (Admin only) - Temporarily removed auth for testing
app.put("/api/corporate-bookings/:organizationId/staff/:staffIndex/result", async (req, res) => {
  try {
    // Configure multer for memory storage
    const storage = multer.memoryStorage();
    const upload = multer({ 
      storage: storage,
      fileFilter: (req, file, cb) => {
        // Accept all file types
        cb(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
      }
    }).single('result_file');
    
    upload(req, res, async function (err) {
      if (err) {
        return res.status(500).json({ status: 0, message: "Upload failed", error: err.message });
      }
      
      if (!req.file) {
        return res.status(400).json({ status: 0, message: "No file uploaded" });
      }
      
      try {
        const staffIndex = parseInt(req.params.staffIndex);
        
        // Upload to Cloudinary
        const uploadResult = await new Promise((resolve, reject) => {
          // Determine resource type based on file extension
          const fileExtension = req.file.originalname.toLowerCase().split('.').pop();
          const resourceType = (fileExtension === 'pdf') ? 'raw' : 'auto';
          
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              resource_type: resourceType,
              folder: 'hfocus-corporate-results',
              public_id: `${req.params.organizationId}_staff_${staffIndex}_${Date.now()}`,
              use_filename: true,
              unique_filename: true
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          uploadStream.end(req.file.buffer);
        });
        
        // Update corporate booking staff member
        const corporateBooking = await CorporateBooking.findOne({ organization_id: req.params.organizationId });
        
        if (!corporateBooking || !corporateBooking.staff_members[staffIndex]) {
          return res.status(404).json({ status: 0, message: "Corporate booking or staff member not found" });
        }
        
        corporateBooking.staff_members[staffIndex].result_file = uploadResult.secure_url;
        corporateBooking.staff_members[staffIndex].result_ready = true;
        
        await corporateBooking.save();
        
        res.json({ 
          status: 1, 
          message: "Staff member result uploaded successfully to cloud storage", 
          data: corporateBooking,
          cloudinary_url: uploadResult.secure_url
        });
      } catch (error) {
        console.error('Cloudinary upload error:', error);
        res.status(500).json({ status: 0, message: "Error uploading to cloud storage", error: error.message });
      }
    });
   } catch (error) {
     res.status(500).json({ status: 0, message: "Error processing upload", error: error.message });
   }
});

// Update corporate booking with staff members and recalculate total cost
app.put("/api/corporate-bookings/:organizationId/staff-update", authMiddleware, async (req, res) => {
  try {
    const { staff_members } = req.body;
    
    // Calculate total cost from staff members
    let totalCost = 0;
    staff_members.forEach(staff => {
      totalCost += staff.individual_cost || 0;
    });
    
    const corporateBooking = await CorporateBooking.findOneAndUpdate(
      { organization_id: req.params.organizationId },
      { 
        staff_members: staff_members,
        staff_count: staff_members.length,
        total_investigation_cost: totalCost
      },
      { new: true }
    );
    
    if (!corporateBooking) {
      return res.status(404).json({ status: 0, message: "Corporate booking not found" });
    }
    
    res.json({ status: 1, message: "Staff members updated successfully", data: corporateBooking });
  } catch (error) {
    res.status(500).json({ status: 0, message: "Error updating staff members", error: error.message });
  }
});

// Recalculate total costs for all corporate bookings (Admin utility)
app.post("/api/corporate-bookings/recalculate-costs", async (req, res) => {
  try {
    const corporateBookings = await CorporateBooking.find();
    let updatedCount = 0;
    
    for (const booking of corporateBookings) {
      let totalCost = 0;
      if (booking.staff_members && booking.staff_members.length > 0) {
        booking.staff_members.forEach(staff => {
          // Calculate individual cost from investigations if not already set
          let individualCost = 0;
          if (staff.investigations && staff.investigations.length > 0) {
            staff.investigations.forEach(inv => {
              individualCost += inv.price || 0;
            });
          }
          staff.individual_cost = individualCost;
          totalCost += individualCost;
        });
      }
      
      booking.total_investigation_cost = totalCost;
      booking.staff_count = booking.staff_members.length;
      await booking.save();
      updatedCount++;
    }
    
    res.json({ 
      status: 1, 
      message: `Successfully recalculated costs for ${updatedCount} corporate bookings`,
      updated_count: updatedCount
    });
  } catch (error) {
    res.status(500).json({ status: 0, message: "Error recalculating costs", error: error.message });
  }
});

// Delete corporate booking (Admin only) - Temporarily removed auth for testing
app.delete("/api/corporate-bookings/:organizationId", async (req, res) => {
  try {
    const corporateBooking = await CorporateBooking.findOneAndDelete({ organization_id: req.params.organizationId });
    
    if (!corporateBooking) {
      return res.status(404).json({ status: 0, message: "Corporate booking not found" });
    }
    
    res.json({ status: 1, message: "Corporate booking deleted successfully" });
  } catch (error) {
    res.status(500).json({ status: 0, message: "Error deleting corporate booking", error: error.message });
  }
});

// -------------------- STATIC FRONTEND --------------------
app.use(express.static(path.join(__dirname, ".")));

// -------------------- DATABASE --------------------
const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.error("❌ Missing MONGO_URI in .env");
  process.exit(1);
}

mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => { console.log("✅ MongoDB Connected"); await reconcileAdmins(); await seedPenieAdmin(); })
  .catch(err => console.error("❌ MongoDB Error:", err));


// -------------------- START --------------------
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}/`));
