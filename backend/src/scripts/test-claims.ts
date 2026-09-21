import { ClaimStatus, Role } from '@prisma/client';
import { authService } from '../services/auth.service';
import { emailService } from '../services/email.service';
import { claimService } from '../services/claim.service';
import { foundItemService } from '../services/foundItem.service';
import { lostItemService } from '../services/lostItem.service';
import { prisma } from '../utils/prisma';
import { authenticateUser, requireRole } from '../middleware/auth.middleware';

async function runClaimTests() {
  console.log('\n======================================================');
  console.log('       CampusFind - Phase 7B Claims Test Suite        ');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;
  const assert = (condition: boolean, name: string, detail?: string) => {
    if (condition) {
      console.log(`PASS: ${name}`);
      passed++;
    } else {
      console.error(`FAIL: ${name}${detail ? ` (${detail})` : ''}`);
      failed++;
    }
  };

  const suffix = Date.now();
  const finderEmail = `claims.finder.${suffix}@gecgudlavallerumic.in`;
  const claimantEmail = `claims.claimant.${suffix}@gecgudlavallerumic.in`;
  const otherEmail = `claims.other.${suffix}@gecgudlavallerumic.in`;
  const adminEmail = `claims.admin.${suffix}@gecgudlavallerumic.in`;
  let finderId = '';
  let claimantId = '';
  let otherId = '';
  let adminId = '';
  let foundItemId = '';
  let lostItemId = '';
  const claimIds: string[] = [];

  const createUser = async (email: string) => {
    await authService.requestOTP(email);
    const otp = emailService.getDevOTP(email);
    if (!otp) throw new Error(`Missing development OTP for ${email}`);
    return (await authService.verifyOTP(email, otp)).user;
  };

  const expectError = async (operation: () => Promise<unknown>, statusCode: number) => {
    try {
      await operation();
      return false;
    } catch (error: any) {
      return error.statusCode === statusCode;
    }
  };

  const middlewareResult = (middleware: any, user?: any) => {
    let statusCode: number | undefined;
    middleware(
      { user, headers: {}, cookies: {} },
      {},
      (error?: any) => { statusCode = error?.statusCode; }
    );
    return statusCode;
  };

  try {
    assert(middlewareResult(authenticateUser) === 401, 'Unauthenticated user cannot create claim');

    const finder = await createUser(finderEmail);
    const claimant = await createUser(claimantEmail);
    const other = await createUser(otherEmail);
    const admin = await createUser(adminEmail);
    finderId = finder.id;
    claimantId = claimant.id;
    otherId = other.id;
    adminId = admin.id;
    await prisma.user.update({ where: { id: adminId }, data: { role: Role.ADMIN } });

    const found = await foundItemService.createFoundItem(finderId, {
      title: 'Phase 7B Test Wallet',
      category: 'Wallets & Purses',
      description: 'A test wallet for private verification workflow coverage.',
      location: 'Claims Test Area',
      foundDate: new Date().toISOString(),
    });
    foundItemId = found.id;
    const lost = await lostItemService.createLostItem(claimantId, {
      title: 'Phase 7B Lost Wallet',
      category: 'Wallets & Purses',
      description: 'A corresponding test lost wallet report.',
      location: 'Claims Test Area',
      lostDate: new Date().toISOString(),
    });
    lostItemId = lost.id;

    const question = await claimService.createQuestion(foundItemId, finderId, {
      questionText: 'What color is the inner lining?',
      expectedAnswer: '  Navy   Blue ',
    });
    assert(!('expectedAnswer' in question) && !('expectedAnswerHash' in question), 'Expected answer is never returned');
    const storedQuestion = await prisma.verificationQuestion.findUnique({ where: { id: question.id } });
    assert(
      !!storedQuestion && storedQuestion.expectedAnswerHash.length === 64 && !storedQuestion.expectedAnswerHash.includes('navy'),
      'Expected answer is stored only as a hash'
    );
    assert(
      await expectError(() => claimService.createQuestion(foundItemId, otherId, { questionText: 'Private?', expectedAnswer: 'answer' }), 403),
      'Unauthorized student cannot create verification question'
    );
    const finderQuestions = await claimService.listQuestions(foundItemId, finderId, Role.STUDENT);
    assert(finderQuestions.length === 1 && !('expectedAnswerHash' in finderQuestions[0]), 'Finder question listing omits answer hash');

    const claim = await claimService.createClaim(claimantId, {
      foundItemId,
      lostItemId,
      claimantId: otherId,
      status: ClaimStatus.APPROVED,
    });
    claimIds.push(claim.id);
    assert(claim.claimantId === claimantId && claim.status === ClaimStatus.PENDING, 'Student can create claim with server-controlled ownership/status');
    assert(
      await expectError(() => claimService.createClaim(claimantId, { foundItemId, lostItemId }), 409),
      'Duplicate active claims are rejected'
    );
    assert((await claimService.getClaim(claim.id, claimantId, Role.STUDENT)).id === claim.id, 'Claimant can retrieve own claim');
    assert(await expectError(() => claimService.getClaim(claim.id, otherId, Role.STUDENT), 403), 'Unauthorized student cannot access claim');

    const claimQuestions = await claimService.getClaimQuestions(claim.id, claimantId, Role.STUDENT);
    assert(claimQuestions.length === 1 && !('expectedAnswerHash' in claimQuestions[0]), 'Claimant receives questions without expected answers');
    assert(await expectError(() => claimService.verifyClaim(claim.id, otherId, { answers: [{ questionId: question.id, answer: 'Navy Blue' }] }), 403), 'Unauthorized user cannot submit verification');

    const verification = await claimService.verifyClaim(claim.id, claimantId, {
      answers: [{ questionId: question.id, answer: 'Navy Blue', isCorrect: false, attemptNumber: 99 }],
    });
    assert(verification.verified && verification.status === ClaimStatus.UNDER_REVIEW, 'Correct answer is accepted and claim moves to review');
    const savedAttempt = await prisma.verificationAttempt.findFirst({ where: { claimId: claim.id }, include: { answers: true } });
    assert(savedAttempt?.attemptNumber === 1 && savedAttempt.answers[0]?.isCorrect === true, 'isCorrect and attemptNumber are server-controlled');
    assert(!('expectedAnswerHash' in verification) && !('submittedAnswerHash' in verification), 'Verification result contains no sensitive hashes');
    const foundAfterVerification = await prisma.foundItem.findUnique({ where: { id: foundItemId } });
    assert(foundAfterVerification?.status === 'ACTIVE', 'Successful verification does not return the found item');

    const claim2 = await claimService.createClaim(otherId, { foundItemId });
    claimIds.push(claim2.id);
    let lastAttempt: { verified: boolean; status: ClaimStatus } | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
      lastAttempt = await claimService.verifyClaim(claim2.id, otherId, {
        answers: [{ questionId: question.id, answer: 'Wrong answer' }],
      });
    }
    assert(lastAttempt?.verified === false && lastAttempt.status === ClaimStatus.REJECTED, 'Verification attempt limit rejects repeated incorrect answers');
    assert(await expectError(() => claimService.verifyClaim(claim2.id, otherId, { answers: [{ questionId: question.id, answer: 'Navy Blue' }] }), 400), 'Terminal verification state prevents replay');

    assert(middlewareResult(requireRole(Role.ADMIN), { role: Role.STUDENT }) === 403, 'Student cannot access admin claim endpoints');
    const adminClaims = await claimService.listAdminClaims(adminId);
    assert(adminClaims.some(item => item.id === claim.id), 'Admin can review authorized claims');
    const adminClaim = await claimService.getAdminClaim(claim.id);
    assert(adminClaim.verificationAttempts[0].answers[0].isCorrect === true && !('submittedAnswerHash' in adminClaim.verificationAttempts[0].answers[0]), 'Admin review exposes outcomes without raw answers');
    const decision = await claimService.decideClaim(claim.id, adminId, 'APPROVE', 'Verification reviewed by admin.');
    assert(decision.status === ClaimStatus.APPROVED, 'Admin can approve a claim');
    const pendingHandover = await prisma.handover.findUnique({ where: { claimId: claim.id } });
    assert(pendingHandover?.status === 'PENDING', 'Approved claim creates a pending handover record');
    const audit = await prisma.adminAction.findFirst({ where: { adminId, targetId: claim.id } });
    assert(!!audit, 'Admin approval creates an audit record');
    const notificationCount = await prisma.notification.count({ where: { userId: claimantId, type: 'CLAIM' } });
    assert(notificationCount >= 1, 'Claim review creates a claimant notification');

    const myClaims = await claimService.listMyClaims(claimantId);
    assert(myClaims.some(item => item.id === claim.id), 'Claimant can list own claims');
    assert(await expectError(() => claimService.cancelClaim(claim2.id, otherId), 400), 'Terminal rejected claim cannot be cancelled');
  } catch (error) {
    console.error('Fatal error during claim test suite:', error);
    failed++;
  } finally {
    if (claimIds.length > 0) {
      await prisma.adminAction.deleteMany({ where: { targetId: { in: claimIds } } });
      await prisma.handover.deleteMany({ where: { claimId: { in: claimIds } } });
      await prisma.claim.deleteMany({ where: { id: { in: claimIds } } });
    }
    if (foundItemId) await prisma.foundItem.delete({ where: { id: foundItemId } }).catch(() => undefined);
    if (lostItemId) await prisma.lostItem.delete({ where: { id: lostItemId } }).catch(() => undefined);
    await prisma.notification.deleteMany({ where: { userId: { in: [finderId, claimantId, otherId, adminId] } } });
    await prisma.oTP.deleteMany({ where: { email: { in: [finderEmail, claimantEmail, otherEmail, adminEmail] } } });
    await prisma.user.deleteMany({ where: { id: { in: [finderId, claimantId, otherId, adminId] } } });
    await prisma.$disconnect();
  }

  console.log(`\nClaim test results: ${passed} PASSED, ${failed} FAILED`);
  if (failed > 0) process.exit(1);
}

runClaimTests();