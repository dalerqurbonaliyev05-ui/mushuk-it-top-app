-- 0002: e'longa sarlavha (title) va bildirishnomalar (layk/izoh uchun, trigger orqali).
-- schema.sql'dan KEYIN ishga tushiring (qayta ishga tushirish xavfsiz).

alter table public.posts add column if not exists title text check (char_length(title) <= 80);
grant insert (title) on public.posts to authenticated;

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (user_id) on delete cascade,   -- qabul qiluvchi (post egasi)
  actor_id   uuid not null references public.profiles (user_id) on delete cascade,   -- layk/izoh qoldirgan
  type       text not null check (type in ('like', 'comment')),
  post_id    uuid not null references public.posts (id) on delete cascade,
  body       text check (char_length(body) <= 120),
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_actor_idx on public.notifications (actor_id);
create index if not exists notifications_post_idx on public.notifications (post_id);
-- bir foydalanuvchi bir postga layk bosib-qaytarib bildirishnomani ko'paytira olmaydi
create unique index if not exists notifications_like_once on public.notifications (post_id, actor_id) where type = 'like';

alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read) on public.notifications to authenticated;
grant delete on public.notifications to authenticated;

drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select to authenticated using (user_id = auth.uid());
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications for delete to authenticated using (user_id = auth.uid());

create or replace function public.notify_on_like() returns trigger
language plpgsql security definer set search_path = '' as $$
declare owner uuid;
begin
  select user_id into owner from public.posts where id = new.post_id;
  if owner is not null and owner <> new.user_id then
    insert into public.notifications (user_id, actor_id, type, post_id) values (owner, new.user_id, 'like', new.post_id)
    on conflict (post_id, actor_id) where type = 'like' do nothing;
  end if;
  return new;
end $$;

create or replace function public.notify_on_comment() returns trigger
language plpgsql security definer set search_path = '' as $$
declare owner uuid;
begin
  select user_id into owner from public.posts where id = new.post_id;
  if owner is not null and owner <> new.user_id then
    insert into public.notifications (user_id, actor_id, type, post_id, body) values (owner, new.user_id, 'comment', new.post_id, left(new.text, 120));
  end if;
  return new;
end $$;

revoke execute on function public.notify_on_like(), public.notify_on_comment() from public, anon, authenticated;

drop trigger if exists likes_notify on public.likes;
create trigger likes_notify after insert on public.likes for each row execute function public.notify_on_like();
drop trigger if exists comments_notify on public.comments;
create trigger comments_notify after insert on public.comments for each row execute function public.notify_on_comment();
