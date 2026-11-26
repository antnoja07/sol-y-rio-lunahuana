/* ============================================================
   SOL Y RÍO LUNAHUANÁ — script.js
   Visitantes: lectura pública + solicitudes a Supabase.
   Administrador: CRUD directo mediante una Edge Function
   con verificación de sesión por correo (sin contraseña).
   ============================================================ */

// 1. Coloca aquí los datos de Project Settings → API de Supabase.
// Esta clave es pública (publishable). JAMÁS uses service_role ni sb_secret.

const SUPABASE_URL = 'https://yzdtzveelkviixbhiujw.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_j0Gz3ROxQxCRkuc88S8xhw_2gtSwlDU';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
let db = null;
let connected = false;
const tables = {
  atractivos_turisticos: {
    pk: 'id_atractivo', label: 'Atractivos',
    fields: [
      ['nombre', 'Nombre', 'text', true], ['descripcion', 'Descripción', 'textarea', true],
      ['ubicacion', 'Ubicación', 'text'], ['imagen_url', 'URL de imagen', 'url'], ['publicado', 'Publicado', 'boolean']
    ]
  },
  actividades: {
    pk: 'id_actividad', label: 'Actividades',
    fields: [
      ['nombre', 'Nombre', 'text', true], ['slug', 'Identificador único (slug)', 'text', true],
      ['descripcion', 'Descripción', 'textarea', true], ['duracion', 'Duración', 'text'],
      ['precio', 'Precio (S/)', 'number', true], ['imagen_url', 'URL de imagen', 'url'], ['publicado', 'Publicado', 'boolean']
    ]
  },
  paquetes_turisticos: {
    pk: 'id_paquete', label: 'Paquetes turísticos',
    fields: [
      ['nombre', 'Nombre', 'text', true], ['slug', 'Identificador único (slug)', 'text', true],
      ['descripcion', 'Descripción', 'textarea', true], ['duracion', 'Duración', 'text'],
      ['incluye', 'Qué incluye (un servicio por línea)', 'textarea'],
      ['precio', 'Precio (S/)', 'number', true], ['imagen_url', 'URL de imagen', 'url'], ['publicado', 'Publicado', 'boolean']
    ]
  },
  agropecuaria: {
    pk: 'id_producto', label: 'Agropecuaria',
    fields: [
      ['nombre', 'Nombre', 'text', true], ['descripcion', 'Descripción', 'textarea', true],
      ['categoria', 'Categoría', 'text'], ['imagen_url', 'URL de imagen', 'url'], ['publicado', 'Publicado', 'boolean']
    ]
  },
  festividades: {
    pk: 'id_festividad', label: 'Festividades',
    fields: [
      ['nombre', 'Nombre', 'text', true], ['descripcion', 'Descripción', 'textarea', true],
      ['fecha_evento', 'Fecha del evento', 'date'], ['lugar', 'Lugar', 'text'],
      ['imagen_url', 'URL de imagen', 'url'], ['publicado', 'Publicado', 'boolean']
    ]
  }
};

const demo = {
  atractivos_turisticos: [
    {id_atractivo:1,nombre:'Río Cañete',descripcion:'Descubre el entorno natural del río y los paisajes que caracterizan a Lunahuaná.',ubicacion:'Valle de Lunahuaná',publicado:true},
    {id_atractivo:2,nombre:'Plaza de Armas',descripcion:'Un espacio tradicional para disfrutar el ambiente del pueblo y su historia.',ubicacion:'Centro de Lunahuaná',publicado:true},
    {id_atractivo:3,nombre:'Bodegas del valle',descripcion:'Conoce la historia de la elaboración local de productos de uva.',ubicacion:'Lunahuaná, Cañete',publicado:true}
  ],
  actividades: [
    {id_actividad:1,nombre:'Canotaje',slug:'canotaje',descripcion:'Experiencia turística en el entorno del río.',duracion:'Consultar',precio:50,publicado:true},
    {id_actividad:2,nombre:'Cuatrimoto',slug:'cuatrimoto',descripcion:'Actividad turística para conocer paisajes de la zona.',duracion:'30 min',precio:60,publicado:true},
    {id_actividad:3,nombre:'Canopy',slug:'canopy',descripcion:'Actividad turística al aire libre.',duracion:'Consultar',precio:40,publicado:true},
    {id_actividad:4,nombre:'Paseo a caballo',slug:'paseo-a-caballo',descripcion:'Paseo tradicional por los alrededores.',duracion:'1 hora',precio:40,publicado:true}
  ],
  paquetes_turisticos: [
    {id_paquete:1,nombre:'Aventura en Lunahuaná',slug:'aventura-en-lunahuana',incluye:"Canotaje\nPaseo en cuatrimoto\nEquipo de seguridad\nGuía especializado",descripcion:'Una selección de experiencias para visitar el valle.',duracion:'Medio día',precio:120,publicado:true},
    {id_paquete:4,nombre:'Experiencia Extrema',slug:'experiencia-extrema',incluye:"Canotaje\nCanopy\nRapel\nEquipo de protección",descripcion:'Selección de actividades de aventura con operadores especializados.',duracion:'Medio día',precio:160,publicado:true},
    {id_paquete:2,nombre:'Ruta Natural',slug:'ruta-natural',incluye:"Visita a Catapalla\nRecorrido por bodegas\nVisita a miradores\nRecorrido por el valle",descripcion:'Una opción para descubrir paisajes y sitios de interés.',duracion:'Día completo',precio:100,publicado:true},
    {id_paquete:3,nombre:'Experiencia Familiar',slug:'experiencia-familiar',incluye:"Recorrido por la plaza\nVisita a centros apícolas\nPaseo recreativo\nVisita a Catapalla",descripcion:'Actividades y propuestas recreativas en el valle.',duracion:'Día completo',precio:180,publicado:true}
  ],
  agropecuaria: [
    {id_producto:1,nombre:'Uvas',descripcion:'Parte de la producción agrícola y vitivinícola del valle.',categoria:'Agricultura',publicado:true},
    {id_producto:2,nombre:'Productos del valle',descripcion:'Alimentos y cultivos ligados a la actividad local.',categoria:'Tradición',publicado:true}
  ],
  festividades: [
    {id_festividad:1,nombre:'Festival de la Uva, Vino y Canotaje',descripcion:'Celebración vinculada con productos y costumbres de la zona.',publicado:true},
    {id_festividad:2,nombre:'Fiestas Patronales',descripcion:'Encuentros y actividades tradicionales de la comunidad.',publicado:true}
  ]
};

const photos = {
  "rio": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/R%C3%ADo_Lunahuan%C3%A1.jpg/1280px-R%C3%ADo_Lunahuan%C3%A1.jpg",
  "plaza": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Plaza_de_armas_de_Lunahuan%C3%A1_Dic-2025.jpg/1280px-Plaza_de_armas_de_Lunahuan%C3%A1_Dic-2025.jpg",
  "puente": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Catapalla_Bridge%2C_Lunahuan%C3%A1%2C_Peru_%28Panoramic_view%29.jpg/1280px-Catapalla_Bridge%2C_Lunahuan%C3%A1%2C_Peru_%28Panoramic_view%29.jpg",
  "valle": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Pano_Lunahuan%C3%A1.jpg/1280px-Pano_Lunahuan%C3%A1.jpg",
  "campo": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Campo_de_Lunahuan%C3%A1.jpg/1280px-Campo_de_Lunahuan%C3%A1.jpg"
};
// Imágenes de referencia del entorno local, nunca de actividades no fotografiadas.
const normalizeName = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function attractionPhoto(row) {
  const name=normalizeName(row.nombre);
  if(name.includes('rio')) return photos.rio;
  if(name.includes('plaza')) return photos.plaza;
  if(name.includes('puente') || name.includes('catapalla')) return photos.puente;
  if(name.includes('bodega')) return photos.campo;
  return photos.valle;
}
function activityPhoto(row) { return row.slug==='canotaje' ? photos.rio : photos.valle; }
function packagePhoto(row) { return ({'aventura-en-lunahuana':photos.rio,'experiencia-extrema':photos.rio,'ruta-natural':photos.puente,'experiencia-familiar':photos.plaza})[row.slug] || photos.valle; }
function packageIncludes(row) {
  const items=String(row.incluye || '').split(/\r?\n/).map(v=>v.trim()).filter(Boolean);
  return `<div class="package-includes"><strong>¿Qué incluye?</strong>${items.length ? `<ul>${items.map(v=>`<li>${escapeHTML(v)}</li>`).join('')}</ul>` : '<span class="package-pending">Consultar servicios incluidos.</span>'}</div>`;
}

const state = { rows: {}, errors: {}, activeModule: 'atractivos_turisticos', currentOperation: 'create', currentRow: null };
const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = (value) => `S/ ${Number(value ?? 0).toFixed(2)}`;
const truncate = (value, size=160) => String(value || '').length > size ? String(value).slice(0,size-1)+'…' : String(value || '');
const localDate = (date = new Date()) => [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
const safePhoto = (value, fallback) => { try { const u = new URL(value); if (['https:','http:'].includes(u.protocol) && u.hostname !== 'images.unsplash.com' && !u.hostname.endsWith('.unsplash.com')) return u.href; } catch { /* use fallback */ } return fallback; };

function status(element, text, type = 'error') {
  const el = $(element); if (!el) return;
  el.textContent = text; el.classList.remove('success','error');
  if (text) el.classList.add(type);
}
function banner(text) { const el = $('#connectionBanner'); el.textContent = text; el.hidden = false; }
function initializeDb() {
  if (!window.supabase?.createClient) { banner('No se pudo cargar la biblioteca de Supabase. Comprueba tu conexión a Internet.'); return; }
  if (!SUPABASE_URL.startsWith('https://') || SUPABASE_PUBLISHABLE_KEY.startsWith('PEGA_AQUI')) {
    banner('VISTA DEMO: configura SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY en script.js para mostrar los datos de tus tablas y recibir reservas.');
    return;
  }
  try { db = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}); connected = true; }
  catch (error) { console.error(error); banner('No se pudo iniciar Supabase. Revisa tu URL y tu clave publicable.'); }
}

async function getTableRows(table) {
  if (!connected) return demo[table] || [];
  try {
    const pk = tables[table].pk;
    const {data,error} = await db.from(table).select('*').order(pk,{ascending:true}).limit(200);
    if (error) throw error;
    return data || [];
  } catch(error) {
    console.error(`Error cargando ${table}:`,error);
    state.errors[table] = error.message;
    return [];
  }
}

function emptyMarkup(table) {
  return `<div class="empty-state">${state.errors[table]
    ? `No se pudo consultar <strong>${escapeHTML(table)}</strong>: ${escapeHTML(state.errors[table])}. Comprueba los permisos <code>SELECT</code> y las políticas RLS de Supabase.`
    : 'Todavía no hay información publicada en esta sección.'}</div>`;
}
function imageMarkup(row, fallback, alt) {
  return `<img class="card-image" src="${escapeHTML(safePhoto(row.imagen_url,fallback))}" alt="${escapeHTML(alt)}" loading="lazy" onerror="this.onerror=()=>{this.hidden=true};this.src='${escapeHTML(fallback)}'">`;
}
function bookingButton(kind, id) { return `<button type="button" class="choose-experience" data-kind="${kind}" data-id="${id}">Reservar ↗</button>`; }

function drawAttractions() {
  const rows=state.rows.atractivos_turisticos || [];
  $('#attractionsGrid').innerHTML = rows.length ? rows.map((r,i) => `<article class="content-card">
    ${imageMarkup(r,attractionPhoto(r),`Entorno de ${r.nombre} en Lunahuaná`)}
    <div class="card-content"><span class="card-kicker">Descubre el valle</span><h3>${escapeHTML(r.nombre)}</h3><p>${escapeHTML(truncate(r.descripcion))}</p>
    <div class="card-footer"><span>⌖ ${escapeHTML(r.ubicacion || 'Lunahuaná, Perú')}</span><a href="#reservar">Conocer más ↗</a></div></div></article>`).join('') : emptyMarkup('atractivos_turisticos');
}
function drawActivities() {
  const rows=state.rows.actividades || [];
  $('#activitiesGrid').innerHTML=rows.length ? rows.map((r,i)=> `<article class="activity-card">
    ${imageMarkup(r,activityPhoto(r),`Entorno de Lunahuaná para ${r.nombre}`)}
    <button type="button" class="choose-experience" data-kind="actividad" data-id="${r.id_actividad}" aria-label="Seleccionar ${escapeHTML(r.nombre)}">↗</button>
    <h3>${escapeHTML(r.nombre)}</h3><span class="activity-meta">${money(r.precio)} · ${escapeHTML(r.duracion || 'Consultar duración')}</span></article>`).join('') : emptyMarkup('actividades');
}
function drawPackages() {
  const rows=state.rows.paquetes_turisticos || [];
  $('#packagesGrid').innerHTML=rows.length ? rows.map((r,i)=>`<article class="content-card">
    ${imageMarkup(r,packagePhoto(r),`Paisaje de referencia para ${r.nombre}`)}<div class="card-content"><span class="card-kicker">${escapeHTML(r.duracion || 'Paquete turístico')}</span><h3>${escapeHTML(r.nombre)}</h3>
    <p>${escapeHTML(r.descripcion || '')}</p>${packageIncludes(r)}<div class="card-footer"><span class="card-price">${money(r.precio)} <small>/ referencial</small></span>${bookingButton('paquete',r.id_paquete)}</div></div></article>`).join('') : emptyMarkup('paquetes_turisticos');
}
function drawAgro() {
  const rows=state.rows.agropecuaria||[];
  $('#agroList').innerHTML=rows.length ? rows.slice(0,5).map((r,i)=>`<article class="agro-item"><span class="agro-index">0${i+1}</span><div><strong>${escapeHTML(r.nombre)}</strong><p>${escapeHTML(truncate(r.descripcion,135))}</p></div></article>`).join('') : emptyMarkup('agropecuaria');
}
// PARCHE CULTURA VIVA V1
function festivalPhoto(row) {
  const name = normalizeName(row.nombre);
  const plaza = {src: photos.plaza, original: 'https://upload.wikimedia.org/wikipedia/commons/0/01/Plaza_de_armas_de_Lunahuan%C3%A1_Dic-2025.jpg', caption: 'Plaza de Armas e iglesia de Lunahuaná', credit: 'El Surquillano · CC0', source: 'https://commons.wikimedia.org/wiki/File:Plaza_de_armas_de_Lunahuan%C3%A1_Dic-2025.jpg'};
  let photo = plaza;
  if (name.includes('patronal')) photo = {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Procesi%C3%B3n_Se%C3%B1or_de_los_milagros_Lunahuana_2026_07.jpg/960px-Procesi%C3%B3n_Se%C3%B1or_de_los_milagros_Lunahuana_2026_07.jpg',
    original: 'https://upload.wikimedia.org/wikipedia/commons/7/71/Procesi%C3%B3n_Se%C3%B1or_de_los_milagros_Lunahuana_2026_07.jpg',
    caption: 'Tradición religiosa local: Señor de los Milagros', credit: 'Futuropopular · CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Procesi%C3%B3n_Se%C3%B1or_de_los_milagros_Lunahuana_2026_07.jpg'
  };
  else if (name.includes('uva') || name.includes('canotaje') || name.includes('vino')) photo = {
    src: photos.rio, original: 'https://upload.wikimedia.org/wikipedia/commons/5/5b/R%C3%ADo_Lunahuan%C3%A1.jpg',
    caption: 'Río Cañete, entorno del festival', credit: 'Kevo287 · CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:R%C3%ADo_Lunahuan%C3%A1.jpg'
  };
  else if (name.includes('patrias')) photo = {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Plaza_de_armas_de_Lunahuan%C3%A1_A1.jpg/960px-Plaza_de_armas_de_Lunahuan%C3%A1_A1.jpg',
    original: 'https://upload.wikimedia.org/wikipedia/commons/4/46/Plaza_de_armas_de_Lunahuan%C3%A1_A1.jpg',
    caption: 'Plaza de Armas de Lunahuaná', credit: 'El Surquillano · CC0', source: 'https://commons.wikimedia.org/wiki/File:Plaza_de_armas_de_Lunahuan%C3%A1_A1.jpg'
  };
  return photo;
}
function drawFestivals() {
  const rows = state.rows.festividades || [];
  const grid = $('#festivalsGrid');
  grid.innerHTML = rows.length ? rows.map(r => {
    const photo = festivalPhoto(r);
    const src = safePhoto(r.imagen_url, photo.src);
    const custom = src !== photo.src;
    return `<article class="festival-card festival-card--photo">
      <figure class="festival-figure">
        <img class="festival-photo" src="${escapeHTML(src)}" alt="${escapeHTML(custom ? r.nombre : photo.caption)}" loading="lazy" decoding="async">
        <figcaption class="festival-caption">${custom ? 'Imagen de la festividad' : `${escapeHTML(photo.caption)} · <a href="${escapeHTML(photo.source)}" target="_blank" rel="noopener noreferrer">${escapeHTML(photo.credit)}</a>`}</figcaption>
      </figure>
      <div class="festival-body"><span class="festival-icon" aria-hidden="true">✦</span><h3>${escapeHTML(r.nombre)}</h3><p>${escapeHTML(truncate(r.descripcion,165))}</p>${r.fecha_evento?`<span class="festival-date">${escapeHTML(r.fecha_evento)} · ${escapeHTML(r.lugar || 'Lunahuaná')}</span>`:''}</div>
    </article>`;
  }).join('') : emptyMarkup('festividades');
  grid.querySelectorAll('.festival-photo').forEach((img, i) => {
    const photo = festivalPhoto(rows[i]);
    const caption = img.nextElementSibling;
    const candidates = [...new Set([photo.src, photo.original])].filter(url => url !== img.getAttribute('src'));
    function fallback() {
      if (candidates.length) {
        img.alt = photo.caption;
        caption.textContent = photo.caption + ' · ';
        const link = document.createElement('a');
        link.href = photo.source; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = photo.credit;
        caption.appendChild(link);
        img.src = candidates.shift();
      } else {
        img.hidden = true;
        img.parentElement.classList.add('festival-photo-missing');
        caption.textContent = 'Fotografía no disponible temporalmente';
      }
    }
    img.addEventListener('error', fallback);
    if (img.complete && !img.naturalWidth) fallback();
  });
}
function drawBookingOptions() {
  const el=$('#bookingOption');
  el.replaceChildren(new Option('Selecciona una experiencia',''));
  const activities=state.rows.actividades||[];
  const packages=state.rows.paquetes_turisticos||[];
  if (activities.length) {
    const group=document.createElement('optgroup'); group.label='ACTIVIDADES';
    activities.forEach(r=>group.appendChild(new Option(`${r.nombre} — ${money(r.precio)}`,`actividad:${r.id_actividad}`)));
    el.appendChild(group);
  }
  if (packages.length) {
    const group=document.createElement('optgroup'); group.label='PAQUETES';
    packages.forEach(r=>group.appendChild(new Option(`${r.nombre} — ${money(r.precio)}`,`paquete:${r.id_paquete}`)));
    el.appendChild(group);
  }
}
function drawPublic() { drawAttractions(); drawActivities(); drawPackages(); drawAgro(); drawFestivals(); drawBookingOptions(); }
async function loadPublicData() {
  const moduleNames=Object.keys(demo);
  const results=await Promise.all(moduleNames.map(t=>getTableRows(t)));
  moduleNames.forEach((name,index)=>state.rows[name] = results[index].filter(row => row.publicado === true));
  drawPublic();
}

function selectExperience(kind,id) {
  const key=`${kind}:${id}`;
  if ([...$('#bookingOption').options].some(option=>option.value===key)) $('#bookingOption').value=key;
  $('#reservar').scrollIntoView({behavior:'smooth',block:'start'});
}
async function sendBooking(event) {
  event.preventDefault();
  const form=event.currentTarget;
  const btn=$('#bookingSubmit');
  const fd=new FormData(form);
  const [kind,rawId]=String(fd.get('opcion')||'').split(':');
  const date=String(fd.get('fecha')||''); const count=Number(fd.get('personas'));
  if (!['actividad','paquete'].includes(kind)||!/^\d+$/.test(rawId||'')) return status('#bookingFeedback','Selecciona una actividad o un paquete válido.');
  if(date<localDate()||!Number.isInteger(count)||count<1||count>100) return status('#bookingFeedback','Revisa la fecha y la cantidad de personas.');
  if(!connected) return status('#bookingFeedback','Configura primero tu conexión con Supabase en script.js para enviar reservas reales.');
  const payload={nombre:String(fd.get('nombre')||'').trim(),telefono:String(fd.get('telefono')||'').trim(),fecha:date,personas:count,
    id_actividad:kind==='actividad'?Number(rawId):null,id_paquete:kind==='paquete'?Number(rawId):null};
  if(!payload.nombre||!payload.telefono) return status('#bookingFeedback','Completa tu nombre y teléfono.');
  btn.disabled=true; const label=btn.innerHTML; btn.textContent='Enviando solicitud…';
  try {
    const {error}=await db.from('reservas').insert(payload);
    if(error) throw error;
    form.reset();$('#bookingDate').min=localDate();
    status('#bookingFeedback','¡Solicitud recibida! La coordinación está pendiente de confirmación.','success');
  } catch(error) {
    console.error('Error al reservar:',error);
    status('#bookingFeedback',`No se pudo enviar la reserva: ${error.message}`);
  } finally {btn.disabled=false;btn.innerHTML=label;}
}
async function sendContact(event) {
  event.preventDefault();
  if(!connected) return status('#contactFeedback','Configura primero Supabase para enviar mensajes reales.');
  const form=event.currentTarget;const fd=new FormData(form);
  const payload={nombre:String(fd.get('nombre')||'').trim(),telefono:String(fd.get('telefono')||'').trim()||null,
    correo:String(fd.get('correo')||'').trim()||null,mensaje:String(fd.get('mensaje')||'').trim()};
  if(!payload.nombre||!payload.mensaje) return status('#contactFeedback','Completa tu nombre y mensaje.');
  const btn=$('#contactSubmit'),label=btn.innerHTML;btn.disabled=true;btn.textContent='Enviando…';
  try {const {error}=await db.from('mensajes_contacto').insert(payload);if(error) throw error;form.reset();status('#contactFeedback','Tu mensaje fue enviado correctamente.','success');}
  catch(error){console.error('Error al enviar contacto:',error);status('#contactFeedback',`Error al enviar el mensaje: ${error.message}`);}
  finally{btn.disabled=false;btn.innerHTML=label;}
}

async function loadPublicConfig() {
  if (!connected) return;
  try {
    const response=await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/admin-api`, {
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_PUBLISHABLE_KEY},
      body:JSON.stringify({action:'public_config'}),
      cache:'no-store'
    });
    if(!response.ok) return; // El sitio sigue funcionando si aún no se desplegó la función.
    const data=await response.json();
    const config=data.config||{};
    if(config.nombre_sitio) document.title=`${config.nombre_sitio} | Turismo y naturaleza`;
    if(config.descripcion_sitio) document.querySelector('meta[name="description"]').content=config.descripcion_sitio;
    if(config.ubicacion) $('#publicLocation').textContent=`⌖ ${config.ubicacion}`;
    if(config.telefono_contacto) {
      $('#publicPhone').textContent=`Teléfono: ${config.telefono_contacto}`;
      $('#publicPhone').hidden=false;
    } else $('#publicPhone').hidden=true;
    if(config.correo_contacto) {
      $('#publicEmail').textContent=`Correo: ${config.correo_contacto}`;
      $('#publicEmail').hidden=false;
    } else $('#publicEmail').hidden=true;
  } catch(error) {
    console.warn('Configuración pública no disponible todavía:',error);
  }
}

// ============================================================
// ADMINISTRACIÓN SIN CONTRASEÑA.
// El correo recibe un enlace temporal de Supabase Auth.
// La Edge Function verifica el usuario y la lista ADMIN_EMAIL.
// ============================================================
let adminBusy = false;
let adminAuthorized = false;
let restoringAdmin = false;
const adminPendingKey = 'solyrio:admin-access-pending';
state.adminRows = {};

function adminReturnExpected() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('admin') === '1') return true;
  // El enlace de Gmail puede abrirse en otra pestaña: localStorage conserva
  // el indicador de retorno sin almacenar contraseñas ni tokens privados.
  try {
    const stamp = Number(localStorage.getItem(adminPendingKey) || '0');
    if (stamp && Date.now() - stamp < 60 * 60 * 1000) return true;
    if (stamp) localStorage.removeItem(adminPendingKey);
  } catch { /* El acceso manual siempre sigue disponible. */ }
  return false;
}
function forgetPendingAdmin() {
  try { localStorage.removeItem(adminPendingKey); } catch { /* opcional */ }
  const url = new URL(window.location.href);
  if (url.searchParams.has('admin')) {
    url.searchParams.delete('admin');
    history.replaceState({}, '', url.pathname + url.search + url.hash);
  }
}
async function resumeAdminFromEmail() {
  if (!connected || restoringAdmin || !adminReturnExpected()) return;
  restoringAdmin = true;
  try {
    const { data: { session }, error } = await db.auth.getSession();
    if (error) throw error;
    if (!session) return; // Espera a SIGNED_IN si la URL aún se está procesando.
    await adminRequest('verify');
    adminAuthorized = true;
    forgetPendingAdmin();
    if ($('#adminAccessDialog').open) $('#adminAccessDialog').close();
    revealAdmin(true);
    $('#adminIdentity').textContent = session.user?.email || 'Administrador autorizado';
    await Promise.all([loadAdminStats(), loadAdminModule()]);
  } catch (error) {
    console.error('No se pudo abrir el panel después del correo:', error);
    forgetPendingAdmin();
    status('#accessFeedback', `No se pudo verificar el acceso: ${error.message}`);
    if (!$('#adminAccessDialog').open) $('#adminAccessDialog').showModal();
  } finally {
    restoringAdmin = false;
  }
}


const adminTables = {
  ...tables,
  reservas: {
    pk: 'id_reserva', label: 'Reservas',
    fields: [
      ['nombre', 'Nombre del visitante', 'text', true],
      ['telefono', 'Teléfono', 'tel', true],
      ['fecha', 'Fecha de visita', 'date', true],
      ['personas', 'Personas', 'integer', true],
      ['id_actividad', 'Actividad (elige solo una opción)', 'actividad'],
      ['id_paquete', 'Paquete (elige solo una opción)', 'paquete'],
      ['estado', 'Estado', 'select', true, ['Pendiente','Confirmada','Cancelada','Finalizada']]
    ]
  },
  mensajes_contacto: {
    pk: 'id_mensaje', label: 'Mensajes',
    fields: [
      ['nombre', 'Nombre del visitante', 'text', true],
      ['telefono', 'Teléfono', 'tel'],
      ['correo', 'Correo electrónico', 'email'],
      ['mensaje', 'Mensaje', 'textarea', true],
      ['estado', 'Estado', 'select', true, ['Nuevo','Leido','Respondido']]
    ]
  },
  configuracion: {
    pk: 'id_configuracion', label: 'Configuración',
    fields: [['clave','Clave','text',true], ['valor','Valor','textarea']]
  }
};

async function adminRequest(action, parameters = {}) {
  if (!connected) throw new Error('Configura primero Supabase en script.js.');
  const { data: { session }, error: sessionError } = await db.auth.getSession();
  if (sessionError || !session?.access_token) {
    adminAuthorized = false;
    throw new Error('Verifica tu correo para acceder a la administración.');
  }
  const endpoint = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/admin-api`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_PUBLISHABLE_KEY,
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ action, ...parameters }),
    cache: 'no-store'
  });
  const result = await response.json().catch(() => ({}));
  if (response.status === 401 || response.status === 403) {
    adminAuthorized = false;
    throw new Error(result.error || 'Este correo no está autorizado para administrar el sitio.');
  }
  if (!response.ok || !result.ok) {
    throw new Error(result.error || `Error en admin-api (HTTP ${response.status}).`);
  }
  return result;
}

async function openAdminAccess() {
  if (!connected) {
    banner('Primero configura la URL y la clave publicable de Supabase en script.js.');
    return;
  }
  // La sesión del correo confirmado se reutiliza aunque el enlace te devuelva
  // al inicio en vez de agregar ?admin=1.
  try {
    const {data: {session}, error: sessionError} = await db.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session) {
      status('#accessFeedback', 'Introduce el correo autorizado para recibir tu enlace.');
      if (!$('#adminAccessDialog').open) $('#adminAccessDialog').showModal();
      $('#adminEmail').focus();
      return;
    }
    await adminRequest('verify');
    adminAuthorized = true;
    forgetPendingAdmin();
    if ($('#adminAccessDialog').open) $('#adminAccessDialog').close();
    revealAdmin(true);
    $('#adminIdentity').textContent = session.user?.email || 'Administrador autorizado';
    await Promise.all([loadAdminStats(), loadAdminModule()]);
  } catch (error) {
    // Distinguimos el error de la API de un caso sin sesión.
    status('#accessFeedback', `No se pudo comprobar el acceso: ${error.message}`);
    if (!$('#adminAccessDialog').open) $('#adminAccessDialog').showModal();
    $('#adminEmail').focus();
  }
}

async function sendAdminLink(event) {
  event.preventDefault();
  if (adminBusy || !connected) return;
  const email = $('#adminEmail').value.trim().toLowerCase();
  if (!email) return status('#accessFeedback','Ingresa tu correo electrónico.');
  adminBusy = true;
  const button = $('#accessSubmit');
  button.disabled = true;
  button.textContent = 'Enviando enlace…';
  try {
    // El enlace regresará a esta misma página y abrirá Administración.
    const url = new URL(window.location.href);
    url.searchParams.set('admin', '1');
    url.hash = '';
    try { localStorage.setItem(adminPendingKey, String(Date.now())); } catch { /* opcional */ }
    const { error } = await db.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: url.toString() }
    });
    if (error) throw error;
    status('#accessFeedback', 'Revisa tu correo y abre el enlace. Al regresar al sitio se abrirá el panel; si vuelves al inicio, pulsa Administración.', 'success');
  } catch (error) {
    forgetPendingAdmin();
    console.error('No se pudo enviar el enlace:',error);
    status('#accessFeedback',`No se pudo enviar el enlace: ${error.message}`);
  } finally {
    adminBusy = false;
    button.disabled = false;
    button.textContent = 'Enviar enlace a mi correo →';
  }
}

async function signOutAdmin() {
  if (connected) await db.auth.signOut();
  adminAuthorized = false;
  forgetPendingAdmin();
  revealAdmin(false);
  status('#accessFeedback', 'Se cerró el acceso de administración.', 'success');
}

function forgetAdmin() {
  state.adminRows = {};
  $('#adminBody').innerHTML = '<tr><td colspan="3">Para ver los registros, abre la administración.</td></tr>';
  $('#editorDialog').close();
  status('#adminFeedback','');
  $('#adminIdentity').textContent = 'Acceso protegido';
  $('#adminRecentBookings').innerHTML = '<p class="admin-recent-empty">Verifica tu acceso para consultar reservas.</p>';
  $('#adminRecentMessages').innerHTML = '<p class="admin-recent-empty">Verifica tu acceso para consultar mensajes.</p>';
  $('#adminRecordCount').textContent = '— registros';
}

async function loadAdminStats() {
  try {
    const { counts } = await adminRequest('summary');
    const statMap = {
      atractivos_turisticos: '#statAttractions',
      actividades: '#statActivities',
      paquetes_turisticos: '#statPackages',
      festividades: '#statFestivals',
      reservas: '#statBookings',
      mensajes_contacto: '#statMessages'
    };
    Object.entries(statMap).forEach(([name, selector]) => {
      $(selector).textContent = counts[name] ?? '—';
    });
    $('#statPending').textContent = `${counts.reservas_pendientes ?? '—'} pendientes`;
    $('#statNewMessages').textContent = `${counts.mensajes_nuevos ?? '—'} nuevos`;
    await loadAdminRecent();
  } catch(error) {
    status('#adminFeedback',`Estadísticas: ${error.message}`);
  }
}

async function loadAdminRecent() {
  if (!adminAuthorized) return;
  try {
    const [bookings, messages] = await Promise.all([
      adminRequest('list', {table:'reservas'}),
      adminRequest('list', {table:'mensajes_contacto'})
    ]);
    state.adminRows.reservas = bookings.records;
    state.adminRows.mensajes_contacto = messages.records;
    $('#adminRecentBookings').innerHTML = bookings.records.length
      ? bookings.records.slice(0,4).map(item=>`<div class="admin-recent-entry"><div><strong>${escapeHTML(item.nombre)}</strong><small>${escapeHTML(item.fecha)} · ${item.personas} persona(s)</small></div><span class="status-chip">${escapeHTML(item.estado)}</span></div>`).join('')
      : '<p class="admin-recent-empty">No hay reservas registradas.</p>';
    $('#adminRecentMessages').innerHTML = messages.records.length
      ? messages.records.slice(0,4).map(item=>`<div class="admin-recent-entry"><div><strong>${escapeHTML(item.nombre)}</strong><small>${escapeHTML(truncate(item.mensaje,72))}</small></div><span class="status-chip">${escapeHTML(item.estado)}</span></div>`).join('')
      : '<p class="admin-recent-empty">No hay mensajes recibidos.</p>';
  } catch (error) {
    $('#adminRecentBookings').innerHTML = '<p class="admin-recent-empty">No se pudieron cargar las reservas.</p>';
    $('#adminRecentMessages').innerHTML = '<p class="admin-recent-empty">No se pudieron cargar los mensajes.</p>';
    console.error('Error de resumen administrativo:', error);
  }
}

function recordTitle(table, row) {
  if (table === 'reservas') return `${row.nombre || 'Visitante'} · Reserva #${row.id_reserva}`;
  if (table === 'mensajes_contacto') return `${row.nombre || 'Visitante'} · Mensaje #${row.id_mensaje}`;
  if (table === 'configuracion') return row.clave;
  return row.nombre;
}

function recordDescription(table, row) {
  if (table === 'reservas') {
    const kind = row.id_actividad
      ? (state.adminRows.actividades || state.rows.actividades || []).find(a => Number(a.id_actividad) === Number(row.id_actividad))?.nombre || `Actividad #${row.id_actividad}`
      : (state.adminRows.paquetes_turisticos || state.rows.paquetes_turisticos || []).find(p => Number(p.id_paquete) === Number(row.id_paquete))?.nombre || `Paquete #${row.id_paquete}`;
    return `${row.fecha} · ${row.personas} persona(s) · ${kind} · Tel: ${row.telefono}`;
  }
  if (table === 'mensajes_contacto') return `${row.telefono || row.correo || 'Sin contacto'} · ${truncate(row.mensaje, 130)}`;
  if (table === 'configuracion') return truncate(row.valor, 150);
  return truncate(row.descripcion, 130);
}

function recordState(table,row) {
  if (table === 'reservas' || table === 'mensajes_contacto') return row.estado;
  if (table === 'configuracion') return 'Configurado';
  return row.publicado ? 'Publicado' : 'Oculto';
}

function drawAdmin() {
  const name = state.activeModule;
  const conf = adminTables[name];
  const rows = state.adminRows[name];
  const search = ($('#adminSearch').value || '').trim().toLocaleLowerCase('es');
  const filtered = rows ? rows.filter(row => Object.values(row).some(value =>
    String(value ?? '').toLocaleLowerCase('es').includes(search))) : null;
  $('#adminRecordCount').textContent = rows ? `${filtered.length} de ${rows.length} registros` : 'Cargando…';
  if (!conf) return;
  $$('.tabs button').forEach(button => button.classList.toggle('active',button.dataset.module===name));
  $('#adminHead').innerHTML = '<tr><th>Registro</th><th>Estado</th><th>Acciones</th></tr>';
  $('#newRecord').textContent = `+ ${name==='reservas' ? 'Nueva reserva' : name==='mensajes_contacto' ? 'Nuevo mensaje' : 'Nuevo registro'}`;
  if (!rows) {
    $('#adminBody').innerHTML='<tr><td colspan="3">Cargando información...</td></tr>';
    return;
  }
  $('#adminBody').innerHTML = filtered.length ? filtered.map(row => {
    const id = Number(row[conf.pk]);
    const stateLabel = recordState(name,row);
    const off = ['Oculto','Cancelada','Anulado','Pendiente','Nuevo'].includes(stateLabel);
    return `<tr><td><span class="row-name">${escapeHTML(recordTitle(name,row))}</span>
      <span class="row-sub">${escapeHTML(recordDescription(name,row))}</span></td>
      <td><span class="status-chip ${off?'off':''}">${escapeHTML(stateLabel)}</span></td>
      <td><button class="row-action" data-edit="${id}" type="button">Editar</button>
      <button class="row-action danger" data-remove="${id}" type="button">Eliminar</button></td></tr>`;
  }).join('') : `<tr><td colspan="3">${rows.length ? 'No se encontraron coincidencias.' : 'Todavía no hay registros en este módulo.'}</td></tr>`;
}

async function loadAdminModule() {
  const table = state.activeModule;
  drawAdmin();
  try {
    const { records } = await adminRequest('list', { table });
    state.adminRows[table] = records;
    drawAdmin();
    status('#adminFeedback',`Se cargaron ${records.length} registro(s) de ${adminTables[table].label}.`,'success');
  } catch(error) {
    console.error('Error de lectura administrativa:',error);
    status('#adminFeedback',`No se pudieron cargar los registros: ${error.message}`);
  }
}

function revealAdmin(show) {
  $('#publicView').hidden=show;
  $('#adminView').hidden=!show;
  $('#mainNav').classList.remove('open');
  $('#menuToggle').setAttribute('aria-expanded','false');
  window.scrollTo({top:0,behavior:'smooth'});
  if(show) drawAdmin();
  else forgetAdmin();
}

function makeOption(value,text) {
  const el=document.createElement('option');
  el.value=String(value);
  el.textContent=text;
  return el;
}

function createEditorField([key,label,type,required,options], row) {
  const wrapper=document.createElement('div');
  wrapper.className='editor-field'+(type==='textarea'?' wide':'')+(type==='boolean'?' checkbox-field':'');
  const isSelect=['select','actividad','paquete'].includes(type);
  const input=document.createElement(type==='textarea'?'textarea':isSelect?'select':'input');
  input.name=key;
  input.id='edit_'+key;
  if(type==='textarea') { input.rows=4; input.value=row?.[key] ?? ''; if(key==='incluye') {input.maxLength=5000;input.placeholder='Canotaje\nGuía especializado\nEquipo de seguridad';} }
  else if(type==='boolean') {
    input.type='checkbox';
    input.checked=row?Boolean(row[key]):true;
  } else if(isSelect) {
    input.appendChild(makeOption('',required?'Selecciona una opción':'Sin seleccionar'));
    if(type==='select') {
      (options||[]).forEach(value=>input.appendChild(makeOption(value,value)));
    } else {
      const table=type==='actividad'?'actividades':'paquetes_turisticos';
      const idName=type==='actividad'?'id_actividad':'id_paquete';
      (state.adminRows[table]||state.rows[table]||[]).forEach(r=>input.appendChild(makeOption(r[idName],`${r.nombre} · ${money(r.precio)}`)));
    }
    input.value=row?.[key] ?? (type==='select'?options?.[0]||'':'');
  } else {
    input.type=type==='integer'?'number':type;
    input.value=row?.[key] ?? '';
    if(type==='number'||type==='integer') {
      input.min=type==='integer'?'1':'0';
      input.step=type==='integer'?'1':'0.01';
    }
    if(type==='url')input.placeholder='https://ejemplo.com/imagen.jpg';
  }
  input.required=Boolean(required);
  const caption=document.createElement('label');
  caption.setAttribute('for',input.id);
  caption.textContent=label;
  wrapper.append(caption,input);
  return wrapper;
}

async function openEditor(mode, row=null) {
  if (!adminAuthorized) return openAdminAccess();
  state.currentOperation=mode;
  state.currentRow=row;
  const conf=adminTables[state.activeModule];
  $('#editorTitle').textContent=(mode==='create'?'Agregar':'Editar')+' · '+conf.label;
  status('#editorFeedback','');
  // Cargamos las opciones completas, incluso las no publicadas.
  if (state.activeModule === 'reservas') {
    try {
      for (const name of ['actividades','paquetes_turisticos']) {
        if (!state.adminRows[name]) {
          const { records } = await adminRequest('list', {table:name});
          state.adminRows[name]=records;
        }
      }
    } catch(error) {
      status('#adminFeedback',`No se pudieron cargar las opciones: ${error.message}`);
      return;
    }
  }
  const fields=$('#editorFields');fields.replaceChildren();
  conf.fields.forEach(field=>fields.append(createEditorField(field,row)));
  $('#editorDialog').showModal();
}

function getEditorPayload() {
  const conf=adminTables[state.activeModule];
  const form=new FormData($('#editorForm'));
  const record={};
  for (const [key,label,type,required] of conf.fields) {
    let value=type==='boolean'?form.has(key):String(form.get(key)||'').trim();
    if (required && (value===''||value===null)) throw new Error(`Completa el campo «${label}».`);
    if (type==='number'||type==='integer'||type==='actividad'||type==='paquete') {
      value=value===''?null:Number(value);
      if(value!==null && (!Number.isFinite(value)||(type==='integer'&&(!Number.isInteger(value)||value<1))))
        throw new Error(`El campo «${label}» debe contener un número válido.`);
    } else if(type!=='boolean'&&value==='') value=null;
    record[key]=value;
  }
  if (state.activeModule==='reservas' && Boolean(record.id_actividad)===Boolean(record.id_paquete))
    throw new Error('Elige exactamente una actividad o un paquete.');
  return record;
}

async function saveEditor(event) {
  event.preventDefault();
  if(adminBusy)return;
  let record;
  try { record=getEditorPayload(); }
  catch(error) { status('#editorFeedback',error.message); return; }
  const table=state.activeModule;
  const pk=adminTables[table].pk;
  const id=state.currentOperation==='edit'?Number(state.currentRow[pk]):null;
  const saveButton=$('#saveRecord');
  saveButton.disabled=true;
  saveButton.textContent='Guardando…';
  adminBusy=true;
  try {
    await adminRequest('save',{table,id,record});
    $('#editorDialog').close();
    await Promise.all([loadAdminModule(),loadPublicData(),loadAdminStats(),loadPublicConfig()]);
    status('#adminFeedback',id?'Registro actualizado en Supabase.':'Registro agregado a Supabase.','success');
  } catch(error) {
    console.error('Error de escritura:',error);
    status('#editorFeedback',`No se pudo guardar: ${error.message}`);
  } finally {
    adminBusy=false;
    saveButton.disabled=false;
    saveButton.textContent='Guardar cambios →';
  }
}

async function removeRecord(row) {
  const table=state.activeModule;
  const pk=adminTables[table].pk;
  const id=Number(row[pk]);
  if (!confirm(`¿Eliminar «${recordTitle(table,row)}» de Supabase? Esta acción es definitiva.`)) return;
  try {
    await adminRequest('delete',{table,id});
    await Promise.all([loadAdminModule(),loadPublicData(),loadAdminStats(),loadPublicConfig()]);
    status('#adminFeedback','Registro eliminado de Supabase correctamente.','success');
  } catch(error) {
    status('#adminFeedback',`No se pudo eliminar: ${error.message}`);
  }
}

function wireEvents(){
  $('#currentYear').textContent=new Date().getFullYear();
  $('#bookingDate').min=localDate();
  $('#menuToggle').addEventListener('click',()=>{
    const open=$('#mainNav').classList.toggle('open');
    $('#menuToggle').setAttribute('aria-expanded',String(open));
  });
  $$('#mainNav a').forEach(link=>link.addEventListener('click',()=>{
    $('#mainNav').classList.remove('open');
    $('#menuToggle').setAttribute('aria-expanded','false');
  }));
  $('#openAdmin').addEventListener('click',openAdminAccess);
  $('#adminLogout').addEventListener('click',signOutAdmin);
  $('#backToSite').addEventListener('click',()=>revealAdmin(false));
  $('#bookingForm').addEventListener('submit',sendBooking);
  $('#contactForm').addEventListener('submit',sendContact);
  document.addEventListener('click',event=>{
    const button=event.target.closest('.choose-experience');
    if(button) selectExperience(button.dataset.kind,button.dataset.id);
  });
  $$('.tabs button').forEach(btn=>btn.addEventListener('click',()=>{
    state.activeModule=btn.dataset.module;
    $('#adminSearch').value='';
    loadAdminModule();
  }));
  $('#adminSearch').addEventListener('input',drawAdmin);
  $$('[data-goto-module]').forEach(btn=>btn.addEventListener('click',()=>{
    state.activeModule=btn.dataset.gotoModule;
    $('#adminSearch').value='';
    loadAdminModule();
    $('#adminBody').scrollIntoView({behavior:'smooth',block:'nearest'});
  }));
  $('#adminRefresh').addEventListener('click',async()=>{
    await Promise.all([loadAdminModule(),loadAdminStats(),loadPublicData()]);
  });
  $('#newRecord').addEventListener('click',()=>openEditor('create'));
  $('#adminBody').addEventListener('click',event=>{
    const edit=event.target.closest('[data-edit]');
    const remove=event.target.closest('[data-remove]');
    if(!edit&&!remove)return;
    const id=Number((edit||remove).dataset[edit?'edit':'remove']);
    const table=state.activeModule;
    const row=(state.adminRows[table]||[]).find(r=>Number(r[adminTables[table].pk])===id);
    if(!row)return;
    if(edit)openEditor('edit',row);else removeRecord(row);
  });
  $('#editorForm').addEventListener('submit',saveEditor);
  $('#closeEditor').addEventListener('click',()=>$('#editorDialog').close());
  $('#cancelEditor').addEventListener('click',()=>$('#editorDialog').close());
  $('#adminAccessForm').addEventListener('submit',sendAdminLink);
  $('#closeAccess').addEventListener('click',()=>$('#adminAccessDialog').close());
  $('#cancelAccess').addEventListener('click',()=>$('#adminAccessDialog').close());
}

async function start(){
  wireEvents();
  initializeDb();
  if (connected) {
    // La sesión puede resolverse un poco después del retorno desde Gmail.
    db.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session && adminReturnExpected()) {
        setTimeout(resumeAdminFromEmail, 0);
      }
    });
    // No esperamos las imágenes o el catálogo para procesar la sesión.
    await resumeAdminFromEmail();
  }
  await Promise.all([loadPublicData(),loadPublicConfig()]);
}
window.addEventListener('DOMContentLoaded',start);
