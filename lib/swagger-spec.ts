/**
 * Comprehensive OpenAPI 3.0 specification for Needle Tech POS System API
 * This file contains all API endpoint definitions
 */

export const swaggerPaths = {
  '/api/v1/auth/login': {
    post: {
      summary: 'User login',
      description: 'Authenticate user with username and password, returns access and refresh tokens',
      tags: ['Authentication'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/LoginRequest',
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Login successful',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/ApiResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/LoginResponse' },
                    },
                  },
                ],
              },
            },
          },
        },
        '400': { description: 'Validation error' },
        '401': { description: 'Invalid credentials' },
      },
    },
  },
  '/api/v1/customers': {
    get: {
      summary: 'Get all customers',
      description: 'Retrieve a paginated list of customers with optional filtering and search',
      tags: ['Customers'],
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' },
        { $ref: '#/components/parameters/SearchParam' },
        {
          name: 'type',
          in: 'query',
          schema: { type: 'string', enum: ['INDIVIDUAL', 'COMPANY'] },
        },
        {
          name: 'status',
          in: 'query',
          schema: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
        },
        { $ref: '#/components/parameters/SortByParam' },
        { $ref: '#/components/parameters/SortOrderParam' },
      ],
      responses: {
        '200': {
          description: 'Customers retrieved successfully',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/ApiResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/PaginatedResponse' },
                    },
                  },
                ],
              },
            },
          },
        },
      },
    },
    post: {
      summary: 'Create a new customer',
      description: 'Create a new customer with required information',
      tags: ['Customers'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['code', 'type', 'name'],
              properties: {
                code: { type: 'string', description: 'Unique customer code' },
                type: { type: 'string', enum: ['INDIVIDUAL', 'COMPANY'] },
                name: { type: 'string' },
                contactPerson: { type: 'string' },
                phones: { type: 'array', items: { type: 'string' } },
                emails: { type: 'array', items: { type: 'string' } },
                billingAddress: { type: 'object' },
                shippingAddress: { type: 'object' },
                taxProfile: { type: 'object' },
              },
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'Customer created successfully',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/ApiResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/Customer' },
                    },
                  },
                ],
              },
            },
          },
        },
        '400': { description: 'Validation error' },
      },
    },
  },
  '/api/v1/customers/{id}': {
    get: {
      summary: 'Get customer by ID',
      description: 'Retrieve a single customer by their ID',
      tags: ['Customers'],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      responses: {
        '200': {
          description: 'Customer retrieved successfully',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/ApiResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/Customer' },
                    },
                  },
                ],
              },
            },
          },
        },
        '404': { description: 'Customer not found' },
      },
    },
    put: {
      summary: 'Update customer',
      description: 'Update customer information',
      tags: ['Customers'],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                type: { type: 'string', enum: ['INDIVIDUAL', 'COMPANY'] },
                contactPerson: { type: 'string' },
                phones: { type: 'array', items: { type: 'string' } },
                emails: { type: 'array', items: { type: 'string' } },
                billingAddress: { type: 'object' },
                shippingAddress: { type: 'object' },
                taxProfile: { type: 'object' },
                status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Customer updated successfully',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/ApiResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/Customer' },
                    },
                  },
                ],
              },
            },
          },
        },
        '404': { description: 'Customer not found' },
      },
    },
    delete: {
      summary: 'Delete customer',
      description: 'Soft delete a customer (sets status to INACTIVE)',
      tags: ['Customers'],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      responses: {
        '200': { description: 'Customer deleted successfully' },
        '404': { description: 'Customer not found' },
      },
    },
  },
  '/api/v1/customers/{id}/rental-history': {
    get: {
      summary: 'Get customer rental history',
      description: 'Retrieve rental history for a specific customer',
      tags: ['Customers'],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      responses: {
        '200': {
          description: 'Rental history retrieved successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiResponse' },
            },
          },
        },
      },
    },
  },
  '/api/v1/rentals': {
    get: {
      summary: 'Get all rentals',
      description: 'Retrieve a paginated list of rentals',
      tags: ['Rentals'],
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' },
        { $ref: '#/components/parameters/SearchParam' },
        {
          name: 'status',
          in: 'query',
          schema: { type: 'string', enum: ['ACTIVE', 'COMPLETED', 'CANCELLED'] },
        },
        {
          name: 'customerId',
          in: 'query',
          schema: { type: 'string' },
        },
        { $ref: '#/components/parameters/SortByParam' },
        { $ref: '#/components/parameters/SortOrderParam' },
      ],
      responses: {
        '200': {
          description: 'Rentals retrieved successfully',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/ApiResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/PaginatedResponse' },
                    },
                  },
                ],
              },
            },
          },
        },
      },
    },
    post: {
      summary: 'Create a new rental',
      description: 'Create a new rental agreement',
      tags: ['Rentals'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['customerId', 'agreementType', 'startDate', 'machines'],
              properties: {
                customerId: { type: 'string' },
                agreementType: { type: 'string' },
                startDate: { type: 'string', format: 'date-time' },
                expectedEndDate: { type: 'string', format: 'date-time' },
                machines: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      machineId: { type: 'string' },
                      rate: { type: 'number' },
                      rateType: { type: 'string' },
                      depositAmount: { type: 'number' },
                      quantity: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'Rental created successfully',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/ApiResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/Rental' },
                    },
                  },
                ],
              },
            },
          },
        },
        '400': { description: 'Validation error' },
      },
    },
  },
  '/api/v1/rentals/{id}': {
    get: {
      summary: 'Get rental by ID',
      tags: ['Rentals'],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      responses: {
        '200': {
          description: 'Rental retrieved successfully',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/ApiResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/Rental' },
                    },
                  },
                ],
              },
            },
          },
        },
        '404': { description: 'Rental not found' },
      },
    },
    put: {
      summary: 'Update rental',
      tags: ['Rentals'],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['ACTIVE', 'COMPLETED', 'CANCELLED'] },
                expectedEndDate: { type: 'string', format: 'date-time' },
                actualEndDate: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Rental updated successfully' },
        '404': { description: 'Rental not found' },
      },
    },
  },
  '/api/v1/machines': {
    get: {
      summary: 'Get all machines',
      tags: ['Machines'],
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' },
        { $ref: '#/components/parameters/SearchParam' },
        { name: 'brand', in: 'query', schema: { type: 'string' } },
        {
          name: 'status',
          in: 'query',
          schema: { type: 'string', enum: ['AVAILABLE', 'RENTED', 'MAINTENANCE', 'RETIRED'] },
        },
        { name: 'category', in: 'query', schema: { type: 'string' } },
        { $ref: '#/components/parameters/SortByParam' },
        { $ref: '#/components/parameters/SortOrderParam' },
      ],
      responses: {
        '200': {
          description: 'Machines retrieved successfully',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/ApiResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/PaginatedResponse' },
                    },
                  },
                ],
              },
            },
          },
        },
      },
    },
    post: {
      summary: 'Create a new machine',
      tags: ['Machines'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['brand', 'serialNumber'],
              properties: {
                brand: { type: 'string' },
                model: { type: 'string' },
                category: { type: 'string' },
                serialNumber: { type: 'string' },
                boxNumber: { type: 'string' },
                photos: { type: 'array', items: { type: 'string' } },
                specs: { type: 'object' },
                currentLocation: { type: 'object' },
              },
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'Machine created successfully',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/ApiResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/Machine' },
                    },
                  },
                ],
              },
            },
          },
        },
        '400': { description: 'Validation error' },
      },
    },
  },
  '/api/v1/machines/{id}': {
    get: {
      summary: 'Get machine by ID',
      tags: ['Machines'],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      responses: {
        '200': {
          description: 'Machine retrieved successfully',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/ApiResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/Machine' },
                    },
                  },
                ],
              },
            },
          },
        },
        '404': { description: 'Machine not found' },
      },
    },
  },
  '/api/v1/machines/qr/{qrCode}': {
    get: {
      summary: 'Get machine by QR code',
      tags: ['Machines'],
      parameters: [
        {
          name: 'qrCode',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'QR code value',
        },
      ],
      responses: {
        '200': {
          description: 'Machine retrieved successfully',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/ApiResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/Machine' },
                    },
                  },
                ],
              },
            },
          },
        },
        '404': { description: 'Machine not found' },
      },
    },
  },
  
  '/api/v1/upload/qr-code': {
    post: {
      summary: 'Upload QR code image to Supabase Storage',
      description: 'Upload a base64 encoded QR code image for a machine and update the machine record. Use either machineId or serialNumber to identify the machine.',
      tags: ['Upload', 'Machines'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['qrCodeValue', 'imageData'],
              properties: {
                machineId: {
                  type: 'string',
                  description: 'MongoDB ObjectId of the machine (use either machineId or serialNumber)',
                  example: '507f1f77bcf86cd799439011',
                },
                serialNumber: {
                  type: 'string',
                  description: 'Serial number of the machine (use either machineId or serialNumber)',
                  example: 'SN12345',
                },
                qrCodeValue: {
                  type: 'string',
                  description: 'QR code value (used for filename)',
                  example: 'MCH-JUKI-SN12345',
                },
                imageData: {
                  type: 'string',
                  description: 'Base64 encoded image data (with or without data URL prefix)',
                  example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
                },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'QR code image uploaded successfully',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/ApiResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'object',
                        properties: {
                          imageUrl: { type: 'string' },
                          machineId: { type: 'string' },
                          qrCodeValue: { type: 'string' },
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        '400': { description: 'Validation error' },
        '404': { description: 'Machine not found' },
        '500': { description: 'Server error' },
      },
    },
  },
  
  '/api/v1/upload/machine-photos': {
    post: {
      summary: 'Upload machine photos to Supabase Storage',
      description: 'Upload one or more photos for a machine. Use either machineId or serialNumber to identify the machine.',
      tags: ['Upload', 'Machines'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['photos'],
              properties: {
                machineId: {
                  type: 'string',
                  description: 'MongoDB ObjectId of the machine (use either machineId or serialNumber)',
                },
                serialNumber: {
                  type: 'string',
                  description: 'Serial number of the machine (use either machineId or serialNumber)',
                  example: 'SN12345',
                },
                photos: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['imageData'],
                    properties: {
                      imageData: { type: 'string', description: 'Base64 encoded image data' },
                      contentType: { type: 'string', default: 'image/jpeg' },
                    },
                  },
                },
                append: { type: 'boolean', default: true },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Photos uploaded successfully' },
        '400': { description: 'Validation error' },
        '404': { description: 'Machine not found' },
      },
    },
  },
  
  '/api/v1/upload/damage-report-photos': {
    post: {
      summary: 'Upload damage report photos to Supabase Storage',
      tags: ['Upload', 'Damage Reports'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['damageReportId', 'photos'],
              properties: {
                damageReportId: { type: 'string' },
                photos: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['imageData'],
                    properties: {
                      imageData: { type: 'string' },
                      contentType: { type: 'string', default: 'image/jpeg' },
                    },
                  },
                },
                append: { type: 'boolean', default: true },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Photos uploaded successfully' },
        '400': { description: 'Validation error' },
        '404': { description: 'Damage report not found' },
      },
    },
  },
  
  '/api/v1/upload/return-photos': {
    post: {
      summary: 'Upload return inspection photos to Supabase Storage',
      tags: ['Upload', 'Returns'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['returnId', 'photos'],
              properties: {
                returnId: { type: 'string' },
                photos: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['imageData'],
                    properties: {
                      imageData: { type: 'string' },
                      contentType: { type: 'string', default: 'image/jpeg' },
                    },
                  },
                },
                append: { type: 'boolean', default: true },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Photos uploaded successfully' },
        '400': { description: 'Validation error' },
        '404': { description: 'Return record not found' },
      },
    },
  },
  
  '/api/v1/invoices': {
    get: {
      summary: 'Get all invoices',
      tags: ['Invoices'],
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' },
        { $ref: '#/components/parameters/SearchParam' },
        {
          name: 'status',
          in: 'query',
          schema: { type: 'string', enum: ['ISSUED', 'CANCELLED'] },
        },
        {
          name: 'paymentStatus',
          in: 'query',
          schema: { type: 'string', enum: ['PENDING', 'PARTIAL', 'PAID'] },
        },
        { name: 'customerId', in: 'query', schema: { type: 'string' } },
        { name: 'rentalId', in: 'query', schema: { type: 'string' } },
        { $ref: '#/components/parameters/SortByParam' },
        { $ref: '#/components/parameters/SortOrderParam' },
      ],
      responses: {
        '200': {
          description: 'Invoices retrieved successfully',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/ApiResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/PaginatedResponse' },
                    },
                  },
                ],
              },
            },
          },
        },
      },
    },
    post: {
      summary: 'Create a new invoice',
      tags: ['Invoices'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['customerId', 'type', 'lineItems'],
              properties: {
                customerId: { type: 'string' },
                rentalId: { type: 'string' },
                type: { type: 'string' },
                lineItems: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      description: { type: 'string' },
                      quantity: { type: 'number' },
                      unitPrice: { type: 'number' },
                      machineId: { type: 'string' },
                      vatRate: { type: 'number' },
                    },
                  },
                },
                issueDate: { type: 'string', format: 'date-time' },
                dueDate: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'Invoice created successfully',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/ApiResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/Invoice' },
                    },
                  },
                ],
              },
            },
          },
        },
        '400': { description: 'Validation error' },
      },
    },
  },
  '/api/v1/invoices/{id}': {
    get: {
      summary: 'Get invoice by ID',
      tags: ['Invoices'],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      responses: {
        '200': {
          description: 'Invoice retrieved successfully',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/ApiResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/Invoice' },
                    },
                  },
                ],
              },
            },
          },
        },
        '404': { description: 'Invoice not found' },
      },
    },
  },
  '/api/v1/payments': {
    get: {
      summary: 'Get all payments',
      tags: ['Payments'],
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' },
        { $ref: '#/components/parameters/SearchParam' },
        { name: 'customerId', in: 'query', schema: { type: 'string' } },
        { $ref: '#/components/parameters/SortByParam' },
        { $ref: '#/components/parameters/SortOrderParam' },
      ],
      responses: {
        '200': {
          description: 'Payments retrieved successfully',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/ApiResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/PaginatedResponse' },
                    },
                  },
                ],
              },
            },
          },
        },
      },
    },
    post: {
      summary: 'Create a new payment',
      tags: ['Payments'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['customerId', 'invoices', 'totalAmount'],
              properties: {
                customerId: { type: 'string' },
                invoices: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      invoiceId: { type: 'string' },
                      amount: { type: 'number' },
                    },
                  },
                },
                totalAmount: { type: 'number' },
                currency: { type: 'string' },
                paymentMethod: {
                  type: 'string',
                  enum: ['CASH', 'CHEQUE', 'BANK_TRANSFER', 'CARD'],
                },
                referenceNumber: { type: 'string' },
                paidAt: { type: 'string', format: 'date-time' },
                notes: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'Payment created successfully',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/ApiResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/Payment' },
                    },
                  },
                ],
              },
            },
          },
        },
        '400': { description: 'Validation error' },
      },
    },
  },
  '/api/v1/payments/{id}': {
    get: {
      summary: 'Get payment by ID',
      tags: ['Payments'],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      responses: {
        '200': {
          description: 'Payment retrieved successfully',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/ApiResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/Payment' },
                    },
                  },
                ],
              },
            },
          },
        },
        '404': { description: 'Payment not found' },
      },
    },
  },
  '/api/v1/gate-passes': {
    get: {
      summary: 'Get all gate passes',
      tags: ['Gate Passes'],
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' },
        { $ref: '#/components/parameters/SearchParam' },
        {
          name: 'status',
          in: 'query',
          schema: { type: 'string', enum: ['DEPARTED', 'ARRIVED'] },
        },
        { name: 'rentalId', in: 'query', schema: { type: 'string' } },
        { name: 'customerId', in: 'query', schema: { type: 'string' } },
        { $ref: '#/components/parameters/SortByParam' },
        { $ref: '#/components/parameters/SortOrderParam' },
      ],
      responses: {
        '200': {
          description: 'Gate passes retrieved successfully',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/ApiResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/PaginatedResponse' },
                    },
                  },
                ],
              },
            },
          },
        },
      },
    },
    post: {
      summary: 'Create a new gate pass',
      description: 'Create a gate pass for machine departure (requires payment)',
      tags: ['Gate Passes'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['rentalId', 'driverName', 'vehicleNumber', 'machines'],
              properties: {
                rentalId: { type: 'string' },
                driverName: { type: 'string' },
                vehicleNumber: { type: 'string' },
                machines: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      machineId: { type: 'string' },
                    },
                  },
                },
                departureTime: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'Gate pass created successfully',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/ApiResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/GatePass' },
                    },
                  },
                ],
              },
            },
          },
        },
        '400': { description: 'Validation error or payment required' },
      },
    },
  },
  '/api/v1/gate-passes/{id}': {
    get: {
      summary: 'Get gate pass by ID',
      tags: ['Gate Passes'],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      responses: {
        '200': {
          description: 'Gate pass retrieved successfully',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/ApiResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/GatePass' },
                    },
                  },
                ],
              },
            },
          },
        },
        '404': { description: 'Gate pass not found' },
      },
    },
    put: {
      summary: 'Update gate pass',
      tags: ['Gate Passes'],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['DEPARTED', 'ARRIVED'] },
                arrivalTime: { type: 'string', format: 'date-time' },
                printedAt: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Gate pass updated successfully' },
        '404': { description: 'Gate pass not found' },
      },
    },
  },
  '/api/v1/returns': {
    get: {
      summary: 'Get all returns',
      tags: ['Returns'],
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' },
        { $ref: '#/components/parameters/SearchParam' },
        { name: 'rentalId', in: 'query', schema: { type: 'string' } },
        { name: 'machineId', in: 'query', schema: { type: 'string' } },
        {
          name: 'triageCategory',
          in: 'query',
          schema: { type: 'string' },
        },
        { $ref: '#/components/parameters/SortByParam' },
        { $ref: '#/components/parameters/SortOrderParam' },
      ],
      responses: {
        '200': {
          description: 'Returns retrieved successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiResponse' },
            },
          },
        },
      },
    },
    post: {
      summary: 'Create a new return',
      tags: ['Returns'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['rentalId', 'machineId', 'returnDate', 'triageCategory'],
              properties: {
                rentalId: { type: 'string' },
                machineId: { type: 'string' },
                returnDate: { type: 'string', format: 'date-time' },
                condition: { type: 'string' },
                triageCategory: { type: 'string' },
                notes: { type: 'string' },
                photos: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
      responses: {
        '201': { description: 'Return created successfully' },
        '400': { description: 'Validation error' },
      },
    },
  },
  '/api/v1/returns/{id}': {
    get: {
      summary: 'Get return by ID',
      tags: ['Returns'],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      responses: {
        '200': { description: 'Return retrieved successfully' },
        '404': { description: 'Return not found' },
      },
    },
  },
  '/api/v1/damage-reports': {
    get: {
      summary: 'Get all damage reports',
      tags: ['Damage Reports'],
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' },
        { $ref: '#/components/parameters/SearchParam' },
        { name: 'machineId', in: 'query', schema: { type: 'string' } },
        { name: 'rentalId', in: 'query', schema: { type: 'string' } },
        { name: 'resolved', in: 'query', schema: { type: 'boolean' } },
        { name: 'severity', in: 'query', schema: { type: 'string' } },
        { $ref: '#/components/parameters/SortByParam' },
        { $ref: '#/components/parameters/SortOrderParam' },
      ],
      responses: {
        '200': {
          description: 'Damage reports retrieved successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiResponse' },
            },
          },
        },
      },
    },
    post: {
      summary: 'Create a new damage report',
      tags: ['Damage Reports'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['machineId', 'severity', 'category', 'description'],
              properties: {
                machineId: { type: 'string' },
                rentalId: { type: 'string' },
                returnId: { type: 'string' },
                severity: { type: 'string' },
                category: { type: 'string' },
                description: { type: 'string' },
                photos: { type: 'array', items: { type: 'string' } },
                estimatedRepairCost: { type: 'number' },
                approvedChargeToCustomer: { type: 'number' },
              },
            },
          },
        },
      },
      responses: {
        '201': { description: 'Damage report created successfully' },
        '400': { description: 'Validation error' },
      },
    },
  },
  '/api/v1/damage-reports/{id}': {
    get: {
      summary: 'Get damage report by ID',
      tags: ['Damage Reports'],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      responses: {
        '200': { description: 'Damage report retrieved successfully' },
        '404': { description: 'Damage report not found' },
      },
    },
  },
  '/api/v1/users': {
    get: {
      summary: 'Get all users',
      tags: ['Users'],
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' },
        { $ref: '#/components/parameters/SearchParam' },
        { name: 'role', in: 'query', schema: { type: 'string' } },
        { name: 'isActive', in: 'query', schema: { type: 'boolean' } },
        { $ref: '#/components/parameters/SortByParam' },
        { $ref: '#/components/parameters/SortOrderParam' },
      ],
      responses: {
        '200': {
          description: 'Users retrieved successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiResponse' },
            },
          },
        },
      },
    },
    post: {
      summary: 'Create a new user',
      tags: ['Users'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['firstName', 'lastName', 'username', 'password', 'role'],
              properties: {
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                email: { type: 'string' },
                phone: { type: 'string' },
                username: { type: 'string' },
                password: { type: 'string', format: 'password' },
                role: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        '201': { description: 'User created successfully' },
        '400': { description: 'Validation error' },
      },
    },
  },
  '/api/v1/users/{id}': {
    get: {
      summary: 'Get user by ID',
      tags: ['Users'],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      responses: {
        '200': { description: 'User retrieved successfully' },
        '404': { description: 'User not found' },
      },
    },
  },
  '/api/v1/roles': {
    get: {
      summary: 'Get all roles',
      tags: ['Roles'],
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' },
        { $ref: '#/components/parameters/SearchParam' },
        { $ref: '#/components/parameters/SortByParam' },
        { $ref: '#/components/parameters/SortOrderParam' },
      ],
      responses: {
        '200': { description: 'Roles retrieved successfully' },
      },
    },
    post: {
      summary: 'Create a new role',
      tags: ['Roles'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name'],
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                permissions: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
      responses: {
        '201': { description: 'Role created successfully' },
        '400': { description: 'Validation error' },
      },
    },
  },
  '/api/v1/roles/{id}': {
    get: {
      summary: 'Get role by ID',
      tags: ['Roles'],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      responses: {
        '200': { description: 'Role retrieved successfully' },
        '404': { description: 'Role not found' },
      },
    },
  },
  '/api/v1/settings': {
    get: {
      summary: 'Get system settings',
      tags: ['Settings'],
      responses: {
        '200': {
          description: 'Settings retrieved successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiResponse' },
            },
          },
        },
      },
    },
    put: {
      summary: 'Update system settings',
      tags: ['Settings'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                company: { type: 'object' },
                tax: { type: 'object' },
                creditPolicy: { type: 'object' },
                alertSchedule: { type: 'object' },
                invoiceSettings: { type: 'object' },
                rentalSettings: { type: 'object' },
                gatePassSettings: { type: 'object' },
                returnSettings: { type: 'object' },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Settings updated successfully' },
      },
    },
  },
  '/api/v1/outstanding-alerts': {
    get: {
      summary: 'Get outstanding alerts',
      description: 'Retrieve alerts for customers with outstanding balances',
      tags: ['Outstanding Alerts'],
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' },
      ],
      responses: {
        '200': {
          description: 'Outstanding alerts retrieved successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiResponse' },
            },
          },
        },
      },
    },
  },
  '/api/v1/analytics/month-end': {
    get: {
      summary: 'Get month-end analytics',
      description: 'Retrieve month-end analytics and reports',
      tags: ['Analytics'],
      parameters: [
        {
          name: 'month',
          in: 'query',
          schema: { type: 'integer', minimum: 1, maximum: 12 },
        },
        {
          name: 'year',
          in: 'query',
          schema: { type: 'integer' },
        },
      ],
      responses: {
        '200': {
          description: 'Analytics retrieved successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiResponse' },
            },
          },
        },
      },
    },
  },
  '/api/v1/qr-print-logs': {
    post: {
      summary: 'Log QR code print',
      description: 'Record a QR code print event for a machine with timestamp and print count',
      tags: ['QR Print Logs'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['machineId', 'printCount'],
              properties: {
                machineId: {
                  type: 'string',
                  format: 'uuid',
                  description: 'ID of the machine',
                },
                printCount: {
                  type: 'integer',
                  minimum: 1,
                  default: 1,
                  description: 'Number of copies printed',
                },
                notes: {
                  type: 'string',
                  description: 'Optional notes about the print',
                },
              },
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'QR print log created successfully',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/ApiResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          machineId: { type: 'string', format: 'uuid' },
                          serialNumber: { type: 'string' },
                          boxNumber: { type: 'string' },
                          qrCodeValue: { type: 'string' },
                          printCount: { type: 'integer' },
                          printedAt: { type: 'string', format: 'date-time' },
                          notes: { type: 'string', nullable: true },
                          machine: { type: 'object' },
                          printedBy: { type: 'object' },
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        '400': { description: 'Validation error' },
        '404': { description: 'Machine not found' },
      },
    },
    get: {
      summary: 'Get QR print logs',
      description: 'Retrieve paginated list of QR print logs with filtering and search',
      tags: ['QR Print Logs'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' },
        { $ref: '#/components/parameters/SearchParam' },
        {
          name: 'machineId',
          in: 'query',
          schema: { type: 'string', format: 'uuid' },
          description: 'Filter by machine ID',
        },
        {
          name: 'serialNumber',
          in: 'query',
          schema: { type: 'string' },
          description: 'Filter by serial number',
        },
        {
          name: 'printedByUserId',
          in: 'query',
          schema: { type: 'string', format: 'uuid' },
          description: 'Filter by user who printed',
        },
        {
          name: 'startDate',
          in: 'query',
          schema: { type: 'string', format: 'date-time' },
          description: 'Filter by start date',
        },
        {
          name: 'endDate',
          in: 'query',
          schema: { type: 'string', format: 'date-time' },
          description: 'Filter by end date',
        },
        { $ref: '#/components/parameters/SortByParam' },
        { $ref: '#/components/parameters/SortOrderParam' },
      ],
      responses: {
        '200': {
          description: 'QR print logs retrieved successfully',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/ApiResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'object',
                        properties: {
                          items: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                id: { type: 'string', format: 'uuid' },
                                machineId: { type: 'string', format: 'uuid' },
                                serialNumber: { type: 'string' },
                                boxNumber: { type: 'string', nullable: true },
                                qrCodeValue: { type: 'string' },
                                printCount: { type: 'integer' },
                                printedAt: { type: 'string', format: 'date-time' },
                                notes: { type: 'string', nullable: true },
                                createdAt: { type: 'string', format: 'date-time' },
                                machine: { type: 'object' },
                                printedBy: { type: 'object' },
                              },
                            },
                          },
                          pagination: { $ref: '#/components/schemas/PaginationMeta' },
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },
    },
  },
};

export const swaggerComponents = {
  parameters: {
    PageParam: {
      name: 'page',
      in: 'query',
      schema: { type: 'integer', default: 1, minimum: 1 },
      description: 'Page number',
    },
    LimitParam: {
      name: 'limit',
      in: 'query',
      schema: { type: 'integer', default: 10, minimum: 1, maximum: 100 },
      description: 'Items per page',
    },
    SearchParam: {
      name: 'search',
      in: 'query',
      schema: { type: 'string' },
      description: 'Search query',
    },
    SortByParam: {
      name: 'sortBy',
      in: 'query',
      schema: { type: 'string', default: 'createdAt' },
      description: 'Field to sort by',
    },
    SortOrderParam: {
      name: 'sortOrder',
      in: 'query',
      schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
      description: 'Sort order',
    },
    IdParam: {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string' },
      description: 'Resource ID',
    },
  },
};
