import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ProHire API Documentation',
      version: '1.0.0',
      description: 'Production-ready Job Board API with authentication, job management, applications, and admin features',
      contact: {
        name: 'ProHire Support',
        email: 'support@prohire.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Development server',
      },
      {
        url: 'https://api.prohire.com',
        description: 'Production server',
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
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'cmlr0ailb0005kz8kobwq8e4e' },
            email: { type: 'string', example: 'user@example.com' },
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            role: { type: 'string', enum: ['CANDIDATE', 'EMPLOYER', 'ADMIN'] },
            isVerified: { type: 'boolean' },
            isSuspended: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Job: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            location: { type: 'string' },
            type: { type: 'string', enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'REMOTE'] },
            experience: { type: 'string', enum: ['ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'LEAD'] },
            salaryMin: { type: 'number' },
            salaryMax: { type: 'number' },
            status: { type: 'string', enum: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CLOSED'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Application: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            coverLetter: { type: 'string' },
            resumeUrl: { type: 'string' },
            status: { type: 'string', enum: ['PENDING', 'REVIEWED', 'ACCEPTED', 'REJECTED'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            stack: { type: 'string' },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'], // Path to the API docs
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Express) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, { explorer: true }));
  console.log('📚 Swagger documentation available at http://localhost:5000/api-docs');
};