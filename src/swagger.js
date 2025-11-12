const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Website Analytics API',
      version: '1.0.0',
      description:
        'API for ingesting analytics events and retrieving aggregated analytics. Includes API-key management (register, revoke, regenerate) and analytics endpoints (ingest, summaries, user-stats).',
      contact: {
        name: 'Analytics Platform',
      },
    },
    servers: [
      { url: process.env.SWAGGER_BASE_URL || 'http://localhost:4000', description: 'Local server' },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
          description: 'API key required for ingesting events'
        }
      },
      schemas: {
        RegisterRequest: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'My Website' },
            ownerEmail: { type: 'string', example: 'owner@example.com' },
            googleIdToken: { type: 'string', example: 'eyJhbGciOi...' },
            expiresInDays: { type: 'integer', example: 365 }
          },
          required: ['name']
        },
        RegisterResponse: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            apiKey: { type: 'string' },
            name: { type: 'string' },
            expiresAt: { type: 'string', format: 'date-time' }
          }
        },
        EventPayload: {
          type: 'object',
          properties: {
            event: { type: 'string', example: 'login_form_cta_click' },
            url: { type: 'string', example: 'https://example.com/page' },
            referrer: { type: 'string', example: 'https://google.com' },
            device: { type: 'string', example: 'mobile' },
            ipAddress: { type: 'string', example: '1.2.3.4' },
            timestamp: { type: 'string', format: 'date-time', example: '2024-02-20T12:34:56Z' },
            userId: { type: 'string', example: 'user789' },
            metadata: {
              type: 'object',
              example: { browser: 'Chrome', os: 'Android', screenSize: '1080x1920' }
            }
          },
          required: ['event']
        },
        EventSummaryQuery: {
          type: 'object',
          properties: {
            event: { type: 'string', example: 'login_form_cta_click' },
            startDate: { type: 'string', format: 'date', example: '2024-02-15' },
            endDate: { type: 'string', format: 'date', example: '2024-02-20' },
            app_id: { type: 'string', example: '64b8f...' }
          }
        },
        EventSummaryResponse: {
          type: 'object',
          properties: {
            event: { type: 'string' },
            count: { type: 'integer' },
            uniqueUsers: { type: 'integer' },
            deviceData: { type: 'object', additionalProperties: { type: 'integer' } }
          }
        },
        UserStatsResponse: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
            totalEvents: { type: 'integer' },
            recentEvents: {
              type: 'array',
              items: { type: 'object' }
            },
            deviceDetails: { type: 'object' },
            ipAddress: { type: 'string' }
          }
        }
      }
    },
    security: []
  },
  apis: []
};

const swaggerSpec = swaggerJSDoc(options);

swaggerSpec.paths = swaggerSpec.paths || {};

swaggerSpec.paths['/api/auth/register'] = {
  post: {
    tags: ['Auth'],
    summary: 'Register a new app and generate API key',
    requestBody: {
      required: true,
      content: {
        'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } }
      }
    },
    responses: {
      201: { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterResponse' } } } },
      400: { description: 'Bad Request' }
    }
  }
};

swaggerSpec.paths['/api/auth/api-key'] = {
  get: {
    tags: ['Auth'],
    summary: 'Retrieve API key by appId or ownerEmail',
    parameters: [
      { name: 'appId', in: 'query', schema: { type: 'string' } },
      { name: 'ownerEmail', in: 'query', schema: { type: 'string' } }
    ],
    responses: {
      200: { description: 'OK' },
      400: { description: 'Bad Request' },
      404: { description: 'Not Found' }
    }
  }
};

swaggerSpec.paths['/api/auth/revoke'] = {
  post: {
    tags: ['Auth'],
    summary: 'Revoke an API key',
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { type: 'object', properties: { apiKey: { type: 'string' } }, required: ['apiKey'] } } }
    },
    responses: { 200: { description: 'OK' }, 404: { description: 'Not Found' } }
  }
};

swaggerSpec.paths['/api/auth/regenerate'] = {
  post: {
    tags: ['Auth'],
    summary: 'Regenerate an API key',
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { type: 'object', properties: { apiKey: { type: 'string' } }, required: ['apiKey'] } } }
    },
    responses: { 200: { description: 'OK' }, 404: { description: 'Not Found' } }
  }
};

swaggerSpec.paths['/api/analytics/collect'] = {
  post: {
    tags: ['Analytics'],
    summary: 'Collect an analytics event (ingest)',
    security: [{ ApiKeyAuth: [] }],
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { $ref: '#/components/schemas/EventPayload' } } }
    },
    responses: {
      201: { description: 'Event recorded' },
      400: { description: 'Bad Request' },
      401: { description: 'Missing API Key' },
      403: { description: 'Invalid API Key' }
    }
  }
};

swaggerSpec.paths['/api/analytics/event-summary'] = {
  get: {
    tags: ['Analytics'],
    summary: 'Get summary for a specific event type (aggregated)',
    parameters: [
      { name: 'event', in: 'query', schema: { type: 'string' } },
      { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
      { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
      { name: 'app_id', in: 'query', schema: { type: 'string' } }
    ],
    responses: {
      200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/EventSummaryResponse' } } } }
    }
  }
};

swaggerSpec.paths['/api/analytics/user-stats'] = {
  get: {
    tags: ['Analytics'],
    summary: 'Get stats for a user (recent events and device/ip info)',
    parameters: [
      { name: 'userId', in: 'query', required: true, schema: { type: 'string' } }
    ],
    responses: {
      200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/UserStatsResponse' } } } },
      400: { description: 'Bad Request' }
    }
  }
};

module.exports = swaggerSpec;
