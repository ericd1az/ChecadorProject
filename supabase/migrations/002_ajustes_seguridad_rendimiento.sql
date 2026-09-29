-- Ajustes posteriores a la migracion inicial de Hotel Smart Display.
-- El esquema private sigue sin exponerse en la API; RLS agrega una barrera.
begin;

alter table private.tv_pairing_requests enable row level security;
alter table private.employee_pin_credentials enable row level security;
alter table private.pin_attempts enable row level security;

-- El servidor con service_role puede operar estas tablas sin politicas;
-- anon y authenticated no tienen privilegios de tabla ni acceso API.

-- Evita evaluar dos politicas permisivas para SELECT.
drop policy welcome_admin_write on public.welcome_messages;
create policy welcome_admin_insert on public.welcome_messages
  for insert to authenticated with check (private.is_admin(hotel_id));
create policy welcome_admin_update on public.welcome_messages
  for update to authenticated
  using (private.is_admin(hotel_id)) with check (private.is_admin(hotel_id));
create policy welcome_admin_delete on public.welcome_messages
  for delete to authenticated using (private.is_admin(hotel_id));

drop policy services_admin_write on public.services;
create policy services_admin_insert on public.services
  for insert to authenticated with check (private.is_admin(hotel_id));
create policy services_admin_update on public.services
  for update to authenticated
  using (private.is_admin(hotel_id)) with check (private.is_admin(hotel_id));
create policy services_admin_delete on public.services
  for delete to authenticated using (private.is_admin(hotel_id));

drop policy service_hours_admin_write on public.service_hours;
create policy service_hours_admin_insert on public.service_hours
  for insert to authenticated with check (private.is_admin(hotel_id));
create policy service_hours_admin_update on public.service_hours
  for update to authenticated
  using (private.is_admin(hotel_id)) with check (private.is_admin(hotel_id));
create policy service_hours_admin_delete on public.service_hours
  for delete to authenticated using (private.is_admin(hotel_id));

drop policy media_admin_write on public.media_assets;
create policy media_admin_insert on public.media_assets
  for insert to authenticated with check (private.is_admin(hotel_id));
create policy media_admin_update on public.media_assets
  for update to authenticated
  using (private.is_admin(hotel_id)) with check (private.is_admin(hotel_id));
create policy media_admin_delete on public.media_assets
  for delete to authenticated using (private.is_admin(hotel_id));

drop policy notices_admin_write on public.notices;
create policy notices_admin_insert on public.notices
  for insert to authenticated with check (private.is_admin(hotel_id));
create policy notices_admin_update on public.notices
  for update to authenticated
  using (private.is_admin(hotel_id)) with check (private.is_admin(hotel_id));
create policy notices_admin_delete on public.notices
  for delete to authenticated using (private.is_admin(hotel_id));

drop policy tv_screen_state_admin_write on public.tv_screen_state;
create policy tv_screen_state_admin_insert on public.tv_screen_state
  for insert to authenticated with check (private.is_admin(hotel_id));
create policy tv_screen_state_admin_update on public.tv_screen_state
  for update to authenticated
  using (private.is_admin(hotel_id)) with check (private.is_admin(hotel_id));
create policy tv_screen_state_admin_delete on public.tv_screen_state
  for delete to authenticated using (private.is_admin(hotel_id));

-- Acelera las referencias a usuarios cuando se elimina una instalacion.
create index cashier_shifts_started_from_device_idx
  on public.cashier_shifts(started_from_device)
  where started_from_device is not null;
create index cashier_shifts_ended_from_device_idx
  on public.cashier_shifts(ended_from_device)
  where ended_from_device is not null;

commit;
