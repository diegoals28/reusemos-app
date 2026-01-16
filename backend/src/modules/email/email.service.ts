// ============================================
// REUSA - Email Service (Resend)
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;
  private readonly fromEmail: string;
  private readonly appName = 'Reusemos';

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.resend = new Resend(apiKey);
    this.fromEmail = this.configService.get<string>('EMAIL_FROM') || 'Reusemos <noreply@reusemos.cl>';
  }

  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      if (error) {
        this.logger.error(`Failed to send email to ${options.to}:`, error);
        return false;
      }

      this.logger.log(`Email sent to ${options.to}, id: ${data?.id}`);
      return true;
    } catch (error) {
      this.logger.error(`Error sending email to ${options.to}:`, error);
      return false;
    }
  }

  async sendVerificationEmail(email: string, token: string, displayName: string): Promise<boolean> {
    const verifyUrl = `${this.getAppUrl()}/verify-email?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #2D9B6E; margin: 0; font-size: 28px;">${this.appName}</h1>
            </div>

            <h2 style="color: #1a1a1a; margin: 0 0 16px 0; font-size: 24px;">
              Verifica tu email
            </h2>

            <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              Hola ${displayName},<br><br>
              Gracias por registrarte en ${this.appName}. Para completar tu registro y comenzar a comprar, vender e intercambiar productos, verifica tu email haciendo clic en el siguiente boton:
            </p>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${verifyUrl}" style="display: inline-block; background-color: #2D9B6E; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 50px; font-weight: 600; font-size: 16px;">
                Verificar Email
              </a>
            </div>

            <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
              Si no puedes hacer clic en el boton, copia y pega este enlace en tu navegador:<br>
              <a href="${verifyUrl}" style="color: #2D9B6E; word-break: break-all;">${verifyUrl}</a>
            </p>

            <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
              Este enlace expira en 24 horas. Si no solicitaste esta verificacion, puedes ignorar este email.
            </p>

            <hr style="border: none; border-top: 1px solid #eeeeee; margin: 32px 0;">

            <p style="color: #999999; font-size: 12px; text-align: center; margin: 0;">
              ${this.appName} - Dale otra vuelta a las cosas
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Hola ${displayName},

Gracias por registrarte en ${this.appName}. Para verificar tu email, visita este enlace:

${verifyUrl}

Este enlace expira en 24 horas.

${this.appName} - Dale otra vuelta a las cosas
    `;

    return this.sendEmail({
      to: email,
      subject: `Verifica tu email - ${this.appName}`,
      html,
      text,
    });
  }

  async sendWelcomeEmail(email: string, displayName: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #2D9B6E; margin: 0; font-size: 28px;">${this.appName}</h1>
            </div>

            <h2 style="color: #1a1a1a; margin: 0 0 16px 0; font-size: 24px;">
              Bienvenido a ${this.appName}!
            </h2>

            <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              Hola ${displayName},<br><br>
              Tu email ha sido verificado correctamente. Ya puedes comenzar a usar ${this.appName} para comprar, vender e intercambiar productos de segunda mano.
            </p>

            <div style="background-color: #E8F5E9; border-radius: 12px; padding: 20px; margin: 24px 0;">
              <p style="color: #2D9B6E; font-size: 14px; margin: 0; text-align: center;">
                Cada producto que reusas ayuda al planeta
              </p>
            </div>

            <hr style="border: none; border-top: 1px solid #eeeeee; margin: 32px 0;">

            <p style="color: #999999; font-size: 12px; text-align: center; margin: 0;">
              ${this.appName} - Dale otra vuelta a las cosas
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `Bienvenido a ${this.appName}!`,
      html,
    });
  }

  async sendPasswordResetEmail(email: string, token: string, displayName: string): Promise<boolean> {
    const resetUrl = `${this.getAppUrl()}/reset-password?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #2D9B6E; margin: 0; font-size: 28px;">${this.appName}</h1>
            </div>

            <h2 style="color: #1a1a1a; margin: 0 0 16px 0; font-size: 24px;">
              Restablecer contrasena
            </h2>

            <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              Hola ${displayName},<br><br>
              Recibimos una solicitud para restablecer la contrasena de tu cuenta. Haz clic en el siguiente boton para crear una nueva contrasena:
            </p>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${resetUrl}" style="display: inline-block; background-color: #2D9B6E; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 50px; font-weight: 600; font-size: 16px;">
                Restablecer Contrasena
              </a>
            </div>

            <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
              Este enlace expira en 1 hora. Si no solicitaste restablecer tu contrasena, puedes ignorar este email.
            </p>

            <hr style="border: none; border-top: 1px solid #eeeeee; margin: 32px 0;">

            <p style="color: #999999; font-size: 12px; text-align: center; margin: 0;">
              ${this.appName} - Dale otra vuelta a las cosas
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `Restablecer contrasena - ${this.appName}`,
      html,
    });
  }

  private getAppUrl(): string {
    return this.configService.get<string>('APP_URL') || 'https://reusemos.cl';
  }
}
