import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log(`Mail transporter configured: ${host}:${port}`);
    } else {
      this.logger.warn(
        'SMTP not configured (missing SMTP_HOST/SMTP_USER/SMTP_PASS). Emails will be logged to console.',
      );
    }
  }

  private get fromAddress(): string {
    return this.configService.get<string>(
      'SMTP_FROM',
      'Bengala Max <noreply@bengalamax.com>',
    );
  }

  private get frontendUrl(): string {
    return this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${this.frontendUrl}/restablecer-contrasena?token=${token}`;

    const subject = 'Recupera tu contrasena - Bengala Max';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f97316; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Bengala Max</h1>
        </div>
        <div style="padding: 32px 24px; background-color: #ffffff;">
          <h2 style="color: #1a1a1a; margin-top: 0;">Restablecer contrasena</h2>
          <p style="color: #4a4a4a; line-height: 1.6;">
            Recibimos una solicitud para restablecer la contrasena de tu cuenta.
            Hace click en el boton de abajo para crear una nueva contrasena:
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}"
               style="background-color: #f97316; color: white; padding: 14px 32px;
                      text-decoration: none; border-radius: 8px; font-weight: bold;
                      display: inline-block;">
              Restablecer contrasena
            </a>
          </div>
          <p style="color: #4a4a4a; line-height: 1.6; font-size: 14px;">
            Este enlace expira en <strong>1 hora</strong>.
          </p>
          <p style="color: #888888; line-height: 1.6; font-size: 13px;">
            Si no solicitaste este cambio, ignora este email. Tu contrasena no sera modificada.
          </p>
        </div>
        <div style="padding: 16px 24px; background-color: #f5f5f5; text-align: center;">
          <p style="color: #888888; font-size: 12px; margin: 0;">
            Bengala Max - Tu tienda online
          </p>
        </div>
      </div>
    `;

    await this.send(email, subject, html);
  }

  async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    const subject = 'Bienvenido a Bengala Max!';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f97316; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Bengala Max</h1>
        </div>
        <div style="padding: 32px 24px; background-color: #ffffff;">
          <h2 style="color: #1a1a1a; margin-top: 0;">Hola ${firstName}!</h2>
          <p style="color: #4a4a4a; line-height: 1.6;">
            Tu cuenta fue creada con exito. Ya podes empezar a explorar
            nuestros productos y hacer tus compras.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${this.frontendUrl}"
               style="background-color: #f97316; color: white; padding: 14px 32px;
                      text-decoration: none; border-radius: 8px; font-weight: bold;
                      display: inline-block;">
              Ir a la tienda
            </a>
          </div>
        </div>
        <div style="padding: 16px 24px; background-color: #f5f5f5; text-align: center;">
          <p style="color: #888888; font-size: 12px; margin: 0;">
            Bengala Max - Tu tienda online
          </p>
        </div>
      </div>
    `;

    await this.send(email, subject, html);
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(`[DEV] Email to ${to}: ${subject}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${(error as Error).message}`);
    }
  }
}
