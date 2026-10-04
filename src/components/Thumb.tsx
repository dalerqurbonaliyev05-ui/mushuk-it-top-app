import { useState } from 'react';
import { thumbUrl } from '../lib/posts';

/** Kichik rasm; mavjud bo'lmasa (eski postlar) to'liq rasmga qaytadi. */
export function Thumb({ url, className, alt = '' }: { url: string; className?: string; alt?: string }) {
  const [full, setFull] = useState(false);
  return <img className={className} src={full ? url : thumbUrl(url)} alt={alt} loading="lazy" onError={() => setFull(true)} />;
}
