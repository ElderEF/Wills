import {createClient} from '@supabase/supabase-js'
const url=import.meta.env.VITE_SUPABASE_URL
const key=import.meta.env.VITE_SUPABASE_ANON_KEY
export const configured=!!(url&&key)
export const supabase=configured?createClient(url,key):null
// Cliente temporal: sirve para crear usuarios sin cerrar la sesión del administrador
export const createTmp=()=>createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
