import { Document } from 'mongoose';
import { BaseRepository } from './base.repository.js';
import { NotFoundError } from '../errors/httpExceptions.js';
import { PaginatedResult } from '../utils/pagination.util.js';

export abstract class BaseService<T extends Document> {
  protected constructor(protected readonly repository: BaseRepository<T>) {}

  async create(data: Partial<T>): Promise<T> {
    return this.repository.create(data);
  }

  async getById(id: string): Promise<T> {
    const item = await this.repository.findById(id);
    if (!item) {
      throw new NotFoundError(`Resource with ID ${id} not found`);
    }
    return item;
  }

  async getAll(filter: Record<string, any> = {}, limit: number = 100): Promise<T[]> {
    return this.repository.findMany(filter, { createdAt: -1 }, limit);
  }

  async getPaginated(filter: Record<string, any> = {}, page: number = 1, limit: number = 20): Promise<PaginatedResult<T>> {
    return this.repository.paginate(filter, page, limit);
  }

  async update(id: string, update: Record<string, any>): Promise<T> {
    const updated = await this.repository.updateById(id, update);
    if (!updated) {
      throw new NotFoundError(`Resource with ID ${id} not found for update`);
    }
    return updated;
  }

  async delete(id: string): Promise<T> {
    const deleted = await this.repository.deleteById(id);
    if (!deleted) {
      throw new NotFoundError(`Resource with ID ${id} not found for deletion`);
    }
    return deleted;
  }
}
