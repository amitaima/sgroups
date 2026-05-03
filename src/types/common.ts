/* Generic application types */

export interface ApiResponse<T> {
  data: T;
  error?: string;
  isLoading?: boolean;
}

export interface PageMeta {
  title: string;
  description?: string;
}
