/** Public storefront origin for printed QR codes; independent of the API origin. */
export function publicSiteOrigin(configured: string | undefined, currentOrigin: string): string | null {
  const value = configured?.trim() || currentOrigin;
  try {
    const url = new URL(value);
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/') return null;
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) return null;
    return url.origin;
  } catch { return null; }
}
