# WILLS · Tienda online (React + Vite + Supabase)

Pasos: ver el resumen en el chat. Resumen rápido:
1. Supabase > SQL Editor: pegar `supabase/1_schema.sql` y ejecutar.
2. Supabase > Authentication > Users > Add user (tu correo y contraseña, marca "Auto Confirm User").
3. Supabase > SQL Editor: pegar `supabase/2_administrador.sql`, cambiar el correo y ejecutar.
4. Supabase > Authentication > Providers > Email: desactivar "Confirm email".
5. Vercel: subir el proyecto e importar el archivo `.env` (copia de `.env.example` con tus 2 datos).
Panel de administración: tusitio.vercel.app/#/admin
