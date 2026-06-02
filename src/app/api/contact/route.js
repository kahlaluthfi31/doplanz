import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

const ADMIN_EMAIL = process.env.CONTACT_ADMIN_EMAIL || 'zoyafreya27@gmail.com';

export async function POST(req) {
  try {
    const body = await req.json();
    const { subject, message, email, userName } = body;

    if (!subject || !message || !email) {
      return NextResponse.json({ message: 'Subjek, email, dan pesan wajib diisi.' }, { status: 400 });
    }

    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    const mailPayload = {
      from: process.env.SMTP_FROM || smtpUser || 'noreply@doplanz.app',
      to: ADMIN_EMAIL,
      replyTo: email,
      subject: `[doplanZ Contact] ${subject}`,
      text: [
        `Nama: ${userName || '-'}`,
        `Email pengirim: ${email}`,
        '',
        'Pesan:',
        message
      ].join('\n'),
      html: `
        <p><strong>Nama:</strong> ${userName || '-'}</p>
        <p><strong>Email pengirim:</strong> ${email}</p>
        <p><strong>Subjek:</strong> ${subject}</p>
        <hr />
        <p>${String(message).replace(/\n/g, '<br />')}</p>
      `
    };

    if (smtpHost && smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: smtpUser, pass: smtpPass }
      });
      await transporter.sendMail(mailPayload);
    } else if (process.env.NODE_ENV !== 'production') {
      console.log('[contact] SMTP not configured. Message logged:\n', mailPayload.text);
    } else {
      return NextResponse.json(
        {
          message:
            'Email belum dikonfigurasi di server. Tambahkan SMTP_HOST, SMTP_USER, SMTP_PASS di .env.local.'
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ message: 'Pesan berhasil dikirim.' });
  } catch (error) {
    console.error('Contact email error:', error);
    return NextResponse.json({ message: 'Gagal mengirim pesan.' }, { status: 500 });
  }
}
