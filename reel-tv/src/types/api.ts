export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface VideoQueryParams {
  page?: number;
  pageSize?: number;
  status?: string;
  channelId?: string;
  userId?: string;
  sort?: "newest" | "popular" | "trending";
}

export interface ChannelQueryParams {
  page?: number;
  pageSize?: number;
  categoryId?: string;
  featured?: boolean;
  sort?: "newest" | "popular" | "name";
}

export interface WebhookEvent {
  type: string;
  data: {
    object: Record<string, unknown>;
  };
}
