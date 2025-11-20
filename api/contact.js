const nodemailer = require('nodemailer');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ status: 0, message: 'Method Not Allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const firstName = body['First Name'] || body.firstName || body.first_name || '';
    const lastName = body['Last Name'] || body.lastName || body.last_name || '';
    const email = body.Email || body.email || '';
    const phone = body.Phone || body.phone || '';
    const subject = body.Subject || body.subject || 'Contact Form Inquiry';
    const message = body.Message || body.message || '';

    if (!firstName || !email || !message) {
      return res.status(400).json({ status: 0, message: 'Please fill required fields' });
    }

    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    const mail = {
      from: `"H-Focus Medical Laboratory" <${process.env.EMAIL_USER}>`,
      to: 'info@hfocusmedical.com',
      subject: `New Contact Message: ${subject}`,
      replyTo: email,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h3 style="color:#228B22;margin-top:0;">Contact Form Submission</h3>
          <p><strong>Name:</strong> ${firstName} ${lastName}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong><br/>${message}</p>
        </div>`
    };

    await transporter.sendMail(mail);
    return res.status(200).json({ status: 1, message: 'Message sent successfully' });
  } catch (err) {
    return res.status(500).json({ status: 0, message: 'Error sending message', error: err.message });
  }
};