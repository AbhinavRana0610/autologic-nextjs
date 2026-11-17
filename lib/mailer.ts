import { appendFile } from 'node:fs/promises';
import { join } from 'node:path';
import nodemailer, { type Transporter } from 'nodemailer';

/**
 * Replacement for PHP's mail(). Transport is chosen from environment variables:
 *   SMTP_HOST (+ SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS)  -> SMTP
 *   otherwise, on Linux/macOS                                    -> local sendmail binary (what mail() used)
 * Returns false when sending fails, like mail() did.
 */

export interface Mail {
  to: string;
  from: string;
  subject: string;
  replyTo?: string;
  bcc?: string;
  text?: string;
  html?: string;
}

let transporter: Transporter | null | undefined;

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;
  const env = process.env;
  if (env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT ?? 587),
      secure: env.SMTP_SECURE === 'true',
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS ?? '' } : undefined,
    });
  } else if (process.platform !== 'win32') {
    transporter = nodemailer.createTransport({ sendmail: true, newline: 'unix' });
  } else {
    transporter = null;
  }
  return transporter;
}

export async function sendMail(mail: Mail): Promise<boolean> {
  const t = getTransporter();
  if (!t) return false;
  try {
    await t.sendMail(mail);
    return true;
  } catch (err) {
    console.error('sendMail failed:', err instanceof Error ? err.message : err);
    return false;
  }
}

/** Local testing fallback from send-mail.php: write the message to mail_log.txt instead. */
export async function logMailLocally(entry: string): Promise<void> {
  await appendFile(join(process.cwd(), 'mail_log.txt'), entry, 'utf8');
}

/** Configuration that was hard-coded at the top of send-mail.php / form-handler.php. */
export const mailConfig = {
  clientEmail: process.env.MAIL_TO ?? 'info@autologicindustries.com',
  siteName: process.env.MAIL_SITE_NAME ?? 'Autologic Industries',
  bcc: process.env.MAIL_BCC ?? 'anandkpp123@gmail.com, promopactmarketing@gmail.com',
  /** Empty = noreply@<request host>, as in send-mail.php */
  fromEmail: process.env.MAIL_FROM ?? '',
  whatsappNumber: process.env.WHATSAPP_NUMBER ?? '919999985012',
};
