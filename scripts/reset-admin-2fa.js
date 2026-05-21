const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '/Users/huhenege/Projects/Saysanaa/.env' });

(async () => {
  const p = new PrismaClient();
  await p.user.update({
    where: { email: 'admin@saysanaa.mn' },
    data: { twoFactorEnabled: false, twoFactorSecret: null },
  });
  console.log('✓ admin@saysanaa.mn 2FA reset хийлээ. Дараагийн login-д шинээр тохирно.');
  await p.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
