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
      'Bengala Max <noreply@bengalamax.uy>',
    );
  }

  private get frontendUrl(): string {
    return this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:5173',
    );
  }

  // ── Shared email layout ──────────────────────────────────────

  private wrapInLayout(preheader: string, bodyContent: string): string {
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Bengala Max</title>
  <!--[if mso]>
  <style type="text/css">
    table { border-collapse: collapse; }
    td { font-family: Arial, sans-serif; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <!-- Preheader (hidden preview text) -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    ${preheader}
    ${'&nbsp;&zwnj;'.repeat(30)}
  </div>

  <!-- Email wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 24px 16px;">

        <!-- Main container -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 32px 24px; text-align: center;">
              <!--[if mso]><table role="presentation" width="100%"><tr><td style="background-color: #f97316; padding: 32px 24px; text-align: center;"><![endif]-->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td style="font-family: Arial, sans-serif; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">
                    <span style="color: #fff;">BENGALA</span>
                    <span style="color: #fde68a;">MAX</span>
                  </td>
                </tr>
              </table>
              <!--[if mso]></td></tr></table><![endif]-->
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color: #ffffff; padding: 40px 32px;">
              ${bodyContent}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #1a1a2e; padding: 32px 24px; text-align: center;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td style="font-family: Arial, sans-serif; font-size: 14px; font-weight: 700; letter-spacing: -0.3px; padding-bottom: 16px;">
                    <span style="color: #f97316;">BENGALA</span>
                    <span style="color: #ffffff;">MAX</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 16px; border-bottom: 1px solid #374151;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <!-- Fray Bentos -->
                      <tr>
                        <td style="font-family: Arial, sans-serif; font-size: 11px; font-weight: 700; color: #f97316; text-transform: uppercase; letter-spacing: 0.5px; padding-bottom: 4px;">
                          Fray Bentos
                        </td>
                      </tr>
                      <tr>
                        <td style="font-family: Arial, sans-serif; font-size: 11px; color: #9ca3af; line-height: 1.6; padding-bottom: 12px;">
                          Rinc&#243;n 1783 &#8226; Tel: 098 161 513<br>
                          18 de Julio 1174 &#8226; Tel: 091 423 838
                        </td>
                      </tr>
                      <!-- Mercedes -->
                      <tr>
                        <td style="font-family: Arial, sans-serif; font-size: 11px; font-weight: 700; color: #f97316; text-transform: uppercase; letter-spacing: 0.5px; padding-bottom: 4px;">
                          Mercedes
                        </td>
                      </tr>
                      <tr>
                        <td style="font-family: Arial, sans-serif; font-size: 11px; color: #9ca3af; line-height: 1.6;">
                          Col&#243;n 442 &#8226; Tel: 091 423 854
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 12px;">
                    <a href="${this.frontendUrl}" style="font-family: Arial, sans-serif; font-size: 12px; color: #f97316; text-decoration: none;">bengalamax.com.uy</a>
                    <span style="font-family: Arial, sans-serif; font-size: 12px; color: #6b7280;">&nbsp;&nbsp;|&nbsp;&nbsp;</span>
                    <a href="mailto:contacto@bengalamax.uy" style="font-family: Arial, sans-serif; font-size: 12px; color: #9ca3af; text-decoration: none;">contacto@bengalamax.uy</a>
                  </td>
                </tr>
                <tr>
                  <td style="font-family: Arial, sans-serif; font-size: 11px; color: #6b7280; padding-top: 12px;">
                    Este email fue enviado automaticamente. No responder a este mensaje.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        <!-- /Main container -->

      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private renderButton(text: string, url: string): string {
    return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 32px auto;">
  <tr>
    <td style="border-radius: 8px; background-color: #f97316;">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${url}" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="17%" fillcolor="#f97316">
        <w:anchorlock/>
        <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">${text}</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-->
      <a href="${url}" style="display: inline-block; padding: 14px 36px; font-family: Arial, sans-serif; font-size: 15px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 8px; background-color: #f97316;">
        ${text}
      </a>
      <!--<![endif]-->
    </td>
  </tr>
</table>`;
  }

  private formatMoney(value: number): string {
    return '$\u00a0' + value.toLocaleString('es-UY', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  // ── Email methods ────────────────────────────────────────────

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${this.frontendUrl}/restablecer-contrasena?token=${token}`;

    const subject = 'Recupera tu contrasena - Bengala Max';
    const body = `
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="text-align: center; padding-bottom: 24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
              <tr>
                <td style="width: 64px; height: 64px; background-color: #fff7ed; border-radius: 50%; text-align: center; vertical-align: middle; font-size: 28px;">
                  &#128274;
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="font-family: Arial, sans-serif; font-size: 22px; font-weight: 700; color: #1a1a1a; text-align: center; padding-bottom: 16px;">
            Restablecer contrasena
          </td>
        </tr>
        <tr>
          <td style="font-family: Arial, sans-serif; font-size: 15px; color: #4a4a4a; line-height: 1.7; text-align: center; padding-bottom: 8px;">
            Recibimos una solicitud para restablecer la contrasena de tu cuenta.
            Hace click en el boton de abajo para crear una nueva contrasena.
          </td>
        </tr>
        <tr>
          <td>
            ${this.renderButton('Restablecer contrasena', resetUrl)}
          </td>
        </tr>
        <tr>
          <td style="padding-top: 8px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fef3c7; border-radius: 8px; border: 1px solid #fde68a;">
              <tr>
                <td style="padding: 12px 16px; font-family: Arial, sans-serif; font-size: 13px; color: #92400e; line-height: 1.5;">
                  &#9888;&#65039; Este enlace expira en <strong>1 hora</strong>. Si no solicitaste este cambio, ignora este email.
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="font-family: Arial, sans-serif; font-size: 12px; color: #9ca3af; text-align: center; padding-top: 24px; line-height: 1.5;">
            Si el boton no funciona, copia y pega este enlace en tu navegador:<br>
            <a href="${resetUrl}" style="color: #f97316; word-break: break-all;">${resetUrl}</a>
          </td>
        </tr>
      </table>
    `;

    const html = this.wrapInLayout(
      'Restablecer tu contrasena de Bengala Max',
      body,
    );
    await this.send(email, subject, html);
  }

  async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    const subject = 'Bienvenido a Bengala Max!';
    const body = `
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="text-align: center; padding-bottom: 24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
              <tr>
                <td style="width: 64px; height: 64px; background-color: #ecfdf5; border-radius: 50%; text-align: center; vertical-align: middle; font-size: 28px;">
                  &#127881;
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="font-family: Arial, sans-serif; font-size: 22px; font-weight: 700; color: #1a1a1a; text-align: center; padding-bottom: 16px;">
            Hola ${firstName}!
          </td>
        </tr>
        <tr>
          <td style="font-family: Arial, sans-serif; font-size: 15px; color: #4a4a4a; line-height: 1.7; text-align: center; padding-bottom: 8px;">
            Tu cuenta fue creada con exito. Ya podes empezar a explorar nuestros productos y hacer tus compras.
          </td>
        </tr>
        <tr>
          <td>
            ${this.renderButton('Ir a la tienda', this.frontendUrl)}
          </td>
        </tr>
        <tr>
          <td style="padding-top: 8px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
              <tr>
                <td style="padding: 16px; font-family: Arial, sans-serif;">
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td style="font-size: 14px; font-weight: 700; color: #166534; padding-bottom: 8px;">
                        Con tu cuenta podes:
                      </td>
                    </tr>
                    <tr>
                      <td style="font-size: 13px; color: #15803d; line-height: 2;">
                        &#10003; Guardar productos en favoritos<br>
                        &#10003; Seguir el estado de tus pedidos<br>
                        &#10003; Guardar tus direcciones de envio<br>
                        &#10003; Acceder a ofertas exclusivas
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `;

    const html = this.wrapInLayout(
      `Bienvenido a Bengala Max, ${firstName}! Tu cuenta esta lista.`,
      body,
    );
    await this.send(email, subject, html);
  }

  async sendOrderConfirmationEmail(
    email: string,
    order: {
      orderNumber: string;
      items: { productName: string; quantity: number; unitPrice: number }[];
      subtotal: number;
      shippingCost: number;
      discount: number;
      total: number;
      shippingAddress?: string;
    },
  ): Promise<void> {
    const itemRows = order.items
      .map(
        (item) =>
          `<tr>
            <td style="padding: 12px 8px; border-bottom: 1px solid #f3f4f6; font-family: Arial, sans-serif; font-size: 14px; color: #374151;">
              ${item.productName}
            </td>
            <td style="padding: 12px 8px; border-bottom: 1px solid #f3f4f6; font-family: Arial, sans-serif; font-size: 14px; color: #6b7280; text-align: center;">
              ${item.quantity}
            </td>
            <td style="padding: 12px 8px; border-bottom: 1px solid #f3f4f6; font-family: Arial, sans-serif; font-size: 14px; color: #374151; text-align: right; font-weight: 600;">
              ${this.formatMoney(item.unitPrice * item.quantity)}
            </td>
          </tr>`,
      )
      .join('');

    const summaryRow = (label: string, value: string, opts?: { bold?: boolean; color?: string }) => {
      const color = opts?.color || '#374151';
      const weight = opts?.bold ? '700' : '400';
      const size = opts?.bold ? '16px' : '14px';
      const padding = opts?.bold
        ? 'padding: 12px 0 0; border-top: 2px solid #e5e7eb;'
        : 'padding: 4px 0;';
      return `<tr>
        <td style="${padding} font-family: Arial, sans-serif; font-size: ${size}; color: ${color}; font-weight: ${weight};">
          ${label}
        </td>
        <td style="${padding} font-family: Arial, sans-serif; font-size: ${size}; color: ${color}; font-weight: ${weight}; text-align: right;">
          ${value}
        </td>
      </tr>`;
    };

    const subject = `Pedido #${order.orderNumber} confirmado - Bengala Max`;
    const body = `
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="text-align: center; padding-bottom: 24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
              <tr>
                <td style="width: 64px; height: 64px; background-color: #ecfdf5; border-radius: 50%; text-align: center; vertical-align: middle; font-size: 28px;">
                  &#9989;
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="font-family: Arial, sans-serif; font-size: 22px; font-weight: 700; color: #1a1a1a; text-align: center; padding-bottom: 8px;">
            Pedido confirmado!
          </td>
        </tr>
        <tr>
          <td style="font-family: Arial, sans-serif; font-size: 15px; color: #4a4a4a; line-height: 1.7; text-align: center; padding-bottom: 24px;">
            Tu pedido <strong style="color: #f97316;">#${order.orderNumber}</strong> fue recibido y el pago fue procesado con exito.
          </td>
        </tr>

        <!-- Order items table -->
        <tr>
          <td style="padding-bottom: 24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
              <tr style="background-color: #1a1a2e;">
                <td style="padding: 10px 8px; font-family: Arial, sans-serif; font-size: 12px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px;">
                  Producto
                </td>
                <td style="padding: 10px 8px; font-family: Arial, sans-serif; font-size: 12px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; text-align: center;">
                  Cant.
                </td>
                <td style="padding: 10px 8px; font-family: Arial, sans-serif; font-size: 12px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; text-align: right;">
                  Total
                </td>
              </tr>
              ${itemRows}
            </table>
          </td>
        </tr>

        <!-- Order totals -->
        <tr>
          <td style="padding-bottom: 24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f9fafb; border-radius: 8px; padding: 16px;">
              <tr><td style="padding: 16px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                  ${summaryRow('Subtotal', this.formatMoney(order.subtotal))}
                  ${summaryRow('Envio', order.shippingCost === 0 ? 'Gratis' : this.formatMoney(order.shippingCost))}
                  ${order.discount > 0 ? summaryRow('Descuento', '-' + this.formatMoney(order.discount), { color: '#16a34a' }) : ''}
                  ${summaryRow('Total', this.formatMoney(order.total), { bold: true })}
                </table>
              </td></tr>
            </table>
          </td>
        </tr>

        ${order.shippingAddress ? `
        <!-- Shipping address -->
        <tr>
          <td style="padding-bottom: 24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #eff6ff; border-radius: 8px; border: 1px solid #bfdbfe;">
              <tr>
                <td style="padding: 16px; font-family: Arial, sans-serif;">
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td style="font-size: 13px; font-weight: 700; color: #1e40af; padding-bottom: 6px;">
                        &#128205; Direccion de envio
                      </td>
                    </tr>
                    <tr>
                      <td style="font-size: 14px; color: #1e3a5f; line-height: 1.5;">
                        ${order.shippingAddress}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        ` : ''}

        <tr>
          <td>
            ${this.renderButton('Ver mi pedido', `${this.frontendUrl}/mi-cuenta/pedidos`)}
          </td>
        </tr>
        <tr>
          <td style="font-family: Arial, sans-serif; font-size: 13px; color: #9ca3af; text-align: center; line-height: 1.6;">
            Te vamos a avisar cuando tu pedido sea enviado.
          </td>
        </tr>
      </table>
    `;

    const html = this.wrapInLayout(
      `Tu pedido #${order.orderNumber} fue confirmado. Total: ${this.formatMoney(order.total)}`,
      body,
    );
    await this.send(email, subject, html);
  }

  // ── Send helper ──────────────────────────────────────────────

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
      this.logger.error(
        `Failed to send email to ${to}: ${(error as Error).message}`,
      );
    }
  }
}
