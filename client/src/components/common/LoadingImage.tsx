import { useSiteContent } from '../../hooks/useSiteContent';
import { useCallback, useState, type ImgHTMLAttributes } from 'react';
import '../../styles/LoadingImage.css';
type LoadingImageProps = ImgHTMLAttributes<HTMLImageElement> & { defer?: boolean; contentKey?: string };
function ImageFrame({ className = '', alt = '', defer = false, onLoad, onError, loading = 'lazy', decoding = 'async', style, ...props }: LoadingImageProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const attach = useCallback((node: HTMLImageElement | null) => {
    if (node?.complete && node.currentSrc) setStatus(node.naturalWidth > 0 ? 'loaded' : 'error');
  }, []);
  return <span className={`image-loader ${className}`} style={style} data-image-state={status} aria-busy={status === 'loading'} aria-hidden={props['aria-hidden']}>
    {!defer && <img {...props} ref={attach} alt={alt} className="image-loader__image" loading={loading} decoding={decoding} onLoad={event => { setStatus('loaded'); onLoad?.(event); }} onError={event => { setStatus('error'); onError?.(event); }} />}
    {status !== 'loaded' && <span className={`image-loader__placeholder${status === 'error' ? ' image-loader__placeholder--error' : ''}`} aria-hidden="true"><span className="image-loader__symbol">{status === 'error' ? '◇' : ''}</span><span className="image-loader__label">{status === 'error' ? 'Image unavailable' : 'Loading image'}</span></span>}
  </span>;
}
/** A changed source gets fresh loading state; cached images settle via the callback ref. */
export default function LoadingImage({ contentKey, ...props }: LoadingImageProps) {
  const { text } = useSiteContent();
  const src = contentKey ? text(contentKey, props.src || '') : props.src;
  const alt = contentKey ? text(contentKey + '-alt', props.alt || '') : props.alt;
  return <ImageFrame key={`${src || ''}|${props.srcSet || ''}`} {...props} src={src} alt={alt} />;
}
