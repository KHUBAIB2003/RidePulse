import { Express, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';

const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'RidePulse v2.0 REST API Specification',
    version: '2.0.0',
    description: 'Enterprise Identity & Telemetry API Engine for RidePulse Motorcycle Companion Platform.',
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
        description: 'Registers a new rider account with default preferences and verification token.',
        responses: { 201: { description: 'Account registered' } }
      }
    },
    '/auth/login': {
      post: {
        summary: 'User Login & Authentication',
        description: 'Authenticates rider credentials with failed login protection (locks after 5 failures).',
        responses: { 200: { description: 'Authenticated successfully' } }
      }
    },
    '/auth/refresh': {
      post: {
        summary: 'Rotate Refresh & Access Tokens',
        description: 'Exchanges refresh token for new access token with automatic reuse detection.',
        responses: { 200: { description: 'Tokens rotated' } }
      }
    },
    '/auth/logout': {
      post: {
        summary: 'User Logout',
        responses: { 200: { description: 'Logged out successfully' } }
      }
    },
    '/auth/change-password': {
      post: {
        summary: 'Change Current Password',
        responses: { 200: { description: 'Password changed successfully' } }
      }
    },
    '/auth/forgot-password': {
      post: {
        summary: 'Forgot Password Request',
        responses: { 200: { description: 'Reset link dispatched' } }
      }
    },
    '/auth/reset-password': {
      post: {
        summary: 'Reset Password',
        responses: { 200: { description: 'Password reset' } }
      }
    },
    '/auth/verify-email': {
      post: {
        summary: 'Verify Email Address',
        responses: { 200: { description: 'Email verified' } }
      }
    },
    '/profile': {
      get: {
        summary: 'Get Authenticated User Profile',
        responses: { 200: { description: 'Profile payload' } }
      },
      put: {
        summary: 'Update User Profile',
        responses: { 200: { description: 'Profile updated' } }
      },
      delete: {
        summary: 'Soft-Delete Account',
        responses: { 200: { description: 'Account soft-deleted' } }
      }
    },
    '/profile/preferences': {
      put: {
        summary: 'Update Preferences & Settings',
        responses: { 200: { description: 'Preferences updated' } }
      }
    },
    '/profile/sessions': {
      get: {
        summary: 'Get Active User Sessions',
        responses: { 200: { description: 'Active sessions list' } }
      },
      delete: {
        summary: 'Terminate Other Sessions',
        responses: { 200: { description: 'Sessions terminated' } }
      }
    },
    '/profile/activity': {
      get: {
        summary: 'Get Activity Audit History Logs',
        responses: { 200: { description: 'Audit history list' } }
      }
    },
    '/profile/emergency-contacts': {
      post: {
        summary: 'Add Emergency Contact',
        responses: { 201: { description: 'Contact added' } }
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
