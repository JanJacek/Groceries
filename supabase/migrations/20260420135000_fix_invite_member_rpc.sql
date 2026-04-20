drop function if exists public.invite_shopping_list_member(uuid, text);

create or replace function public.invite_shopping_list_member(p_list_id uuid, p_email text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  normalized_email text := lower(trim(p_email));
  invited_user_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Brak zalogowanego użytkownika.';
  end if;

  if not public.is_list_owner(p_list_id) then
    raise exception 'Tylko właściciel listy może zapraszać innych użytkowników.';
  end if;

  if normalized_email = '' then
    raise exception 'Podaj adres e-mail użytkownika.';
  end if;

  select users.id
  into invited_user_id
  from auth.users users
  where lower(users.email::text) = normalized_email
  limit 1;

  if invited_user_id is null then
    raise exception 'Nie znaleziono użytkownika o takim adresie e-mail.';
  end if;

  insert into public.shopping_list_members (list_id, user_id, role)
  values (p_list_id, invited_user_id, 'editor')
  on conflict (list_id, user_id) do nothing;
end;
$$;

grant execute on function public.invite_shopping_list_member(uuid, text) to authenticated;
