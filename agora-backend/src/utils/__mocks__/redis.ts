export const redis = {
  on: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  keys: jest.fn().mockResolvedValue([]),
  status: 'ready',
}

export const getCache = jest.fn().mockResolvedValue(null)
export const setCache = jest.fn().mockResolvedValue(undefined)
export const invalidateCache = jest.fn().mockResolvedValue(undefined)
export const invalidateCachePattern = jest.fn().mockResolvedValue(undefined)