-- Operaciones privilegiadas para la app móvil. Las funciones RPC solo las ejecuta service_role
-- desde una Edge Function que autentica el JWT. No se expone private al Data API.
create table if not exists private.hotel_pin_secrets (
  hotel_id uuid primary key references public.hotels(id) on delete cascade,
  secret bytea not null default extensions.gen_random_bytes(32)
);
alter table private.hotel_pin_secrets enable row level security;
revoke all on private.hotel_pin_secrets from public, anon, authenticated;

alter table private.employee_pin_credentials
  add column if not exists hotel_id uuid,
  add column if not exists pin_lookup text;
update private.employee_pin_credentials c set hotel_id=e.hotel_id
  from public.employees e where c.employee_id=e.id and c.hotel_id is null;
alter table private.employee_pin_credentials alter column hotel_id set not null;
create unique index if not exists employee_pin_lookup_per_hotel
  on private.employee_pin_credentials(hotel_id, pin_lookup);

create or replace function private.pin_employee(p_hotel uuid, p_device uuid, p_pin text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_secret bytea; v_employee uuid; v_hash text; v_failures int;
begin
  if p_pin !~ '^[0-9]{6}$' then return null; end if;
  perform 1 from public.hotels where id=p_hotel for update;
  select count(*) into v_failures from private.pin_attempts
    where device_auth_user_id=p_device and attempted_at > now() - interval '15 minutes';
  if v_failures >= 5 then raise exception 'Demasiados intentos. Espera 15 minutos.'; end if;
  select secret into v_secret from private.hotel_pin_secrets where hotel_id=p_hotel;
  select c.employee_id,c.pin_hash into v_employee,v_hash
    from private.employee_pin_credentials c
    join public.employees e on e.id=c.employee_id and e.hotel_id=c.hotel_id
    where c.hotel_id=p_hotel and e.is_active
      and c.pin_lookup=encode(extensions.hmac(convert_to(p_hotel::text || ':' || p_pin,'UTF8'),v_secret,'sha256'),'hex');
  if v_employee is null or extensions.crypt(p_pin,v_hash) <> v_hash then
    insert into private.pin_attempts(device_auth_user_id) values (p_device);
    return null;
  end if;
  delete from private.pin_attempts where device_auth_user_id=p_device;
  return v_employee;
end $$;

create or replace function public.hotel_set_pin(p_device uuid, p_employee uuid, p_pin text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_hotel uuid; v_secret bytea;
begin
  if p_pin !~ '^[0-9]{6}$' then raise exception 'El PIN debe tener seis dígitos.'; end if;
  select hotel_id into v_hotel from public.admin_devices where auth_user_id=p_device and enabled;
  if v_hotel is null then raise exception 'Celular no autorizado.'; end if;
  perform 1 from public.hotels where id=v_hotel for update;
  perform 1 from public.employees where id=p_employee and hotel_id=v_hotel;
  if not found then raise exception 'Empleado no encontrado.'; end if;
  insert into private.hotel_pin_secrets(hotel_id) values (v_hotel) on conflict do nothing;
  select secret into v_secret from private.hotel_pin_secrets where hotel_id=v_hotel;
  insert into private.employee_pin_credentials(employee_id,hotel_id,pin_lookup,pin_hash)
  values (p_employee,v_hotel,
    encode(extensions.hmac(convert_to(v_hotel::text || ':' || p_pin,'UTF8'),v_secret,'sha256'),'hex'),
    extensions.crypt(p_pin,extensions.gen_salt('bf',12)))
  on conflict (employee_id) do update set hotel_id=excluded.hotel_id,
    pin_lookup=excluded.pin_lookup,pin_hash=excluded.pin_hash,updated_at=now();
exception when unique_violation then raise exception 'Ese PIN ya está asignado a otro empleado del hotel.';
end $$;

create or replace function public.hotel_verify_pin(p_device uuid, p_pin text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_hotel uuid; v_employee uuid; v_name text; v_schedule text;
begin
  select hotel_id into v_hotel from public.admin_devices where auth_user_id=p_device and enabled;
  if v_hotel is null then raise exception 'Celular no autorizado.'; end if;
  v_employee := private.pin_employee(v_hotel,p_device,p_pin);
  if v_employee is null then return null; end if;
  select full_name,schedule_label into v_name,v_schedule from public.employees where id=v_employee;
  return jsonb_build_object('employee_id',v_employee,'full_name',v_name,'schedule_label',v_schedule);
end $$;

create or replace function public.hotel_start_shift(p_device uuid, p_pin text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_hotel uuid; v_employee uuid; v_shift uuid; v_name text; v_schedule text;
begin
  select hotel_id into v_hotel from public.admin_devices where auth_user_id=p_device and enabled;
  if v_hotel is null then raise exception 'Celular no autorizado.'; end if;
  v_employee := private.pin_employee(v_hotel,p_device,p_pin);
  if v_employee is null then raise exception 'PIN incorrecto o empleado inactivo.'; end if;
  if exists(select 1 from public.cashier_shifts where hotel_id=v_hotel and ended_at is null) then
    raise exception 'Ya hay un turno activo.';
  end if;
  select full_name,schedule_label into v_name,v_schedule from public.employees where id=v_employee;
  insert into public.cashier_shifts(hotel_id,employee_id,started_from_device)
    values (v_hotel,v_employee,p_device) returning id into v_shift;
  insert into public.cashier_display(hotel_id,status,employee_name,schedule_label)
    values (v_hotel,'active',v_name,v_schedule)
    on conflict (hotel_id) do update set status='active',employee_name=excluded.employee_name,
      schedule_label=excluded.schedule_label,updated_at=now();
  return v_shift;
end $$;

create or replace function public.hotel_end_shift(p_device uuid, p_pin text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_hotel uuid; v_employee uuid; v_active uuid; v_current_employee uuid;
begin
  select hotel_id into v_hotel from public.admin_devices where auth_user_id=p_device and enabled;
  if v_hotel is null then raise exception 'Celular no autorizado.'; end if;
  v_employee := private.pin_employee(v_hotel,p_device,p_pin);
  if v_employee is null then raise exception 'PIN incorrecto o empleado inactivo.'; end if;
  select id,employee_id into v_active,v_current_employee from public.cashier_shifts
    where hotel_id=v_hotel and ended_at is null for update;
  if v_active is null or v_current_employee <> v_employee then raise exception 'Este empleado no tiene el turno activo.'; end if;
  update public.cashier_shifts set ended_at=now(),ended_from_device=p_device where id=v_active;
  insert into public.cashier_display(hotel_id,status,employee_name,schedule_label)
    values (v_hotel,'pending',null,null)
    on conflict (hotel_id) do update set status='pending',employee_name=null,schedule_label=null,updated_at=now();
end $$;

create or replace function public.hotel_request_pairing(p_tv_user uuid, p_token_hash text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_token_hash !~ '^[a-f0-9]{64}$' then raise exception 'Token no válido.'; end if;
  if exists(select 1 from public.tv_devices where auth_user_id=p_tv_user) then raise exception 'La TV ya está vinculada.'; end if;
  insert into private.tv_pairing_requests(tv_auth_user_id,token_hash,expires_at)
    values (p_tv_user,p_token_hash,now()+interval '5 minutes')
    on conflict (tv_auth_user_id) do update set token_hash=excluded.token_hash,
      expires_at=excluded.expires_at,created_at=now();
end $$;

create or replace function public.hotel_pair_tv(p_device uuid, p_token_hash text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_hotel uuid; v_tv_user uuid; v_tv uuid;
begin
  select hotel_id into v_hotel from public.admin_devices where auth_user_id=p_device and enabled;
  if v_hotel is null then raise exception 'Celular no autorizado.'; end if;
  select tv_auth_user_id into v_tv_user from private.tv_pairing_requests
    where token_hash=p_token_hash and expires_at>now() for update;
  if v_tv_user is null then raise exception 'El QR venció o ya fue utilizado.'; end if;
  delete from private.tv_pairing_requests where tv_auth_user_id=v_tv_user;
  insert into public.tv_devices(auth_user_id,hotel_id,name)
    values (v_tv_user,v_hotel,'TV nueva') returning id into v_tv;
  insert into public.tv_screen_state(tv_id,hotel_id,section) values (v_tv,v_hotel,null);
  return v_tv;
end $$;

create or replace function public.hotel_unpair_tv(p_device uuid, p_tv uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_hotel uuid;
begin
  select hotel_id into v_hotel from public.admin_devices where auth_user_id=p_device and enabled;
  if v_hotel is null then raise exception 'Celular no autorizado.'; end if;
  delete from public.tv_devices where id=p_tv and hotel_id=v_hotel;
  if not found then raise exception 'Pantalla no encontrada.'; end if;
end $$;

revoke all on function private.pin_employee(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.hotel_set_pin(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.hotel_verify_pin(uuid,text) from public,anon,authenticated;
revoke all on function public.hotel_start_shift(uuid,text) from public,anon,authenticated;
revoke all on function public.hotel_end_shift(uuid,text) from public,anon,authenticated;
revoke all on function public.hotel_request_pairing(uuid,text) from public,anon,authenticated;
revoke all on function public.hotel_pair_tv(uuid,text) from public,anon,authenticated;
revoke all on function public.hotel_unpair_tv(uuid,uuid) from public,anon,authenticated;
grant execute on function public.hotel_set_pin(uuid,uuid,text),public.hotel_verify_pin(uuid,text),
  public.hotel_start_shift(uuid,text),public.hotel_end_shift(uuid,text),
  public.hotel_request_pairing(uuid,text),public.hotel_pair_tv(uuid,text),
  public.hotel_unpair_tv(uuid,uuid) to service_role;
