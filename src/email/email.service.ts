import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    // Verify connection configuration
    this.transporter.verify((error) => {
      if (error) {
        this.logger.error(`SMTP connection error: ${error.message}`);
      } else {
        this.logger.log('SMTP server is ready to send emails');
      }
    });
  }

  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
    resetUrl: string,
  ): Promise<boolean> {
    const appName = this.configService.get<string>('APP_NAME', 'Team Connect');
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:5173',
    );

    const fullResetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: `"${appName}" <${this.configService.get<string>('SMTP_USER')}>`,
      to: email,
      subject: `${appName} - รีเซ็ตรหัสผ่านของคุณ`,
      html: `
        <!DOCTYPE html>
        <html lang="th">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>รีเซ็ตรหัสผ่าน</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background-color: #f4f4f5;
              margin: 0;
              padding: 20px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              overflow: hidden;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 600;
            }
            .content {
              padding: 40px 30px;
              color: #333;
              line-height: 1.6;
            }
            .content p {
              margin-bottom: 20px;
            }
            .button-container {
              text-align: center;
              margin: 30px 0;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              text-decoration: none;
              padding: 14px 40px;
              border-radius: 8px;
              font-weight: 600;
              font-size: 16px;
            }
            .button:hover {
              opacity: 0.9;
            }
            .warning {
              background-color: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 15px;
              margin: 20px 0;
              border-radius: 0 8px 8px 0;
            }
            .warning p {
              margin: 0;
              color: #92400e;
              font-size: 14px;
            }
            .footer {
              background-color: #f9fafb;
              padding: 20px 30px;
              text-align: center;
              color: #6b7280;
              font-size: 12px;
              border-top: 1px solid #e5e7eb;
            }
            .link-text {
              word-break: break-all;
              color: #667eea;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 รีเซ็ตรหัสผ่าน</h1>
            </div>
            <div class="content">
              <p>สวัสดีครับ/ค่ะ,</p>
              <p>เราได้รับคำขอรีเซ็ตรหัสผ่านสำหรับบัญชีของคุณใน ${appName}</p>
              <p>กรุณาคลิกปุ่มด้านล่างเพื่อรีเซ็ตรหัสผ่านของคุณ:</p>
              
              <div class="button-container">
                <a href="${fullResetUrl}" class="button">รีเซ็ตรหัสผ่าน</a>
              </div>

              <div class="warning">
                <p>⚠️ ลิงก์นี้จะหมดอายุใน <strong>1 ชั่วโมง</strong> หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยต่ออีเมลนี้</p>
              </div>

              <p>หากปุ่มด้านบนไม่ทำงาน คุณสามารถคัดลอกและวางลิงก์นี้ในเบราว์เซอร์ของคุณ:</p>
              <p class="link-text">${fullResetUrl}</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
              <p>อีเมลนี้ถูกส่งโดยอัตโนมัติ กรุณาอย่าตอบกลับ</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
รีเซ็ตรหัสผ่านของคุณ

เราได้รับคำขอรีเซ็ตรหัสผ่านสำหรับบัญชีของคุณใน ${appName}

กรุณาคลิกลิงก์ด้านล่างเพื่อรีเซ็ตรหัสผ่าน:
${fullResetUrl}

⚠️ ลิงก์นี้จะหมดอายุใน 1 ชั่วโมง
หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยต่ออีเมลนี้

© ${new Date().getFullYear()} ${appName}
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Password reset email sent to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send password reset email: ${error.message}`);
      return false;
    }
  }

  async sendVerificationEmail(
    email: string,
    verificationToken: string,
  ): Promise<boolean> {
    const appName = this.configService.get<string>('APP_NAME', 'Team Connect');
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:5173',
    );

    const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

    const mailOptions = {
      from: `"${appName}" <${this.configService.get<string>('SMTP_USER')}>`,
      to: email,
      subject: `${appName} - ยืนยันอีเมลของคุณ`,
      html: `
        <!DOCTYPE html>
        <html lang="th">
        <head>
          <meta charset="UTF-8">
          <title>ยืนยันอีเมล</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
            .content { padding: 40px 30px; color: #333; line-height: 1.6; }
            .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: 600; }
            .footer { background-color: #f9fafb; padding: 20px 30px; text-align: center; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✉️ ยืนยันอีเมลของคุณ</h1>
            </div>
            <div class="content">
              <p>สวัสดีครับ/ค่ะ,</p>
              <p>ขอบคุณที่ลงทะเบียนกับ ${appName}!</p>
              <p>กรุณาคลิกปุ่มด้านล่างเพื่อยืนยันอีเมลของคุณ:</p>
              <p style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" class="button">ยืนยันอีเมล</a>
              </p>
              <p style="font-size: 12px; color: #6b7280;">หรือคัดลอกลิงก์นี้: ${verificationUrl}</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Verification email sent to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send verification email: ${error.message}`);
      return false;
    }
  }

  async sendTestEmail(to: string): Promise<{ success: boolean; message: string }> {
    const appName = this.configService.get<string>('APP_NAME', 'Team Connect');

    const mailOptions = {
      from: `"${appName}" <${this.configService.get<string>('SMTP_USER')}>`,
      to,
      subject: `${appName} - ทดสอบการส่งอีเมล`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>✅ ทดสอบการส่งอีเมลสำเร็จ!</h2>
          <p>นี่คืออีเมลทดสอบจาก ${appName}</p>
          <p>หากคุณได้รับอีเมลนี้ แสดงว่าการตั้งค่า SMTP ของคุณถูกต้องแล้ว</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return { success: true, message: 'Test email sent successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}
