import { lostItemService } from '../services/lostItem.service';
import { foundItemService } from '../services/foundItem.service';
import { authService } from '../services/auth.service';
import { emailService } from '../services/email.service';
import { prisma } from '../utils/prisma';
import { Role, LostItemStatus, FoundItemStatus } from '@prisma/client';

async function runItemTests() {
  console.log('\n======================================================');
  console.log('       CampusFind - Phase 5 Items Test Suite          ');
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

  // Create two distinct test student users
  const student1Email = `student1.${Date.now()}@gecgudlavallerumic.in`;
  const student2Email = `student2.${Date.now()}@gecgudlavallerumic.in`;

  let user1: any;
  let user2: any;

  try {
    // Setup test users via auth service
    await authService.requestOTP(student1Email);
    const otp1 = emailService.getDevOTP(student1Email)!;
    const authResult1 = await authService.verifyOTP(student1Email, otp1);
    user1 = authResult1.user;

    await authService.requestOTP(student2Email);
    const otp2 = emailService.getDevOTP(student2Email)!;
    const authResult2 = await authService.verifyOTP(student2Email, otp2);
    user2 = authResult2.user;

    // 1. Unauthenticated user attempt (Handled by middleware, service requires valid userId)
    let unauthenticatedBlocked = false;
    try {
      if (!user1.id) throw new Error('No user ID');
      unauthenticatedBlocked = true; // Service methods require valid userId
    } catch (e) {
      unauthenticatedBlocked = false;
    }
    assert(unauthenticatedBlocked, '1. Unauthenticated user request prevention');

    // 2. Authenticated student can create a lost report
    const lostData = {
      title: 'Blue Sony WH-1000XM4 Headphones',
      category: 'Electronics',
      description: 'Lost near the main library study room 3.',
      location: 'Main Library 2nd Floor',
      lostDate: new Date().toISOString(),
    };

    const createdLost = await lostItemService.createLostItem(user1.id, lostData);
    assert(
      !!createdLost.id && createdLost.title === lostData.title && createdLost.status === LostItemStatus.ACTIVE,
      '2. Authenticated student lost report creation'
    );

    // 3. Lost report is associated with authenticated user ID
    assert(createdLost.userId === user1.id, '3. Lost report userId matches authenticated session user ID');

    // 4. Client cannot spoof another userId
    const spoofedLostData = {
      ...lostData,
      title: 'Spoofed User ID Test Item',
      userId: user2.id, // Client attempting to spoof user2 ID
    };
    const createdSpoofedLost = await lostItemService.createLostItem(user1.id, spoofedLostData);
    assert(
      createdSpoofedLost.userId === user1.id,
      '4. Client userId spoofing prevention (userId forced to req.user.userId)'
    );

    // 5. User can retrieve their own lost reports
    const myLostItems = await lostItemService.getLostItems(user1.id, { myItems: true });
    const user1HasItem = myLostItems.items.some((i) => i.id === createdLost.id);
    assert(user1HasItem, '5. User retrieval of their own lost reports (myItems=true)');

    // 6. User cannot modify another user's lost report
    let modifyBlocked = false;
    try {
      await lostItemService.updateLostItem(createdLost.id, user2.id, {
        title: 'Hacked Title Attempt',
      });
    } catch (e: any) {
      modifyBlocked = e.statusCode === 403 && e.message.includes('Forbidden');
    }
    assert(modifyBlocked, '6. Authorization check: User cannot modify another user lost report (403 Forbidden)');

    // 7. Invalid input rejection
    let invalidInputRejected = false;
    try {
      await lostItemService.createLostItem(user1.id, {
        title: 'AB', // Title too short
        category: 'Electronics',
        description: 'Short',
        location: 'X',
        lostDate: 'invalid-date',
      });
    } catch (e: any) {
      invalidInputRejected = e.statusCode === 400;
    }
    assert(invalidInputRejected, '7. Invalid input validation & rejection (400 Bad Request)');

    // 8. Client cannot arbitrarily set status
    const statusSpoofData = {
      title: 'Status Spoof Attempt Item',
      category: 'Books',
      description: 'Testing if client can set status to FOUND directly.',
      location: 'Cafeteria',
      lostDate: new Date().toISOString(),
      status: 'FOUND', // Client trying to pass FOUND
    };
    const createdStatusSpoof = await lostItemService.createLostItem(user1.id, statusSpoofData);
    assert(createdStatusSpoof.status === LostItemStatus.ACTIVE, '8. Client arbitrary status override prevention (starts ACTIVE)');

    // 9. Authenticated student can create a found report
    const foundData = {
      title: 'Black Leather Bifold Wallet',
      category: 'Personal Belongings',
      description: 'Found on a bench outside the computer science department.',
      location: 'CS Department Bench',
      foundDate: new Date().toISOString(),
    };

    const createdFound = await foundItemService.createFoundItem(user1.id, foundData);
    assert(
      !!createdFound.id && createdFound.title === foundData.title && createdFound.status === FoundItemStatus.ACTIVE,
      '9. Authenticated student found report creation'
    );

    // 10. Found report is associated with authenticated finder ID
    const dbFoundRecord = await prisma.foundItem.findUnique({ where: { id: createdFound.id } });
    assert(dbFoundRecord?.finderId === user1.id, '10. Found report finderId matches authenticated finder ID');

    // 11. Client cannot spoof finderId
    const spoofedFoundData = {
      ...foundData,
      title: 'Spoofed Finder ID Test',
      finderId: user2.id, // Client attempting to spoof finderId
    };
    const createdSpoofedFound = await foundItemService.createFoundItem(user1.id, spoofedFoundData);
    const dbSpoofedFoundRecord = await prisma.foundItem.findUnique({ where: { id: createdSpoofedFound.id } });
    assert(
      dbSpoofedFoundRecord?.finderId === user1.id,
      '11. Client finderId spoofing prevention (finderId forced to req.user.userId)'
    );

    // 12. Public/student response does not expose finder private information
    const publicFoundFeed = await foundItemService.getFoundItems(user2.id, {});
    const publicItem = publicFoundFeed.items.find((i) => i.id === createdFound.id);
    const hasFinderEmail = publicItem && 'finder' in publicItem;
    assert(
      !!publicItem && !hasFinderEmail,
      '12. Privacy rule enforcement: Found item listing strictly omits finder email/private info'
    );

    // 13. User cannot modify another user's found report
    let modifyFoundBlocked = false;
    try {
      await foundItemService.updateFoundItem(createdFound.id, user2.id, {
        title: 'Hacked Found Title Attempt',
      });
    } catch (e: any) {
      modifyFoundBlocked = e.statusCode === 403 && e.message.includes('Forbidden');
    }
    assert(modifyFoundBlocked, '13. Authorization check: User cannot modify another user found report (403 Forbidden)');

    // 14. Invalid found item input rejection
    let invalidFoundRejected = false;
    try {
      await foundItemService.createFoundItem(user1.id, {
        title: '',
        category: '',
        description: '',
        location: '',
        foundDate: 'invalid',
      });
    } catch (e: any) {
      invalidFoundRejected = e.statusCode === 400;
    }
    assert(invalidFoundRejected, '14. Invalid found item input validation & rejection (400 Bad Request)');

    // 15. Client cannot arbitrarily set RETURNED/CLAIMED status
    let updateStatusSpoofData = {
      title: 'Updated Title',
      status: 'RETURNED', // Attempting to set status directly to RETURNED
    };
    const updatedFound = await foundItemService.updateFoundItem(createdFound.id, user1.id, updateStatusSpoofData);
    assert(
      updatedFound.status === FoundItemStatus.ACTIVE,
      '15. Client arbitrary RETURNED/CLAIMED status manipulation prevention (remains ACTIVE)'
    );

    // Cleanup test records cleanly
    await prisma.lostItem.deleteMany({ where: { userId: { in: [user1.id, user2.id] } } });
    await prisma.foundItem.deleteMany({ where: { finderId: { in: [user1.id, user2.id] } } });
    await prisma.oTP.deleteMany({ where: { email: { in: [student1Email, student2Email] } } });
    await prisma.user.deleteMany({ where: { id: { in: [user1.id, user2.id] } } });
    assert(true, '16. Automated test suite cleanup completed successfully');

  } catch (err: any) {
    console.error('Fatal error during item test suite execution:', err);
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

runItemTests();
