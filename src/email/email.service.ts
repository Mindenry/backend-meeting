import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { Resend } from 'resend';

export type EmailProvider = 'smtp' | 'resend' | 'none';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private resendClient: Resend | null = null;
  private initializationError: string | null = null;
  private provider: EmailProvider = 'none';

  constructor(private configService: ConfigService) {
    this.initializeProvider();
  }

  private initializeProvider() {
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');
    const resendApiKey = this.configService.get<string>('RESEND_API_KEY');

    console.log('========================================');
    console.log('📧 Email Service Initialization');
    console.log('========================================');
    console.log('RESEND_API_KEY:', resendApiKey ? '✅ Configured' : '❌ Not set');
    console.log('SMTP_USER:', smtpUser ? '✅ Configured' : '❌ Not set');
    console.log('SMTP_PASS:', smtpPass ? '✅ Configured' : '❌ Not set');
    console.log('========================================\n');

    // Prefer Resend API (works on cloud platforms that block SMTP)
    if (resendApiKey) {
      try {
        this.resendClient = new Resend(resendApiKey);
        this.provider = 'resend';
        this.logger.log('Using Resend API for email delivery');
        console.log('✅ Using Resend API for email delivery');
        return;
      } catch (error: any) {
        this.logger.error(`Failed to initialize Resend: ${error.message}`);
        console.error('❌ Failed to initialize Resend:', error.message);
      }
    }

    // Fallback to SMTP for local development
    if (smtpUser && smtpPass) {
      try {
        this.transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          auth: { user: smtpUser, pass: smtpPass },
          family: 4,
          connectionTimeout: 20000,
          socketTimeout: 20000,
        } as any);

        this.transporter.verify((error) => {
          if (error) {
            this.initializationError = error.message;
            this.logger.error(`SMTP connection error: ${error.message}`);
          } else {
            this.logger.log('SMTP server is ready to send emails');
          }
        });
        this.provider = 'smtp';
        return;
      } catch (error: any) {
        this.initializationError = error.message;
        this.logger.error(`Failed to initialize SMTP: ${error.message}`);
      }
    }

    this.initializationError = 'No email provider configured';
    this.logger.warn('No email provider configured. Email sending is disabled.');
  }

  getStatus(): { configured: boolean; provider: EmailProvider; error: string | null } {
    return {
      configured: this.provider !== 'none',
      provider: this.provider,
      error: this.initializationError,
    };
  }

  private getResetEmailHtml(appName: string, fullResetUrl: string): string {
    return `
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>รีเซ็ตรหัสผ่าน</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">🔐 รีเซ็ตรหัสผ่าน</h1>
          </div>
          <div style="padding: 40px 30px; color: #333; line-height: 1.6;">
            <p>สวัสดีครับ/ค่ะ,</p>
            <p>เราได้รับคำขอรีเซ็ตรหัสผ่านสำหรับบัญชีของคุณใน ${appName}</p>
            <p>กรุณาคลิกปุ่มด้านล่างเพื่อรีเซ็ตรหัสผ่านของคุณ:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${fullResetUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: 600;">รีเซ็ตรหัสผ่าน</a>
            </div>
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">⚠️ ลิงก์นี้จะหมดอายุใน <strong>1 ชั่วโมง</strong> หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยต่ออีเมลนี้</p>
            </div>
            <p>หากปุ่มด้านบนไม่ทำงาน คุณสามารถคัดลอกและวางลิงก์นี้ในเบราว์เซอร์ของคุณ:</p>
            <p style="word-break: break-all; color: #667eea; font-size: 12px;">${fullResetUrl}</p>
          </div>
          <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb;">
            <p>© ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
            <p>อีเมลนี้ถูกส่งโดยอัตโนมัติ กรุณาอย่าตอบกลับ</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getResetEmailText(appName: string, fullResetUrl: string): string {
    return `
รีเซ็ตรหัสผ่านของคุณ

เราได้รับคำขอรีเซ็ตรหัสผ่านสำหรับบัญชีของคุณใน ${appName}

กรุณาคลิกลิงก์ด้านล่างเพื่อรีเซ็ตรหัสผ่าน:
${fullResetUrl}

⚠️ ลิงก์นี้จะหมดอายุใน 1 ชั่วโมง
หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยต่ออีเมลนี้

© ${new Date().getFullYear()} ${appName}
    `;
  }

  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
    resetUrl: string,
  ): Promise<boolean> {
    if (this.provider === 'none') {
      const errorMsg = this.initializationError || 'No email provider configured';
      this.logger.error(`Cannot send password reset email: ${errorMsg}`);
      console.error('❌ Cannot send email:', errorMsg);
      return false;
    }
    
    const appName = this.configService.get<string>('APP_NAME', 'Team Connect');
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const fullResetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
    const html = this.getResetEmailHtml(appName, fullResetUrl);
    const text = this.getResetEmailText(appName, fullResetUrl);

    // Send via Resend API
    if (this.provider === 'resend' && this.resendClient) {
      try {
        const fromEmail = this.configService.get<string>('RESEND_FROM_EMAIL', 'onboarding@resend.dev');
        await this.resendClient.emails.send({
          from: `${appName} <${fromEmail}>`,
          to: email,
          subject: `${appName} - รีเซ็ตรหัสผ่านของคุณ`,
          html,
          text,
        });
        this.logger.log(`Password reset email sent to ${email} via Resend`);
        console.log(`✅ Password reset email sent to ${email} via Resend`);
        return true;
      } catch (error: any) {
        this.logger.error(`Resend error: ${error.message}`);
        console.error('❌ Resend error:', error.message);
        return false;
      }
    }

    // Send via SMTP
    if (this.provider === 'smtp' && this.transporter) {
      try {
        await this.transporter.sendMail({
          from: `"${appName}" <${this.configService.get<string>('SMTP_USER')}>`,
          to: email,
          subject: `${appName} - รีเซ็ตรหัสผ่านของคุณ`,
          html,
          text,
        });
        this.logger.log(`Password reset email sent to ${email} via SMTP`);
        return true;
      } catch (error: any) {
        this.logger.error(`SMTP error: ${error.message}`);
        return false;
      }
    }

    return false;
  }

  async sendVerificationEmail(
    email: string,
    verificationToken: string,
  ): Promise<boolean> {
    if (this.provider === 'none') {
      return false;
    }

    const appName = this.configService.get<string>('APP_NAME', 'Team Connect');
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

    const html = `
      <!DOCTYPE html>
      <html lang="th">
      <head><meta charset="UTF-8"><title>ยืนยันอีเมล</title></head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
            <h1>✉️ ยืนยันอีเมลของคุณ</h1>
          </div>
          <div style="padding: 40px 30px; color: #333; line-height: 1.6;">
            <p>สวัสดีครับ/ค่ะ,</p>
            <p>ขอบคุณที่ลงทะเบียนกับ ${appName}!</p>
            <p>กรุณาคลิกปุ่มด้านล่างเพื่อยืนยันอีเมลของคุณ:</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: 600;">ยืนยันอีเมล</a>
            </p>
            <p style="font-size: 12px; color: #6b7280;">หรือคัดลอกลิงก์นี้: ${verificationUrl}</p>
          </div>
          <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center; color: #6b7280; font-size: 12px;">
            <p>© ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send via Resend API
    if (this.provider === 'resend' && this.resendClient) {
      try {
        const fromEmail = this.configService.get<string>('RESEND_FROM_EMAIL', 'onboarding@resend.dev');
        await this.resendClient.emails.send({
          from: `${appName} <${fromEmail}>`,
          to: email,
          subject: `${appName} - ยืนยันอีเมลของคุณ`,
          html,
        });
        this.logger.log(`Verification email sent to ${email} via Resend`);
        return true;
      } catch (error: any) {
        this.logger.error(`Resend error: ${error.message}`);
        return false;
      }
    }

    // Send via SMTP
    if (this.provider === 'smtp' && this.transporter) {
      try {
        await this.transporter.sendMail({
          from: `"${appName}" <${this.configService.get<string>('SMTP_USER')}>`,
          to: email,
          subject: `${appName} - ยืนยันอีเมลของคุณ`,
          html,
        });
        this.logger.log(`Verification email sent to ${email} via SMTP`);
        return true;
      } catch (error: any) {
        this.logger.error(`SMTP error: ${error.message}`);
        return false;
      }
    }

    return false;
  }

  async sendTestEmail(to: string): Promise<{ success: boolean; message: string }> {
    if (this.provider === 'none') {
      return { success: false, message: 'Email service not configured' };
    }

    const appName = this.configService.get<string>('APP_NAME', 'Team Connect');
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>✅ ทดสอบการส่งอีเมลสำเร็จ!</h2>
        <p>นี่คืออีเมลทดสอบจาก ${appName}</p>
        <p>หากคุณได้รับอีเมลนี้ แสดงว่าการตั้งค่าอีเมลของคุณถูกต้องแล้ว</p>
      </div>
    `;

    // Send via Resend API
    if (this.provider === 'resend' && this.resendClient) {
      try {
        const fromEmail = this.configService.get<string>('RESEND_FROM_EMAIL', 'onboarding@resend.dev');
        await this.resendClient.emails.send({
          from: `${appName} <${fromEmail}>`,
          to,
          subject: `${appName} - ทดสอบการส่งอีเมล`,
          html,
        });
        return { success: true, message: 'Test email sent successfully via Resend' };
      } catch (error: any) {
        return { success: false, message: error.message };
      }
    }

    // Send via SMTP
    if (this.provider === 'smtp' && this.transporter) {
      try {
        await this.transporter.sendMail({
          from: `"${appName}" <${this.configService.get<string>('SMTP_USER')}>`,
          to,
          subject: `${appName} - ทดสอบการส่งอีเมล`,
          html,
        });
        return { success: true, message: 'Test email sent successfully via SMTP' };
      } catch (error: any) {
        return { success: false, message: error.message };
      }
    }

    return { success: false, message: 'No email provider available' };
  }
}
