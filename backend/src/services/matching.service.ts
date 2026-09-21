import { FoundItemStatus, LostItemStatus, MatchStatus, Role } from '@prisma/client';
import { config } from '../config';
import { AppError } from '../utils/errors';
import { prisma } from '../utils/prisma';
import { imageService } from './image.service';
import { ImageMatchingProvider, imageMatchingProvider } from './image-matching.provider';

interface SecureImageSource {
  getSecureBufferForAI(publicId: string): Promise<Buffer>;
}

interface MatchingItem {
  id: string;
  title: string;
  category: string;
  description: string;
  location: string;
  date: Date;
  images: { imageUrl: string }[];
}

const MATCH_SELECT = {
  id: true,
  lostItemId: true,
  foundItemId: true,
  textScore: true,
  imageScore: true,
  metadataScore: true,
  overallScore: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

const clamp = (value: number): number => Math.max(0, Math.min(1, value));

const tokens = (value: string): Set<string> => {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(token => token.length > 1)
  );
};

const jaccard = (left: Set<string>, right: Set<string>): number => {
  if (left.size === 0 && right.size === 0) return 1;
  if (left.size === 0 || right.size === 0) return 0;
  let intersection = 0;
  for (const token of left) if (right.has(token)) intersection++;
  return intersection / (left.size + right.size - intersection);
};

export class MatchingService {
  constructor(
    private readonly imageSource: SecureImageSource = imageService,
    private readonly provider: ImageMatchingProvider = imageMatchingProvider
  ) {}

  async generateMatch(
    lostItemId: string,
    foundItemId: string,
    requestingUserId?: string,
    requestingRole?: Role
  ) {
    const [lostItem, foundItem] = await Promise.all([
      prisma.lostItem.findUnique({
        where: { id: lostItemId },
        select: {
          id: true,
          userId: true,
          title: true,
          category: true,
          description: true,
          location: true,
          lostDate: true,
          status: true,
          images: { where: { isPrivate: true }, select: { imageUrl: true } },
        },
      }),
      prisma.foundItem.findUnique({
        where: { id: foundItemId },
        select: {
          id: true,
          finderId: true,
          title: true,
          category: true,
          description: true,
          location: true,
          foundDate: true,
          status: true,
          images: { where: { isPrivate: true }, select: { imageUrl: true } },
        },
      }),
    ]);

    if (!lostItem) throw new AppError('Lost item report not found.', 404);
    if (!foundItem) throw new AppError('Found item report not found.', 404);

    if (requestingUserId && requestingRole !== Role.ADMIN) {
      if (lostItem.userId !== requestingUserId && foundItem.finderId !== requestingUserId) {
        throw new AppError('Forbidden: matching may only be triggered for your own report.', 403);
      }
    }

    if (lostItem.status !== LostItemStatus.ACTIVE || foundItem.status !== FoundItemStatus.ACTIVE) {
      throw new AppError('Matching requires active lost and found reports.', 400);
    }

    const lost: MatchingItem = { ...lostItem, date: lostItem.lostDate };
    const found: MatchingItem = { ...foundItem, date: foundItem.foundDate };
    const metadataScore = this.calculateMetadataScore(lost, found);
    const textScore = this.calculateTextScore(lost, found);
    const imageScore = await this.calculateImageScore(lost.images, found.images);
    const overallScore = this.calculateOverallScore(metadataScore, textScore, imageScore);

    if (overallScore < config.matchingThreshold) return null;

    return prisma.match.upsert({
      where: { lostItemId_foundItemId: { lostItemId, foundItemId } },
      create: {
        lostItemId,
        foundItemId,
        metadataScore,
        textScore,
        imageScore,
        overallScore,
        status: MatchStatus.POTENTIAL,
      },
      update: {
        metadataScore,
        textScore,
        imageScore,
        overallScore,
        status: MatchStatus.POTENTIAL,
      },
      select: MATCH_SELECT,
    });
  }

  calculateMetadataScore(lost: MatchingItem, found: MatchingItem): number {
    const categoryScore = lost.category.trim().toLowerCase() === found.category.trim().toLowerCase() ? 1 : 0;
    const locationScore = lost.location.trim().toLowerCase() === found.location.trim().toLowerCase()
      ? 1
      : jaccard(tokens(lost.location), tokens(found.location)) >= 0.5 ? 0.6 : 0;
    const daysApart = Math.abs(lost.date.getTime() - found.date.getTime()) / (24 * 60 * 60 * 1000);
    const dateScore = Math.exp(-0.2 * daysApart);
    return clamp(0.4 * categoryScore + 0.3 * locationScore + 0.3 * dateScore);
  }

  calculateTextScore(lost: MatchingItem, found: MatchingItem): number {
    const left = `${lost.title} ${lost.category} ${lost.description}`;
    const right = `${found.title} ${found.category} ${found.description}`;
    return clamp(jaccard(tokens(left), tokens(right)));
  }

  calculateOverallScore(metadataScore: number, textScore: number, imageScore: number | null): number {
    if (imageScore === null) return clamp(0.4 * metadataScore + 0.6 * textScore);
    return clamp(0.3 * metadataScore + 0.4 * textScore + 0.3 * imageScore);
  }

  private async calculateImageScore(
    lostImages: { imageUrl: string }[],
    foundImages: { imageUrl: string }[]
  ): Promise<number | null> {
    if (lostImages.length === 0 || foundImages.length === 0) return null;

    try {
      const [lostBuffers, foundBuffers] = await Promise.all([
        Promise.all(lostImages.map(image => this.imageSource.getSecureBufferForAI(image.imageUrl))),
        Promise.all(foundImages.map(image => this.imageSource.getSecureBufferForAI(image.imageUrl))),
      ]);
      const scores: number[] = [];
      let comparisons = 0;
      for (const lostBuffer of lostBuffers) {
        for (const foundBuffer of foundBuffers) {
          if (comparisons >= config.maxImageComparisons) break;
          scores.push(clamp(await this.provider.compareImages(lostBuffer, foundBuffer)));
          comparisons++;
        }
        if (comparisons >= config.maxImageComparisons) break;
      }
      if (scores.length === 0) return null;
      scores.sort((left, right) => right - left);
      const topScores = scores.slice(0, Math.min(3, scores.length));
      return topScores.reduce((sum, score) => sum + score, 0) / topScores.length;
    } catch (error) {
      console.error(`[Matching] Image provider '${this.provider.name}' failed; continuing without image score.`);
      return null;
    }
  }
}

export const matchingService = new MatchingService();