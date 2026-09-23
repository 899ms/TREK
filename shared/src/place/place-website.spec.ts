import { PLACE_WEBSITE_MAX_LENGTH, normalizePlaceWebsite } from './place-website';

import { describe, expect, it } from 'vitest';

describe('normalizePlaceWebsite (#2483)', () => {
  it('SHARED-WEBSITE-001: the value from the issue gains https and keeps its accented path as written', () => {
    expect(normalizePlaceWebsite('fr.wikipedia.org/wiki/Chapelle_Sainte-Barbe_du_Faouët')).toBe(
      'https://fr.wikipedia.org/wiki/Chapelle_Sainte-Barbe_du_Faouët',
    );
  });

  it('SHARED-WEBSITE-002: http and https stay exactly as they came, case included', () => {
    expect(normalizePlaceWebsite('https://louvre.fr/en/visit')).toBe('https://louvre.fr/en/visit');
    expect(normalizePlaceWebsite('http://pension-alpenblick.at')).toBe('http://pension-alpenblick.at');
    expect(normalizePlaceWebsite('HTTPS://Example.COM/Pfad?q=1#top')).toBe('HTTPS://Example.COM/Pfad?q=1#top');
    expect(normalizePlaceWebsite('https://user@example.com/')).toBe('https://user@example.com/');
  });

  it('SHARED-WEBSITE-003: surrounding whitespace is trimmed, empty and blank are nothing', () => {
    expect(normalizePlaceWebsite('  www.example.com \n')).toBe('https://www.example.com');
    expect(normalizePlaceWebsite(' https://example.com ')).toBe('https://example.com');
    expect(normalizePlaceWebsite('')).toBeNull();
    expect(normalizePlaceWebsite('   ')).toBeNull();
  });

  it('SHARED-WEBSITE-004: a host with a port is a host, not a scheme', () => {
    expect(normalizePlaceWebsite('example.com:8080/x')).toBe('https://example.com:8080/x');
    expect(normalizePlaceWebsite('www.example.com:443')).toBe('https://www.example.com:443');
  });

  it('SHARED-WEBSITE-005: a protocol-relative address gains https:', () => {
    expect(normalizePlaceWebsite('//www.example.fr/patrimoine')).toBe('https://www.example.fr/patrimoine');
    expect(normalizePlaceWebsite('//')).toBeNull();
    expect(normalizePlaceWebsite('//Chapelle')).toBeNull();
  });

  it('SHARED-WEBSITE-006: every other scheme is dropped, a script one in any spelling included', () => {
    for (const value of [
      'javascript:alert(1)',
      'JavaScript:alert(1)',
      '  javascript:alert(1)',
      'java\tscript:alert(1)',
      'javascript:80',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
      'mailto:mairie@example.fr',
      'tel:+33297230000',
      'ftp://example.com/file',
      'file:///etc/passwd',
      'http:example.com',
    ]) {
      expect(normalizePlaceWebsite(value), value).toBeNull();
    }
  });

  it('SHARED-WEBSITE-007: text that is no address is dropped rather than linked', () => {
    for (const value of [
      'Chapelle',
      'localhost',
      'localhost:3000',
      '3.5',
      'call the hotel',
      'exa mple.com',
      'mairie@example.fr',
      '-example.com',
      'example-.com',
      'example.com.',
      'https://',
      'https://localhost:3000',
      'https://exa mple.com',
    ]) {
      expect(normalizePlaceWebsite(value), value).toBeNull();
    }
  });

  it('SHARED-WEBSITE-008: an IPv4 address is a host, a number that only looks like one is not', () => {
    expect(normalizePlaceWebsite('192.168.1.10/admin')).toBe('https://192.168.1.10/admin');
    expect(normalizePlaceWebsite('http://203.0.113.7')).toBe('http://203.0.113.7');
    expect(normalizePlaceWebsite('256.1.1.1')).toBeNull();
    expect(normalizePlaceWebsite('1.2.3')).toBeNull();
  });

  it('SHARED-WEBSITE-009: an internationalised host keeps its letters', () => {
    expect(normalizePlaceWebsite('münchen.de/rathaus')).toBe('https://münchen.de/rathaus');
    expect(normalizePlaceWebsite('www.北京.cn')).toBe('https://www.北京.cn');
  });

  it('SHARED-WEBSITE-010: a query or fragment right after the host still counts as a host', () => {
    expect(normalizePlaceWebsite('example.com?lang=de')).toBe('https://example.com?lang=de');
    expect(normalizePlaceWebsite('example.com#kontakt')).toBe('https://example.com#kontakt');
  });

  it('SHARED-WEBSITE-011: a value the contract could not store is dropped rather than cut', () => {
    const path = 'a'.repeat(PLACE_WEBSITE_MAX_LENGTH);
    expect(normalizePlaceWebsite(`example.com/${path}`)).toBeNull();
    const fits = `example.com/${'a'.repeat(PLACE_WEBSITE_MAX_LENGTH - 'https://example.com/'.length)}`;
    expect(normalizePlaceWebsite(fits)).toHaveLength(PLACE_WEBSITE_MAX_LENGTH);
  });

  it('SHARED-WEBSITE-012: anything but a string is nothing', () => {
    expect(normalizePlaceWebsite(null)).toBeNull();
    expect(normalizePlaceWebsite(undefined)).toBeNull();
    expect(normalizePlaceWebsite(42)).toBeNull();
    expect(normalizePlaceWebsite({ href: 'https://example.com' })).toBeNull();
  });
});
