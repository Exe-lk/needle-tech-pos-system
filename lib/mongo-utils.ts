import { ObjectId } from 'mongodb';

export function isValidObjectId(id: string): boolean {
  return ObjectId.isValid(id);
}

export function toObjectId(id: string): ObjectId {
  if (!isValidObjectId(id)) {
    throw new Error('Invalid ObjectId');
  }
  return new ObjectId(id);
}

export function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }

  if (obj instanceof ObjectId) {
    return obj.toString();
  }

  if (obj instanceof Date) {
    return obj.toISOString();
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}
