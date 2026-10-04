import { Icon } from './Icons';
import { Thumb } from './Thumb';
import { TypeBadge } from './Chips';
import { useMyLocation } from '../lib/location';
import { timeAgo } from '../lib/format';
import { postTitle } from '../lib/types';
import type { FeedPost } from '../lib/posts';

/** Ixcham qator: kichik rasm, tur, sarlavha, manzil · masofa, vaqt, layklar soni. */
export function PostRow({ post, onOpen }: { post: FeedPost; onOpen: (id: string) => void }) {
  const { distanceTo } = useMyLocation();
  const dist = distanceTo(post.latitude, post.longitude);
  const city = post.address?.split(',').pop()?.trim();
  return (
    <button className="row-card" onClick={() => onOpen(post.id)}>
      <Thumb url={post.image_url} className="row-img" alt={postTitle(post)} />
      <div className="row-body">
        <div className="row-top"><TypeBadge type={post.animal_type} /><span className="likes"><Icon name="heart" size={15} fill /> {post.likes[0]?.count ?? 0}</span></div>
        <b className="row-title">{postTitle(post)}</b>
        <div className="muted small ellip"><Icon name="pin" size={13} /> {[city, dist].filter(Boolean).join(', ') || 'Manzil aniqlanmagan'}</div>
        <div className="muted small"><Icon name="clock" size={13} /> {timeAgo(post.created_at)}</div>
      </div>
    </button>
  );
}
