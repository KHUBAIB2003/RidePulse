import { Express, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';

const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'RidePulse v2.0 REST API Specification',
    version: '2.0.0',
    description: 'Enterprise Telemetry, Ride Tracking, SOS, Digital Garage & Identity API Engine for RidePulse Platform.',
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
    '/rides/start': {
      post: {
        summary: 'Start Ride Recording Session',
        responses: { 201: { description: 'Ride session started' } }
      }
    },
    '/rides/pause': {
      post: {
        summary: 'Pause Ride Recording Session',
        responses: { 200: { description: 'Ride session paused' } }
      }
    },
    '/rides/resume': {
      post: {
        summary: 'Resume Ride Recording Session',
        responses: { 200: { description: 'Ride session resumed' } }
      }
    },
    '/rides/stop': {
      post: {
        summary: 'Stop & Finalize Ride Session',
        responses: { 200: { description: 'Ride session completed' } }
      }
    },
    '/rides/location': {
      post: {
        summary: 'Append Single GPS Location Waypoint',
        responses: { 200: { description: 'Location appended' } }
      }
    },
    '/rides/telemetry': {
      post: {
        summary: 'Batch Append GPS Telemetry Points',
        responses: { 200: { description: 'Telemetry points processed' } }
      }
    },
    '/rides': {
      get: {
        summary: 'Search & Filter Recorded Rides',
        responses: { 200: { description: 'Rides list retrieved' } }
      }
    },
    '/rides/statistics/summary': {
      get: {
        summary: 'Get Rider Aggregate Statistics',
        responses: { 200: { description: 'Aggregate stats' } }
      }
    },
    '/rides/{id}': {
      get: {
        summary: 'Get Ride Details & Waypoints',
        responses: { 200: { description: 'Ride details' } }
      },
      delete: {
        summary: 'Soft-Delete Ride',
        responses: { 200: { description: 'Ride deleted' } }
      }
    },
    '/rides/{id}/replay': {
      get: {
        summary: 'Get Ride Telemetry Replay Keyframes',
        responses: { 200: { description: 'Replay dataset' } }
      }
    },
    '/rides/{id}/export/gpx': {
      get: {
        summary: 'Export Track to Open Standard GPX XML',
        responses: { 200: { description: 'GPX XML file' } }
      }
    },
    '/rides/{id}/export/geojson': {
      get: {
        summary: 'Export Track to Standard GeoJSON',
        responses: { 200: { description: 'GeoJSON file' } }
      }
    },
    '/rides/{id}/export/csv': {
      get: {
        summary: 'Export Track to CSV Telemetry Data',
        responses: { 200: { description: 'CSV file' } }
      }
    }
  }
};

export const setupSwaggerDocs = (app: Express): void => {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api/docs.json', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
};
