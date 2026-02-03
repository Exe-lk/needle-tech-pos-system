import { NextResponse } from 'next/server';

export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  code: number;
  message: string;
  timestamp: string;
  data?: T;
}

export interface PaginationMeta {
  totalItems: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
  sorting?: {
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
  search?: string;
  filters?: Record<string, any>;
}

export function successResponse<T>(
  data: T,
  message: string = 'Operation successful',
  code: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      status: 'success',
      code,
      message,
      timestamp: new Date().toISOString(),
      data,
    },
    { status: code }
  );
}

export function errorResponse(
  message: string = 'An error occurred',
  code: number = 500,
  data: any = null
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      status: 'error',
      code,
      message,
      timestamp: new Date().toISOString(),
      data,
    },
    { status: code }
  );
}

export function paginatedResponse<T>(
  items: T[],
  pagination: PaginationMeta,
  message: string = 'Items retrieved successfully',
  sorting?: { sortBy: string; sortOrder: 'asc' | 'desc' },
  search?: string,
  filters?: Record<string, any>
): NextResponse<ApiResponse<PaginatedResponse<T>>> {
  return NextResponse.json(
    {
      status: 'success',
      code: 200,
      message,
      timestamp: new Date().toISOString(),
      data: {
        items,
        pagination,
        ...(sorting && { sorting }),
        ...(search && { search }),
        ...(filters && { filters }),
      },
    },
    { status: 200 }
  );
}

export function validationErrorResponse(
  message: string = 'Validation error',
  errors?: Record<string, string[]>
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      status: 'error',
      code: 400,
      message,
      timestamp: new Date().toISOString(),
      data: errors || null,
    },
    { status: 400 }
  );
}

export function notFoundResponse(
  message: string = 'Resource not found'
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      status: 'error',
      code: 404,
      message,
      timestamp: new Date().toISOString(),
      data: null,
    },
    { status: 404 }
  );
}

export function unauthorizedResponse(
  message: string = 'Unauthorized'
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      status: 'error',
      code: 401,
      message,
      timestamp: new Date().toISOString(),
      data: null,
    },
    { status: 401 }
  );
}
