import {
  ClaimStatus,
  NotificationType,
  Role,
} from '@prisma/client';
import { prisma } from '../utils/prisma';
import { AppError } from '../utils/errors';
import {
  hashVerificationAnswer,
  verifyVerificationAnswer,
} from '../utils/verification';

const MAX_VERIFICATION_ATTEMPTS = 3;

type ClaimRequest = {
  foundItemId?: unknown;
  lostItemId?: unknown;
  matchId?: unknown;
  claimantId?: unknown;
  status?: unknown;
};

const asOptionalId = (value: unknown, fieldName: string): string | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new AppError(`${fieldName} must be a valid identifier.`, 400);
  }
  return value.trim();
};

const publicClaimSelect = {
  id: true,
  claimantId: true,
  foundItemId: true,
  lostItemId: true,
  matchId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  foundItem: {
    select: {
      id: true,
      title: true,
      category: true,
      description: true,
      location: true,
      foundDate: true,
      status: true,
    },
  },
} as const;

const adminClaimSelect = {
  ...publicClaimSelect,
  claimant: { select: { id: true, collegeEmail: true } },
  foundItem: {
    select: {
      id: true,
      title: true,
      category: true,
      description: true,
      location: true,
      foundDate: true,
      status: true,
      finderId: true,
    },
  },
  verificationAttempts: {
    orderBy: { attemptNumber: 'asc' as const },
    select: {
      id: true,
      attemptNumber: true,
      status: true,
      createdAt: true,
      answers: {
        select: {
          questionId: true,
          isCorrect: true,
          question: { select: { questionText: true } },
        },
      },
    },
  },
} as const;

const questionResponse = (question: {
  id: string;
  questionText: string;
  createdAt: Date;
}) => ({
  id: question.id,
  questionText: question.questionText,
  createdAt: question.createdAt,
});

export class ClaimService {
  async createClaim(claimantId: string, data: ClaimRequest) {
    const foundItemId = asOptionalId(data.foundItemId, 'foundItemId');
    const requestedLostItemId = asOptionalId(data.lostItemId, 'lostItemId');
    const requestedMatchId = asOptionalId(data.matchId, 'matchId');

    if (!foundItemId) {
      throw new AppError('foundItemId is required.', 400);
    }

    const foundItem = await prisma.foundItem.findUnique({
      where: { id: foundItemId },
      select: { id: true, finderId: true, status: true },
    });

    if (!foundItem) {
      throw new AppError('Found item report not found.', 404);
    }
    if (foundItem.status !== 'ACTIVE') {
      throw new AppError('Claims can only be submitted for active found item reports.', 400);
    }
    if (foundItem.finderId === claimantId) {
      throw new AppError('You cannot claim your own found item report.', 403);
    }

    const activeDuplicate = await prisma.claim.findFirst({
      where: {
        claimantId,
        foundItemId,
        status: { in: [ClaimStatus.PENDING, ClaimStatus.UNDER_REVIEW, ClaimStatus.APPROVED] },
      },
      select: { id: true },
    });
    if (activeDuplicate) {
      throw new AppError('You already have an active claim for this found item.', 409);
    }

    let lostItemId = requestedLostItemId;
    if (lostItemId) {
      const lostItem = await prisma.lostItem.findUnique({
        where: { id: lostItemId },
        select: { id: true, userId: true },
      });
      if (!lostItem) {
        throw new AppError('Lost item report not found.', 404);
      }
      if (lostItem.userId !== claimantId) {
        throw new AppError('You can only associate your own lost item report.', 403);
      }
    }

    if (requestedMatchId) {
      const match = await prisma.match.findFirst({
        where: { id: requestedMatchId, foundItemId },
        select: { id: true, lostItemId: true },
      });
      if (!match) {
        throw new AppError('The supplied match does not belong to this found item.', 400);
      }
      if (lostItemId && lostItemId !== match.lostItemId) {
        throw new AppError('The supplied lost item does not match the supplied match.', 400);
      }
      if (!lostItemId) {
        const matchedLostItem = await prisma.lostItem.findUnique({
          where: { id: match.lostItemId },
          select: { userId: true },
        });
        if (!matchedLostItem || matchedLostItem.userId !== claimantId) {
          throw new AppError('You can only claim a match for your own lost item.', 403);
        }
        lostItemId = match.lostItemId;
      }
    }

    const claim = await prisma.$transaction(async (transaction) => {
      const created = await transaction.claim.create({
        data: {
          claimantId,
          foundItemId,
          lostItemId,
          matchId: requestedMatchId,
          status: ClaimStatus.PENDING,
        },
        select: publicClaimSelect,
      });

      await transaction.notification.create({
        data: {
          userId: foundItem.finderId,
          type: NotificationType.CLAIM,
          title: 'New claim submitted',
          message: 'A student submitted a claim for your found item.',
        },
      });

      return created;
    });

    return claim;
  }

  async listMyClaims(claimantId: string) {
    return prisma.claim.findMany({
      where: { claimantId },
      orderBy: { createdAt: 'desc' },
      select: publicClaimSelect,
    });
  }

  async getClaim(claimId: string, requestingUserId: string, role: Role) {
    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      select: {
        ...publicClaimSelect,
        foundItem: { select: { ...publicClaimSelect.foundItem.select, finderId: true } },
      },
    });

    if (!claim) {
      throw new AppError('Claim not found.', 404);
    }

    const authorized =
      role === Role.ADMIN ||
      claim.claimantId === requestingUserId ||
      claim.foundItem.finderId === requestingUserId;
    if (!authorized) {
      throw new AppError('Forbidden: you are not authorized to view this claim.', 403);
    }

    const { finderId: _finderId, ...safeFoundItem } = claim.foundItem;
    return { ...claim, foundItem: safeFoundItem };
  }

  async cancelClaim(claimId: string, claimantId: string) {
    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      select: { id: true, claimantId: true, foundItem: { select: { finderId: true } }, status: true },
    });
    if (!claim) throw new AppError('Claim not found.', 404);
    if (claim.claimantId !== claimantId) throw new AppError('Forbidden: this is not your claim.', 403);
    if (claim.status !== ClaimStatus.PENDING && claim.status !== ClaimStatus.UNDER_REVIEW) {
      throw new AppError('This claim can no longer be cancelled.', 400);
    }

    const updated = await prisma.$transaction(async (transaction) => {
      const result = await transaction.claim.update({
        where: { id: claimId },
        data: { status: ClaimStatus.CANCELLED },
        select: publicClaimSelect,
      });
      await transaction.notification.create({
        data: {
          userId: claim.foundItem.finderId,
          type: NotificationType.CLAIM,
          title: 'Claim cancelled',
          message: 'A student cancelled their claim for your found item.',
        },
      });
      return result;
    });
    return updated;
  }

  async createQuestion(foundItemId: string, finderId: string, data: { questionText?: unknown; expectedAnswer?: unknown }) {
    if (typeof data.questionText !== 'string' || data.questionText.trim().length < 3 || data.questionText.trim().length > 500) {
      throw new AppError('questionText must be between 3 and 500 characters.', 400);
    }
    if (typeof data.expectedAnswer !== 'string' || data.expectedAnswer.trim().length === 0 || data.expectedAnswer.length > 500) {
      throw new AppError('expectedAnswer is required and must be at most 500 characters.', 400);
    }

    const foundItem = await prisma.foundItem.findUnique({
      where: { id: foundItemId },
      select: { id: true, finderId: true },
    });
    if (!foundItem) throw new AppError('Found item report not found.', 404);
    if (foundItem.finderId !== finderId) throw new AppError('Forbidden: only the finder can create verification questions.', 403);

    const question = await prisma.verificationQuestion.create({
      data: {
        foundItemId,
        questionText: data.questionText.trim(),
        expectedAnswerHash: hashVerificationAnswer(data.expectedAnswer),
      },
      select: { id: true, questionText: true, createdAt: true },
    });
    return questionResponse(question);
  }

  async listQuestions(foundItemId: string, requestingUserId: string, role: Role) {
    const foundItem = await prisma.foundItem.findUnique({
      where: { id: foundItemId },
      select: { id: true, finderId: true },
    });
    if (!foundItem) throw new AppError('Found item report not found.', 404);

    const authorized = role === Role.ADMIN || foundItem.finderId === requestingUserId;
    if (!authorized) throw new AppError('Forbidden: only the finder or an admin can list these questions.', 403);

    const questions = await prisma.verificationQuestion.findMany({
      where: { foundItemId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, questionText: true, createdAt: true },
    });
    return questions.map(questionResponse);
  }

  async getClaimQuestions(claimId: string, requestingUserId: string, role: Role) {
    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      select: { claimantId: true, foundItem: { select: { finderId: true, verificationQuestions: { select: { id: true, questionText: true, createdAt: true }, orderBy: { createdAt: 'asc' } } } } },
    });
    if (!claim) throw new AppError('Claim not found.', 404);
    if (role !== Role.ADMIN && claim.claimantId !== requestingUserId && claim.foundItem.finderId !== requestingUserId) {
      throw new AppError('Forbidden: you are not authorized to view these questions.', 403);
    }
    return claim.foundItem.verificationQuestions.map(questionResponse);
  }

  async verifyClaim(claimId: string, claimantId: string, data: { answers?: unknown }) {
    if (!Array.isArray(data.answers) || data.answers.length === 0) {
      throw new AppError('answers must be a non-empty array.', 400);
    }

    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      select: {
        id: true,
        claimantId: true,
        status: true,
        foundItem: {
          select: {
            finderId: true,
            verificationQuestions: {
              select: { id: true, expectedAnswerHash: true },
            },
          },
        },
      },
    });
    if (!claim) throw new AppError('Claim not found.', 404);
    if (claim.claimantId !== claimantId) throw new AppError('Forbidden: only the claimant can submit verification.', 403);
    if (claim.status !== ClaimStatus.PENDING) {
      throw new AppError('Verification is not available for this claim.', 400);
    }

    const previousAttempts = await prisma.verificationAttempt.count({ where: { claimId } });
    if (previousAttempts >= MAX_VERIFICATION_ATTEMPTS) {
      throw new AppError('Maximum verification attempts exceeded.', 400);
    }

    const supplied = data.answers.map((entry: any) => {
      if (!entry || typeof entry.questionId !== 'string' || typeof entry.answer !== 'string') {
        throw new AppError('Each answer requires questionId and answer.', 400);
      }
      return { questionId: entry.questionId, answer: entry.answer };
    });
    const expectedIds = new Set(claim.foundItem.verificationQuestions.map(question => question.id));
    const suppliedIds = new Set(supplied.map(answer => answer.questionId));
    if (supplied.length !== expectedIds.size || suppliedIds.size !== supplied.length || supplied.some(answer => !expectedIds.has(answer.questionId))) {
      throw new AppError('Answers must match the verification questions for this found item.', 400);
    }

    const results = supplied.map(answer => {
      const question = claim.foundItem.verificationQuestions.find(item => item.id === answer.questionId)!;
      return {
        questionId: question.id,
        answerHash: hashVerificationAnswer(answer.answer),
        isCorrect: verifyVerificationAnswer(answer.answer, question.expectedAnswerHash),
      };
    });
    const allCorrect = results.every(result => result.isCorrect);
    const attemptNumber = previousAttempts + 1;
    const nextStatus = allCorrect
      ? ClaimStatus.UNDER_REVIEW
      : attemptNumber >= MAX_VERIFICATION_ATTEMPTS
        ? ClaimStatus.REJECTED
        : ClaimStatus.PENDING;

    const result = await prisma.$transaction(async (transaction) => {
      const attempt = await transaction.verificationAttempt.create({
        data: {
          claimId,
          attemptNumber,
          status: allCorrect ? 'VERIFIED' : 'REJECTED',
          answers: {
            create: results.map(answer => ({
              questionId: answer.questionId,
              submittedAnswerHash: answer.answerHash,
              isCorrect: answer.isCorrect,
            })),
          },
        },
        select: { id: true },
      });
      const updatedClaim = await transaction.claim.update({
        where: { id: claimId },
        data: { status: nextStatus },
        select: { status: true, foundItem: { select: { finderId: true } } },
      });
      await transaction.notification.create({
        data: {
          userId: claim.foundItem.finderId,
          type: NotificationType.VERIFICATION,
          title: 'Claim verification submitted',
          message: allCorrect
            ? 'A claim passed verification and is ready for review.'
            : 'A claimant submitted verification answers for your found item.',
        },
      });
      return { attemptId: attempt.id, status: updatedClaim.status };
    });

    return {
      verified: allCorrect,
      status: result.status,
    };
  }

  async listAdminClaims(adminId: string, status?: unknown) {
    if (status !== undefined && typeof status !== 'string') throw new AppError('Invalid claim status filter.', 400);
    const where = status
      ? { status: Object.values(ClaimStatus).includes(status as ClaimStatus) ? status as ClaimStatus : undefined }
      : undefined;
    if (status && !where?.status) throw new AppError('Invalid claim status filter.', 400);
    void adminId;
    return prisma.claim.findMany({ where, orderBy: { createdAt: 'desc' }, select: adminClaimSelect });
  }

  async getAdminClaim(claimId: string) {
    const claim = await prisma.claim.findUnique({ where: { id: claimId }, select: adminClaimSelect });
    if (!claim) throw new AppError('Claim not found.', 404);
    return claim;
  }

  async decideClaim(claimId: string, adminId: string, decision: 'APPROVE' | 'REJECT', reason?: unknown) {
    if (decision === 'REJECT' && (typeof reason !== 'string' || reason.trim().length < 3)) {
      throw new AppError('A rejection reason is required.', 400);
    }
    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      select: { id: true, claimantId: true, status: true },
    });
    if (!claim) throw new AppError('Claim not found.', 404);
    if (claim.status !== ClaimStatus.PENDING && claim.status !== ClaimStatus.UNDER_REVIEW) {
      throw new AppError('This claim is not available for admin review.', 400);
    }

    const status = decision === 'APPROVE' ? ClaimStatus.APPROVED : ClaimStatus.REJECTED;
    return prisma.$transaction(async (transaction) => {
      const updated = await transaction.claim.update({
        where: { id: claimId },
        data: { status },
        select: { id: true, status: true },
      });
      await transaction.adminAction.create({
        data: {
          adminId,
          action: `${decision}_CLAIM`,
          targetType: 'Claim',
          targetId: claimId,
          reason: typeof reason === 'string' ? reason.trim() : undefined,
        },
      });
      await transaction.notification.create({
        data: {
          userId: claim.claimantId,
          type: NotificationType.CLAIM,
          title: `Claim ${decision.toLowerCase()}`,
          message: decision === 'APPROVE'
            ? 'Your claim was approved by an administrator.'
            : 'Your claim was rejected by an administrator.',
        },
      });
      return updated;
    });
  }
}

export const claimService = new ClaimService();