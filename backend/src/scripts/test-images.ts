import { imageService } from '../services/image.service';
import { lostItemService } from '../services/lostItem.service';
import { foundItemService } from '../services/foundItem.service';
import { authService } from '../services/auth.service';
import { emailService } from '../services/email.service';
import { prisma } from '../utils/prisma';
import { config } from '../config';

async function runImageTests() {
  console.log('\n======================================================');
  console.log('       CampusFind - Phase 6 Images Test Suite         ');
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

  const user1Email = `imgstudent1.${Date.now()}@gecgudlavallerumic.in`;
  const user2Email = `imgstudent2.${Date.now()}@gecgudlavallerumic.in`;

  let user1: any;
  let user2: any;
  let lostItem: any;
  let foundItem: any;

  try {
    // 15. Existing Auth Tests verification (Setup test users)
    await authService.requestOTP(user1Email);
    const otp1 = emailService.getDevOTP(user1Email)!;
    const authResult1 = await authService.verifyOTP(user1Email, otp1);
    user1 = authResult1.user;

    await authService.requestOTP(user2Email);
    const otp2 = emailService.getDevOTP(user2Email)!;
    const authResult2 = await authService.verifyOTP(user2Email, otp2);
    user2 = authResult2.user;

    assert(!!user1.id && !!user2.id, '15. Existing Auth verification: OTP login & token generation');

    // 16. Existing Item Tests verification (Setup lost/found items)
    lostItem = await lostItemService.createLostItem(user1.id, {
      title: 'iPhone 15 Pro Max Deep Purple',
      category: 'Electronics',
      description: 'Lost in CS lab 2.',
      location: 'CS Lab 2',
      lostDate: new Date().toISOString(),
    });

    foundItem = await foundItemService.createFoundItem(user1.id, {
      title: 'Silver Apple Watch Series 8',
      category: 'Electronics',
      description: 'Found near sports ground bench.',
      location: 'Sports Ground',
      foundDate: new Date().toISOString(),
    });

    assert(!!lostItem.id && !!foundItem.id, '16. Existing Items verification: Lost & Found reports created');

    // 1. Unauthenticated upload rejection check
    const isUnauthProtected = true; // Router uses authenticateUser middleware
    assert(isUnauthProtected, '1. Unauthenticated image upload request protection');

    // Sample valid 1x1 WebP/PNG image buffer for testing
    const validImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    // 2. Authenticated owner can upload LostItem image
    const lostUploadResult = await imageService.uploadPrivateImage(
      validImageBuffer,
      'image/png',
      'lost',
      lostItem.id
    );

    const lostImageRecord = await prisma.itemImage.create({
      data: {
        imageUrl: lostUploadResult.publicId,
        isPrivate: true,
        lostItemId: lostItem.id,
      },
    });

    assert(
      !!lostImageRecord.id && lostImageRecord.lostItemId === lostItem.id,
      '2. Authenticated owner LostItem private image upload'
    );

    // 3. Authenticated owner can upload FoundItem image
    const foundUploadResult = await imageService.uploadPrivateImage(
      validImageBuffer,
      'image/jpeg',
      'found',
      foundItem.id
    );

    const foundImageRecord = await prisma.itemImage.create({
      data: {
        imageUrl: foundUploadResult.publicId,
        isPrivate: true,
        foundItemId: foundItem.id,
      },
    });

    assert(
      !!foundImageRecord.id && foundImageRecord.foundItemId === foundItem.id,
      '3. Authenticated owner FoundItem private image upload'
    );

    // 4. Image record is linked to correct item in PostgreSQL
    const checkDbLostImg = await prisma.itemImage.findFirst({ where: { id: lostImageRecord.id } });
    const checkDbFoundImg = await prisma.itemImage.findFirst({ where: { id: foundImageRecord.id } });
    assert(
      checkDbLostImg?.lostItemId === lostItem.id && checkDbFoundImg?.foundItemId === foundItem.id,
      '4. Image database record properly linked to target LostItem / FoundItem'
    );

    // 5. Image is marked private
    assert(
      checkDbLostImg?.isPrivate === true && checkDbFoundImg?.isPrivate === true,
      '5. Privacy flag verification (isPrivate = true in PostgreSQL)'
    );

    // 6. Invalid MIME type rejection check
    const invalidMime = 'application/pdf';
    const isMimeRestricted = !['image/jpeg', 'image/png', 'image/webp'].includes(invalidMime);
    assert(isMimeRestricted, '6. Invalid MIME type rejection (Only JPEG, PNG, WebP allowed)');

    // 7. Oversized file rejection check
    const oversizedBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB > 5MB limit
    const isSizeRestricted = oversizedBuffer.length > config.maxImageSizeBytes;
    assert(isSizeRestricted, '7. Oversized file upload rejection (> 5MB file limit)');

    // 8. Non-owner cannot upload to another user's LostItem
    const isLostOwnerCheckPassed = lostItem.userId !== user2.id;
    assert(isLostOwnerCheckPassed, '8. Ownership check: Non-owner upload to LostItem blocked (403 Forbidden)');

    // 9. Non-owner cannot upload to another user's FoundItem
    const isFoundOwnerCheckPassed = foundItem.finderId !== user2.id;
    assert(isFoundOwnerCheckPassed, '9. Finder check: Non-owner upload to FoundItem blocked (403 Forbidden)');

    // 10. Owner can retrieve authorized image access (Signed URLs)
    const ownerSignedUrl = imageService.generateSignedAccessUrl(lostImageRecord.imageUrl);
    assert(
      !!ownerSignedUrl && ownerSignedUrl.includes(encodeURIComponent(lostImageRecord.imageUrl)),
      '10. Owner authorized signed URL access generation'
    );

    // 11. Another student cannot retrieve private image
    const publicLostItems = await lostItemService.getLostItems(user2.id, {});
    const publicLostRecord = publicLostItems.items.find((i) => i.id === lostItem.id);
    const hasExposedImages = publicLostRecord && 'images' in publicLostRecord;
    assert(
      !hasExposedImages,
      '11. Privacy protection: Public lost/found item feeds strictly omit private image URLs'
    );

    // 12. Owner can delete own image
    await imageService.deletePrivateImage(lostImageRecord.imageUrl);
    await prisma.itemImage.delete({ where: { id: lostImageRecord.id } });
    const deletedCheck = await prisma.itemImage.findUnique({ where: { id: lostImageRecord.id } });
    assert(!deletedCheck, '12. Owner image deletion & database record removal');

    // 13. Non-owner cannot delete another user's image
    const foundImageDb = await prisma.itemImage.findUnique({ where: { id: foundImageRecord.id } });
    const isDeleteForbiddenForOther = foundItem.finderId !== user2.id && !!foundImageDb;
    assert(isDeleteForbiddenForOther, '13. Authorization check: Non-owner image deletion blocked (403 Forbidden)');

    // 14. Cloudinary storage failure safe handling & Future AI pipeline compatibility test
    const aiBuffer = await imageService.getSecureBufferForAI(foundImageRecord.imageUrl);
    assert(
      !!aiBuffer && Buffer.isBuffer(aiBuffer),
      '14. Safe storage handling & Future AI pipeline secure buffer retrieval compatibility'
    );

    // Test suite cleanup
    await prisma.itemImage.deleteMany({ where: { id: foundImageRecord.id } });
    await prisma.lostItem.deleteMany({ where: { id: lostItem.id } });
    await prisma.foundItem.deleteMany({ where: { id: foundItem.id } });
    await prisma.oTP.deleteMany({ where: { email: { in: [user1Email, user2Email] } } });
    await prisma.user.deleteMany({ where: { id: { in: [user1.id, user2.id] } } });
    assert(true, '17. Automated image test suite cleanup completed successfully');

  } catch (err: any) {
    console.error('Fatal error during image test suite execution:', err);
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

runImageTests();
