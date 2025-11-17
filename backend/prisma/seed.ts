import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Hash the default admin password
  const hashedPassword = await bcrypt.hash('admin123!@#', 10);

  // Create default admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@portfolio.local' },
    update: {},
    create: {
      email: 'admin@portfolio.local',
      username: 'admin',
      password: hashedPassword,
      role: UserRole.ADMIN,
    },
  });

  console.log('✅ Created admin user:', {
    id: adminUser.id,
    email: adminUser.email,
    username: adminUser.username,
    role: adminUser.role,
  });

  // Create default regular user for testing
  const regularUserPassword = await bcrypt.hash('user123!@#', 10);
  const regularUser = await prisma.user.upsert({
    where: { email: 'user@portfolio.local' },
    update: {},
    create: {
      email: 'user@portfolio.local',
      username: 'user',
      password: regularUserPassword,
      role: UserRole.USER,
    },
  });

  console.log('✅ Created regular user:', {
    id: regularUser.id,
    email: regularUser.email,
    username: regularUser.username,
    role: regularUser.role,
  });

  console.log('\n📝 Default Credentials:');
  console.log('   Admin:  admin@portfolio.local / admin123!@#');
  console.log('   User:   user@portfolio.local / user123!@#');
  console.log('\n⚠️  Please change these passwords in production!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
