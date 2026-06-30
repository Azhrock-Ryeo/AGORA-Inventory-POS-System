// src/utils/__mocks__/resend.ts
export class Resend {
  constructor(_apiKey: string) {}
  emails = {
    send: jest.fn().mockResolvedValue({ id: 'mock-email-id' }),
  }
}