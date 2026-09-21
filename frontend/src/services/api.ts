const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface ApiResponse<T = any> {
  success?: boolean;
  status?: 'success' | 'error';
  message?: string;
  data?: T;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export class ApiClientError extends Error {
  constructor(public statusCode: number, message: string, public details?: any) {
    super(message);
    this.name = 'ApiClientError';
  }
}

async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const config: RequestInit = {
    ...options,
    credentials: 'include', // Include HTTP-only cookies for auth sessions
    headers,
  };

  try {
    const response = await fetch(url, config);
    
    let responseData: any;
    const contentType = response.headers.get('Content-Type');
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = { message: await response.text() };
    }

    if (!response.ok) {
      throw new ApiClientError(
        response.status,
        responseData.message || `HTTP error ${response.status}`,
        responseData
      );
    }

    return responseData as T;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }
    throw new ApiClientError(500, error instanceof Error ? error.message : 'Network error occurred');
  }
}

export interface User {
  id: string;
  collegeEmail: string;
  role: 'STUDENT' | 'ADMIN';
  createdAt?: string;
}

export type LostItemStatus = 'ACTIVE' | 'MATCHED' | 'FOUND' | 'CLOSED';
export type FoundItemStatus = 'ACTIVE' | 'CLAIM_PENDING' | 'CLAIMED' | 'RETURNED' | 'CLOSED';

export interface ItemImage {
  id: string;
  lostItemId?: string | null;
  foundItemId?: string | null;
  isPrivate: boolean;
  signedAccessUrl?: string;
  createdAt?: string;
}

export interface LostItem {
  id: string;
  userId: string;
  title: string;
  category: string;
  description: string;
  location: string;
  lostDate: string;
  status: LostItemStatus;
  createdAt: string;
  updatedAt: string;
  images?: ItemImage[];
}

export interface FoundItem {
  id: string;
  finderId?: string;
  title: string;
  category: string;
  description: string;
  location: string;
  foundDate: string;
  status: FoundItemStatus;
  createdAt: string;
  updatedAt: string;
  images?: ItemImage[];
}

export type MatchStatus = 'POTENTIAL' | 'REVIEWED' | 'CONFIRMED' | 'DISMISSED';

export interface AdminMatch {
  id: string;
  lostItemId: string;
  foundItemId: string;
  textScore: number | null;
  imageScore: number | null;
  metadataScore: number | null;
  overallScore: number | null;
  status: MatchStatus;
  createdAt: string;
  updatedAt: string;
  lostItem: LostItem;
  foundItem: FoundItem;
}

export interface AdminMatchImage {
  id: string;
  signedAccessUrl: string;
  createdAt: string;
}

export interface AdminMatchDetail extends Omit<AdminMatch, 'lostItem' | 'foundItem'> {
  lostItem: LostItem & { images: AdminMatchImage[] };
  foundItem: FoundItem & { images: AdminMatchImage[] };
}

export interface GetItemsQuery {
  category?: string;
  status?: string;
  search?: string;
  myItems?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateLostItemInput {
  title: string;
  category: string;
  description: string;
  location: string;
  lostDate: string;
}

export interface UpdateLostItemInput {
  title?: string;
  category?: string;
  description?: string;
  location?: string;
  lostDate?: string;
}

export interface CreateFoundItemInput {
  title: string;
  category: string;
  description: string;
  location: string;
  foundDate: string;
}

export interface UpdateFoundItemInput {
  title?: string;
  category?: string;
  description?: string;
  location?: string;
  foundDate?: string;
}

export const CATEGORIES = [
  'Electronics',
  'Books & Stationery',
  'IDs & Cards',
  'Keys & Accessories',
  'Clothing & Apparel',
  'Bags & Backpacks',
  'Wallets & Purses',
  'Sports Equipment',
  'Other',
];

function buildQueryString(query?: GetItemsQuery): string {
  if (!query) return '';
  const params = new URLSearchParams();
  if (query.category) params.append('category', query.category);
  if (query.status) params.append('status', query.status);
  if (query.search) params.append('search', query.search);
  if (query.myItems) params.append('myItems', 'true');
  if (query.page) params.append('page', query.page.toString());
  if (query.limit) params.append('limit', query.limit.toString());
  const str = params.toString();
  return str ? `?${str}` : '';
}

export const api = {
  get: <T = any>(endpoint: string, options?: RequestInit) => 
    request<T>(endpoint, { ...options, method: 'GET' }),
  
  post: <T = any>(endpoint: string, body?: any, options?: RequestInit) => 
    request<T>(endpoint, { 
      ...options, 
      method: 'POST', 
      body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined) 
    }),

  patch: <T = any>(endpoint: string, body?: any, options?: RequestInit) => 
    request<T>(endpoint, { 
      ...options, 
      method: 'PATCH', 
      body: body ? JSON.stringify(body) : undefined 
    }),

  put: <T = any>(endpoint: string, body?: any, options?: RequestInit) => 
    request<T>(endpoint, { 
      ...options, 
      method: 'PUT', 
      body: body ? JSON.stringify(body) : undefined 
    }),

  delete: <T = any>(endpoint: string, options?: RequestInit) => 
    request<T>(endpoint, { ...options, method: 'DELETE' }),

  // Service helper for liveness check
  checkHealth: async (): Promise<{ status: string; message: string; timestamp: string; environment: string }> => {
    return api.get('/health');
  },

  // Auth endpoints
  requestOTP: async (email: string): Promise<{ status: string; message: string }> => {
    return api.post('/auth/request-otp', { email });
  },

  verifyOTP: async (email: string, otp: string): Promise<{ status: string; message: string; data: { user: User; token: string } }> => {
    return api.post('/auth/verify-otp', { email, otp });
  },

  getMe: async (): Promise<{ status: string; data: { user: User } }> => {
    return api.get('/auth/me');
  },

  getCurrentUser: async (): Promise<User | null> => {
    try {
      const res = await api.getMe();
      return res.data?.user || null;
    } catch {
      return null;
    }
  },

  logout: async (): Promise<{ status: string; message: string }> => {
    return api.post('/auth/logout');
  },

  // Lost Item Endpoints
  getLostItems: async (query?: GetItemsQuery): Promise<{ success: boolean; data: LostItem[]; pagination: PaginationMeta }> => {
    const q = buildQueryString(query);
    return api.get(`/items/lost${q}`);
  },

  getLostItem: async (id: string): Promise<{ success: boolean; data: LostItem }> => {
    return api.get(`/items/lost/${id}`);
  },

  createLostItem: async (input: CreateLostItemInput): Promise<{ success: boolean; data: LostItem }> => {
    return api.post('/items/lost', input);
  },

  updateLostItem: async (id: string, input: UpdateLostItemInput): Promise<{ success: boolean; data: LostItem }> => {
    return api.patch(`/items/lost/${id}`, input);
  },

  deleteLostItem: async (id: string): Promise<{ success: boolean; message: string }> => {
    return api.delete(`/items/lost/${id}`);
  },

  // Found Item Endpoints
  getFoundItems: async (query?: GetItemsQuery): Promise<{ success: boolean; data: FoundItem[]; pagination: PaginationMeta }> => {
    const q = buildQueryString(query);
    return api.get(`/items/found${q}`);
  },

  getFoundItem: async (id: string): Promise<{ success: boolean; data: FoundItem }> => {
    return api.get(`/items/found/${id}`);
  },

  createFoundItem: async (input: CreateFoundItemInput): Promise<{ success: boolean; data: FoundItem }> => {
    return api.post('/items/found', input);
  },

  updateFoundItem: async (id: string, input: UpdateFoundItemInput): Promise<{ success: boolean; data: FoundItem }> => {
    return api.patch(`/items/found/${id}`, input);
  },

  deleteFoundItem: async (id: string): Promise<{ success: boolean; message: string }> => {
    return api.delete(`/items/found/${id}`);
  },

  // Image Management Endpoints
  uploadLostImages: async (id: string, files: File[]): Promise<ItemImage[]> => {
    const uploadedImages: ItemImage[] = [];
    for (const file of files) {
      const formData = new FormData();
      formData.append('image', file);
      const res = await api.post<{ success: boolean; data: ItemImage }>(`/items/lost/${id}/images`, formData);
      if (res.data) {
        uploadedImages.push(res.data);
      }
    }
    return uploadedImages;
  },

  uploadFoundImages: async (id: string, files: File[]): Promise<ItemImage[]> => {
    const uploadedImages: ItemImage[] = [];
    for (const file of files) {
      const formData = new FormData();
      formData.append('image', file);
      const res = await api.post<{ success: boolean; data: ItemImage }>(`/items/found/${id}/images`, formData);
      if (res.data) {
        uploadedImages.push(res.data);
      }
    }
    return uploadedImages;
  },

  getLostImages: async (id: string): Promise<{ success: boolean; data: ItemImage[] }> => {
    return api.get(`/items/lost/${id}/images`);
  },

  getFoundImages: async (id: string): Promise<{ success: boolean; data: ItemImage[] }> => {
    return api.get(`/items/found/${id}/images`);
  },

  deleteLostImage: async (id: string, imageId: string): Promise<{ success: boolean; message: string }> => {
    return api.delete(`/items/lost/${id}/images/${imageId}`);
  },

  deleteFoundImage: async (id: string, imageId: string): Promise<{ success: boolean; message: string }> => {
    return api.delete(`/items/found/${id}/images/${imageId}`);
  },

  // Admin Match Review Endpoints
  getAdminMatches: async (): Promise<{ status: string; data: AdminMatch[] }> => {
    return api.get('/admin/matches');
  },

  getAdminMatch: async (id: string): Promise<{ status: string; data: AdminMatchDetail }> => {
    return api.get(`/admin/matches/${id}`);
  },

  approveAdminMatch: async (id: string, reason?: string): Promise<{ status: string; data: AdminMatch }> => {
    return api.post(`/admin/matches/${id}/approve`, reason ? { reason } : {});
  },

  rejectAdminMatch: async (id: string, reason: string): Promise<{ status: string; data: AdminMatch }> => {
    return api.post(`/admin/matches/${id}/reject`, { reason });
  },
};
