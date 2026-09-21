import { MatchStatus, Role } from '@prisma/client';
import { authService } from '../services/auth.service';
import { emailService } from '../services/email.service';
import { foundItemService } from '../services/foundItem.service';
import { lostItemService } from '../services/lostItem.service';
import { matchingService } from '../services/matching.service';
import { adminMatchService } from '../services/admin-match.service';
import { prisma } from '../utils/prisma';
import { authenticateUser, requireRole } from '../middleware/auth.middleware';

async function runAdminMatchTests() {
  console.log('\n======================================================');
  console.log('   CampusFind - Phase 9 Admin Match Test Suite         ');
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
  const adminEmail = `admin.match.${suffix}@gecgudlavallerumic.in`;
  const studentEmail = `student.match.${suffix}@gecgudlavallerumic.in`;
  const otherEmail = `other.match.${suffix}@gecgudlavallerumic.in`;
  let adminId = '';
  let studentId = '';
  let otherId = '';
  let lostItemId = '';
  let foundItemId = '';
  let matchId = '';

  const createUser = async (email: string) => {
    await authService.requestOTP(email);
    const otp = emailService.getDevOTP(email);
    if (!otp) throw new Error('Missing development OTP.');
    return (await authService.verifyOTP(email, otp)).user;
  };

  try {
    let unauthenticatedStatus: number | undefined;
    authenticateUser({ headers: {}, cookies: {} } as any, {} as any, (error?: any) => { unauthenticatedStatus = error?.statusCode; });
    assert(unauthenticatedStatus === 401, 'Unauthenticated users cannot access admin matches');
    let studentRoleStatus: number | undefined;
    requireRole(Role.ADMIN)({ user: { role: Role.STUDENT } } as any, {} as any, (error?: any) => { studentRoleStatus = error?.statusCode; });
    assert(studentRoleStatus === 403, 'Students cannot access admin match routes');

    const admin = await createUser(adminEmail);
    const student = await createUser(studentEmail);
    const other = await createUser(otherEmail);
    adminId = admin.id;
    studentId = student.id;
    otherId = other.id;
    await prisma.user.update({ where: { id: adminId }, data: { role: Role.ADMIN } });

    const lost = await lostItemService.createLostItem(studentId, {
      title: 'Admin Review Camera', category: 'Electronics', description: 'A silver camera for admin review.',
      location: 'Admin Test Hall', lostDate: new Date().toISOString(),
    });
    lostItemId = lost.id;
    const found = await foundItemService.createFoundItem(otherId, {
      title: 'Admin Review Camera', category: 'Electronics', description: 'A silver camera for admin review.',
      location: 'Admin Test Hall', foundDate: new Date().toISOString(),
    });
    foundItemId = found.id;
    await prisma.itemImage.createMany({
      data: [
        { imageUrl: 'admin-review-lost-private', isPrivate: true, lostItemId },
        { imageUrl: 'admin-review-found-private', isPrivate: true, foundItemId },
      ],
    });
    const match = await matchingService.generateMatch(lostItemId, foundItemId, studentId);
    if (!match) throw new Error('Expected a potential match for admin test.');
    matchId = match.id;

    assert(await expectError(() => adminMatchService.listPotentialMatches(Role.STUDENT), 403), 'Student service calls cannot list admin matches');
    const list = await adminMatchService.listPotentialMatches(Role.ADMIN);
    const listed = list.find(item => item.id === matchId);
    assert(!!listed && listed.status === MatchStatus.POTENTIAL, 'Admin can retrieve potential match list');
    assert(!!listed && !('images' in listed) && !('imageUrl' in listed), 'Admin list contains metadata and scores only');

    assert(await expectError(() => adminMatchService.getMatchDetail(matchId, Role.STUDENT), 403), 'Students cannot retrieve admin match details');
    const detail = await adminMatchService.getMatchDetail(matchId, Role.ADMIN);
    assert(detail.lostItem.images.length === 1 && detail.foundItem.images.length === 1, 'Admin can retrieve both private image reviews');
    assert(!('imageUrl' in detail.lostItem.images[0]) && detail.lostItem.images[0].signedAccessUrl.length > 0, 'Admin detail exposes temporary signed URLs only');
    assert(!('expectedAnswerHash' in detail) && !('submittedAnswerHash' in detail), 'Admin match detail excludes verification secrets');

    assert(await expectError(() => adminMatchService.decideMatch(matchId, studentId, Role.STUDENT, 'APPROVE'), 403), 'Non-admin cannot approve matches');
    const approved = await adminMatchService.decideMatch(matchId, adminId, Role.ADMIN, 'APPROVE');
    assert(approved.status === MatchStatus.CONFIRMED, 'Admin can approve a potential match');
    assert(await expectError(() => adminMatchService.decideMatch(matchId, adminId, Role.ADMIN, 'REJECT', 'Duplicate decision'), 400), 'Duplicate match decisions are rejected');
    const audit = await prisma.adminAction.findFirst({ where: { adminId, targetId: matchId, action: 'APPROVE_MATCH' } });
    assert(!!audit, 'Match decision creates an admin audit record');
    const notifications = await prisma.notification.count({ where: { type: 'MATCH', userId: { in: [studentId, otherId] } } });
    assert(notifications === 2, 'Match decision creates notifications for both report owners');
    const lostAfter = await prisma.lostItem.findUnique({ where: { id: lostItemId }, select: { status: true } });
    const foundAfter = await prisma.foundItem.findUnique({ where: { id: foundItemId }, select: { status: true } });
    assert(lostAfter?.status === 'ACTIVE' && foundAfter?.status === 'ACTIVE', 'Match decision does not change item ownership or handover status');
  } catch (error) {
    console.error('Fatal error during admin match tests:', error);
    failed++;
  } finally {
    if (matchId) {
      await prisma.adminAction.deleteMany({ where: { targetId: matchId } });
      await prisma.match.deleteMany({ where: { id: matchId } });
    }
    if (foundItemId) await prisma.foundItem.delete({ where: { id: foundItemId } }).catch(() => undefined);
    if (lostItemId) await prisma.lostItem.delete({ where: { id: lostItemId } }).catch(() => undefined);
    await prisma.notification.deleteMany({ where: { userId: { in: [adminId, studentId, otherId] } } });
    await prisma.oTP.deleteMany({ where: { email: { in: [adminEmail, studentEmail, otherEmail] } } });
    await prisma.user.deleteMany({ where: { id: { in: [adminId, studentId, otherId] } } });
    await prisma.$disconnect();
  }

  console.log(`\nAdmin match test results: ${passed} PASSED, ${failed} FAILED`);
  if (failed > 0) process.exit(1);
}

runAdminMatchTests();