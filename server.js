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
    'http://localhost:3000', // For local development
    'http://localhost:5000'  // For local development
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(bodyParser.json());

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
  password: String,
  role: { type: String, enum: ["admin", "superadmin"], default: "admin" },
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

const Appointment = mongoose.model("Appointment", appointmentSchema);
const User = mongoose.model("User", userSchema);
const RegisterToken = mongoose.model("RegisterToken", registerTokenSchema);
const ActiveToken = mongoose.model("ActiveToken", activeTokenSchema);

// -------------------- HELPERS --------------------
function generateUniqueId() {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return "HFML" + randomNum;
}

function generateBookingId() {
  return "HF" + Date.now();
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
    const envPass = (SUPERADMIN_PASS || "").trim();

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

    // Normal admin login
    const user = await User.findOne({ username: username.trim() });
    if (!user) return res.json({ status: 0, message: "User not found" });

    const valid = await bcrypt.compare(password.trim(), user.password);
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
    const { "First Name": firstName, "Last Name": lastName, Email: email, Phone: phone, Subject: subject, Message: message } = req.body;
    
    // Send email to official company email
    const contactEmail = {
      from: `"H-Focus Medical Laboratory" <${process.env.EMAIL_USER}>`,
      to: 'havefocusgroups@gmail.com',
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
    console.log(`✅ Contact form email sent to: havefocusgroups@gmail.com from: ${email}`);
    
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
    const appointment = await Appointment.findOne({ unique_id: req.params.uniqueId });
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

// Upload result file (Admin only)
app.post("/api/appointments/upload/:uniqueId", authMiddleware, async (req, res) => {
  try {
    const multer = require('multer');
    const storage = multer.diskStorage({
      destination: function (req, file, cb) {
        const fs = require('fs');
        const dir = './public/results';
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
      },
      filename: function (req, file, cb) {
        cb(null, req.params.uniqueId + '_' + Date.now() + '.pdf');
      }
    });
    
    const upload = multer({ storage: storage }).single('result');
    
    upload(req, res, async function (err) {
      if (err) {
        return res.status(500).json({ status: 0, message: "Upload failed", error: err.message });
      }
      
      try {
        const filePath = '/results/' + req.file.filename;
        const appointment = await Appointment.findOneAndUpdate(
          { unique_id: req.params.uniqueId },
          { 
            result_ready: true,
            result_file: filePath
          },
          { new: true }
        );
        
        if (!appointment) {
          return res.status(404).json({ status: 0, message: "Appointment not found" });
        }
        
        res.json({ status: 1, message: "Result uploaded successfully", data: appointment });
      } catch (error) {
        res.status(500).json({ status: 0, message: "Error updating appointment", error: error.message });
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

// -------------------- STATIC FRONTEND --------------------
app.use(express.static(path.join(__dirname, ".")));

// -------------------- DATABASE --------------------
const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.error("❌ Missing MONGO_URI in .env");
  process.exit(1);
}

mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Error:", err));


// -------------------- START --------------------
app.listen(PORT, () => console.log(`🚀 Server running on https://hfocusmedical.com/`));
