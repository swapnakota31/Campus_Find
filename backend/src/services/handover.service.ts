import { ClaimStatus, FoundItemStatus, HandoverStatus, LostItemStatus, NotificationType, Role } from '@prisma/client';
import { AppError } from '../utils/errors';
import { prisma } from '../utils/prisma';

const requireAdmin = (role: Role) => {
  if (role !== Role.ADMIN) throw new AppError('Forbidden: admin access is required.', 403);
};

export class HandoverService {
  private async confirmParticipant(claimId: string, userId: string, participant: 'finder' | 'claimant') {
    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      select: {
        id: true, claimantId: true, status: true, foundItemId: true, lostItemId: true,
        foundItem: { select: { finderId: true, status: true } },
        handover: { select: { id: true, status: true, finderConfirmed: true, claimantConfirmed: true } },
      },
    });
    if (!claim) throw new AppError('Claim not found.', 404);
    if (claim.status !== ClaimStatus.APPROVED) throw new AppError('Only approved claims can be handed over.', 400);
    if (participant === 'finder' && claim.foundItem.finderId !== userId) throw new AppError('Forbidden: only the finder can confirm handover.', 403);
    if (participant === 'claimant' && claim.claimantId !== userId) throw new AppError('Forbidden: only the claimant can confirm receipt.', 403);
    if (claim.handover?.status === HandoverStatus.COMPLETED) throw new AppError('This recovery is already completed.', 409);
    if (participant === 'finder' && claim.handover?.finderConfirmed) throw new AppError('Handover was already confirmed by the finder.', 409);
    if (participant === 'claimant' && claim.handover?.claimantConfirmed) throw new AppError('Receipt was already confirmed by the claimant.', 409);

    return prisma.$transaction(async transaction => {
      const finderConfirmed = participant === 'finder' || Boolean(claim.handover?.finderConfirmed);
      const claimantConfirmed = participant === 'claimant' || Boolean(claim.handover?.claimantConfirmed);
      const complete = finderConfirmed && claimantConfirmed;
      const handover = claim.handover
        ? await transaction.handover.update({ where: { id: claim.handover.id }, data: { finderConfirmed, claimantConfirmed, status: complete ? HandoverStatus.COMPLETED : HandoverStatus.PENDING, completedAt: complete ? new Date() : null }, select: { id: true, claimId: true, status: true, finderConfirmed: true, claimantConfirmed: true, completedAt: true } })
        : await transaction.handover.create({ data: { claimId, finderConfirmed, claimantConfirmed, status: complete ? HandoverStatus.COMPLETED : HandoverStatus.PENDING, completedAt: complete ? new Date() : null }, select: { id: true, claimId: true, status: true, finderConfirmed: true, claimantConfirmed: true, completedAt: true } });

      let foundItem = await transaction.foundItem.findUnique({ where: { id: claim.foundItemId }, select: { id: true, status: true } });
      let lostItem = claim.lostItemId ? await transaction.lostItem.findUnique({ where: { id: claim.lostItemId }, select: { id: true, status: true } }) : null;
      if (complete) {
        foundItem = await transaction.foundItem.update({ where: { id: claim.foundItemId }, data: { status: FoundItemStatus.RETURNED }, select: { id: true, status: true } });
        if (claim.lostItemId) lostItem = await transaction.lostItem.update({ where: { id: claim.lostItemId }, data: { status: LostItemStatus.FOUND }, select: { id: true, status: true } });
      }

      const notifyUserId = participant === 'finder' ? claim.claimantId : claim.foundItem.finderId;
      await transaction.notification.create({ data: { userId: notifyUserId, type: NotificationType.HANDOVER, title: participant === 'finder' ? 'Finder confirmed handover' : 'Claimant confirmed receipt', message: participant === 'finder' ? 'The finder confirmed handing over the item. Confirm receipt after receiving it.' : 'The claimant confirmed receipt of the item.' } });
      if (complete) {
        await transaction.notification.createMany({ data: [{ userId: claim.claimantId, type: NotificationType.HANDOVER, title: 'Recovery completed', message: 'Both participants confirmed recovery. The item is marked returned.' }, { userId: claim.foundItem.finderId, type: NotificationType.HANDOVER, title: 'Recovery completed', message: 'Both participants confirmed recovery. The item is marked returned.' }] });
      }
      return { claimId, handover, foundItem, lostItem };
    });
  }

  async confirmFinderHandover(claimId: string, userId: string) { return this.confirmParticipant(claimId, userId, 'finder'); }
  async confirmClaimantReceipt(claimId: string, userId: string) { return this.confirmParticipant(claimId, userId, 'claimant'); }

  async confirmHandover(claimId: string, adminId: string, role: Role) {
    requireAdmin(role);

    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      select: {
        id: true,
        claimantId: true,
        status: true,
        foundItemId: true,
        lostItemId: true,
        foundItem: { select: { finderId: true, status: true } },
        lostItem: { select: { userId: true, status: true } },
        handover: { select: { id: true, status: true } },
      },
    });

    if (!claim) throw new AppError('Claim not found.', 404);
    if (claim.status !== ClaimStatus.APPROVED) {
      throw new AppError('Only an admin-approved claim can be handed over.', 400);
    }
    if (claim.handover?.status === HandoverStatus.COMPLETED) {
      throw new AppError('This handover has already been completed.', 409);
    }
    if (claim.handover?.status === HandoverStatus.CANCELLED) {
      throw new AppError('This handover was cancelled and cannot be completed.', 400);
    }
    if (claim.foundItem.status === FoundItemStatus.RETURNED) {
      throw new AppError('The found item has already been returned.', 409);
    }

    return prisma.$transaction(async transaction => {
      const handover = claim.handover
        ? await transaction.handover.update({
          where: { id: claim.handover.id },
          data: { status: HandoverStatus.COMPLETED, completedAt: new Date() },
          select: { id: true, claimId: true, status: true, completedAt: true },
        })
        : await transaction.handover.create({
          data: { claimId, status: HandoverStatus.COMPLETED, completedAt: new Date() },
          select: { id: true, claimId: true, status: true, completedAt: true },
        });

      const foundItem = await transaction.foundItem.update({
        where: { id: claim.foundItemId },
        data: { status: FoundItemStatus.RETURNED },
        select: { id: true, status: true },
      });

      let lostItem: { id: string; status: LostItemStatus } | null = null;
      if (claim.lostItemId) {
        // LostItem has no RETURNED enum; FOUND is its existing completed state.
        lostItem = await transaction.lostItem.update({
          where: { id: claim.lostItemId },
          data: { status: LostItemStatus.FOUND },
          select: { id: true, status: true },
        });
      }

      await transaction.adminAction.create({
        data: {
          adminId,
          action: 'CONFIRM_HANDOVER',
          targetType: 'Claim',
          targetId: claimId,
          reason: 'Physical handover confirmed by administrator.',
        },
      });

      await transaction.notification.createMany({
        data: [
          {
            userId: claim.claimantId,
            type: NotificationType.HANDOVER,
            title: 'Handover confirmed',
            message: 'An administrator confirmed the handover. The found item is marked returned.',
          },
          {
            userId: claim.foundItem.finderId,
            type: NotificationType.HANDOVER,
            title: 'Handover confirmed',
            message: 'An administrator confirmed the handover for your found item.',
          },
        ],
      });

      return {
        claimId,
        claimStatus: claim.status,
        handover,
        foundItem,
        lostItem,
      };
    });
  }
}

export const handoverService = new HandoverService();