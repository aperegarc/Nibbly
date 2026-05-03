import { LIMITS } from '../src/shared/utils/limits';
import {
  sanitizeDiscoveryTags,
  sanitizeProfileTags,
  sanitizeUserTag,
  sanitizeUserTagList,
} from '../src/shared/utils/sanitize';

describe('sanitizeUserTag', () => {
  it('recorta espacios y elimina caracteres de control', () => {
    expect(sanitizeUserTag('  tomate  ', 40)).toBe('tomate');
    expect(sanitizeUserTag('a\u000bb', 40)).toBe('ab');
  });

  it('devuelve null si queda vacío', () => {
    expect(sanitizeUserTag('   ', 40)).toBeNull();
    expect(sanitizeUserTag('', 40)).toBeNull();
  });

  it('respeta longitud máxima', () => {
    expect(sanitizeUserTag('abcdef', 3)).toBe('abc');
  });
});

describe('sanitizeUserTagList', () => {
  it('deduplica sin distinguir mayúsculas y respeta el tope', () => {
    const out = sanitizeUserTagList(['Tomate', 'tomate', 'Queso'], 2, 20);
    expect(out).toEqual(['Tomate', 'Queso']);
  });
});

describe('helpers de límites', () => {
  it('aplica límites de descubrimiento', () => {
    const tags = Array.from({ length: 20 }, (_, index) => `x${index}`);
    const out = sanitizeDiscoveryTags(tags);
    expect(out.length).toBe(LIMITS.discoveryTagMaxCount);
  });

  it('aplica límites de perfil', () => {
    const tags = ['uno', 'dos'];
    const out = sanitizeProfileTags(tags);
    expect(out).toEqual(['uno', 'dos']);
  });
});
