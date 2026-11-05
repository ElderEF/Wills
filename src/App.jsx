import {useEffect,useState} from 'react'
import {supabase,createTmp,configured} from './supabase'

const WA='59178727273'
const CATS=['Armazones','Gafas de sol','Lentes de contacto','Accesorios','Líquidos']
const bs=n=>'Bs. '+Number(n).toFixed(2).replace(/\.00$/,'')

export default function App(){
  const [h,setH]=useState(location.hash)
  useEffect(()=>{const f=()=>setH(location.hash);addEventListener('hashchange',f);return()=>removeEventListener('hashchange',f)},[])
  if(!configured)return <div className="center"><h2>Falta conectar Supabase</h2><p>Agrega las variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en Vercel y vuelve a publicar.</p></div>
  return h.startsWith('#/admin')?<Admin/>:<Tienda/>
}

function Tienda(){
  const [prods,setProds]=useState([]),[cat,setCat]=useState('Todos'),[open,setOpen]=useState(false)
  const [cart,setCart]=useState(()=>{try{return JSON.parse(localStorage.cart||'[]')}catch{return[]}})
  useEffect(()=>{supabase.from('productos').select('*').eq('activo',true).order('id').then(r=>setProds(r.data||[]))},[])
  useEffect(()=>{localStorage.cart=JSON.stringify(cart)},[cart])
  const add=p=>setCart(c=>c.find(x=>x.id===p.id)?c.map(x=>x.id===p.id?{...x,q:x.q+1}:x):[...c,{id:p.id,nombre:p.nombre,precio:p.precio,q:1}])
  const list=cat==='Todos'?prods:prods.filter(p=>p.categoria===cat)
  const n=cart.reduce((a,x)=>a+x.q,0)
  return <>
    <div className="topbar">ENVÍOS Y CONSULTAS · ATENCIÓN PERSONALIZADA POR WHATSAPP</div>
    <header className="header"><img src="/logo.png" alt="WILLS"/><div><a href="#/admin">ADMIN</a> <button onClick={()=>setOpen(true)}>CARRITO ({n})</button></div></header>
    <section className="hero"><span className="eyebrow">WILLS · STYLE &amp; VISION</span><h1>En tus ojos se esconde la magia.</h1><p>Gafas que combinan estilo, personalidad y una nueva forma de mirar el mundo.</p></section>
    <section className="section"><h2>Nuestra colección</h2>
      <div className="chips">{['Todos',...CATS].map(c=><button key={c} className={'chip'+(c===cat?' on':'')} onClick={()=>setCat(c)}>{c.toUpperCase()}</button>)}</div>
      <div className="grid">{list.map(p=><div className="card" key={p.id}>
        <div className="ph">{p.imagen_url?<img src={p.imagen_url} alt={p.nombre}/>:'Sin foto'}</div>
        <div className="in"><small>{(p.categoria+' · '+(p.marca||'')).toUpperCase()}</small><h3>{p.nombre}</h3><b>{bs(p.precio)}</b><br/><br/>
        {p.stock>0?<button className="btn sm" onClick={()=>add(p)}>Agregar</button>:<small>AGOTADO</small>}</div></div>)}</div>
      {!list.length&&<p>No hay productos en esta categoría.</p>}
    </section>
    <a className="wa" href={`https://wa.me/${WA}`}>WhatsApp</a>
    <footer className="section">© WILLS · BOLIVIA · +591 78727273</footer>
    {open&&<Carrito cart={cart} setCart={setCart} close={()=>setOpen(false)}/>}
  </>
}

function Carrito({cart,setCart,close}){
  const [f,setF]=useState({cliente:'',telefono:'',entrega:'Envío a domicilio',direccion:'',pago:'Transferencia bancaria'})
  const [msg,setMsg]=useState(''),[done,setDone]=useState(null),[busy,setBusy]=useState(false)
  const total=cart.reduce((a,x)=>a+x.precio*x.q,0)
  const set=k=>e=>setF({...f,[k]:e.target.value})
  const qty=(id,d)=>setCart(c=>c.map(x=>x.id===id?{...x,q:x.q+d}:x).filter(x=>x.q>0))
  async function enviar(){
    if(!f.cliente||!f.telefono)return setMsg('Escribe tu nombre y teléfono.')
    if(f.entrega.startsWith('Envío')&&!f.direccion)return setMsg('Escribe tu dirección.')
    setBusy(true);setMsg('')
    const {data,error}=await supabase.rpc('crear_pedido',{p_cliente:f.cliente,p_telefono:f.telefono,p_direccion:f.direccion,p_entrega:f.entrega,p_pago:f.pago,p_items:cart.map(x=>({id:x.id,cantidad:x.q}))})
    setBusy(false)
    if(error)return setMsg('No se pudo enviar el pedido: '+error.message)
    const txt=`Hola WILLS, hice el pedido #${data}:%0A`+cart.map(x=>`- ${x.q} x ${x.nombre}`).join('%0A')+`%0ATotal: ${bs(total)}%0AEntrega: ${f.entrega}%0APago: ${f.pago}%0ANombre: ${f.cliente}`
    setDone({n:data,url:`https://wa.me/${WA}?text=${txt}`});setCart([])
  }
  return <div className="modal" onClick={close}><div className="panel" onClick={e=>e.stopPropagation()}>
    <h2>Tu carrito</h2>
    {done?<><p className="ok">¡Pedido #{done.n} registrado!</p><p>Confírmalo por WhatsApp para coordinar el pago y la entrega.</p><a className="btn" href={done.url}>Abrir WhatsApp</a></>:<>
    {!cart.length&&<p>Tu carrito está vacío.</p>}
    {cart.map(x=><div className="row" key={x.id}><span>{x.nombre}<br/>{bs(x.precio)}</span><span><button onClick={()=>qty(x.id,-1)}>−</button> {x.q} <button onClick={()=>qty(x.id,1)}>+</button></span></div>)}
    {!!cart.length&&<><p><b>Total: {bs(total)}</b></p>
      <input placeholder="Nombre completo" value={f.cliente} onChange={set('cliente')}/>
      <input placeholder="Teléfono / WhatsApp" value={f.telefono} onChange={set('telefono')}/>
      <select value={f.entrega} onChange={set('entrega')}><option>Envío a domicilio</option><option>Retiro en tienda</option></select>
      {f.entrega.startsWith('Envío')&&<input placeholder="Dirección de entrega" value={f.direccion} onChange={set('direccion')}/>}
      <select value={f.pago} onChange={set('pago')}><option>Transferencia bancaria</option><option>Tarjeta de crédito/débito</option><option>Pago contra entrega</option></select>
      {f.pago.startsWith('Tarjeta')&&<small>Te enviaremos un enlace de pago por WhatsApp.</small>}
      {msg&&<p className="err">{msg}</p>}
      <button className="btn" disabled={busy} onClick={enviar}>{busy?'Enviando...':'Confirmar pedido'}</button></>}</>}
    <p><button className="btn alt sm" onClick={close}>Cerrar</button></p>
  </div></div>
}

function Admin(){
  const [ses,setSes]=useState(null),[perfil,setPerfil]=useState(null),[tab,setTab]=useState('productos'),[load,setLoad]=useState(true)
  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>{setSes(data.session);setLoad(false)})
    const {data:s}=supabase.auth.onAuthStateChange((_e,x)=>setSes(x))
    return()=>s.subscription.unsubscribe()
  },[])
  useEffect(()=>{if(ses)supabase.from('perfiles').select('*').eq('id',ses.user.id).single().then(r=>setPerfil(r.data));else setPerfil(null)},[ses])
  if(load)return <div className="center">Cargando...</div>
  if(!ses)return <Login/>
  if(!perfil)return <div className="center">Cargando perfil...</div>
  if(perfil.rol==='sin_acceso')return <div className="center"><p>Tu usuario aún no tiene permisos. Pídele al administrador que te los asigne.</p><button className="btn" onClick={()=>supabase.auth.signOut()}>Salir</button></div>
  const admin=perfil.rol==='admin'
  return <div className="section">
    <h2>Panel WILLS <small style={{fontSize:12}}>({perfil.rol})</small></h2>
    <div className="tabs"><button className="chip" onClick={()=>setTab('productos')}>PRODUCTOS</button><button className="chip" onClick={()=>setTab('pedidos')}>PEDIDOS</button>
      {admin&&<button className="chip" onClick={()=>setTab('usuarios')}>USUARIOS</button>}
      <a className="chip" href="#/">VER TIENDA</a><button className="chip" onClick={()=>supabase.auth.signOut()}>SALIR</button></div>
    {tab==='productos'&&<Productos/>}{tab==='pedidos'&&<Pedidos/>}{tab==='usuarios'&&admin&&<Usuarios/>}
  </div>
}

function Login(){
  const [e,setE]=useState(''),[p,setP]=useState(''),[m,setM]=useState('')
  const go=async()=>{const {error}=await supabase.auth.signInWithPassword({email:e,password:p});if(error)setM('Correo o contraseña incorrectos.')}
  return <div className="center box"><h2>Ingresar</h2><input placeholder="Correo" value={e} onChange={x=>setE(x.target.value)}/><input type="password" placeholder="Contraseña" value={p} onChange={x=>setP(x.target.value)} onKeyDown={x=>x.key==='Enter'&&go()}/>
    {m&&<p className="err">{m}</p>}<button className="btn" onClick={go}>Entrar</button><p><a href="#/">← Volver a la tienda</a></p></div>
}

const vacio={nombre:'',categoria:CATS[0],marca:'',precio:'',stock:'',descripcion:'',imagen_url:''}
function Productos(){
  const [l,setL]=useState([]),[f,setF]=useState(vacio),[m,setM]=useState('')
  const cargar=()=>supabase.from('productos').select('*').order('id',{ascending:false}).then(r=>setL(r.data||[]))
  useEffect(()=>{cargar()},[])
  const set=k=>e=>setF({...f,[k]:e.target.value})
  async function foto(e){
    const file=e.target.files[0];if(!file)return
    const name=Date.now()+'-'+file.name.replace(/[^a-zA-Z0-9.]/g,'_')
    const {error}=await supabase.storage.from('productos').upload(name,file)
    if(error)return setM('Error al subir foto: '+error.message)
    setF(x=>({...x,imagen_url:supabase.storage.from('productos').getPublicUrl(name).data.publicUrl}))
  }
  async function guardar(){
    if(!f.nombre||f.precio==='')return setM('Nombre y precio son obligatorios.')
    const d={nombre:f.nombre,categoria:f.categoria,marca:f.marca,descripcion:f.descripcion,imagen_url:f.imagen_url,precio:Number(f.precio),stock:Number(f.stock||0)}
    const r=f.id?await supabase.from('productos').update(d).eq('id',f.id):await supabase.from('productos').insert(d)
    if(r.error)return setM(r.error.message)
    setF(vacio);setM('Guardado ✔');cargar()
  }
  const borrar=async id=>{if(confirm('¿Eliminar este producto?')){await supabase.from('productos').delete().eq('id',id);cargar()}}
  const toggle=async p=>{await supabase.from('productos').update({activo:!p.activo}).eq('id',p.id);cargar()}
  return <>
    <div className="box"><b>{f.id?'Editar producto':'Nuevo producto'}</b><br/><br/>
      <input placeholder="Nombre" value={f.nombre} onChange={set('nombre')}/>
      <select value={f.categoria} onChange={set('categoria')}>{CATS.map(c=><option key={c}>{c}</option>)}</select>
      <input placeholder="Marca" value={f.marca||''} onChange={set('marca')}/>
      <input type="number" placeholder="Precio (Bs.)" value={f.precio} onChange={set('precio')}/>
      <input type="number" placeholder="Stock" value={f.stock} onChange={set('stock')}/>
      <textarea placeholder="Descripción" value={f.descripcion||''} onChange={set('descripcion')}/>
      <input type="file" accept="image/*" onChange={foto}/>{f.imagen_url&&<img src={f.imagen_url} width="80" alt=""/>}
      {m&&<p>{m}</p>}<button className="btn" onClick={guardar}>Guardar</button> {f.id&&<button className="btn alt" onClick={()=>setF(vacio)}>Cancelar</button>}</div>
    {l.map(p=><div className="row" key={p.id}><span>{p.nombre} · {bs(p.precio)} · stock {p.stock} {!p.activo&&'(oculto)'}</span>
      <span><button className="btn sm alt" onClick={()=>setF(p)}>Editar</button> <button className="btn sm alt" onClick={()=>toggle(p)}>{p.activo?'Ocultar':'Mostrar'}</button> <button className="btn sm" onClick={()=>borrar(p.id)}>Borrar</button></span></div>)}
  </>
}

function Pedidos(){
  const [l,setL]=useState([])
  const cargar=()=>supabase.from('pedidos').select('*,pedido_items(*)').order('id',{ascending:false}).then(r=>setL(r.data||[]))
  useEffect(()=>{cargar()},[])
  const estado=async(id,e)=>{await supabase.from('pedidos').update({estado:e}).eq('id',id);cargar()}
  return <>{!l.length&&<p>Aún no hay pedidos.</p>}{l.map(p=><div className="box" key={p.id}>
    <b>Pedido #{p.id}</b> · {new Date(p.creado).toLocaleString()} · <b>{bs(p.total)}</b><br/>
    {p.cliente} · {p.telefono}<br/>{p.entrega}{p.direccion?': '+p.direccion:''} · {p.pago}
    <ul>{p.pedido_items.map(i=><li key={i.id}>{i.cantidad} x {i.nombre}</li>)}</ul>
    <select value={p.estado} onChange={e=>estado(p.id,e.target.value)}>{['nuevo','confirmado','enviado','entregado','cancelado'].map(s=><option key={s}>{s}</option>)}</select></div>)}</>
}

function Usuarios(){
  const [l,setL]=useState([]),[f,setF]=useState({nombre:'',email:'',password:'',rol:'vendedor'}),[m,setM]=useState('')
  const cargar=()=>supabase.from('perfiles').select('*').order('email').then(r=>setL(r.data||[]))
  useEffect(()=>{cargar()},[])
  const set=k=>e=>setF({...f,[k]:e.target.value})
  async function crear(){
    if(!f.email||f.password.length<6)return setM('Escribe un correo y una contraseña de al menos 6 caracteres.')
    const {data,error}=await createTmp().auth.signUp({email:f.email,password:f.password})
    if(error||!data.user)return setM('No se pudo crear: '+(error?.message||'intenta de nuevo'))
    await new Promise(r=>setTimeout(r,800))
    const u=await supabase.from('perfiles').update({rol:f.rol,nombre:f.nombre}).eq('id',data.user.id)
    setM(u.error?u.error.message:'Usuario creado ✔');setF({nombre:'',email:'',password:'',rol:'vendedor'});cargar()
  }
  const rol=async(id,r)=>{await supabase.from('perfiles').update({rol:r}).eq('id',id);cargar()}
  return <>
    <div className="box"><b>Crear usuario</b><br/><br/>
      <input placeholder="Nombre" value={f.nombre} onChange={set('nombre')}/><input placeholder="Correo" value={f.email} onChange={set('email')}/>
      <input placeholder="Contraseña (mín. 6)" value={f.password} onChange={set('password')}/>
      <select value={f.rol} onChange={set('rol')}><option value="vendedor">Vendedor / empleado</option><option value="admin">Administrador</option></select>
      {m&&<p>{m}</p>}<button className="btn" onClick={crear}>Crear usuario</button></div>
    {l.map(u=><div className="row" key={u.id}><span>{u.nombre||'—'} · {u.email}</span>
      <select value={u.rol} onChange={e=>rol(u.id,e.target.value)} style={{width:150}}><option value="admin">admin</option><option value="vendedor">vendedor</option><option value="sin_acceso">sin acceso</option></select></div>)}
  </>
}
