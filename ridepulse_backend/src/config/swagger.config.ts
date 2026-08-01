import { Express, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';

const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'RidePulse v2.0 REST API Specification',
    version: '2.0.0',
    description: 'Enterprise API Documentation for RidePulse Motorcycle Telemetry, Digital Garage, Hazard Reporting, Guardian & SOS Engine.',
    contact: {
      name: 'RidePulse Architecture Team',
      email: 'support@ridepulse.local'
    }
  },
  servers: [
    {
      url: '/api/v1',
      description: 'Production API v1 Router'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide JWT Access Token'
      }
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ],
  paths: {
    '/health': {
      get: {
        summary: 'Server System Health Check',
        description: 'Returns current database ping latency, operational environment, and health status.',
        responses: {
          200: {
            description: 'Server is healthy'
          }
        }
      }
    },
    '/auth/register': {
      post: {
        summary: 'Register New Rider Account',
        responses: {
          201: { description: 'Account registered successfully' }
        }
      }
    },
    '/auth/login': {
      post: {
        summary: 'Authenticate Rider Credentials',
        responses: {
          200: { description: 'Authenticated successfully with JWT' }
        }
      }
    }
  }
};

export const setupSwaggerDocs = (app: Express): void => {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api/docs.json', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
};
