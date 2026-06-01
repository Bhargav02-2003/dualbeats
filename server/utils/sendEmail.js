const nodemailer = require('nodemailer');

const isGmailConfigured = () => {
  const user = process.env.EMAIL_USER || '';
  const pass = process.env.EMAIL_PASS || '';
  return (
    user.includes('@') &&
    !user.includes('your_gmail') &&
    pass.length > 0 &&
    pass !== 'your_gmail_app_password'
  );
};

const createTransporter = async () => {
  // Use real Gmail if credentials are configured
  if (isGmailConfigured()) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  // Fallback: Ethereal fake SMTP (development/testing)
  // OTP will be printed to server console + preview URL shown
  console.log('⚠️  Gmail not configured — using Ethereal test account');
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
    _ethereal: true,
  });
};

/**
 * Send OTP verification email
 * @param {string} toEmail - Recipient email address
 * @param {string} otp - 6-digit OTP code
 * @param {string} name - Recipient name
 */
const sendOTPEmail = async (toEmail, otp, name) => {
  const transporter = await createTransporter();

  const mailOptions = {
    from: `"DualBeats 🎵" <${process.env.EMAIL_USER || 'dualbeats@test.com'}>`,
    to: toEmail,
    subject: 'Your DualBeats Verification Code',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verification</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #0f0f0f; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <div style="max-width: 600px; margin: 40px auto; background: linear-gradient(135deg, #1a1a1a, #212121); border-radius: 16px; overflow: hidden; border: 1px solid #2a2a2a;">
            <div style="background: linear-gradient(135deg, #6c5ce7, #a29bfe); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">🎵 DualBeats</h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">Dual Music Player Experience</p>
            </div>
            <div style="padding: 40px 30px;">
              <p style="color: #e0e0e0; font-size: 16px; margin: 0 0 16px;">Hi <strong style="color: #a29bfe;">${name}</strong>,</p>
              <p style="color: #aaa; font-size: 15px; line-height: 1.6; margin: 0 0 30px;">
                Use the verification code below to complete your DualBeats registration. This code expires in <strong style="color: #e0e0e0;">10 minutes</strong>.
              </p>
              <div style="background: #0f0f0f; border: 2px solid #6c5ce7; border-radius: 12px; padding: 24px; text-align: center; margin: 0 0 30px;">
                <p style="margin: 0 0 8px; color: #888; font-size: 13px; text-transform: uppercase; letter-spacing: 2px;">Verification Code</p>
                <div style="font-size: 42px; font-weight: 900; color: #6c5ce7; letter-spacing: 12px; margin: 8px 0;">${otp}</div>
              </div>
              <p style="color: #666; font-size: 13px; margin: 0;">
                If you didn't request this code, you can safely ignore this email.
              </p>
            </div>
            <div style="padding: 20px 30px; border-top: 1px solid #2a2a2a; text-align: center;">
              <p style="color: #555; font-size: 12px; margin: 0;">© 2024 DualBeats. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };

  const info = await transporter.sendMail(mailOptions);

  // In dev/test mode — print OTP + preview URL to server console
  if (!isGmailConfigured()) {
    console.log('\n' + '='.repeat(50));
    console.log(`📧 OTP EMAIL (TEST MODE)`);
    console.log(`   To   : ${toEmail}`);
    console.log(`   OTP  : ${otp}  ← USE THIS CODE`);
    console.log(`   Preview: ${nodemailer.getTestMessageUrl(info)}`);
    console.log('='.repeat(50) + '\n');
  }
};

module.exports = { sendOTPEmail };

