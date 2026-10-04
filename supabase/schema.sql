-- "Mushuk va It Top": Supabase sxemasi (jadvallar, RLS, Storage, admin funksiyalari).
--
-- DIQQAT: bu sxema ALOHIDA Supabase loyihasi uchun. `profiles` jadvali nomi mavjud
-- "res loyihasi" (Amaliyot portali) dagi `profiles` bilan to'qnashadi, u yerga qo'llamang.
-- Supabase Dashboard > SQL Editor'da bir marta ishga tushiring (qayta ishga tushirish xavfsiz).
-- Bu fayl ilova repozitoriysidagi (mushuk-it-top-app/supabase/schema.sql) bilan bir xil.

-- =====================================================================
-- Jadvallar
-- =====================================================================

-- Adminlar: mijoz (anon/authenticated) bu jadvalga umuman yoza ham, o'qiy ham olmaydi.
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  full_name  text not null default '' check (char_length(full_name) <= 120),
  google_id  text unique,
  avatar_url text,
  phone      text check (char_length(phone) <= 32),
  city       text check (char_length(city) <= 80),
  bio        text check (char_length(bio) <= 300),
  onboarded  boolean not null default false,   -- profil to'ldirilganmi
  blocked    boolean not null default false,   -- admin bloklagan
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (user_id) on delete cascade,
  animal_type    text not null check (animal_type in ('cat', 'dog')),
  image_url      text not null,
  latitude       double precision not null check (latitude between -90 and 90),
  longitude      double precision not null check (longitude between -180 and 180),
  address        text check (char_length(address) <= 300),
  caption        text check (char_length(caption) <= 500),
  status         text not null default 'active' check (status in ('active', 'blocked')),
  blocked_reason text check (char_length(blocked_reason) <= 300),
  created_at     timestamptz not null default now(),
  -- rasm faqat egasining o'z papkasidagi Storage fayli bo'lishi shart (tashqi havolalar yo'q)
  constraint posts_image_in_bucket check (image_url like '%/storage/v1/object/public/animal-photos/' || user_id::text || '/%')
);
create index if not exists posts_created_idx on public.posts (created_at desc);
create index if not exists posts_user_idx on public.posts (user_id);

create table if not exists public.likes (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    uuid not null references public.profiles (user_id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);
create index if not exists likes_post_idx on public.likes (post_id);
create index if not exists likes_user_idx on public.likes (user_id);

create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    uuid not null references public.profiles (user_id) on delete cascade,
  text       text not null check (char_length(btrim(text)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists comments_post_idx on public.comments (post_id, created_at);
create index if not exists comments_user_idx on public.comments (user_id);

-- =====================================================================
-- Yordamchi funksiyalar (RLS ichida ishlatiladi)
-- =====================================================================
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = auth.uid())
$$;

create or replace function public.is_blocked() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select blocked from public.profiles where user_id = auth.uid()), false)
$$;

revoke execute on function public.is_admin(), public.is_blocked() from public, anon;
grant execute on function public.is_admin(), public.is_blocked() to authenticated;

-- Yangi foydalanuvchi (Google orqali) ro'yxatdan o'tganda profil avtomatik yaratiladi.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id, full_name, google_id, avatar_url)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), nullif(new.raw_user_meta_data ->> 'name', ''), ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'provider_id', ''), nullif(new.raw_user_meta_data ->> 'sub', '')),
    coalesce(nullif(new.raw_user_meta_data ->> 'avatar_url', ''), nullif(new.raw_user_meta_data ->> 'picture', ''))
  )
  on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Boshqalarga ko'rinadigan profil qismi (telefon, shahar, google_id YO'Q).
create or replace view public.public_profiles as
  select user_id, full_name, avatar_url from public.profiles;

-- =====================================================================
-- Huquqlar va RLS
-- =====================================================================
alter table public.admins   enable row level security;
alter table public.profiles enable row level security;
alter table public.posts    enable row level security;
alter table public.likes    enable row level security;
alter table public.comments enable row level security;

revoke all on public.admins, public.profiles, public.posts, public.likes, public.comments, public.public_profiles from anon, authenticated;

-- Ustun darajasidagi huquqlar: foydalanuvchi o'zini admin/bloklangan qila olmaydi.
grant select on public.profiles to authenticated;
grant update (full_name, phone, city, bio, onboarded) on public.profiles to authenticated;
grant select on public.public_profiles to authenticated;

grant select, delete on public.posts to authenticated;
grant insert (id, user_id, animal_type, image_url, latitude, longitude, address, caption) on public.posts to authenticated;
grant update (status, blocked_reason) on public.posts to authenticated;       -- faqat admin (policy)

grant select, delete on public.likes to authenticated;
grant insert (post_id, user_id) on public.likes to authenticated;

grant select, delete on public.comments to authenticated;
grant insert (post_id, user_id, text) on public.comments to authenticated;

-- profiles: o'zining profili yoki admin
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- posts: hamma (bloklanmagan) faol postlarni o'qiydi; egasi o'zinikini; admin hammasini
drop policy if exists posts_select on public.posts;
create policy posts_select on public.posts for select to authenticated
  using (public.is_admin() or (not public.is_blocked() and (status = 'active' or user_id = auth.uid())));
drop policy if exists posts_insert on public.posts;
create policy posts_insert on public.posts for insert to authenticated
  with check (user_id = auth.uid() and not public.is_blocked());
drop policy if exists posts_update_admin on public.posts;
create policy posts_update_admin on public.posts for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists posts_delete on public.posts;
create policy posts_delete on public.posts for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- likes
drop policy if exists likes_select on public.likes;
create policy likes_select on public.likes for select to authenticated
  using (public.is_admin() or not public.is_blocked());
drop policy if exists likes_insert on public.likes;
create policy likes_insert on public.likes for insert to authenticated
  with check (user_id = auth.uid() and not public.is_blocked()
              and exists (select 1 from public.posts p where p.id = post_id));   -- post ko'rinadigan bo'lishi shart (RLS)
drop policy if exists likes_delete on public.likes;
create policy likes_delete on public.likes for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- comments
drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments for select to authenticated
  using (public.is_admin() or not public.is_blocked());
drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments for insert to authenticated
  with check (user_id = auth.uid() and not public.is_blocked()
              and exists (select 1 from public.posts p where p.id = post_id));
drop policy if exists comments_delete on public.comments;
create policy comments_delete on public.comments for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- =====================================================================
-- Storage: rasmlar uchun ochiq bucket (o'qish ommaviy, yozish faqat o'z papkasiga)
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('animal-photos', 'animal-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists animal_photos_select on storage.objects;
create policy animal_photos_select on storage.objects for select to authenticated
  using (bucket_id = 'animal-photos');
drop policy if exists animal_photos_insert on storage.objects;
create policy animal_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'animal-photos' and (storage.foldername(name))[1] = auth.uid()::text and not public.is_blocked());
drop policy if exists animal_photos_delete on storage.objects;
create policy animal_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'animal-photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- =====================================================================
-- Admin funksiyalari (har biri ichida is_admin() tekshiriladi)
-- =====================================================================
create or replace function public.admin_stats() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  today date := (now() at time zone 'Asia/Tashkent')::date;
  res jsonb;
begin
  if not public.is_admin() then raise exception 'Ruxsat yo''q' using errcode = '42501'; end if;
  select jsonb_build_object(
    'total_posts',      (select count(*) from public.posts),
    'active_posts',     (select count(*) from public.posts where status = 'active'),
    'blocked_posts',    (select count(*) from public.posts where status = 'blocked'),
    'cat_posts',        (select count(*) from public.posts where animal_type = 'cat'),
    'dog_posts',        (select count(*) from public.posts where animal_type = 'dog'),
    'total_users',      (select count(*) from public.profiles),
    'blocked_users',    (select count(*) from public.profiles where blocked),
    'total_likes',      (select count(*) from public.likes),
    'total_comments',   (select count(*) from public.comments),
    'new_posts_today',  (select count(*) from public.posts where (created_at at time zone 'Asia/Tashkent')::date = today),
    'new_users_today',  (select count(*) from public.profiles where (created_at at time zone 'Asia/Tashkent')::date = today),
    -- faol foydalanuvchi: oxirgi N kunda post, layk yoki izoh qoldirgan
    'active_users_7d',  (select count(distinct u) from (
        select user_id u from public.posts    where created_at >= now() - interval '7 days'
        union all select user_id from public.likes    where created_at >= now() - interval '7 days'
        union all select user_id from public.comments where created_at >= now() - interval '7 days') a),
    'active_users_30d', (select count(distinct u) from (
        select user_id u from public.posts    where created_at >= now() - interval '30 days'
        union all select user_id from public.likes    where created_at >= now() - interval '30 days'
        union all select user_id from public.comments where created_at >= now() - interval '30 days') a),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object(
        'day', d::text,
        'posts',    (select count(*) from public.posts    where (created_at at time zone 'Asia/Tashkent')::date = d),
        'users',    (select count(*) from public.profiles where (created_at at time zone 'Asia/Tashkent')::date = d),
        'likes',    (select count(*) from public.likes    where (created_at at time zone 'Asia/Tashkent')::date = d),
        'comments', (select count(*) from public.comments where (created_at at time zone 'Asia/Tashkent')::date = d)
      ) order by d), '[]'::jsonb) from (select (today - n)::date as d from generate_series(0, 13) n) x)
  ) into res;
  return res;
end $$;

create or replace function public.admin_list_users() returns table (
  user_id uuid, full_name text, email text, google_id text, avatar_url text, phone text, city text,
  created_at timestamptz, last_sign_in_at timestamptz, blocked boolean, is_admin boolean,
  posts_count bigint, comments_count bigint, likes_count bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Ruxsat yo''q' using errcode = '42501'; end if;
  return query
    select p.user_id, p.full_name, u.email::text, p.google_id, p.avatar_url, p.phone, p.city,
           p.created_at, u.last_sign_in_at, p.blocked,
           exists (select 1 from public.admins a where a.user_id = p.user_id),
           (select count(*) from public.posts    x where x.user_id = p.user_id),
           (select count(*) from public.comments x where x.user_id = p.user_id),
           (select count(*) from public.likes    x where x.user_id = p.user_id)
    from public.profiles p join auth.users u on u.id = p.user_id
    order by p.created_at desc;
end $$;

create or replace function public.admin_set_user_blocked(p_user uuid, p_blocked boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Ruxsat yo''q' using errcode = '42501'; end if;
  if p_user = auth.uid() then raise exception 'O''zingizni bloklab bo''lmaydi'; end if;
  if exists (select 1 from public.admins where user_id = p_user) then raise exception 'Adminni bloklab bo''lmaydi'; end if;
  update public.profiles set blocked = p_blocked where user_id = p_user;
  if p_blocked then
    -- bloklangan foydalanuvchining yangi tokenlari bekor qilinadi (joriy token qisqa muddat ishlaydi, RLS esa darhol to'sadi)
    delete from auth.refresh_tokens where user_id = p_user::text;
  end if;
end $$;

-- Foydalanuvchini va uning barcha post/layk/izohlarini o'chiradi (Storage fayllarini panel o'zi avval o'chiradi).
create or replace function public.admin_delete_user(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Ruxsat yo''q' using errcode = '42501'; end if;
  if p_user = auth.uid() then raise exception 'O''zingizni o''chirib bo''lmaydi'; end if;
  if exists (select 1 from public.admins where user_id = p_user) then raise exception 'Adminni o''chirib bo''lmaydi'; end if;
  delete from auth.users where id = p_user;   -- profiles, posts, likes, comments cascade
end $$;

revoke execute on function public.admin_stats(), public.admin_list_users(),
  public.admin_set_user_blocked(uuid, boolean), public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_stats(), public.admin_list_users(),
  public.admin_set_user_blocked(uuid, boolean), public.admin_delete_user(uuid) to authenticated;

-- =====================================================================
-- Birinchi adminni belgilash (qo'lda, SQL Editor'da; avval shu hisob bilan bir marta kiring):
--   insert into public.admins (user_id) select id from auth.users where email = 'sizning@gmail.com';
-- =====================================================================
