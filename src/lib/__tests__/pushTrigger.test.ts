import {
  PUSH_TRIGGER_HEADER,
  extractTriggerToken,
  isValidPushTrigger,
  timingSafeEqual,
} from '@/lib/pushTrigger';

function headers(map: Record<string, string>) {
  const lower = new Map(Object.entries(map).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    get(name: string) {
      return lower.get(name.toLowerCase()) ?? null;
    },
  };
}

describe('pushTrigger', () => {
  describe('extractTriggerToken', () => {
    it('reads the trigger header', () => {
      expect(extractTriggerToken(headers({ 'X-Push-Trigger-Token': 'secret' }))).toBe('secret');
    });

    it('is case insensitive on the header name', () => {
      expect(extractTriggerToken(headers({ 'x-push-trigger-token': 'secret' }))).toBe('secret');
    });

    it('trims surrounding whitespace', () => {
      expect(extractTriggerToken(headers({ [PUSH_TRIGGER_HEADER]: '  secret\n' }))).toBe('secret');
    });

    it('returns null when the header is missing', () => {
      expect(extractTriggerToken(headers({}))).toBeNull();
    });

    it('returns null when the header is empty or whitespace only', () => {
      expect(extractTriggerToken(headers({ [PUSH_TRIGGER_HEADER]: '   ' }))).toBeNull();
    });

    it('returns null when there are no headers at all', () => {
      expect(extractTriggerToken(undefined)).toBeNull();
      expect(extractTriggerToken(null)).toBeNull();
    });

    it('reads a plain header record (Node IncomingHttpHeaders)', () => {
      expect(extractTriggerToken({ 'x-push-trigger-token': 'secret' })).toBe('secret');
      expect(extractTriggerToken({ 'X-Push-Trigger-Token': 'secret' })).toBe('secret');
      expect(extractTriggerToken({ 'x-push-trigger-token': ['secret'] })).toBe('secret');
      expect(extractTriggerToken({ 'x-other': 'value' })).toBeNull();
    });
  });

  describe('timingSafeEqual', () => {
    it('matches identical strings', () => {
      expect(timingSafeEqual('correct horse', 'correct horse')).toBe(true);
    });

    it('ignores surrounding whitespace', () => {
      expect(timingSafeEqual(' secret ', 'secret')).toBe(true);
    });

    it('rejects different strings', () => {
      expect(timingSafeEqual('secret', 'secrets')).toBe(false);
      expect(timingSafeEqual('secret', 'sekret')).toBe(false);
    });

    it('rejects empty strings', () => {
      expect(timingSafeEqual('', '')).toBe(false);
      expect(timingSafeEqual('secret', '')).toBe(false);
    });
  });

  describe('isValidPushTrigger', () => {
    it('accepts the correct token', () => {
      expect(isValidPushTrigger(headers({ [PUSH_TRIGGER_HEADER]: 'abc123' }), 'abc123')).toBe(true);
    });

    it('rejects a wrong token', () => {
      expect(isValidPushTrigger(headers({ [PUSH_TRIGGER_HEADER]: 'abc124' }), 'abc123')).toBe(false);
    });

    it('rejects a missing header', () => {
      expect(isValidPushTrigger(headers({}), 'abc123')).toBe(false);
    });

    it('fails closed when no token is configured', () => {
      expect(isValidPushTrigger(headers({ [PUSH_TRIGGER_HEADER]: 'abc123' }), undefined)).toBe(false);
      expect(isValidPushTrigger(headers({ [PUSH_TRIGGER_HEADER]: 'abc123' }), '')).toBe(false);
    });
  });
});
