/**
 * Standard API Response Format
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
  path?: string;
}

export function createSuccessResponse<T>(
  data: T,
  message?: string,
  path?: string,
): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    path,
  };
}

export function createErrorResponse(
  error: string | Error,
  path?: string,
): ApiResponse {
  return {
    success: false,
    error: error instanceof Error ? error.message : error,
    timestamp: new Date().toISOString(),
    path,
  };
}
