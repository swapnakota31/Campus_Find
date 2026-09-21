import { MatchStatus, NotificationType, Role } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { AppError } from '../utils/errors';
import { imageService } from './image.service';

const MATCH_FIELDS = {
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

const ITEM_FIELDS = {
  id: true,
  title: true,
  category: true,
  description: true,
  location: true,
  lostDate: true,
  status: true,
} as const;

const FOUND_ITEM_FIELDS = {
  id: true,
  title: true,
  category: true,
  description: true,
  location: true,
  foundDate: true,
  status: true,
} as const;

const requireAdmin = (role: Role) => {
  if (role !== Role.ADMIN) {
    throw new AppError('Forbidden: admin access is required.', 403);
  }
};

const scoreResponse = (match: {
  id: string;
  lostItemId: string;
  foundItemId: string;
  textScore: number | null;
  imageScore: number | null;
  metadataScore: number | null;
  overallScore: number | null;
  status: MatchStatus;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: match.id,
  lostItemId: match.lostItemId,
  foundItemId: match.foundItemId,
  textScore: match.textScore,
  imageScore: match.imageScore,
  metadataScore: match.metadataScore,
  overallScore: match.overallScore,
  status: match.status,
  createdAt: match.createdAt,
  updatedAt: match.updatedAt,
});

export class AdminMatchService {
  async listPotentialMatches(role: Role) {
    requireAdmin(role);
    const matches = await prisma.match.findMany({
      where: { status: MatchStatus.POTENTIAL },
      orderBy: [{ overallScore: 'desc' }, { createdAt: 'desc' }],
      select: {
        ...MATCH_FIELDS,
        lostItem: { select: ITEM_FIELDS },
        foundItem: { select: FOUND_ITEM_FIELDS },
      },
    });

    return matches.map(match => ({
      ...scoreResponse(match),
      lostItem: match.lostItem,
      foundItem: match.foundItem,
    }));
  }

  async getMatchDetail(matchId: string, role: Role) {
    requireAdmin(role);
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: {
        ...MATCH_FIELDS,
        lostItem: {
          select: {
            ...ITEM_FIELDS,
            images: {
              where: { isPrivate: true },
              select: { id: true, imageUrl: true, createdAt: true },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        foundItem: {
          select: {
            ...FOUND_ITEM_FIELDS,
            images: {
              where: { isPrivate: true },
              select: { id: true, imageUrl: true, createdAt: true },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        claims: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            createdAt: true,
            handover: { select: { id: true, status: true, completedAt: true } },
          },
        },
      },
    });

    if (!match) throw new AppError('Match not found.', 404);

    return {
      ...scoreResponse(match),
      lostItem: {
        ...match.lostItem,
        images: match.lostItem.images.map(image => ({
          id: image.id,
          signedAccessUrl: imageService.generateSignedAccessUrl(image.imageUrl, 300),
          createdAt: image.createdAt,
        })),
      },
      foundItem: {
        ...match.foundItem,
        images: match.foundItem.images.map(image => ({
          id: image.id,
          signedAccessUrl: imageService.generateSignedAccessUrl(image.imageUrl, 300),
          createdAt: image.createdAt,
        })),
      },
      claims: match.claims,
    };
  }

  async decideMatch(
    matchId: string,
    adminId: string,
    role: Role,
    decision: 'APPROVE' | 'REJECT',
    reason?: unknown
  ) {
    requireAdmin(role);
    if (decision === 'REJECT' && (typeof reason !== 'string' || reason.trim().length < 3)) {
      throw new AppError('A rejection reason is required.', 400);
    }

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        status: true,
        lostItem: { select: { userId: true } },
        foundItem: { select: { finderId: true } },
      },
    });
    if (!match) throw new AppError('Match not found.', 404);
    if (match.status !== MatchStatus.POTENTIAL) {
      throw new AppError('Only potential matches can be reviewed.', 400);
    }

    const nextStatus = decision === 'APPROVE' ? MatchStatus.CONFIRMED : MatchStatus.DISMISSED;
    return prisma.$transaction(async transaction => {
      const updated = await transaction.match.update({
        where: { id: matchId },
        data: { status: nextStatus },
        select: MATCH_FIELDS,
      });

      await transaction.adminAction.create({
        data: {
          adminId,
          action: `${decision}_MATCH`,
          targetType: 'Match',
          targetId: matchId,
          reason: typeof reason === 'string' ? reason.trim() : undefined,
        },
      });

      await transaction.notification.createMany({
        data: [
          {
            userId: match.lostItem.userId,
            type: NotificationType.MATCH,
            title: 'Match reviewed',
            message: decision === 'APPROVE'
              ? 'An administrator confirmed a potential similarity match for your lost item.'
              : 'An administrator dismissed a potential similarity match for your lost item.',
          },
          {
            userId: match.foundItem.finderId,
            type: NotificationType.MATCH,
            title: 'Match reviewed',
            message: decision === 'APPROVE'
              ? 'An administrator confirmed a potential similarity match for your found item.'
              : 'An administrator dismissed a potential similarity match for your found item.',
          },
        ],
      });

      return scoreResponse(updated);
    });
  }
}

export const adminMatchService = new AdminMatchService();