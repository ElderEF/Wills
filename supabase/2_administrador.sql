-- WILLS · Script 2: convierte en ADMINISTRADOR al usuario que creaste en Authentication.
-- Cambia SOLO el correo entre comillas por el tuyo y pulsa Run.
insert into perfiles(id,email,nombre,rol)
select id,email,'Administrador','admin' from auth.users where email='elder.flores.oficial@gmail.com'
on conflict(id) do update set rol='admin';
