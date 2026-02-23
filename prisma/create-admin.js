/**
 * Create SUPER_ADMIN user in production
 *
 * Run with:  npm run db:create-admin
 *
 * Reads ADMIN_EMAIL and ADMIN_PASSWORD from .env file
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@bengalamax.com.uy';
  const password = process.env.ADMIN_PASSWORD || 'admin123';

  console.log(`Creating SUPER_ADMIN user: ${email}`);

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: 'SUPER_ADMIN',
    },
    create: {
      email,
      passwordHash,
      firstName: 'Admin',
      lastName: 'Bengala',
      role: 'SUPER_ADMIN',
      authProvider: 'LOCAL',
      emailVerified: true,
      isActive: true,
    },
  });

  console.log(`  Done! User ID: ${admin.id}`);
  console.log(`  Email: ${email}`);
  console.log(`  Role: SUPER_ADMIN`);
}

main()
  .catch((e) => {
    console.error('Failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
