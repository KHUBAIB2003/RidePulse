export const parseSort = (sortParam?: string, defaultSort: Record<string, 1 | -1> = { createdAt: -1 }): Record<string, 1 | -1> => {
  if (!sortParam) return defaultSort;
  const result: Record<string, 1 | -1> = {};
  const fields = sortParam.split(',');
  for (const field of fields) {
    if (field.startsWith('-')) {
      result[field.substring(1)] = -1;
    } else {
      result[field] = 1;
    }
  }
  return result;
};

export const parseSearch = (searchParam?: string, fields: string[] = []): Record<string, any> => {
  if (!searchParam || fields.length === 0) return {};
  const regex = new RegExp(searchParam.trim(), 'i');
  return {
    $or: fields.map(field => ({ [field]: regex }))
  };
};

export const parseFilter = (query: Record<string, any>, allowedFields: string[]): Record<string, any> => {
  const filter: Record<string, any> = {};
  for (const field of allowedFields) {
    if (query[field] !== undefined) {
      filter[field] = query[field];
    }
  }
  return filter;
};
