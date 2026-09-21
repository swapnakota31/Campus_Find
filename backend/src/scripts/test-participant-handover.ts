import { ClaimStatus, HandoverStatus, Role } from '@prisma/client';
import { authService } from '../services/auth.service';
import { emailService } from '../services/email.service';
import { claimService } from '../services/claim.service';
import { foundItemService } from '../services/foundItem.service';
import { lostItemService } from '../services/lostItem.service';
import { handoverService } from '../services/handover.service';
import { prisma } from '../utils/prisma';

async function runParticipantHandoverTests() {
  let passed = 0; let failed = 0;
  const assert = (condition: boolean, name: string) => { if (condition) { console.log(`PASS: ${name}`); passed++; } else { console.error(`FAIL: ${name}`); failed++; } };
  const expectError = async (operation: () => Promise<unknown>, statusCode: number) => { try { await operation(); return false; } catch (error: any) { return error.statusCode === statusCode; } };
  const suffix = Date.now();
  const finderEmail = `participant.finder.${suffix}@gecgudlavallerumic.in`;
  const claimantEmail = `participant.claimant.${suffix}@gecgudlavallerumic.in`;
  const otherEmail = `participant.other.${suffix}@gecgudlavallerumic.in`;
  const adminEmail = `participant.admin.${suffix}@gecgudlavallerumic.in`;
  let finderId = ''; let claimantId = ''; let otherId = ''; let adminId = '';
  const foundItemIds: string[] = []; const lostItemIds: string[] = []; const claimIds: string[] = [];

  const createUser = async (email: string) => { await authService.requestOTP(email); const otp = emailService.getDevOTP(email); if (!otp) throw new Error('Missing OTP'); return (await authService.verifyOTP(email, otp)).user; };
  const createClaim = async (status: ClaimStatus = ClaimStatus.PENDING) => {
    const found = await foundItemService.createFoundItem(finderId, { title: 'Participant Test Item', category: 'Electronics', description: 'Participant handover test item.', location: 'Participant Test Hall', foundDate: new Date().toISOString() });
    const lost = await lostItemService.createLostItem(claimantId, { title: 'Participant Lost Item', category: 'Electronics', description: 'Participant handover test report.', location: 'Participant Test Hall', lostDate: new Date().toISOString() });
    const claim = await prisma.claim.create({ data: { claimantId, foundItemId: found.id, lostItemId: lost.id, status }, select: { id: true } });
    foundItemIds.push(found.id); lostItemIds.push(lost.id); claimIds.push(claim.id); return claim.id;
  };

  try {
    const finder = await createUser(finderEmail); const claimant = await createUser(claimantEmail); const other = await createUser(otherEmail); const admin = await createUser(adminEmail);
    finderId = finder.id; claimantId = claimant.id; otherId = other.id; adminId = admin.id;
    await prisma.user.update({ where: { id: adminId }, data: { role: Role.ADMIN } });

    const claimId = await createClaim();
    const foundItemId = (await prisma.claim.findUnique({ where: { id: claimId }, select: { foundItemId: true } }))!.foundItemId;
    const finderClaims = await claimService.listClaimsForFoundItem(foundItemId, finderId, Role.STUDENT);
    assert(finderClaims.some(claim => claim.id === claimId), 'Finder can view claims for own found item');
    assert(await expectError(() => claimService.listClaimsForFoundItem(foundItemId, otherId, Role.STUDENT), 403), 'Other student cannot view finder claims');
    const approved = await claimService.decideClaimAsFinder(claimId, finderId, 'APPROVE');
    assert(approved.status === ClaimStatus.APPROVED && (await prisma.handover.findUnique({ where: { claimId }, select: { status: true } }))?.status === HandoverStatus.PENDING, 'Finder can approve a valid claim and open handover');
    assert(await expectError(() => claimService.decideClaimAsFinder(claimId, otherId, 'REJECT'), 403), 'Other student cannot decide claims');
    assert(await expectError(() => handoverService.confirmFinderHandover(claimId, otherId), 403), 'Unrelated student cannot confirm handover');
    const finderConfirmed = await handoverService.confirmFinderHandover(claimId, finderId);
    assert(finderConfirmed.handover.finderConfirmed && !finderConfirmed.handover.claimantConfirmed && finderConfirmed.handover.status === HandoverStatus.PENDING, 'Finder confirmation alone does not complete recovery');
    assert(await expectError(() => handoverService.confirmFinderHandover(claimId, finderId), 409), 'Duplicate finder confirmation is rejected');
    assert(await expectError(() => handoverService.confirmClaimantReceipt(claimId, otherId), 403), 'Unrelated student cannot confirm receipt');
    const completed = await handoverService.confirmClaimantReceipt(claimId, claimantId);
    assert(completed.handover.claimantConfirmed && completed.handover.status === HandoverStatus.COMPLETED, 'Claimant confirmation completes recovery after finder confirmation');
    assert(completed.foundItem?.status === 'RETURNED' && completed.lostItem?.status === 'FOUND', 'Participant completion transitions item states');
    assert(await expectError(() => handoverService.confirmClaimantReceipt(claimId, claimantId), 409), 'Completed recovery rejects duplicate receipt');

    const rejectedClaim = await createClaim(ClaimStatus.REJECTED);
    assert(await expectError(() => handoverService.confirmFinderHandover(rejectedClaim, finderId), 400), 'Rejected claims cannot enter participant handover');
    const pendingReject = await createClaim();
    await claimService.decideClaimAsFinder(pendingReject, finderId, 'REJECT', 'Not enough evidence.');
    assert((await prisma.claim.findUnique({ where: { id: pendingReject }, select: { status: true } }))?.status === ClaimStatus.REJECTED, 'Finder can reject a valid claim');

    const adminClaim = await createClaim(ClaimStatus.APPROVED);
    const adminResult = await handoverService.confirmHandover(adminClaim, adminId, Role.ADMIN);
    assert(adminResult.handover.status === HandoverStatus.COMPLETED, 'Admin override remains available');
    assert(!!await prisma.adminAction.findFirst({ where: { adminId, targetId: adminClaim, action: 'CONFIRM_HANDOVER' } }), 'Admin override creates audit record');
    const notificationCount = await prisma.notification.count({ where: { userId: { in: [finderId, claimantId] }, type: 'HANDOVER' } });
    assert(notificationCount >= 4, 'Participant and completed recovery notifications are created');
  } catch (error) { console.error('Fatal participant handover test error:', error); failed++; }
  finally {
    await prisma.adminAction.deleteMany({ where: { targetId: { in: claimIds } } });
    await prisma.handover.deleteMany({ where: { claimId: { in: claimIds } } });
    await prisma.claim.deleteMany({ where: { id: { in: claimIds } } });
    await prisma.foundItem.deleteMany({ where: { id: { in: foundItemIds } } });
    await prisma.lostItem.deleteMany({ where: { id: { in: lostItemIds } } });
    await prisma.notification.deleteMany({ where: { userId: { in: [finderId, claimantId, otherId, adminId] } } });
    await prisma.oTP.deleteMany({ where: { email: { in: [finderEmail, claimantEmail, otherEmail, adminEmail] } } });
    await prisma.user.deleteMany({ where: { id: { in: [finderId, claimantId, otherId, adminId] } } });
    await prisma.$disconnect();
  }
  console.log(`Participant handover test results: ${passed} PASSED, ${failed} FAILED`);
  if (failed > 0) process.exit(1);
}

runParticipantHandoverTests();