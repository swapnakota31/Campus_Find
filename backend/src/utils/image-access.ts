import { Role } from '@prisma/client';

export const canAccessPrivateItemImages = (
  requestingUserId: string,
  ownerId: string,
  role: Role
): boolean => {
  return role === Role.ADMIN || requestingUserId === ownerId;
};