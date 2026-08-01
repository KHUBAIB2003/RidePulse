import { ZodSchema, ZodError } from 'zod';
import { BadRequestError } from '../errors/httpExceptions.js';

export const validateSchema = <T>(schema: ZodSchema<T>, data: unknown): T => {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      const issueMsgs = error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
      throw new BadRequestError(`Validation error: ${issueMsgs}`);
    }
    throw error;
  }
};
