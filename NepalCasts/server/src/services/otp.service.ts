import * as nodemailer from 'nodemailer';
import twilio from 'twilio';

export const maskDestination = (method: string, phone: string, email: string): string => {
  if (method === 'email') {
    const [name, domain] = (email || '').split('@');
    if (!name || !domain) return 'your email';
    const masked = name[0] + '*'.repeat(Math.max(name.length - 2, 1)) + name.slice(-1);
    return `${masked}@${domain}`;
  }
  if (method === 'sms') {
    const cleanPhone = phone || '';
    return `+${'*'.repeat(Math.max(cleanPhone.length - 4, 3))}${cleanPhone.slice(-4)}`;
  }
  return 'your device';
};

export const sendOTPEmail = async (email: string, code: string): Promise<void> => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"NC Network" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your NC Network Verification Code',
    html: `
      <div style="font-family: Arial; max-width: 400px; margin: 0 auto;">
        <h2 style="color: #FFD700;">NC Network</h2>
        <p>Your verification code is:</p>
        <h1 style="letter-spacing: 8px; color: #00BFFF; font-size: 36px;">
          ${code}
        </h1>
        <p>This code expires in <strong>2 minutes</strong>.</p>
        <p style="color: #999; font-size: 12px;">
          If you didn't request this, please ignore this email.
        </p>
      </div>
    `,
  });
};

export const sendOTPSMS = async (phone: string, code: string): Promise<void> => {
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  await client.messages.create({
    body: `Your NC Network verification code: ${code}. Expires in 2 minutes.`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phone,
  });
};
