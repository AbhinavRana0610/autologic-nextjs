import { type NextRequest } from 'next/server';
import { logMailLocally, mailConfig, sendMail } from '@/lib/mailer';
import { phpEmpty, phpTrim } from '@/lib/php-compat';
import { field, istDate, postFields, requestHost } from '@/lib/request';

/**
 * Port of send-mail.php (served at /send-mail.php via a rewrite). Used by the WhatsApp, email and
 * call-back modals and the contact page form. Responds with plain text "success" / "error",
 * which the front-end script checks.
 */

const LABELS: Record<string, string> = {
  whatsappName: 'Name',
  whatsappMobile: 'Mobile',
  companyName: 'Company Name',
  company: 'Company Name',
  name: 'Name',
  email: 'Email',
  mobile: 'Mobile',
  phone: 'Mobile',
  productService: 'Product/Service',
  product: 'Product/Service',
  message: 'Message',
};
const SKIP_FIELDS = ['formSource', 'website'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const text = (body: string) => new Response(body, { headers: { 'Content-Type': 'text/html; charset=UTF-8' } });

/** "project_location" / "projectLocation" -> "Project Location" (ucwords + preg_replace in PHP) */
function labelFor(key: string): string {
  if (LABELS[key]) return LABELS[key];
  const spaced = key.replace(/([a-z])([A-Z])|[_-]+/g, (_m, a?: string, b?: string) => (a ? `${a} ${b}` : ' '));
  return phpTrim(spaced).replace(/(^|[ \t\r\n\f\v])([a-z])/g, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}

export function GET() {
  return text(''); // send-mail.php simply exited on non-POST requests
}

export async function POST(request: NextRequest) {
  const { clientEmail, bcc, siteName: configuredName, fromEmail: configuredFrom } = mailConfig;
  if (!EMAIL_RE.test(clientEmail)) {
    console.error('send-mail: MAIL_TO is not set or invalid');
    return text('error');
  }

  const fields = await postFields(request);
  // Honeypot: bots fill the hidden "website" field; quietly report success.
  if (!phpEmpty(fields.get('website'))) return text('success');

  const host = requestHost(request);
  const siteName = configuredName || host;
  const fromEmail = configuredFrom || `noreply@${host}`;

  const formType = !phpEmpty(fields.get('formSource'))
      ? phpTrim(field(fields, 'formSource'))
      : fields.has('whatsappName')
        ? 'WhatsApp Contact Form'
        : fields.has('email')
          ? 'Email Contact Form'
          : 'Website Form';

  const lines: string[] = [];
  let hasContact = false;
  for (const [key, raw] of fields) {
    if (SKIP_FIELDS.includes(key)) continue;
    const value = phpTrim(Array.isArray(raw) ? raw.join(', ') : raw);
    if (value === '') continue;
    const label = labelFor(key);
    if (/mobile|phone|email/i.test(key)) hasContact = true;
    // Long message on its own lines, everything else on one line (strlen counts bytes in PHP)
    lines.push(value.includes('\n') || Buffer.byteLength(value) > 80 ? `\n${label}:\n${value}` : `${label}: ${value}`);
  }
  if (lines.length === 0 || !hasContact) return text('Invalid form submission.');

  const currentTime = istDate('d-m-Y H:i:s');
  const subject = `${siteName} Inquiry - ${currentTime}`;
  const body =
    `${formType} Submission:\n\n` +
    lines.join('\n') +
    `\n\n----\nSubmitted: ${currentTime}` +
    `\nPage: ${request.headers.get('referer') ?? 'N/A'}`;

  // Reply-To: only a valid visitor email (header injection protection)
  const visitorEmail = phpTrim(field(fields, 'email'));
  const replyTo = EMAIL_RE.test(visitorEmail) ? visitorEmail : clientEmail;

  const sent = await sendMail({
    to: clientEmail,
    from: `${siteName} Website <${fromEmail}>`,
    replyTo,
    bcc: bcc || undefined,
    subject,
    text: body,
  });

  // On localhost, where no mail server is configured, log to a file for testing (as send-mail.php did).
  if (!sent && ['localhost', '127.0.0.1'].includes(host)) {
    await logMailLocally(`[${currentTime}]\nTo: ${clientEmail}\nSubject: ${subject}\n${body}\n${'-'.repeat(40)}\n\n`);
    return text('success');
  }
  return text(sent ? 'success' : 'error');
}
