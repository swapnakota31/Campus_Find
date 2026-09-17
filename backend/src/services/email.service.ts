import nodemailer from 'nodemailer';
import { config } from '../config';

export interface SendOtpParams {
  email: string;
  otp: string;
  expiresInMinutes: number;
}

// Dev memory store for automated tests to inspect generated OTPs in dev mode
const devOtpMemoryStore = new Map<string, string>();

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    if (config.emailMode === 'smtp' && config.smtpHost) {
      this.transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpPort === 465,
        auth: config.smtpUser
          ? {
              user: config.smtpUser,
              pass: config.smtpPassword,
            }
          : undefined,
      });
    }
  }

  /**
   * Sends an OTP verification email to the user.
   */
  async sendOTP({ email, otp, expiresInMinutes }: SendOtpParams): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();

    // Store in dev memory store for automated testing and dev verification
    devOtpMemoryStore.set(normalizedEmail, otp);

    if (config.emailMode === 'dev' || !this.transporter) {
      console.log(`
======================================================
[DEV EMAIL SERVICE] OTP Dispatch Notice
To: ${normalizedEmail}
OTP Code: ${otp}
Expires In: ${expiresInMinutes} minutes
======================================================
      `);
      return;
    }

    // SMTP Mode Execution
    const mailOptions = {
      from: config.emailFrom,
      to: normalizedEmail,
      subject: 'CampusFind - Your Verification Code',
      text: `Your CampusFind verification code is: ${otp}. It will expire in ${expiresInMinutes} minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #2563eb;">CampusFind Email Verification</h2>
          <p>Your verification code is:</p>
          <div style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #1e293b; padding: 12px 24px; background: #f1f5f9; display: inline-block; border-radius: 8px;">
            ${otp}
          </div>
          <p style="margin-top: 16px; color: #64748b;">This code will expire in ${expiresInMinutes} minutes.</p>
          <p style="font-size: 12px; color: #94a3b8;">If you did not request this code, please ignore this email.</p>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  /**
   * Returns the last generated dev OTP for automated testing (dev mode only).
   */
  getDevOTP(email: string): string | undefined {
    return devOtpMemoryStore.get(email.toLowerCase().trim());
  }

  /**
   * Clears stored dev OTPs (for test cleanup).
   */
  clearDevStore(): void {
    devOtpMemoryStore.clear();
  }
}

export const emailService = new EmailService();
