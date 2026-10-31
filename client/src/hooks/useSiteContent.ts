import { useContext } from 'react';
import { SiteContentContext } from '../context/site-content-context';
export function useSiteContent() {
  const { values, refresh } = useContext(SiteContentContext);
  const text = (key: string, fallback: string) => values[key] ?? fallback;
  return { text, refresh };
}
