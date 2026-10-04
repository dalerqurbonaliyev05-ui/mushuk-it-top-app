-- Supabase SQL Editor'da qo'lda ishga tushiring (schema.sql'ning ikki admin funksiyasi: bloklash va o'chirish).
-- Ichida `delete` bor, shuning uchun avtomatik asboblar tasdiq so'rab kutib qoladi.
create or replace function public.admin_set_user_blocked(p_user uuid, p_blocked boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Ruxsat yo''q' using errcode = '42501'; end if;
  if p_user = auth.uid() then raise exception 'O''zingizni bloklab bo''lmaydi'; end if;
  if exists (select 1 from public.admins where user_id = p_user) then raise exception 'Adminni bloklab bo''lmaydi'; end if;
  update public.profiles set blocked = p_blocked where user_id = p_user;
  if p_blocked then
    delete from auth.refresh_tokens where user_id = p_user::text;
  end if;
end $$;

create or replace function public.admin_delete_user(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Ruxsat yo''q' using errcode = '42501'; end if;
  if p_user = auth.uid() then raise exception 'O''zingizni o''chirib bo''lmaydi'; end if;
  if exists (select 1 from public.admins where user_id = p_user) then raise exception 'Adminni o''chirib bo''lmaydi'; end if;
  delete from auth.users where id = p_user;
end $$;

revoke execute on function public.admin_set_user_blocked(uuid, boolean), public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_set_user_blocked(uuid, boolean), public.admin_delete_user(uuid) to authenticated;
