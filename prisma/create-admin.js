/**
 * Create SUPER_ADMIN user in production
 *
 * Run with:  node prisma/create-admin.js
 *
 * Environment variables (optional):
 *   ADMIN_EMAIL    — default: admin@bengalamax.com.uy
 *   ADMIN_PASSWORD — default: admin123
 */
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
  console.log('\n  IMPORTANT: Change the password from the admin panel after first login!');
}

main()
  .catch((e) => {
    console.error('Failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
