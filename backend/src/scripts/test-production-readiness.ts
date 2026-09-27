import { cleanupExpiredOTPs, validateEnvironmentForRuntime } from '../utils/maintenance';
import { prisma } from '../utils/prisma';
import { hashOTP } from '../utils/otp';

async function runProductionReadinessTests() {
  console.log('\n======================================================');
  console.log('   CampusFind - Production Readiness Regression Test   ');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      if (detail) console.error(`   Detail: ${detail}`);
      failed++;
    }
  }

  try {
    const testEmail = `prod.${Date.now()}@gecgudlavallerumic.in`;

    await prisma.oTP.deleteMany({ where: { email: testEmail } });

    await prisma.oTP.createMany({
      data: [
        {
          email: testEmail,
          hashedOtp: hashOTP('111111', testEmail),
          expiresAt: new Date(Date.now() - 1000),
          usedAt: null,
          attempts: 0,
        },
        {
          email: testEmail,
          hashedOtp: hashOTP('222222', testEmail),
          expiresAt: new Date(Date.now() + 600000),
          usedAt: new Date(Date.now() - 1000),
          attempts: 2,
        },
        {
          email: `keep.${Date.now()}@gecgudlavallerumic.in`,
          hashedOtp: hashOTP('333333', `keep.${Date.now()}@gecgudlavallerumic.in`),
          expiresAt: new Date(Date.now() + 600000),
          usedAt: null,
          attempts: 0,
        },
      ],
    });

    const beforeCount = await prisma.oTP.count({ where: { email: testEmail } });
    assert(beforeCount === 2, '1. Expired and used OTP records are present before cleanup');

    const deletedCount = await cleanupExpiredOTPs();
    assert(deletedCount >= 2, '2. Cleanup removes expired and used OTP records');

    const remaining = await prisma.oTP.count({ where: { email: testEmail } });
    assert(remaining === 0, '3. No stale OTP records remain after cleanup');

    const configCheck = validateEnvironmentForRuntime({
      nodeEnv: 'production',
      databaseUrl: 'postgresql://user:pass@localhost:5432/campusfind',
      jwtSecret: 'strong-production-secret',
      allowedEmailDomains: ['gecgudlavallerumic.in'],
    });
    assert(configCheck === true, '4. Production config validation accepts a fully configured runtime');

    const configFailure = validateEnvironmentForRuntime({
      nodeEnv: 'production',
      databaseUrl: 'postgresql://user:pass@localhost:5432/campusfind',
      jwtSecret: 'campusfind-dev-jwt-secret-key-change-in-prod',
      allowedEmailDomains: ['gecgudlavallerumic.in'],
    });
    assert(configFailure === false, '5. Production config validation rejects insecure default secrets');

    await prisma.oTP.deleteMany({ where: { email: testEmail } });
    assert(true, '6. Test cleanup completed');
  } catch (error: any) {
    console.error('Fatal error during production-readiness regression:', error);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n======================================================');
  console.log(` Test Results: ${passed} PASSED, ${failed} FAILED `);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runProductionReadinessTests();
