import { authService } from '../services/auth.service';
import { emailService } from '../services/email.service';
import { hashOTP, verifyOTPHash, generateSecureOTP } from '../utils/otp';
import { prisma } from '../utils/prisma';
import { config } from '../config';
import { Role } from '@prisma/client';

async function runAuthTests() {
  console.log('\n======================================================');
  console.log('         CampusFind - Phase 4 Auth Test Suite          ');
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

  const validEmail = `test.student.${Date.now()}@gecgudlavallerumic.in`;
  const invalidEmail = `hacker@gmail.com`;

  try {
    // 1. Valid college email domain validation
    let validDomainResult = false;
    try {
      const normalized = authService.validateEmailDomain(validEmail);
      validDomainResult = normalized === validEmail.toLowerCase();
    } catch (e) {
      validDomainResult = false;
    }
    assert(validDomainResult, '1. Valid college email domain acceptance');

    // 2. Invalid email domain rejection
    let invalidDomainRejected = false;
    try {
      authService.validateEmailDomain(invalidEmail);
    } catch (e: any) {
      invalidDomainRejected = e.statusCode === 400 && e.message.includes('not authorized');
    }
    assert(invalidDomainRejected, '2. Invalid email domain rejection (400 Bad Request)');

    // 3. OTP generation
    const generatedOtp = generateSecureOTP();
    const is6Digits = /^\d{6}$/.test(generatedOtp);
    assert(is6Digits, '3. Cryptographically secure 6-digit OTP generation', `Generated OTP: ${generatedOtp}`);

    // 4. OTP hashing security (Plaintext OTP is never saved directly)
    const hashed = hashOTP('123456', validEmail);
    const hashMatches = verifyOTPHash('123456', validEmail, hashed);
    const wrongHashFails = !verifyOTPHash('654321', validEmail, hashed);
    assert(
      hashed !== '123456' && hashMatches && wrongHashFails,
      '4. Salted OTP hashing & timing-safe verification'
    );

    // Clean up test data if pre-existing
    await prisma.oTP.deleteMany({ where: { email: validEmail } });
    await prisma.user.deleteMany({ where: { collegeEmail: validEmail } });

    // 5. Correct OTP Request & Delivery
    const reqResult = await authService.requestOTP(validEmail);
    const devOtp = emailService.getDevOTP(validEmail);
    assert(
      !!devOtp && devOtp.length === 6 && reqResult.message.includes('sent to email'),
      '5. Request OTP flow & EmailService abstraction dispatch'
    );

    // Check DB record to verify plaintext OTP was NOT stored
    const dbOtpRecord = await prisma.oTP.findFirst({
      where: { email: validEmail },
      orderBy: { createdAt: 'desc' },
    });
    assert(
      !!dbOtpRecord && dbOtpRecord.hashedOtp !== devOtp,
      '5b. Verification that database stores hash, not plaintext OTP'
    );

    // 6. Incorrect OTP verification attempt & count increment
    let wrongOtpFailed = false;
    try {
      await authService.verifyOTP(validEmail, '000000');
    } catch (e: any) {
      wrongOtpFailed = e.statusCode === 400 && e.message.includes('Invalid OTP');
    }
    const dbOtpAfterWrong = await prisma.oTP.findFirst({ where: { id: dbOtpRecord?.id } });
    assert(
      wrongOtpFailed && dbOtpAfterWrong?.attempts === 1,
      '6. Incorrect OTP rejection & attempt counter increment (attempts = 1)'
    );

    // 7. Expired OTP verification
    const expiredEmail = `expired.${Date.now()}@gecgudlavallerumic.in`;
    await prisma.oTP.create({
      data: {
        email: expiredEmail,
        hashedOtp: hashOTP('111111', expiredEmail),
        expiresAt: new Date(Date.now() - 1000), // expired 1s ago
      },
    });
    let expiredRejected = false;
    try {
      await authService.verifyOTP(expiredEmail, '111111');
    } catch (e: any) {
      expiredRejected = e.statusCode === 400 && e.message.includes('expired');
    }
    assert(expiredRejected, '7. Expired OTP rejection');

    // 8. Attempt limit enforcement
    const maxAttemptsEmail = `maxattempts.${Date.now()}@gecgudlavallerumic.in`;
    await prisma.oTP.create({
      data: {
        email: maxAttemptsEmail,
        hashedOtp: hashOTP('222222', maxAttemptsEmail),
        expiresAt: new Date(Date.now() + 600000),
        attempts: config.otpMaxAttempts, // Already reached limit
      },
    });
    let maxAttemptsRejected = false;
    try {
      await authService.verifyOTP(maxAttemptsEmail, '222222');
    } catch (e: any) {
      maxAttemptsRejected = e.statusCode === 400 && e.message.includes('Maximum verification attempts');
    }
    assert(maxAttemptsRejected, '8. Verification attempt limit enforcement (Max 5 attempts)');

    // 9. New User creation on successful verification (Default STUDENT role)
    const verifySuccess = await authService.verifyOTP(validEmail, devOtp!);
    assert(
      !!verifySuccess.token &&
        verifySuccess.user.collegeEmail === validEmail &&
        verifySuccess.user.role === Role.STUDENT,
      '9. Successful OTP verification & New User creation (role = STUDENT)'
    );

    // 10. Reused OTP verification rejection
    let reusedRejected = false;
    try {
      await authService.verifyOTP(validEmail, devOtp!);
    } catch (e: any) {
      reusedRejected = e.statusCode === 400 && e.message.includes('already been used');
    }
    assert(reusedRejected, '10. Reused (single-use) OTP rejection');

    // 11. Existing user login flow (preserves user role)
    // Create new OTP for same user
    // Wait for cooldown or bypass cooldown by deleting previous OTP
    await prisma.oTP.deleteMany({ where: { email: validEmail } });
    await authService.requestOTP(validEmail);
    const devOtp2 = emailService.getDevOTP(validEmail);
    const existingLoginResult = await authService.verifyOTP(validEmail, devOtp2!);

    const usersCount = await prisma.user.count({ where: { collegeEmail: validEmail } });
    assert(
      usersCount === 1 && existingLoginResult.user.id === verifySuccess.user.id,
      '11. Existing User authentication (does not duplicate user record)'
    );

    // 12. Retrieve user by ID (/me service method)
    const meResult = await authService.getUserById(verifySuccess.user.id);
    assert(
      meResult.id === verifySuccess.user.id && meResult.collegeEmail === validEmail,
      '12. User profile retrieval (/me backend service)'
    );

    // 13. Security check: User role ADMIN cannot be chosen by student signup
    const studentUser = await prisma.user.findUnique({ where: { collegeEmail: validEmail } });
    assert(studentUser?.role === Role.STUDENT, '13. Security enforcement: User signup defaults strictly to STUDENT');

    // 14. Cleanup test records
    await prisma.oTP.deleteMany({ where: { email: validEmail } });
    await prisma.oTP.deleteMany({ where: { email: expiredEmail } });
    await prisma.oTP.deleteMany({ where: { email: maxAttemptsEmail } });
    await prisma.user.deleteMany({ where: { collegeEmail: validEmail } });
    assert(true, '14. Automated test suite cleanup completed successfully');

  } catch (err: any) {
    console.error('Fatal error during test suite execution:', err);
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

runAuthTests();
