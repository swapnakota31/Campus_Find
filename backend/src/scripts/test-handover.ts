import { ClaimStatus, HandoverStatus, Role } from '@prisma/client';
import { authService } from '../services/auth.service';
import { emailService } from '../services/email.service';
import { foundItemService } from '../services/foundItem.service';
import { lostItemService } from '../services/lostItem.service';
import { handoverService } from '../services/handover.service';
import { prisma } from '../utils/prisma';
import { authenticateUser, requireRole } from '../middleware/auth.middleware';

async function runHandoverTests() {
  console.log('\n======================================================');
  console.log('       CampusFind - Phase 10 Handover Test Suite       ');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;
  const assert = (condition: boolean, name: string) => {
    if (condition) { console.log(`PASS: ${name}`); passed++; }
    else { console.error(`FAIL: ${name}`); failed++; }
  };
  const expectError = async (operation: () => Promise<unknown>, statusCode: number) => {
    try { await operation(); return false; }
    catch (error: any) { return error.statusCode === statusCode; }
  };

  const suffix = Date.now();
  const adminEmail = `handover.admin.${suffix}@gecgudlavallerumic.in`;
  const finderEmail = `handover.finder.${suffix}@gecgudlavallerumic.in`;
  const claimantEmail = `handover.claimant.${suffix}@gecgudlavallerumic.in`;
  const otherEmail = `handover.other.${suffix}@gecgudlavallerumic.in`;
  let adminId = '';
  let finderId = '';
  let claimantId = '';
  let otherId = '';
  const foundItemIds: string[] = [];
  const lostItemIds: string[] = [];
  const claimIds: string[] = [];

  const createUser = async (email: string) => {
    await authService.requestOTP(email);
    const otp = emailService.getDevOTP(email);
    if (!otp) throw new Error('Missing development OTP.');
    return (await authService.verifyOTP(email, otp)).user;
  };

  const createScenario = async (status: ClaimStatus) => {
    const found = await foundItemService.createFoundItem(finderId, {
      title: `Handover Found ${status}`, category: 'Electronics', description: 'Handover workflow test item.',
      location: 'Handover Test Hall', foundDate: new Date().toISOString(),
    });
    const lost = await lostItemService.createLostItem(claimantId, {
      title: `Handover Lost ${status}`, category: 'Electronics', description: 'Handover workflow test report.',
      location: 'Handover Test Hall', lostDate: new Date().toISOString(),
    });
    const claim = await prisma.claim.create({
      data: { claimantId, foundItemId: found.id, lostItemId: lost.id, status },
      select: { id: true },
    });
    foundItemIds.push(found.id);
    lostItemIds.push(lost.id);
    claimIds.push(claim.id);
    return claim.id;
  };

  try {
    let unauthenticatedStatus: number | undefined;
    authenticateUser({ headers: {}, cookies: {} } as any, {} as any, (error?: any) => { unauthenticatedStatus = error?.statusCode; });
    assert(unauthenticatedStatus === 401, 'Unauthenticated users are denied handover');
    let studentRoleStatus: number | undefined;
    requireRole(Role.ADMIN)({ user: { role: Role.STUDENT } } as any, {} as any, (error?: any) => { studentRoleStatus = error?.statusCode; });
    assert(studentRoleStatus === 403, 'Students are denied admin handover');

    const admin = await createUser(adminEmail);
    const finder = await createUser(finderEmail);
    const claimant = await createUser(claimantEmail);
    const other = await createUser(otherEmail);
    adminId = admin.id;
    finderId = finder.id;
    claimantId = claimant.id;
    otherId = other.id;
    await prisma.user.update({ where: { id: adminId }, data: { role: Role.ADMIN } });

    const pendingClaim = await createScenario(ClaimStatus.PENDING);
    const underReviewClaim = await createScenario(ClaimStatus.UNDER_REVIEW);
    const rejectedClaim = await createScenario(ClaimStatus.REJECTED);
    const cancelledClaim = await createScenario(ClaimStatus.CANCELLED);
    const eligibleClaim = await createScenario(ClaimStatus.APPROVED);

    assert(await expectError(() => handoverService.confirmHandover(pendingClaim, adminId, Role.ADMIN), 400), 'Unverified pending claim cannot be handed over');
    assert(await expectError(() => handoverService.confirmHandover(underReviewClaim, adminId, Role.ADMIN), 400), 'Under-review claim cannot be handed over');
    assert(await expectError(() => handoverService.confirmHandover(rejectedClaim, adminId, Role.ADMIN), 400), 'Rejected claim cannot be handed over');
    assert(await expectError(() => handoverService.confirmHandover(cancelledClaim, adminId, Role.ADMIN), 400), 'Cancelled claim cannot be handed over');
    assert(await expectError(() => handoverService.confirmHandover(eligibleClaim, otherId, Role.STUDENT), 403), 'Ordinary student cannot confirm handover');

    const result = await handoverService.confirmHandover(eligibleClaim, adminId, Role.ADMIN);
    assert(result.handover.status === HandoverStatus.COMPLETED, 'Admin can confirm eligible handover');
    assert(result.foundItem.status === 'RETURNED' && result.lostItem?.status === 'FOUND', 'Item statuses transition to supported returned states');
    assert(await expectError(() => handoverService.confirmHandover(eligibleClaim, adminId, Role.ADMIN), 409), 'Duplicate handover confirmation is rejected safely');

    const persistedClaim = await prisma.claim.findUnique({ where: { id: eligibleClaim } });
    const persistedHandover = await prisma.handover.findUnique({ where: { claimId: eligibleClaim } });
    const persistedFound = await prisma.foundItem.findUnique({ where: { id: result.foundItem.id } });
    const persistedLost = result.lostItem ? await prisma.lostItem.findUnique({ where: { id: result.lostItem.id } }) : null;
    assert(persistedClaim?.status === ClaimStatus.APPROVED, 'Claim history remains preserved after handover');
    assert(persistedHandover?.status === HandoverStatus.COMPLETED && !!persistedHandover.completedAt, 'Completed handover remains persisted');
    assert(persistedFound?.status === 'RETURNED' && persistedLost?.status === 'FOUND', 'Returned item records remain in the database');
    const audit = await prisma.adminAction.findFirst({ where: { adminId, targetId: eligibleClaim, action: 'CONFIRM_HANDOVER' } });
    assert(!!audit, 'Handover creates an admin audit record');
    const notifications = await prisma.notification.count({ where: { type: 'HANDOVER', userId: { in: [claimantId, finderId] } } });
    assert(notifications === 2, 'Handover creates notifications for claimant and finder');
    assert(await expectError(() => handoverService.confirmHandover('missing-claim', adminId, Role.ADMIN), 404), 'Missing claim is handled safely');
  } catch (error) {
    console.error('Fatal error during handover tests:', error);
    failed++;
  } finally {
    if (claimIds.length) {
      await prisma.adminAction.deleteMany({ where: { targetId: { in: claimIds } } });
      await prisma.handover.deleteMany({ where: { claimId: { in: claimIds } } });
      await prisma.claim.deleteMany({ where: { id: { in: claimIds } } });
    }
    if (foundItemIds.length) await prisma.foundItem.deleteMany({ where: { id: { in: foundItemIds } } });
    if (lostItemIds.length) await prisma.lostItem.deleteMany({ where: { id: { in: lostItemIds } } });
    await prisma.notification.deleteMany({ where: { userId: { in: [adminId, finderId, claimantId, otherId] } } });
    await prisma.oTP.deleteMany({ where: { email: { in: [adminEmail, finderEmail, claimantEmail, otherEmail] } } });
    await prisma.user.deleteMany({ where: { id: { in: [adminId, finderId, claimantId, otherId] } } });
    await prisma.$disconnect();
  }

  console.log(`\nHandover test results: ${passed} PASSED, ${failed} FAILED`);
  if (failed > 0) process.exit(1);
}

runHandoverTests();