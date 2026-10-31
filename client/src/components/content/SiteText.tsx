import { useSiteContent } from '../../hooks/useSiteContent';
import { contentKey as hashContent } from '../../context/site-content-context';
export default function SiteText({ contentKey, namespace, fallback }: { contentKey?: string; namespace?: string; fallback: string }) {
  const { text } = useSiteContent();
  return <>{text(contentKey || `${namespace}-${hashContent(fallback)}`, fallback)}</>;
}
