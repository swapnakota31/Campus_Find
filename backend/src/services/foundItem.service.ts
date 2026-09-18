import { FoundItemStatus } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { AppError } from '../utils/errors';
import { validateItemInput } from '../utils/validation';

export interface GetFoundItemsQuery {
  category?: string;
  status?: string;
  search?: string;
  myItems?: boolean;
  page?: number;
  limit?: number;
}

export class FoundItemService {
  /**
   * Creates a new FoundItem report for the authenticated finder.
   */
  async createFoundItem(finderId: string, data: any) {
    const validated = validateItemInput(data, 'foundDate');

    const foundItem = await prisma.foundItem.create({
      data: {
        finderId, // Strictly bound to authenticated session user ID
        title: validated.title,
        category: validated.category,
        description: validated.description,
        location: validated.location,
        foundDate: validated.parsedDate,
        status: FoundItemStatus.ACTIVE, // Default status is strictly ACTIVE
      },
      select: {
        id: true,
        title: true,
        category: true,
        description: true,
        location: true,
        foundDate: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return foundItem;
  }

  /**
   * Retrieves found item reports while strictly enforcing privacy (omits finder email/private details).
   */
  async getFoundItems(requestingUserId: string, query: GetFoundItemsQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    // Filter by specific finder items if requested
    if (query.myItems) {
      where.finderId = requestingUserId;
    }

    // Filter by category if provided
    if (query.category) {
      where.category = { equals: query.category.trim(), mode: 'insensitive' };
    }

    // Filter by status if provided (default to ACTIVE for public browsing)
    if (query.status) {
      if (Object.values(FoundItemStatus).includes(query.status as FoundItemStatus)) {
        where.status = query.status as FoundItemStatus;
      }
    } else if (!query.myItems) {
      where.status = FoundItemStatus.ACTIVE;
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
      prisma.foundItem.count({ where }),
      prisma.foundItem.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        // Privacy rule: Exclude finder user relation/email from listing output!
        select: {
          id: true,
          title: true,
          category: true,
          description: true,
          location: true,
          foundDate: true,
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
   * Retrieves a single found item report by ID with sanitized public fields.
   */
  async getFoundItemById(id: string, requestingUserId: string) {
    const item = await prisma.foundItem.findUnique({
      where: { id },
      // Privacy rule: Do NOT select finder's email or private information
      select: {
        id: true,
        title: true,
        category: true,
        description: true,
        location: true,
        foundDate: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!item) {
      throw new AppError('Found item report not found.', 404);
    }

    return item;
  }

  /**
   * Updates an existing found item report (Finder only).
   */
  async updateFoundItem(id: string, requestingUserId: string, data: any) {
    const existing = await prisma.foundItem.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Found item report not found.', 404);
    }

    // Finder Authorization Check
    if (existing.finderId !== requestingUserId) {
      throw new AppError('Forbidden: You are not authorized to modify this found item report.', 403);
    }

    // Terminal State Check
    if (
      existing.status === FoundItemStatus.CLOSED ||
      existing.status === FoundItemStatus.CLAIMED ||
      existing.status === FoundItemStatus.RETURNED
    ) {
      throw new AppError(`Cannot modify a found item report that is in ${existing.status} status.`, 400);
    }

    // Validate update fields (ignoring any client-submitted finderId or status)
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

    if (data.foundDate !== undefined) {
      const parsedDate = new Date(data.foundDate);
      if (isNaN(parsedDate.getTime())) {
        throw new AppError('Invalid foundDate format.', 400);
      }
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      if (parsedDate > tomorrow) {
        throw new AppError('foundDate cannot be in the future.', 400);
      }
      updateData.foundDate = parsedDate;
    }

    if (Object.keys(updateData).length === 0) {
      throw new AppError('No valid fields provided to update.', 400);
    }

    const updated = await prisma.foundItem.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        title: true,
        category: true,
        description: true,
        location: true,
        foundDate: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updated;
  }

  /**
   * Deletes or soft-closes a found item report (Finder only).
   */
  async deleteFoundItem(id: string, requestingUserId: string) {
    const existing = await prisma.foundItem.findUnique({
      where: { id },
      include: {
        claims: { select: { id: true } },
        matches: { select: { id: true } },
      },
    });

    if (!existing) {
      throw new AppError('Found item report not found.', 404);
    }

    // Finder Authorization Check
    if (existing.finderId !== requestingUserId) {
      throw new AppError('Forbidden: You are not authorized to delete this found item report.', 403);
    }

    // Safe Deletion: If dependent claims or matches exist, soft-close record to preserve history
    if (existing.claims.length > 0 || existing.matches.length > 0) {
      await prisma.foundItem.update({
        where: { id },
        data: { status: FoundItemStatus.CLOSED },
      });
      return { message: 'Found item report has been closed safely due to associated history records.' };
    }

    // Otherwise perform hard deletion
    await prisma.foundItem.delete({
      where: { id },
    });

    return { message: 'Found item report deleted successfully.' };
  }
}

export const foundItemService = new FoundItemService();
