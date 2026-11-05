-- WILLS · Script 1: crea toda la base de datos. Pégalo UNA vez en Supabase > SQL Editor > Run.
create table if not exists perfiles(id uuid primary key references auth.users on delete cascade,email text,nombre text,rol text not null default 'sin_acceso' check(rol in('admin','vendedor','sin_acceso')));
create table if not exists productos(id bigint generated always as identity primary key,nombre text not null,categoria text not null,marca text,descripcion text,precio numeric(10,2) not null,stock int not null default 0,imagen_url text,activo boolean not null default true,creado timestamptz default now());
create table if not exists pedidos(id bigint generated always as identity primary key,cliente text,telefono text,direccion text,entrega text,pago text,total numeric(10,2),estado text default 'nuevo',creado timestamptz default now());
create table if not exists pedido_items(id bigint generated always as identity primary key,pedido_id bigint references pedidos on delete cascade,producto_id bigint references productos on delete set null,nombre text,precio numeric(10,2),cantidad int);

create or replace function es_personal() returns boolean language sql security definer set search_path=public stable as $$select exists(select 1 from perfiles where id=auth.uid() and rol in('admin','vendedor'))$$;
create or replace function es_admin() returns boolean language sql security definer set search_path=public stable as $$select exists(select 1 from perfiles where id=auth.uid() and rol='admin')$$;

-- Cada usuario nuevo de Authentication recibe un perfil sin permisos
create or replace function nuevo_usuario() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into perfiles(id,email,rol) values(new.id,new.email,'sin_acceso') on conflict do nothing; return new; end $$;
drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario after insert on auth.users for each row execute function nuevo_usuario();

-- Pedido seguro: los precios se leen de la base, no del navegador
create or replace function crear_pedido(p_cliente text,p_telefono text,p_direccion text,p_entrega text,p_pago text,p_items jsonb) returns bigint language plpgsql security definer set search_path=public as $$
declare pid bigint; it jsonb; pr productos; tot numeric:=0;
begin
  insert into pedidos(cliente,telefono,direccion,entrega,pago,total) values(p_cliente,p_telefono,p_direccion,p_entrega,p_pago,0) returning id into pid;
  for it in select * from jsonb_array_elements(p_items) loop
    select * into pr from productos where id=(it->>'id')::bigint and activo;
    if found and (it->>'cantidad')::int>0 then
      insert into pedido_items(pedido_id,producto_id,nombre,precio,cantidad) values(pid,pr.id,pr.nombre,pr.precio,(it->>'cantidad')::int);
      tot:=tot+pr.precio*(it->>'cantidad')::int;
    end if;
  end loop;
  if tot=0 then raise exception 'Pedido vacío'; end if;
  update pedidos set total=tot where id=pid; return pid;
end $$;
grant execute on function crear_pedido to anon,authenticated;

alter table perfiles enable row level security;alter table productos enable row level security;alter table pedidos enable row level security;alter table pedido_items enable row level security;
drop policy if exists p_perfiles_ver on perfiles;create policy p_perfiles_ver on perfiles for select using(id=auth.uid() or es_admin());
drop policy if exists p_perfiles_mod on perfiles;create policy p_perfiles_mod on perfiles for update using(es_admin()) with check(es_admin());
drop policy if exists p_prod_ver on productos;create policy p_prod_ver on productos for select using(activo or es_personal());
drop policy if exists p_prod_mod on productos;create policy p_prod_mod on productos for all using(es_personal()) with check(es_personal());
drop policy if exists p_ped_ver on pedidos;create policy p_ped_ver on pedidos for select using(es_personal());
drop policy if exists p_ped_mod on pedidos;create policy p_ped_mod on pedidos for update using(es_personal());
drop policy if exists p_item_ver on pedido_items;create policy p_item_ver on pedido_items for select using(es_personal());

-- Carpeta de fotos (bucket público "productos") creada automáticamente
insert into storage.buckets(id,name,public) values('productos','productos',true) on conflict(id) do update set public=true;
drop policy if exists f_ver on storage.objects;create policy f_ver on storage.objects for select using(bucket_id='productos');
drop policy if exists f_subir on storage.objects;create policy f_subir on storage.objects for insert with check(bucket_id='productos' and es_personal());
drop policy if exists f_mod on storage.objects;create policy f_mod on storage.objects for update using(bucket_id='productos' and es_personal());
drop policy if exists f_borrar on storage.objects;create policy f_borrar on storage.objects for delete using(bucket_id='productos' and es_personal());

-- Productos de ejemplo (puedes borrarlos desde el panel)
insert into productos(nombre,categoria,marca,precio,stock,descripcion)
select * from(values('Modelo Aura','Armazones','Wills',180,10,'Armazón elegante'),('Modelo Urban','Armazones','Wills',160,10,'Clásico unisex'),('Modelo Ébano','Gafas de sol','Wills',195,10,'Gafas de sol'),('Modelo Classic','Armazones','Wills',175,10,'Contemporáneo')) v(a,b,c,d,e,f)
where not exists(select 1 from productos);
