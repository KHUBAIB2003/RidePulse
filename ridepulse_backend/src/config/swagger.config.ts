import { Express, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';

const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'RidePulse v2.0 REST API Specification',
    version: '2.0.0',
    description: 'Enterprise Digital Garage, Telemetry & Identity API Engine for RidePulse Motorcycle Platform.',
    contact: {
      name: 'RidePulse Engineering Team',
      email: 'support@ridepulse.local'
    }
  },
  servers: [
    {
      url: '/api/v1',
      description: 'Production API v1 Engine'
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
        summary: 'System Health Check Telemetry',
        responses: { 200: { description: 'Server operational' } }
      }
    },
    '/auth/register': {
      post: {
        summary: 'User Registration',
        responses: { 201: { description: 'Account registered' } }
      }
    },
    '/auth/login': {
      post: {
        summary: 'User Login & Authentication',
        responses: { 200: { description: 'Authenticated successfully' } }
      }
    },
    '/bikes': {
      get: {
        summary: 'Get Rider Motorcycles',
        responses: { 200: { description: 'Bikes list retrieved' } }
      },
      post: {
        summary: 'Add Motorcycle to Digital Garage',
        responses: { 201: { description: 'Bike created' } }
      }
    },
    '/bikes/statistics': {
      get: {
        summary: 'Get Garage Statistics',
        responses: { 200: { description: 'Garage stats' } }
      }
    },
    '/bikes/{id}': {
      get: {
        summary: 'Get Motorcycle Details',
        responses: { 200: { description: 'Bike details' } }
      },
      put: {
        summary: 'Update Motorcycle Details',
        responses: { 200: { description: 'Bike updated' } }
      },
      delete: {
        summary: 'Remove Motorcycle',
        responses: { 200: { description: 'Bike soft-deleted' } }
      }
    },
    '/bikes/{id}/default': {
      patch: {
        summary: 'Set Motorcycle as Default',
        responses: { 200: { description: 'Default bike set' } }
      }
    },
    '/bikes/{id}/archive': {
      patch: {
        summary: 'Archive/Restore Motorcycle',
        responses: { 200: { description: 'Archive status toggled' } }
      }
    },
    '/bikes/{id}/maintenance': {
      post: {
        summary: 'Log Maintenance Service',
        responses: { 201: { description: 'Maintenance logged' } }
      },
      get: {
        summary: 'Get Maintenance History',
        responses: { 200: { description: 'Maintenance history' } }
      }
    },
    '/bikes/{id}/expenses': {
      post: {
        summary: 'Log Vehicle Expense',
        responses: { 201: { description: 'Expense logged' } }
      },
      get: {
        summary: 'Get Vehicle Expenses',
        responses: { 200: { description: 'Expenses list' } }
      }
    },
    '/bikes/{id}/fuel': {
      post: {
        summary: 'Log Fuel Fill & Calculate Economy',
        responses: { 201: { description: 'Fuel log saved & Kmpl calculated' } }
      },
      get: {
        summary: 'Get Fuel Log History',
        responses: { 200: { description: 'Fuel logs list' } }
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
