import { Request, Response } from 'express';
import { Document } from 'mongoose';
import { BaseService } from './base.service.js';
import { ApiResponse } from '../utils/apiResponse.util.js';
import { parsePagination } from '../utils/pagination.util.js';

export abstract class BaseController<T extends Document> {
  protected constructor(protected readonly service: BaseService<T>) {}

  async create(req: Request, res: Response): Promise<Response> {
    const result = await this.service.create(req.body);
    return ApiResponse.success(res, result, 'Resource created successfully', 201);
  }

  async getById(req: Request, res: Response): Promise<Response> {
    const result = await this.service.getById(req.params.id);
    return ApiResponse.success(res, result, 'Resource fetched successfully');
  }

  async getPaginated(req: Request, res: Response): Promise<Response> {
    const { page, limit } = parsePagination(req.query);
    const result = await this.service.getPaginated({}, page, limit);
    return ApiResponse.success(res, result.items, 'Resources fetched successfully', 200, {
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage
      }
    });
  }

  async update(req: Request, res: Response): Promise<Response> {
    const result = await this.service.update(req.params.id, req.body);
    return ApiResponse.success(res, result, 'Resource updated successfully');
  }

  async delete(req: Request, res: Response): Promise<Response> {
    const result = await this.service.delete(req.params.id);
    return ApiResponse.success(res, result, 'Resource deleted successfully');
  }
}
