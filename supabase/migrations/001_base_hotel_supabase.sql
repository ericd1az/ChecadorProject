-- Base de datos inicial para Hotel Smart Display.
-- Ejecutar una sola vez en un proyecto Supabase NUEVO, desde SQL Editor.
-- La autorizacion inicial de celulares y las operaciones de PIN/QR requieren
-- pasos de configuracion descritos en INSTRUCCIONES_BASE_DE_DATOS.md.

begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- 1. Hotel y dispositivos autorizados ---------------------------------------

create table public.hotels (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 150),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admin_devices (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  label text not null check (length(btrim(label)) between 1 and 100),
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
create index admin_devices_hotel_idx on public.admin_devices(hotel_id);

create table public.tv_devices (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 100),
  location text,
  paired_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, hotel_id)
);
create index tv_devices_hotel_idx on public.tv_devices(hotel_id);

-- Solo el servidor creara/consumira estas solicitudes. El codigo mostrado
-- en el QR nunca se guarda aqui en texto legible.
create table private.tv_pairing_requests (
  tv_auth_user_id uuid primary key references auth.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index tv_pairing_requests_expires_idx
  on private.tv_pairing_requests(expires_at);

-- 2. Contenido que pueden mostrar las TVs -----------------------------------

create table public.welcome_messages (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  body text not null check (length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, hotel_id)
);
create index welcome_messages_hotel_idx on public.welcome_messages(hotel_id);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 120),
  description text,
  location text,
  details text,
  icon_storage_path text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, hotel_id)
);
create index services_hotel_order_idx
  on public.services(hotel_id, display_order);

-- 0 = domingo, 1 = lunes, ... 6 = sabado. Sin fila = cerrado ese dia.
create table public.service_hours (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null,
  service_id uuid not null,
  weekday smallint not null check (weekday between 0 and 6),
  opens_at time not null,
  closes_at time not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_hours_service_fk
    foreign key (service_id, hotel_id)
    references public.services(id, hotel_id) on delete cascade,
  constraint service_hours_time_order check (closes_at > opens_at),
  unique (service_id, weekday, opens_at)
);
create index service_hours_hotel_idx on public.service_hours(hotel_id);
create index service_hours_service_hotel_idx
  on public.service_hours(service_id, hotel_id);

-- file_path sigue el formato: HOTEL_UUID/nombre-del-archivo.ext
create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  kind text not null check (kind in ('image', 'video')),
  title text,
  file_path text not null unique,
  duration_seconds numeric(6,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, hotel_id),
  constraint media_path_hotel_check
    check (split_part(file_path, '/', 1) = hotel_id::text),
  constraint media_duration_check
    check (
      (kind = 'image' and duration_seconds is null)
      or
      (kind = 'video' and duration_seconds is not null
        and duration_seconds > 0 and duration_seconds <= 20)
    )
);
create index media_assets_hotel_kind_idx
  on public.media_assets(hotel_id, kind);

create table public.notices (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 150),
  body text not null check (length(btrim(body)) between 1 and 2000),
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notices_hotel_order_idx
  on public.notices(hotel_id, display_order);

-- Una TV = una seccion fija. NULL significa vinculada y esperando contenido.
-- Los FK compuestos impiden asignar contenido de otro hotel.
create table public.tv_screen_state (
  tv_id uuid primary key,
  hotel_id uuid not null,
  section text check (
    section in ('welcome', 'services_hours', 'media', 'notices', 'cashier')
  ),
  welcome_id uuid,
  media_id uuid,
  updated_at timestamptz not null default now(),
  constraint tv_screen_device_fk
    foreign key (tv_id, hotel_id)
    references public.tv_devices(id, hotel_id) on delete cascade,
  constraint tv_screen_welcome_fk
    foreign key (welcome_id, hotel_id)
    references public.welcome_messages(id, hotel_id),
  constraint tv_screen_media_fk
    foreign key (media_id, hotel_id)
    references public.media_assets(id, hotel_id),
  constraint tv_screen_section_check check (
    case
      when section is null then welcome_id is null and media_id is null
      when section = 'welcome' then welcome_id is not null and media_id is null
      when section = 'media' then media_id is not null and welcome_id is null
      else welcome_id is null and media_id is null
    end
  )
);
create index tv_screen_state_hotel_idx on public.tv_screen_state(hotel_id);
create index tv_screen_state_welcome_hotel_idx
  on public.tv_screen_state(welcome_id, hotel_id) where welcome_id is not null;
create index tv_screen_state_media_hotel_idx
  on public.tv_screen_state(media_id, hotel_id) where media_id is not null;

-- 3. Empleados y turnos de caja ---------------------------------------------

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  full_name text not null check (length(btrim(full_name)) between 1 and 150),
  schedule_label text not null check (length(btrim(schedule_label)) between 1 and 150),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, hotel_id)
);
create index employees_hotel_idx on public.employees(hotel_id);

-- PIN protegido mediante hash; nunca incluir esta tabla en la API publica.
create table private.employee_pin_credentials (
  employee_id uuid primary key references public.employees(id) on delete cascade,
  pin_hash text not null,
  updated_at timestamptz not null default now()
);

-- Registro de intentos para limitar verificaciones de PIN desde el servidor.
create table private.pin_attempts (
  id bigint generated always as identity primary key,
  device_auth_user_id uuid not null references auth.users(id) on delete cascade,
  attempted_at timestamptz not null default now()
);
create index pin_attempts_device_time_idx
  on private.pin_attempts(device_auth_user_id, attempted_at desc);

create table public.cashier_shifts (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  employee_id uuid not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  started_from_device uuid references auth.users(id) on delete set null,
  ended_from_device uuid references auth.users(id) on delete set null,
  constraint cashier_shift_employee_fk
    foreign key (employee_id, hotel_id)
    references public.employees(id, hotel_id),
  constraint cashier_shift_time_check
    check (ended_at is null or ended_at >= started_at)
);
create unique index cashier_one_active_shift_per_hotel
  on public.cashier_shifts(hotel_id) where ended_at is null;
create index cashier_shifts_hotel_start_idx
  on public.cashier_shifts(hotel_id, started_at desc);
create index cashier_shifts_employee_hotel_idx
  on public.cashier_shifts(employee_id, hotel_id);

-- Vista de estado materializada como tabla para que la TV pueda escuchar
-- cambios por Realtime sin consultar los PIN ni el historial de turnos.
create table public.cashier_display (
  hotel_id uuid primary key references public.hotels(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'active')),
  employee_name text,
  schedule_label text,
  updated_at timestamptz not null default now(),
  constraint cashier_display_state_check check (
    (status = 'pending' and employee_name is null and schedule_label is null)
    or
    (status = 'active' and employee_name is not null and schedule_label is not null)
  )
);

-- 4. Limites y marcas de tiempo ---------------------------------------------

create function private.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger hotels_updated_at before update on public.hotels
  for each row execute function private.touch_updated_at();
create trigger tv_devices_updated_at before update on public.tv_devices
  for each row execute function private.touch_updated_at();
create trigger welcome_messages_updated_at before update on public.welcome_messages
  for each row execute function private.touch_updated_at();
create trigger services_updated_at before update on public.services
  for each row execute function private.touch_updated_at();
create trigger service_hours_updated_at before update on public.service_hours
  for each row execute function private.touch_updated_at();
create trigger media_assets_updated_at before update on public.media_assets
  for each row execute function private.touch_updated_at();
create trigger notices_updated_at before update on public.notices
  for each row execute function private.touch_updated_at();
create trigger employees_updated_at before update on public.employees
  for each row execute function private.touch_updated_at();
create trigger tv_screen_state_updated_at before update on public.tv_screen_state
  for each row execute function private.touch_updated_at();

create function private.limit_five_videos()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.kind <> 'video' then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.kind = 'video' and old.hotel_id = new.hotel_id then
      return new;
    end if;
  end if;

  -- Serializa altas de videos del mismo hotel sin bloquear su fila padre.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('hotel-videos'),
    pg_catalog.hashtext(new.hotel_id::text)
  );
  if (
    select count(*) from public.media_assets
    where hotel_id = new.hotel_id and kind = 'video' and id <> new.id
  ) >= 5 then
    raise exception 'Solo se permiten cinco videos por hotel';
  end if;
  return new;
end;
$$;
create trigger media_max_five_videos
  before insert or update of kind, hotel_id on public.media_assets
  for each row execute function private.limit_five_videos();

-- 5. Autorizacion centralizada ----------------------------------------------

create function private.is_admin(p_hotel_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.admin_devices ad
    where ad.hotel_id = p_hotel_id
      and ad.auth_user_id = (select auth.uid())
      and ad.enabled
  );
$$;

create function private.can_read_hotel(p_hotel_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_admin(p_hotel_id) or exists (
    select 1 from public.tv_devices tv
    where tv.hotel_id = p_hotel_id
      and tv.auth_user_id = (select auth.uid())
  );
$$;

create function private.is_admin_storage_path(p_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.admin_devices ad
    where ad.hotel_id::text = split_part(p_path, '/', 1)
      and ad.auth_user_id = (select auth.uid())
      and ad.enabled
  );
$$;

create function private.can_read_storage_path(p_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_admin_storage_path(p_path) or exists (
    select 1 from public.tv_devices tv
    where tv.hotel_id::text = split_part(p_path, '/', 1)
      and tv.auth_user_id = (select auth.uid())
  );
$$;

revoke all on all functions in schema private from public, anon, authenticated;
grant usage on schema private to authenticated, service_role;
grant execute on function private.is_admin(uuid) to authenticated;
grant execute on function private.can_read_hotel(uuid) to authenticated;
grant execute on function private.is_admin_storage_path(text) to authenticated;
grant execute on function private.can_read_storage_path(text) to authenticated;
grant all on all tables in schema private to service_role;
grant usage, select on all sequences in schema private to service_role;

-- 6. Seguridad por fila de las tablas accesibles desde las aplicaciones ----

alter table public.hotels enable row level security;
alter table public.admin_devices enable row level security;
alter table public.tv_devices enable row level security;
alter table public.welcome_messages enable row level security;
alter table public.services enable row level security;
alter table public.service_hours enable row level security;
alter table public.media_assets enable row level security;
alter table public.notices enable row level security;
alter table public.tv_screen_state enable row level security;
alter table public.employees enable row level security;
alter table public.cashier_shifts enable row level security;
alter table public.cashier_display enable row level security;

-- Hotel y lista de celulares: la primera autorizacion se hace en SQL Editor.
create policy hotels_read on public.hotels for select to authenticated
  using (private.can_read_hotel(id));
create policy hotels_admin_update on public.hotels for update to authenticated
  using (private.is_admin(id)) with check (private.is_admin(id));

create policy admin_devices_read on public.admin_devices for select to authenticated
  using (private.is_admin(hotel_id) or auth_user_id = (select auth.uid()));
-- Sin insert/update/delete desde el cliente: impide autoautorizar un celular.

create policy tv_devices_read on public.tv_devices for select to authenticated
  using (private.is_admin(hotel_id) or auth_user_id = (select auth.uid()));
create policy tv_devices_admin_update on public.tv_devices for update to authenticated
  using (private.is_admin(hotel_id)) with check (private.is_admin(hotel_id));
create policy tv_devices_admin_delete on public.tv_devices for delete to authenticated
  using (private.is_admin(hotel_id));
-- La creacion de una TV emparejada corresponde al backend, tras validar QR.

create policy welcome_read on public.welcome_messages for select to authenticated
  using (private.can_read_hotel(hotel_id));
create policy welcome_admin_write on public.welcome_messages for all to authenticated
  using (private.is_admin(hotel_id)) with check (private.is_admin(hotel_id));

create policy services_read on public.services for select to authenticated
  using (private.can_read_hotel(hotel_id));
create policy services_admin_write on public.services for all to authenticated
  using (private.is_admin(hotel_id)) with check (private.is_admin(hotel_id));

create policy service_hours_read on public.service_hours for select to authenticated
  using (private.can_read_hotel(hotel_id));
create policy service_hours_admin_write on public.service_hours for all to authenticated
  using (private.is_admin(hotel_id)) with check (private.is_admin(hotel_id));

create policy media_read on public.media_assets for select to authenticated
  using (private.can_read_hotel(hotel_id));
create policy media_admin_write on public.media_assets for all to authenticated
  using (private.is_admin(hotel_id)) with check (private.is_admin(hotel_id));

create policy notices_read on public.notices for select to authenticated
  using (private.can_read_hotel(hotel_id));
create policy notices_admin_write on public.notices for all to authenticated
  using (private.is_admin(hotel_id)) with check (private.is_admin(hotel_id));

create policy tv_screen_state_read on public.tv_screen_state for select to authenticated
  using (
    private.is_admin(hotel_id)
    or exists (
      select 1 from public.tv_devices tv
      where tv.id = tv_id and tv.auth_user_id = (select auth.uid())
    )
  );
create policy tv_screen_state_admin_write on public.tv_screen_state for all to authenticated
  using (private.is_admin(hotel_id)) with check (private.is_admin(hotel_id));

create policy employees_admin_all on public.employees for all to authenticated
  using (private.is_admin(hotel_id)) with check (private.is_admin(hotel_id));

create policy cashier_shifts_admin_read on public.cashier_shifts
  for select to authenticated using (private.is_admin(hotel_id));
-- Inicios y cierres de turno se escribiran desde funciones de servidor.

create policy cashier_display_read on public.cashier_display
  for select to authenticated using (private.can_read_hotel(hotel_id));
-- La TV puede leer el estado, pero solo el servidor puede cambiarlo.

-- Los proyectos nuevos no exponen tablas en la API sin GRANT explicito.
-- anon no accede directamente a estas tablas: cada celular/TV autorizado
-- usa una sesion anonima de Supabase Auth con el rol authenticated.
revoke all on table
  public.hotels, public.admin_devices, public.tv_devices,
  public.welcome_messages, public.services, public.service_hours,
  public.media_assets, public.notices, public.tv_screen_state,
  public.employees, public.cashier_shifts, public.cashier_display
from anon;

grant select, update on public.hotels to authenticated;
grant select on public.admin_devices to authenticated;
grant select, update, delete on public.tv_devices to authenticated;
grant select, insert, update, delete on table
  public.welcome_messages, public.services, public.service_hours,
  public.media_assets, public.notices, public.tv_screen_state,
  public.employees
to authenticated;
grant select on public.cashier_shifts, public.cashier_display
  to authenticated;

grant select, insert, update, delete on table
  public.hotels, public.admin_devices, public.tv_devices,
  public.welcome_messages, public.services, public.service_hours,
  public.media_assets, public.notices, public.tv_screen_state,
  public.employees, public.cashier_shifts, public.cashier_display
to service_role;

-- 7. Archivos privados de imagenes y videos ---------------------------------

insert into storage.buckets (id, name, public)
values ('hotel-media', 'hotel-media', false)
on conflict (id) do update set public = false;

create policy hotel_media_read on storage.objects for select to authenticated
  using (
    bucket_id = 'hotel-media'
    and private.can_read_storage_path(name)
  );
create policy hotel_media_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'hotel-media'
    and private.is_admin_storage_path(name)
  );
create policy hotel_media_update on storage.objects for update to authenticated
  using (
    bucket_id = 'hotel-media'
    and private.is_admin_storage_path(name)
  )
  with check (
    bucket_id = 'hotel-media'
    and private.is_admin_storage_path(name)
  );
create policy hotel_media_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'hotel-media'
    and private.is_admin_storage_path(name)
  );

-- 8. Publicacion de cambios a las TVs --------------------------------------

do $$
declare
  table_name text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach table_name in array array[
      'tv_devices', 'tv_screen_state', 'welcome_messages', 'services',
      'service_hours', 'media_assets', 'notices', 'cashier_display'
    ] loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = table_name
      ) then
        execute format('alter publication supabase_realtime add table public.%I', table_name);
      end if;
    end loop;
  end if;
end;
$$;

commit;
