-- Un PIN incorrecto debe devolver un resultado (no lanzar excepción), para que
-- el intento insertado por private.pin_employee se confirme en la transacción.
create or replace function public.hotel_start_shift(p_device uuid, p_pin text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_hotel uuid; v_employee uuid; v_shift uuid; v_name text; v_schedule text;
begin
  select hotel_id into v_hotel from public.admin_devices where auth_user_id=p_device and enabled;
  if v_hotel is null then raise exception 'Celular no autorizado.'; end if;
  v_employee := private.pin_employee(v_hotel,p_device,p_pin);
  if v_employee is null then return null; end if;
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

drop function public.hotel_end_shift(uuid,text);
create function public.hotel_end_shift(p_device uuid, p_pin text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_hotel uuid; v_employee uuid; v_active uuid; v_current_employee uuid;
begin
  select hotel_id into v_hotel from public.admin_devices where auth_user_id=p_device and enabled;
  if v_hotel is null then raise exception 'Celular no autorizado.'; end if;
  v_employee := private.pin_employee(v_hotel,p_device,p_pin);
  if v_employee is null then return false; end if;
  select id,employee_id into v_active,v_current_employee from public.cashier_shifts
    where hotel_id=v_hotel and ended_at is null for update;
  if v_active is null or v_current_employee <> v_employee then raise exception 'Este empleado no tiene el turno activo.'; end if;
  update public.cashier_shifts set ended_at=now(),ended_from_device=p_device where id=v_active;
  insert into public.cashier_display(hotel_id,status,employee_name,schedule_label)
    values (v_hotel,'pending',null,null)
    on conflict (hotel_id) do update set status='pending',employee_name=null,schedule_label=null,updated_at=now();
  return true;
end $$;
revoke all on function public.hotel_end_shift(uuid,text) from public,anon,authenticated;
grant execute on function public.hotel_end_shift(uuid,text) to service_role;
