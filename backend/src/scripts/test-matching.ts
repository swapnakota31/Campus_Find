import { MatchStatus } from '@prisma/client';
import { authService } from '../services/auth.service';
import { emailService } from '../services/email.service';
import { foundItemService } from '../services/foundItem.service';
import { lostItemService } from '../services/lostItem.service';
import { MatchingService } from '../services/matching.service';
import { prisma } from '../utils/prisma';
import { authenticateUser } from '../middleware/auth.middleware';

async function runMatchingTests() {
  console.log('\n======================================================');
  console.log('      CampusFind - Phase 8 Matching Test Suite         ');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;
  const assert = (condition: boolean, name: string) => {
    if (condition) {
      console.log(`PASS: ${name}`);
      passed++;
    } else {
      console.error(`FAIL: ${name}`);
      failed++;
    }
  };
  const expectError = async (operation: () => Promise<unknown>, statusCode: number) => {
    try {
      await operation();
      return false;
    } catch (error: any) {
      return error.statusCode === statusCode;
    }
  };

  const suffix = Date.now();
  const ownerEmail = `matching.owner.${suffix}@gecgudlavallerumic.in`;
  const otherEmail = `matching.other.${suffix}@gecgudlavallerumic.in`;
  let ownerId = '';
  let otherId = '';
  let lostItemId = '';
  let foundItemId = '';

  const createUser = async (email: string) => {
    await authService.requestOTP(email);
    const otp = emailService.getDevOTP(email);
    if (!otp) throw new Error('Development OTP was not generated.');
    return (await authService.verifyOTP(email, otp)).user;
  };

  const requestedImageIds: string[] = [];
  let providerCalls = 0;
  const testImageSource = {
    async getSecureBufferForAI(publicId: string): Promise<Buffer> {
      requestedImageIds.push(publicId);
      return Buffer.from(publicId, 'utf8');
    },
  };
  const testProvider = {
    name: 'test-provider',
    async compareImages(lostImage: Buffer, foundImage: Buffer): Promise<number> {
      providerCalls++;
      return lostImage[0] === foundImage[0] ? 0.9 : 0.4;
    },
  };
  const matchingService = new MatchingService(testImageSource, testProvider);

  try {
    assert(
      (() => {
        let statusCode: number | undefined;
        authenticateUser({ headers: {}, cookies: {} } as any, {} as any, (error?: any) => { statusCode = error?.statusCode; });
        return statusCode === 401;
      })(),
      'Unauthenticated matching requests are rejected'
    );

    assert(await expectError(() => matchingService.generateMatch('missing-lost', 'missing-found'), 404), 'Missing lost item is handled safely');

    const owner = await createUser(ownerEmail);
    const other = await createUser(otherEmail);
    ownerId = owner.id;
    otherId = other.id;

    const lost = await lostItemService.createLostItem(ownerId, {
      title: 'Gold Ring',
      category: 'Jewelry',
      description: 'Round gold ring with a small engraved star.',
      location: 'Main Library',
      lostDate: new Date().toISOString(),
    });
    lostItemId = lost.id;
    assert(await expectError(() => matchingService.generateMatch(lostItemId, 'missing-found', ownerId), 404), 'Missing found item is handled safely');

    const found = await foundItemService.createFoundItem(ownerId, {
      title: 'Gold Ring',
      category: 'Jewelry',
      description: 'Round gold ring with a small engraved star.',
      location: 'Main Library',
      foundDate: new Date().toISOString(),
    });
    foundItemId = found.id;
    assert(await expectError(() => matchingService.generateMatch(lostItemId, foundItemId, otherId), 403), 'Students cannot match reports they do not own');

    const noImageMatch = await matchingService.generateMatch(lostItemId, foundItemId, ownerId);
    assert(noImageMatch?.imageScore === null, 'Missing images degrade gracefully to a null image score');
    assert(noImageMatch?.status === MatchStatus.POTENTIAL, 'Generated match starts in POTENTIAL status');
    assert(noImageMatch !== null && (noImageMatch?.overallScore ?? 0) >= 0.45, 'Metadata and text scores can generate a potential match');

    await prisma.itemImage.createMany({
      data: [
        { imageUrl: 'lost-private-1', isPrivate: true, lostItemId },
        { imageUrl: 'lost-private-2', isPrivate: true, lostItemId },
        { imageUrl: 'lost-public-should-not-be-read', isPrivate: false, lostItemId },
        { imageUrl: 'found-private-1', isPrivate: true, foundItemId },
        { imageUrl: 'found-private-2', isPrivate: true, foundItemId },
        { imageUrl: 'found-public-should-not-be-read', isPrivate: false, foundItemId },
      ],
    });

    requestedImageIds.length = 0;
    providerCalls = 0;
    const imageMatch = await matchingService.generateMatch(lostItemId, foundItemId, ownerId);
    assert((imageMatch?.imageScore ?? 0) > 0, 'Private images produce a server-side image score');
    assert(providerCalls === 4, 'Multiple private images are compared without reading public images');
    assert(
      requestedImageIds.every(id => id.includes('private')) && requestedImageIds.length === 4,
      'Matching image retrieval stays isolated to private image records'
    );
    assert(!('imageUrl' in (imageMatch || {})), 'Match response contains no private image URLs');
    assert(
      imageMatch !== null &&
        [imageMatch.imageScore, imageMatch.metadataScore, imageMatch.textScore, imageMatch.overallScore].every(score => score !== null && score >= 0 && score <= 1),
      'All generated scores are server-controlled and bounded'
    );

    const duplicateMatch = await matchingService.generateMatch(lostItemId, foundItemId, ownerId);
    const matchCount = await prisma.match.count({ where: { lostItemId, foundItemId } });
    assert(duplicateMatch?.id === imageMatch?.id && matchCount === 1, 'Duplicate lost/found pairs update one Match record');

    const storedMatch = await prisma.match.findUnique({ where: { lostItemId_foundItemId: { lostItemId, foundItemId } } });
    assert(storedMatch?.status === MatchStatus.POTENTIAL, 'Stored match remains a potential suggestion');
    assert(
      storedMatch?.overallScore === imageMatch?.overallScore && storedMatch?.imageScore === imageMatch?.imageScore,
      'Stored scores come from the matching service rather than client input'
    );
  } catch (error) {
    console.error('Fatal error during matching test suite:', error);
    failed++;
  } finally {
    if (lostItemId && foundItemId) {
      await prisma.match.deleteMany({ where: { lostItemId, foundItemId } });
    }
    if (foundItemId) await prisma.foundItem.delete({ where: { id: foundItemId } }).catch(() => undefined);
    if (lostItemId) await prisma.lostItem.delete({ where: { id: lostItemId } }).catch(() => undefined);
    await prisma.oTP.deleteMany({ where: { email: { in: [ownerEmail, otherEmail] } } });
    await prisma.user.deleteMany({ where: { id: { in: [ownerId, otherId] } } });
    await prisma.$disconnect();
  }

  console.log(`\nMatching test results: ${passed} PASSED, ${failed} FAILED`);
  if (failed > 0) process.exit(1);
}

runMatchingTests();