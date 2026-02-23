require('dotenv').config();
const nodemailer = require('nodemailer');

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

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject: 'Test de email - Bengala Max',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f97316; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Bengala Max</h1>
          </div>
          <div style="padding: 32px 24px; background-color: #ffffff;">
            <h2 style="color: #1a1a1a; margin-top: 0;">Email de prueba</h2>
            <p style="color: #4a4a4a; line-height: 1.6;">
              Si estas leyendo esto, el SMTP esta configurado correctamente.
            </p>
            <p style="color: #888; font-size: 13px;">
              Enviado el ${new Date().toLocaleString('es-UY')}
            </p>
          </div>
          <div style="padding: 16px 24px; background-color: #f5f5f5; text-align: center;">
            <p style="color: #888888; font-size: 12px; margin: 0;">Bengala Max - Tu tienda online</p>
          </div>
        </div>
      `,
    });

    console.log(`Email enviado a ${to} - ID: ${info.messageId}`);
  } catch (err) {
    console.error('Error al enviar:', err.message);
    process.exit(1);
  }
}

main();
