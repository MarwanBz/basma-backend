import swaggerJsdoc from 'swagger-jsdoc';
import { version } from '../../package.json';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Basma Maintenance System API - نظام بصمة للصيانة',
      version,
      description: `Comprehensive API documentation for Basma Maintenance Management System.

**ملاحظة هامة - Important Note:**
جميع رسائل الاستجابة (النجاح والخطأ) باللغة العربية.
All response messages (success and error) are returned in Arabic.

**Response Format - تنسيق الاستجابة:**
\`\`\`json
{
  "success": true,
  "message": "تمت العملية بنجاح",
  "data": { ... },
  "requestId": "uuid"
}
\`\`\`

**Error Response - استجابة الخطأ:**
\`\`\`json
{
  "success": false,
  "message": "حدث خطأ داخلي في الخادم",
  "code": "ERR_6001",
  "requestId": "uuid"
}
\`\`\``,
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: '/api',
        description: 'API server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Access token is missing or invalid - رمز الوصول مفقود أو غير صالح',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  message: { type: 'string', example: 'غير مصرح' },
                  code: { type: 'string', example: 'ERR_1001' }
                }
              }
            }
          }
        },
        BadRequestError: {
          description: 'Invalid request data - بيانات الطلب غير صالحة',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  message: { type: 'string', example: 'بيانات الطلب غير صالحة' },
                  code: { type: 'string', example: 'ERR_3001' }
                }
              }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found - المورد غير موجود',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  message: { type: 'string', example: 'المورد غير موجود' },
                  code: { type: 'string', example: 'ERR_4001' }
                }
              }
            }
          }
        },
        InternalServerError: {
          description: 'Internal server error - حدث خطأ داخلي في الخادم',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  message: { type: 'string', example: 'حدث خطأ داخلي في الخادم' },
                  code: { type: 'string', example: 'ERR_6001' }
                }
              }
            }
          }
        },
        SuccessResponse: {
          description: 'Successful operation - تمت العملية بنجاح',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'تمت العملية بنجاح' },
                  data: { type: 'object' },
                  requestId: { type: 'string' }
                }
              }
            }
          }
        }
      }
    },
    security: [{
      bearerAuth: [],
    }],
  },
  apis: [
    './src/routes/*.ts',
    './src/docs/schemas/*.yml',
    './src/docs/schemas/*.yaml'
  ],
};

export const specs = swaggerJsdoc(options); 