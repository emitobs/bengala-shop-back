require('dotenv').config();
const nodemailer = require('nodemailer');

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

function wrapInLayout(preheader, bodyContent) {
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
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    ${preheader}
    ${'&nbsp;&zwnj;'.repeat(30)}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
          <tr>
            <td style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 32px 24px; text-align: center;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td style="font-family: Arial, sans-serif; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">
                    <span style="color: #fff;">BENGALA</span>
                    <span style="color: #fde68a;">MAX</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; padding: 40px 32px;">
              ${bodyContent}
            </td>
          </tr>
          <tr>
            <td style="background-color: #1a1a2e; padding: 32px 24px; text-align: center;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td style="font-family: Arial, sans-serif; font-size: 14px; font-weight: 700; letter-spacing: -0.3px; padding-bottom: 12px;">
                    <span style="color: #f97316;">BENGALA</span>
                    <span style="color: #ffffff;">MAX</span>
                  </td>
                </tr>
                <tr>
                  <td style="font-family: Arial, sans-serif; font-size: 12px; color: #9ca3af; line-height: 1.6; padding-bottom: 8px;">
                    Tu tienda de variedades en Uruguay
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 12px; border-top: 1px solid #374151;">
                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                      <tr>
                        <td style="font-family: Arial, sans-serif; font-size: 12px; padding: 8px 0;">
                          <a href="${frontendUrl}" style="color: #f97316; text-decoration: none;">bengalamax.com.uy</a>
                        </td>
                      </tr>
                    </table>
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
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function main() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || 'Bengala Max <noreply@bengalamax.uy>';
  const to = process.env.ADMIN_EMAIL || 'admin@bengalamax.uy';

  if (!host || !user || !pass) {
    console.error('Faltan variables SMTP_HOST, SMTP_USER o SMTP_PASS en .env');
    process.exit(1);
  }

  console.log(`Conectando a ${host}:${port} con usuario ${user}...`);

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  try {
    await transporter.verify();
    console.log('Conexion SMTP OK');
  } catch (err) {
    console.error('Error de conexion SMTP:', err.message);
    process.exit(1);
  }

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
        <td style="font-family: Arial, sans-serif; font-size: 22px; font-weight: 700; color: #1a1a1a; text-align: center; padding-bottom: 16px;">
          Email de prueba
        </td>
      </tr>
      <tr>
        <td style="font-family: Arial, sans-serif; font-size: 15px; color: #4a4a4a; line-height: 1.7; text-align: center; padding-bottom: 8px;">
          Si estas leyendo esto, el SMTP esta configurado correctamente.<br>
          Los emails de Bengala Max se ven asi de lindos.
        </td>
      </tr>
      <tr>
        <td style="padding: 24px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
            <tr>
              <td style="padding: 16px; font-family: Arial, sans-serif;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td style="font-size: 13px; font-weight: 700; color: #374151; padding-bottom: 8px;">
                      Datos del test:
                    </td>
                  </tr>
                  <tr>
                    <td style="font-size: 13px; color: #6b7280; line-height: 2;">
                      Servidor: <strong style="color: #374151;">${host}:${port}</strong><br>
                      Usuario: <strong style="color: #374151;">${user}</strong><br>
                      Fecha: <strong style="color: #374151;">${new Date().toLocaleString('es-UY')}</strong>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="text-align: center;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
            <tr>
              <td style="border-radius: 8px; background-color: #f97316;">
                <a href="${frontendUrl}" style="display: inline-block; padding: 14px 36px; font-family: Arial, sans-serif; font-size: 15px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 8px; background-color: #f97316;">
                  Ir a Bengala Max
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  const html = wrapInLayout('Test de configuracion SMTP - Bengala Max', body);

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject: 'Test de email - Bengala Max',
      html,
    });

    console.log(`Email enviado a ${to} - ID: ${info.messageId}`);
  } catch (err) {
    console.error('Error al enviar:', err.message);
    process.exit(1);
  }
}

main();
