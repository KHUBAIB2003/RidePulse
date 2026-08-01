import { Model, Document, FilterQuery, UpdateQuery, QueryOptions } from 'mongoose';
import { formatPaginatedData, PaginatedResult } from '../utils/pagination.util.js';

export abstract class BaseRepository<T extends Document> {
  protected constructor(protected readonly model: Model<T>) {}

  async create(data: Partial<T>): Promise<T> {
    const doc = new this.model(data);
    return (await doc.save()) as T;
  }

  async findById(id: string): Promise<T | null> {
    return this.model.findById(id).exec();
  }

  async findOne(filter: FilterQuery<T>): Promise<T | null> {
    return this.model.findOne(filter).exec();
  }

  async findMany(
    filter: FilterQuery<T> = {},
    sort: Record<string, 1 | -1> = { createdAt: -1 },
    limit: number = 100
  ): Promise<T[]> {
    return this.model.find(filter).sort(sort as any).limit(limit).exec();
  }

  async updateById(id: string, update: UpdateQuery<T>, options: QueryOptions = { new: true }): Promise<T | null> {
    return this.model.findByIdAndUpdate(id, update, options).exec();
  }

  async deleteById(id: string): Promise<T | null> {
    return this.model.findByIdAndDelete(id).exec();
  }

  async count(filter: FilterQuery<T> = {}): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }

  async exists(filter: FilterQuery<T>): Promise<boolean> {
    const count = await this.model.countDocuments(filter).limit(1).exec();
    return count > 0;
  }

  async paginate(
    filter: FilterQuery<T> = {},
    page: number = 1,
    limit: number = 20,
    sort: Record<string, 1 | -1> = { createdAt: -1 }
  ): Promise<PaginatedResult<T>> {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.model.find(filter).sort(sort as any).skip(skip).limit(limit).exec(),
      this.model.countDocuments(filter).exec()
    ]);

    return formatPaginatedData(items, total, page, limit);
  }
}
