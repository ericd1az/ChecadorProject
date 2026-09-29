-- El límite se aplica también a inserciones concurrentes y a clientes antiguos.
create function private.limit_five_notices()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and old.hotel_id = new.hotel_id then
    return new;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('hotel-notices'),
    pg_catalog.hashtext(new.hotel_id::text)
  );

  if (select count(*) from public.notices where hotel_id = new.hotel_id) >= 5 then
    raise exception 'Solo se permiten cinco avisos por hotel';
  end if;

  return new;
end;
$$;

create trigger notices_max_five
before insert or update of hotel_id on public.notices
for each row execute function private.limit_five_notices();

-- Una TV asignada a un elemento eliminado queda vinculada, pero sin contenido.
-- Se hace en la misma transacción del DELETE para no dejar referencias colgantes.
create function private.release_deleted_display_content()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_table_name = 'welcome_messages' then
    update public.tv_screen_state
    set section = null, welcome_id = null, media_id = null
    where hotel_id = old.hotel_id and welcome_id = old.id;
  elsif tg_table_name = 'media_assets' then
    update public.tv_screen_state
    set section = null, welcome_id = null, media_id = null
    where hotel_id = old.hotel_id and media_id = old.id;
  end if;

  return old;
end;
$$;

create trigger release_deleted_welcome
before delete on public.welcome_messages
for each row execute function private.release_deleted_display_content();

create trigger release_deleted_media
before delete on public.media_assets
for each row execute function private.release_deleted_display_content();
