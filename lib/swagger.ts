import { createSwaggerSpec } from 'next-swagger-doc';
import { swaggerPaths, swaggerComponents } from './swagger-spec';

export const getApiDocs = async () => {
  const spec = createSwaggerSpec({
    apiFolder: 'app/api',
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Needle Tech POS System API',
        version: '1.0.0',
        description: 'API documentation for Needle Tech POS System - A comprehensive rental management system for equipment rental businesses',
        contact: {
          name: 'API Support',
        },
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Development server',
        },
        {
          url: 'https://api.example.com',
          description: 'Production server',
        },
      ],
      paths: swaggerPaths,
      components: {
        ...swaggerComponents,
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT token obtained from login endpoint',
          },
        },
        schemas: {
          ApiResponse: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
                enum: ['success', 'error'],
                description: 'Response status',
              },
              code: {
                type: 'number',
                description: 'HTTP status code',
              },
              message: {
                type: 'string',
                description: 'Response message',
              },
              timestamp: {
                type: 'string',
                format: 'date-time',
                description: 'Response timestamp',
              },
              data: {
                type: 'object',
                description: 'Response data',
              },
            },
          },
          PaginatedResponse: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                },
                description: 'Array of items',
              },
              pagination: {
                type: 'object',
                properties: {
                  totalItems: { type: 'number', description: 'Total number of items' },
                  currentPage: { type: 'number', description: 'Current page number' },
                  itemsPerPage: { type: 'number', description: 'Items per page' },
                  totalPages: { type: 'number', description: 'Total number of pages' },
                  hasNextPage: { type: 'boolean', description: 'Whether there is a next page' },
                  hasPreviousPage: { type: 'boolean', description: 'Whether there is a previous page' },
                },
              },
              sorting: {
                type: 'object',
                properties: {
                  sortBy: { type: 'string', description: 'Field to sort by' },
                  sortOrder: { type: 'string', enum: ['asc', 'desc'], description: 'Sort order' },
                },
              },
              search: { type: 'string', description: 'Search query' },
              filters: { type: 'object', description: 'Applied filters' },
            },
          },
          Customer: {
            type: 'object',
            properties: {
              _id: { type: 'string', description: 'Customer ID' },
              code: { type: 'string', description: 'Customer code' },
              type: { type: 'string', enum: ['INDIVIDUAL', 'COMPANY'], description: 'Customer type' },
              name: { type: 'string', description: 'Customer name' },
              contactPerson: { type: 'string', description: 'Contact person name' },
              phones: { type: 'array', items: { type: 'string' }, description: 'Phone numbers' },
              emails: { type: 'array', items: { type: 'string' }, description: 'Email addresses' },
              billingAddress: { type: 'object', description: 'Billing address' },
              shippingAddress: { type: 'object', description: 'Shipping address' },
              taxProfile: {
                type: 'object',
                properties: {
                  vatApplicable: { type: 'boolean' },
                  vatRegistrationNumber: { type: 'string' },
                  taxCategory: { type: 'string' },
                },
              },
              financials: {
                type: 'object',
                properties: {
                  creditLimit: { type: 'number' },
                  paymentTermsDays: { type: 'number' },
                  currentBalance: { type: 'number' },
                  isCreditLocked: { type: 'boolean' },
                },
              },
              status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          Rental: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              agreementNumber: { type: 'string' },
              customerId: { type: 'string' },
              status: { type: 'string', enum: ['ACTIVE', 'COMPLETED', 'CANCELLED'] },
              agreementType: { type: 'string' },
              startDate: { type: 'string', format: 'date-time' },
              expectedEndDate: { type: 'string', format: 'date-time' },
              actualEndDate: { type: 'string', format: 'date-time' },
              machines: { type: 'array', items: { type: 'object' } },
              financials: {
                type: 'object',
                properties: {
                  subtotal: { type: 'number' },
                  vatAmount: { type: 'number' },
                  total: { type: 'number' },
                  depositTotal: { type: 'number' },
                  paidAmount: { type: 'number' },
                  balance: { type: 'number' },
                  currency: { type: 'string' },
                },
              },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          Machine: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              brand: { type: 'string' },
              model: { type: 'string' },
              category: { type: 'string' },
              serialNumber: { type: 'string' },
              boxNumber: { type: 'string' },
              qrCode: {
                type: 'object',
                properties: {
                  value: { type: 'string' },
                  imageUrl: { type: 'string' },
                },
              },
              status: { type: 'string', enum: ['AVAILABLE', 'RENTED', 'MAINTENANCE', 'RETIRED'] },
              currentLocation: { type: 'object' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          Invoice: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              invoiceNumber: { type: 'string' },
              customerId: { type: 'string' },
              rentalId: { type: 'string' },
              type: { type: 'string' },
              status: { type: 'string', enum: ['ISSUED', 'CANCELLED'] },
              paymentStatus: { type: 'string', enum: ['PENDING', 'PARTIAL', 'PAID'] },
              issueDate: { type: 'string', format: 'date-time' },
              dueDate: { type: 'string', format: 'date-time' },
              lineItems: { type: 'array', items: { type: 'object' } },
              totals: {
                type: 'object',
                properties: {
                  subtotal: { type: 'number' },
                  vatAmount: { type: 'number' },
                  grandTotal: { type: 'number' },
                  currency: { type: 'string' },
                },
              },
              paidAmount: { type: 'number' },
              balance: { type: 'number' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          GatePass: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              gatePassNumber: { type: 'string' },
              rentalId: { type: 'string' },
              customerId: { type: 'string' },
              machines: { type: 'array', items: { type: 'object' } },
              driverName: { type: 'string' },
              vehicleNumber: { type: 'string' },
              departureTime: { type: 'string', format: 'date-time' },
              arrivalTime: { type: 'string', format: 'date-time' },
              status: { type: 'string', enum: ['DEPARTED', 'ARRIVED'] },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          Payment: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              receiptNumber: { type: 'string' },
              customerId: { type: 'string' },
              invoices: { type: 'array', items: { type: 'object' } },
              totalAmount: { type: 'number' },
              currency: { type: 'string' },
              paymentMethod: { type: 'string', enum: ['CASH', 'CHEQUE', 'BANK_TRANSFER', 'CARD'] },
              referenceNumber: { type: 'string' },
              paidAt: { type: 'string', format: 'date-time' },
              notes: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          LoginRequest: {
            type: 'object',
            required: ['username', 'password'],
            properties: {
              username: { type: 'string', example: 'admin' },
              password: { type: 'string', format: 'password', example: 'password123' },
            },
          },
          LoginResponse: {
            type: 'object',
            properties: {
              userId: { type: 'string' },
              username: { type: 'string' },
              role: { type: 'string' },
              accessToken: { type: 'string' },
              refreshToken: { type: 'string' },
            },
          },
        },
      },
      tags: [
        { name: 'Authentication', description: 'Authentication endpoints' },
        { name: 'Customers', description: 'Customer management endpoints' },
        { name: 'Rentals', description: 'Rental management endpoints' },
        { name: 'Machines', description: 'Machine management endpoints' },
        { name: 'Invoices', description: 'Invoice management endpoints' },
        { name: 'Payments', description: 'Payment management endpoints' },
        { name: 'Gate Passes', description: 'Gate pass management endpoints' },
        { name: 'Returns', description: 'Return management endpoints' },
        { name: 'Damage Reports', description: 'Damage report management endpoints' },
        { name: 'Users', description: 'User management endpoints' },
        { name: 'Roles', description: 'Role management endpoints' },
        { name: 'Settings', description: 'Settings management endpoints' },
        { name: 'Analytics', description: 'Analytics endpoints' },
        { name: 'Outstanding Alerts', description: 'Outstanding alerts endpoints' },
        { name: 'QR Print Logs', description: 'QR code print logging endpoints' },
      ],
    },
  });
  return spec;
};
