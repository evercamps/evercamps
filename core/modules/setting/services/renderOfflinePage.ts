export interface OfflinePageContent {
  language: string;
  storeName: string;
  title: string;
  message: string;
  logoSrc?: string | null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * The whole page visitors get while the storefront is offline: one
 * standalone HTML document, without the storefront layout, menus or
 * scripts. Everything that comes from settings is escaped.
 */
export function renderOfflinePage({
  language,
  storeName,
  title,
  message,
  logoSrc
}: OfflinePageContent): string {
  const logo = logoSrc
    ? `<img class="logo" src="${escapeHtml(logoSrc)}" alt="${escapeHtml(storeName)}">`
    : '';
  return `<!doctype html>
<html lang="${escapeHtml(language)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(storeName ? `${title} | ${storeName}` : title)}</title>
<style>
  html, body { height: 100%; margin: 0; }
  body {
    display: flex; align-items: center; justify-content: center;
    padding: 1rem; box-sizing: border-box;
    font-family: ui-sans-serif, system-ui, sans-serif;
    color: #3a3a3a; background: #fff; text-align: center;
  }
  main { max-width: 36rem; }
  .logo { max-width: 200px; max-height: 120px; object-fit: contain; margin-bottom: 2rem; }
  h1 { font-size: 1.75rem; font-weight: 600; margin: 0 0 1rem; }
  p { color: #737373; line-height: 1.5; margin: 0; white-space: pre-line; }
</style>
</head>
<body>
<main>
${logo}
<h1>${escapeHtml(title)}</h1>
<p>${escapeHtml(message)}</p>
</main>
</body>
</html>`;
}
