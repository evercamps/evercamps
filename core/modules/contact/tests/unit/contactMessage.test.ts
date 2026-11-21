import { describe, expect, it } from '@jest/globals';
import { renderEmail } from '../../../email/services/renderTemplate.js';
import { pickTemplateLanguage } from '../../../email/services/templateContent.js';
import { hashIp } from '../../services/contactSettings.js';
import contactMessage from '../../templates/contactMessage.js';

const layoutData = { storeName: 'Surf & Co', storeEmail: 'info@example.com', language: 'nl' };

describe('contact_message email template', () => {
  it.each(['nl', 'fr', 'en'])('renders every placeholder in %s', (language) => {
    const content = pickTemplateLanguage(contactMessage, language)!;
    const result = renderEmail(
      content,
      { store: { name: 'Surf & Co' }, ...contactMessage.sampleData },
      { ...layoutData, language }
    );
    expect(result.missing).toEqual([]);
    expect(result.html).toContain('an@example.com');
  });

  it('escapes what the visitor typed', () => {
    const content = pickTemplateLanguage(contactMessage, 'en')!;
    const result = renderEmail(
      content,
      {
        store: { name: 'Surf & Co' },
        contact: {
          name: '<script>x</script>',
          email: 'a@example.com',
          phone: '-',
          message: 'Hi <b>there</b>'
        }
      },
      layoutData
    );
    expect(result.html).not.toContain('<script>');
    expect(result.html).toContain('Hi &lt;b&gt;there&lt;/b&gt;');
  });
});

describe('hashIp', () => {
  it('is stable and never contains the raw IP', () => {
    const hash = hashIp('203.0.113.7');
    expect(hash).toBe(hashIp('203.0.113.7'));
    expect(hash).not.toContain('203.0.113.7');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('gives different IPs different hashes', () => {
    expect(hashIp('203.0.113.7')).not.toBe(hashIp('203.0.113.8'));
  });
});
