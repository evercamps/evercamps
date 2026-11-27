import { describe, expect, it } from '@jest/globals';
import { renderOfflinePage } from '../../services/renderOfflinePage.js';

const base = {
  language: 'nl',
  storeName: 'Kampen',
  title: 'We zijn bijna klaar',
  message: 'Kom snel terug!'
};

describe('renderOfflinePage', () => {
  it('is one standalone page with the heading and message', () => {
    const html = renderOfflinePage(base);
    expect(html).toContain('<html lang="nl">');
    expect(html).toContain('<h1>We zijn bijna klaar</h1>');
    expect(html).toContain('<p>Kom snel terug!</p>');
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html).not.toContain('<script');
  });

  it('escapes text that comes from the settings', () => {
    const html = renderOfflinePage({
      ...base,
      title: '<script>alert(1)</script>',
      message: 'Tom & Jerry "quoted"'
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('Tom &amp; Jerry &quot;quoted&quot;');
  });

  it('shows the logo only when there is one', () => {
    expect(renderOfflinePage(base)).not.toContain('<img');
    const html = renderOfflinePage({ ...base, logoSrc: '/logo.png' });
    expect(html).toContain('<img class="logo" src="/logo.png" alt="Kampen">');
  });
});
