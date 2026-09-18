import { LostItemStatus } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { AppError } from '../utils/errors';
import { validateItemInput } from '../utils/validation';

export interface GetLostItemsQuery {
  category?: string;
  status?: string;
  search?: string;
  myItems?: boolean;
  page?: number;
  limit?: number;
}

export class LostItemService {
  /**
   * Creates a new LostItem report for the authenticated user.
   */
  async createLostItem(userId: string, data: any) {
    const validated = validateItemInput(data, 'lostDate');

    const lostItem = await prisma.lostItem.create({
      data: {
        userId, // Strictly bound to authenticated session user ID
        title: validated.title,
        category: validated.category,
        description: validated.description,
        location: validated.location,
        lostDate: validated.parsedDate,
        status: LostItemStatus.ACTIVE, // Default status is strictly ACTIVE
      },
      select: {
        id: true,
        userId: true,
        title: true,
        category: true,
        description: true,
        location: true,
        lostDate: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return lostItem;
  }

  /**
   * Retrieves lost item reports with optional filtering, search, and pagination.
   */
  async getLostItems(requestingUserId: string, query: GetLostItemsQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    // Filter by specific user items if requested
    if (query.myItems) {
      where.userId = requestingUserId;
    }

    // Filter by category if provided
    if (query.category) {
      where.category = { equals: query.category.trim(), mode: 'insensitive' };
    }

    // Filter by status if provided (default to ACTIVE if not specifying myItems)
    if (query.status) {
      if (Object.values(LostItemStatus).includes(query.status as LostItemStatus)) {
        where.status = query.status as LostItemStatus;
      }
    } else if (!query.myItems) {
      where.status = LostItemStatus.ACTIVE;
    }

    // Text search query across title, description, and location
    if (query.search && query.search.trim().length > 0) {
      const searchTerm = query.search.trim();
      where.OR = [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { location: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.lostItem.count({ where }),
      prisma.lostItem.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          userId: true,
          title: true,
          category: true,
          description: true,
          location: true,
          lostDate: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves a single lost item report by ID.
   */
  async getLostItemById(id: string, requestingUserId: string) {
    const item = await prisma.lostItem.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        title: true,
        category: true,
        description: true,
        location: true,
        lostDate: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!item) {
      throw new AppError('Lost item report not found.', 404);
    }

    return item;
  }

  /**
   * Updates an existing lost item report (Owner only).
   */
  async updateLostItem(id: string, requestingUserId: string, data: any) {
    const existing = await prisma.lostItem.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Lost item report not found.', 404);
    }

    // Ownership Authorization Check
    if (existing.userId !== requestingUserId) {
      throw new AppError('Forbidden: You are not authorized to modify this lost item report.', 403);
    }

    // Terminal State Check
    if (existing.status === LostItemStatus.CLOSED || existing.status === LostItemStatus.FOUND) {
      throw new AppError(`Cannot modify a lost item report that is in ${existing.status} status.`, 400);
    }

    // Validate update fields (ignoring any client-submitted userId or status)
    const updateData: any = {};

    if (data.title !== undefined) {
      if (typeof data.title !== 'string' || data.title.trim().length < 3 || data.title.trim().length > 100) {
        throw new AppError('Title must be between 3 and 100 characters.', 400);
      }
      updateData.title = data.title.trim();
    }

    if (data.category !== undefined) {
      if (typeof data.category !== 'string' || data.category.trim().length === 0) {
        throw new AppError('Category cannot be empty.', 400);
      }
      updateData.category = data.category.trim();
    }

    if (data.description !== undefined) {
      if (typeof data.description !== 'string' || data.description.trim().length < 5 || data.description.trim().length > 1000) {
        throw new AppError('Description must be between 5 and 1000 characters.', 400);
      }
      updateData.description = data.description.trim();
    }

    if (data.location !== undefined) {
      if (typeof data.location !== 'string' || data.location.trim().length < 2 || data.location.trim().length > 200) {
        throw new AppError('Location must be between 2 and 200 characters.', 400);
      }
      updateData.location = data.location.trim();
    }

    if (data.lostDate !== undefined) {
      const parsedDate = new Date(data.lostDate);
      if (isNaN(parsedDate.getTime())) {
        throw new AppError('Invalid lostDate format.', 400);
      }
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      if (parsedDate > tomorrow) {
        throw new AppError('lostDate cannot be in the future.', 400);
      }
      updateData.lostDate = parsedDate;
    }

    if (Object.keys(updateData).length === 0) {
      throw new AppError('No valid fields provided to update.', 400);
    }

    const updated = await prisma.lostItem.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        userId: true,
        title: true,
        category: true,
        description: true,
        location: true,
        lostDate: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updated;
  }

  /**
   * Deletes or soft-closes a lost item report (Owner only).
   */
  async deleteLostItem(id: string, requestingUserId: string) {
    const existing = await prisma.lostItem.findUnique({
      where: { id },
      include: {
        claims: { select: { id: true } },
        matches: { select: { id: true } },
      },
    });

    if (!existing) {
      throw new AppError('Lost item report not found.', 404);
    }

    // Ownership Authorization Check
    if (existing.userId !== requestingUserId) {
      throw new AppError('Forbidden: You are not authorized to delete this lost item report.', 403);
    }

    // Safe Deletion: If dependent claims or matches exist, soft-close record to preserve history
    if (existing.claims.length > 0 || existing.matches.length > 0) {
      await prisma.lostItem.update({
        where: { id },
        data: { status: LostItemStatus.CLOSED },
      });
      return { message: 'Lost item report has been closed safely due to associated history records.' };
    }

    // Otherwise perform hard deletion
    await prisma.lostItem.delete({
      where: { id },
    });

    return { message: 'Lost item report deleted successfully.' };
  }
}

export const lostItemService = new LostItemService();
