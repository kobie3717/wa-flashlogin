import { describe, it, expect } from 'vitest';
import { generateToken, signToken, verifyToken, isValidBase32 } from '../src/token.js';

describe('token', () => {
  describe('generateToken', () => {
    it('should generate token with correct length', () => {
      const token = generateToken(8);
      expect(token).toHaveLength(8);
    });

    it('should generate token with custom length', () => {
      const token = generateToken(12);
      expect(token).toHaveLength(12);
    });

    it('should use base32 alphabet', () => {
      const token = generateToken(8);
      expect(isValidBase32(token)).toBe(true);
    });

    it('should generate different tokens', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateToken(8));
      }
      expect(tokens.size).toBeGreaterThan(95);
    });

    it('should have no collisions in 10k runs', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 10000; i++) {
        tokens.add(generateToken(8));
      }
      expect(tokens.size).toBe(10000);
    });
  });

  describe('isValidBase32', () => {
    it('should validate correct base32 tokens', () => {
      expect(isValidBase32('ABCDEFGH')).toBe(true);
      expect(isValidBase32('A2B3C4D5')).toBe(true);
      expect(isValidBase32('ZYXWVU72')).toBe(true);
    });

    it('should reject invalid tokens', () => {
      expect(isValidBase32('abcdefgh')).toBe(false);
      expect(isValidBase32('ABC-DEF')).toBe(false);
      expect(isValidBase32('ABC DEF')).toBe(false);
      expect(isValidBase32('ABC01')).toBe(false);
      expect(isValidBase32('ABC8')).toBe(false);
      expect(isValidBase32('ABC9')).toBe(false);
    });
  });

  describe('signToken and verifyToken', () => {
    const secret = 'test-secret-key';

    it('should sign and verify token', () => {
      const token = 'ABCD1234';
      const signature = signToken(token, secret);
      expect(verifyToken(token, signature, secret)).toBe(true);
    });

    it('should reject invalid signature', () => {
      const token = 'ABCD1234';
      const signature = signToken(token, secret);
      expect(verifyToken(token, 'invalid-signature', secret)).toBe(false);
    });

    it('should reject wrong secret', () => {
      const token = 'ABCD1234';
      const signature = signToken(token, secret);
      expect(verifyToken(token, signature, 'wrong-secret')).toBe(false);
    });

    it('should reject modified token', () => {
      const token = 'ABCD1234';
      const signature = signToken(token, secret);
      expect(verifyToken('DCBA4321', signature, secret)).toBe(false);
    });
  });
});
