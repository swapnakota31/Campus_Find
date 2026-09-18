import { AppError } from './errors';

export interface LostItemInput {
  title: string;
  category: string;
  description: string;
  location: string;
  lostDate: string;
}

export interface FoundItemInput {
  title: string;
  category: string;
  description: string;
  location: string;
  foundDate: string;
}

/**
 * Validates and normalizes common Item input fields.
 */
export const validateItemInput = (data: any, dateFieldName: 'lostDate' | 'foundDate'): {
  title: string;
  category: string;
  description: string;
  location: string;
  parsedDate: Date;
} => {
  if (!data || typeof data !== 'object') {
    throw new AppError('Invalid request payload. Expected a JSON object.', 400);
  }

  const { title, category, description, location } = data;
  const rawDate = data[dateFieldName];

  // Validate Title
  if (!title || typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 100) {
    throw new AppError('Title is required and must be between 3 and 100 characters.', 400);
  }

  // Validate Category
  if (!category || typeof category !== 'string' || category.trim().length === 0) {
    throw new AppError('Category is required.', 400);
  }

  // Validate Description
  if (!description || typeof description !== 'string' || description.trim().length < 5 || description.trim().length > 1000) {
    throw new AppError('Description is required and must be between 5 and 1000 characters.', 400);
  }

  // Validate Location
  if (!location || typeof location !== 'string' || location.trim().length < 2 || location.trim().length > 200) {
    throw new AppError('Location is required and must be between 2 and 200 characters.', 400);
  }

  // Validate Date
  if (!rawDate) {
    throw new AppError(`${dateFieldName} is required.`, 400);
  }

  const parsedDate = new Date(rawDate);
  if (isNaN(parsedDate.getTime())) {
    throw new AppError(`Invalid date format provided for ${dateFieldName}. Expected ISO date string.`, 400);
  }

  // Ensure date is not set in the far future (e.g. more than 1 day ahead of server time)
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  if (parsedDate > tomorrow) {
    throw new AppError(`${dateFieldName} cannot be in the future.`, 400);
  }

  return {
    title: title.trim(),
    category: category.trim(),
    description: description.trim(),
    location: location.trim(),
    parsedDate,
  };
};
