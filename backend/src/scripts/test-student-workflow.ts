import { NotificationType } from '@prisma/client';
import { authService } from '../services/auth.service';
import { emailService } from '../services/email.service';
import { notificationService } from '../services/notification.service';
import { prisma } from '../utils/prisma';

async function runStudentWorkflowTests() {
  let passed = 0;
  let failed = 0;
  const assert = (condition: boolean, name: string) => {
    if (condition) { console.log(`PASS: ${name}`); passed++; }
    else { console.error(`FAIL: ${name}`); failed++; }
  };
  const suffix = Date.now();
  const firstEmail = `student.workflow.${suffix}@gecgudlavallerumic.in`;
  const secondEmail = `student.workflow.other.${suffix}@gecgudlavallerumic.in`;
  let firstId = '';
  let secondId = '';
  let notificationId = '';

  const createUser = async (email: string) => {
    await authService.requestOTP(email);
    const otp = emailService.getDevOTP(email);
    if (!otp) throw new Error('Missing development OTP.');
    return (await authService.verifyOTP(email, otp)).user;
  };

  try {
    const first = await createUser(firstEmail);
    const second = await createUser(secondEmail);
    firstId = first.id; secondId = second.id;
    const notification = await prisma.notification.create({ data: { userId: firstId, type: NotificationType.SYSTEM, title: 'Workflow test', message: 'Private test notification.' } });
    notificationId = notification.id;
    const firstNotifications = await notificationService.listForUser(firstId);
    const secondNotifications = await notificationService.listForUser(secondId);
    assert(firstNotifications.some(item => item.id === notificationId), 'Student can list own notifications');
    assert(!secondNotifications.some(item => item.id === notificationId), 'Student cannot list another user notifications');
    const marked = await notificationService.markRead(notificationId, firstId);
    assert(marked.isRead, 'Student can mark own notification as read');
    try { await notificationService.markRead(notificationId, secondId); assert(false, 'Cross-user notification mutation is denied'); }
    catch (error: any) { assert(error.statusCode === 404, 'Cross-user notification mutation is denied'); }
    await notificationService.markAllRead(firstId);
    const unread = await prisma.notification.count({ where: { userId: firstId, isRead: false } });
    assert(unread === 0, 'Student can mark all own notifications as read');
  } catch (error) {
    console.error('Fatal error during student workflow tests:', error);
    failed++;
  } finally {
    if (notificationId) await prisma.notification.delete({ where: { id: notificationId } }).catch(() => undefined);
    await prisma.oTP.deleteMany({ where: { email: { in: [firstEmail, secondEmail] } } });
    await prisma.user.deleteMany({ where: { id: { in: [firstId, secondId] } } });
    await prisma.$disconnect();
  }

  console.log(`Student workflow test results: ${passed} PASSED, ${failed} FAILED`);
  if (failed > 0) process.exit(1);
}

runStudentWorkflowTests();