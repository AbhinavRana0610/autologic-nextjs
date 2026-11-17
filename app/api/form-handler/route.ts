import { type NextRequest } from 'next/server';
import { mailConfig, sendMail } from '@/lib/mailer';
import { esc, phpTrim, phpUrlencode, stripTags } from '@/lib/php-compat';
import { clientIp, field, istDate, postFields } from '@/lib/request';

/**
 * Port of form-handler.php (served at /form-handler.php via a rewrite): HTML enquiry email to the
 * company + auto-reply to the customer, JSON response with a WhatsApp fallback link.
 * PHP rate-limited per session; here it is per client IP (one submission per 60 s per server process).
 */

const COMPANY_NAME = 'Autologic Industries';
const RECIPIENT_EMAIL = 'info@autologicindustries.com';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const lastSubmit = new Map<string, number>();

const json = (body: object, status = 200) =>
  Response.json(body, { status, headers: { 'X-Content-Type-Options': 'nosniff' } });

const sanitize = (v: string) => esc(stripTags(phpTrim(v)));
const nl2br = (s: string) => s.replace(/(\r\n|\n\r|\n|\r)/g, '<br />$1');

export function GET() {
  return json({ status: 'error', message: 'Method Not Allowed' }, 405);
}

export async function POST(request: NextRequest) {
  const fields = await postFields(request);
  const wa = mailConfig.whatsappNumber;

  // Honeypot
  if (field(fields, 'website') !== '' && field(fields, 'website') !== '0') {
    return json({ status: 'success', message: 'Message sent successfully!' });
  }

  // Rate limiting
  const ip = clientIp(request);
  const now = Math.floor(Date.now() / 1000);
  const last = lastSubmit.get(ip);
  if (last !== undefined && now - last < 60) {
    return json({ status: 'error', message: 'Please wait a minute before submitting again.' }, 429);
  }

  const name = sanitize(field(fields, 'name'));
  let email = sanitize(field(fields, 'email'));
  const mobile = sanitize(field(fields, 'mobile'));
  let message = sanitize(field(fields, 'message'));
  const product = sanitize(fields.has('product') ? field(fields, 'product') : 'Not specified');
  const company = sanitize(fields.has('company') ? field(fields, 'company') : 'Not provided');
  const source = sanitize(fields.has('source') ? field(fields, 'source') : 'Website');

  const errors: string[] = [];
  if (name === '' || name.length < 2) errors.push('Valid name is required.');
  if (email !== '' && !EMAIL_RE.test(email)) errors.push('Valid email address is required if provided.');
  if (email === '') email = 'Not Provided';
  if (mobile === '' || !/^[0-9+\-\s]{7,15}$/.test(mobile)) errors.push('Valid mobile number is required.');
  if (message === '') message = 'Quick Enquiry via Popup (No message provided)';
  if (errors.length) return json({ status: 'error', message: errors.join(' ') }, 400);

  const dateTime = istDate('d M Y, h:i A');
  const html = `
<!DOCTYPE html>
<html>
<head>
 <meta charset='UTF-8'>
 <style>
 body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }.wrapper { max-width: 600px; margin: 20px auto; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }.header { background: #8f0000; padding: 25px 30px; text-align: center; }.header h1 { color: #fff; margin: 0; font-size: 22px; }.header p { color: #ffcccc; margin: 5px 0 0; font-size: 13px; }.body { padding: 30px; }.body h2 { color: #333; font-size: 18px; margin-top: 0; border-bottom: 2px solid #8f0000; padding-bottom: 10px; }.info-table { width: 100%; border-collapse: collapse; margin: 15px 0; }.info-table td { padding: 10px 12px; font-size: 14px; }.info-table tr:nth-child(even) { background: #f9f9f9; }.info-table.label { font-weight: bold; color: #555; width: 35%; }.info-table.value { color: #222; }.message-box { background: #f0f4ff; border-left: 4px solid #8f0000; padding: 15px; border-radius: 0 8px 8px 0; margin: 20px 0; font-size: 14px; color: #333; line-height: 1.6; }.cta { text-align: center; margin: 25px 0 10px; }.cta a { background: #25D366; color: #fff; padding: 12px 28px; border-radius: 25px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block; }.footer-note { text-align: center; font-size: 12px; color: #aaa; padding: 15px 30px; background: #f9f9f9; }
 </style>
</head>
<body>
 <div class='wrapper'>
 <div class='header'>
 <h1>🔔 New Enquiry Received</h1>
 <p>${COMPANY_NAME} — ${dateTime} (IST)</p>
 </div>
 <div class='body'>
 <h2>Customer Details</h2>
 <table class='info-table'>
 <tr><td class='label'>Full Name</td><td class='value'>${name}</td></tr>
 <tr><td class='label'>Email</td><td class='value'><a href='mailto:${email}'>${email}</a></td></tr>
 <tr><td class='label'>Mobile</td><td class='value'><a href='tel:${mobile}'>${mobile}</a></td></tr>
 <tr><td class='label'>Company</td><td class='value'>${company}</td></tr>
 <tr><td class='label'>Product Interest</td><td class='value'>${product}</td></tr>
 <tr><td class='label'>Source</td><td class='value'>${source}</td></tr>
 </table>
 <h2>Message</h2>
 <div class='message-box'>${nl2br(message)}</div>
 <div class='cta'>
 <a href='https://wa.me/${wa}?text=Hi%20${phpUrlencode(name)}%2C%20Thank%20you%20for%20your%20enquiry%20at%20Autologic%20Industries!%20We%20will%20get%20back%20to%20you%20shortly.'>
 💬 Reply via WhatsApp
 </a>
 </div>
 </div>
 <div class='footer-note'>
 This email was auto-generated from the enquiry form on autologicindustries.com<br>
 Autologic Industries | Kh 52/13, Prahlad Pur, Industrial Area, Bawana Road, Delhi-110042
 </div>
 </div>
</body>
</html>
`;

  const replyEmail = email !== 'Not Provided' ? email : 'noreply@autologicindustries.com';
  const mailSent = await sendMail({
    to: RECIPIENT_EMAIL,
    from: `${COMPANY_NAME} Enquiry <noreply@autologicindustries.com>`,
    replyTo: `${name} <${replyEmail}>`,
    bcc: mailConfig.bcc,
    subject: `New Enquiry from ${name} | ${COMPANY_NAME} Website`,
    html,
  });

  // Auto-reply to the customer
  if (email !== 'Not Provided' && EMAIL_RE.test(email)) {
    await sendMail({
      to: email,
      from: `${COMPANY_NAME} <info@autologicindustries.com>`,
      subject: `Thank You for Your Enquiry | ${COMPANY_NAME}`,
      html: `
<!DOCTYPE html>
<html>
<head>
 <meta charset='UTF-8'>
 <style>
 body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }.wrapper { max-width: 600px; margin: 20px auto; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }.header { background: #8f0000; padding: 30px; text-align: center; }.header h1 { color: #fff; margin: 0; font-size: 24px; }.body { padding: 30px; color: #333; font-size: 15px; line-height: 1.7; }.highlight { background: #fff5f5; border-left: 4px solid #8f0000; padding: 15px 20px; border-radius: 0 8px 8px 0; margin: 20px 0; }.contact-info p { margin: 5px 0; }.footer-note { text-align: center; font-size: 12px; color: #aaa; padding: 15px 30px; background: #f9f9f9; }.btn { display: inline-block; background: #8f0000; color: #fff; padding: 12px 28px; border-radius: 25px; text-decoration: none; font-weight: bold; margin: 10px 0; }
 </style>
</head>
<body>
 <div class='wrapper'>
 <div class='header'>
 <h1>✅ Enquiry Received!</h1>
 </div>
 <div class='body'>
 <p>Dear <strong>${name}</strong>,</p>
 <p>Thank you for reaching out to <strong>Autologic Industries</strong>! We have successfully received your enquiry and our team will get back to you within <strong>24 hours</strong>.</p>
 <div class='highlight'>
 <strong>Your Enquiry Summary:</strong><br>
 📦 Product Interest: ${product}<br>
 💬 Your Message: ${message}
 </div>
 <p>In the meantime, feel free to reach us directly:</p>
 <div class='contact-info'>
 <p>📞 <strong>Phone:</strong> +91 99999 85012 | +91 99111 54216</p>
 <p>📧 <strong>Email:</strong> info@autologicindustries.com</p>
 <p>📍 <strong>Address:</strong> Kh 52/13, Prahlad Pur, Industrial Area, Bawana Road, Delhi-110042</p>
 </div>
 <p style='text-align:center; margin-top: 25px;'>
 <a href='https://wa.me/${wa}' class='btn'>💬 Chat on WhatsApp</a>
 </p>
 </div>
 <div class='footer-note'>
 © 2025 Autologic Industries | autologicindustries.com<br>
 This is an automated response. Please do not reply to this email.
 </div>
 </div>
</body>
</html>
`,
    });
  }

  lastSubmit.set(ip, now);

  const waUrl =
    `https://wa.me/${wa}?text=` +
    phpUrlencode(`🔔 New Enquiry!\nName: ${name}\nMobile: ${mobile}\nEmail: ${email}\nProduct: ${product}\nMessage: ${message}`);

  return mailSent
    ? json({
        status: 'success',
        message: 'Thank you! Your enquiry has been sent successfully. Our team will contact you within 24 hours.',
        wa_url: waUrl,
      })
    : json({ status: 'warning', message: 'Form received! For immediate assistance, please contact us on WhatsApp.', wa_url: waUrl });
}
