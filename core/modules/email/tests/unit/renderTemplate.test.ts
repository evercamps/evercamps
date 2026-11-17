import { describe, expect, it } from '@jest/globals';
import { htmlToText, renderEmail, replacePlaceholders } from '../../services/renderTemplate.js';
import { pickTemplateLanguage } from '../../services/templateContent.js';
import { coreEmailTemplates } from '../../templates/index.js';

const layoutData = { storeName: 'Camp & Co', storeEmail: 'info@example.com', language: 'nl' };

describe('replacePlaceholders', () => {
  it('escapes {{ }} values and keeps {{{ }}} values raw', () => {
    const out = replacePlaceholders('<p>{{ name }}</p>{{{ table }}}', {
      name: '<b>Emma</b> & co',
      table: '<table></table>'
    });
    expect(out).toBe('<p>&lt;b&gt;Emma&lt;/b&gt; &amp; co</p><table></table>');
  });

  it('reads nested paths', () => {
    expect(replacePlaceholders('#{{ order.number }}', { order: { number: '10001' } })).toBe('#10001');
  });

  it('replaces unknown placeholders with empty text and reports them', () => {
    const missing: string[] = [];
    expect(replacePlaceholders('a{{ nope }}b{{{ raw }}}c', {}, true, missing)).toBe('abc');
    expect(missing).toEqual(['raw', 'nope']);
  });
});

describe('renderEmail', () => {
  it('wraps the body in the layout and builds a text part', () => {
    const result = renderEmail(
      { subject: 'Order {{ n }}', body: '<p>Hi {{ name }}</p><p><a href="https://x.test/a">your account</a></p>' },
      { n: '1', name: 'An' },
      layoutData
    );
    expect(result.subject).toBe('Order 1');
    expect(result.html).toContain('<!DOCTYPE html>');
    expect(result.html).toContain('Camp &amp; Co');
    expect(result.html).toContain('<p>Hi An</p>');
    expect(result.text).toBe('Hi An\nyour account (https://x.test/a)');
    expect(result.missing).toEqual([]);
  });
});

describe('htmlToText', () => {
  it('decodes entities and drops tags', () => {
    expect(htmlToText('<p>A &amp; B</p><br><span>C</span>')).toBe('A & B\n\nC');
  });
});

describe('code templates', () => {
  it('falls back to en for an unknown language', () => {
    expect(pickTemplateLanguage(coreEmailTemplates[0], 'de')?.language).toBe('en');
    expect(pickTemplateLanguage(coreEmailTemplates[0], 'nl-BE')?.language).toBe('nl');
  });

  for (const template of coreEmailTemplates) {
    for (const language of ['nl', 'fr', 'en']) {
      it(`${template.code} renders in ${language} without missing placeholders`, () => {
        const content = pickTemplateLanguage(template, language);
        expect(content?.language).toBe(language);
        const result = renderEmail(
          content!,
          { store: { name: 'Camp & Co', email: 'info@example.com' }, ...(template.sampleData || {}) },
          { ...layoutData, language }
        );
        expect(result.missing).toEqual([]);
        expect(result.subject.length).toBeGreaterThan(0);
      });
    }
  }
});
