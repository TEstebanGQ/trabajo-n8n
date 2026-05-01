/* ── CONFIG ── */
const IS_LOCAL = ['localhost','127.0.0.1'].includes(location.hostname);
const WEBHOOK   = IS_LOCAL
  ? 'https://tomas-jk-esteban.app.n8n.cloud/webhook-test/inasistencia'
  : 'https://tomas-jk-esteban.app.n8n.cloud/webhook/inasistencia';
const BOT = 'alertas_2026_ia_bot';
const MAX_MB = 10;
const TIPOS  = ['application/pdf','image/jpeg','image/png','image/jpg'];

/* ── ESTADO LOCAL (detectar duplicados del mismo navegador) ── */
const enviados = JSON.parse(localStorage.getItem('inasistencias_enviadas') || '[]');

/* ── HELPERS ── */
const $  = id => document.getElementById(id);
const show = id => $(id).classList.add('show');
const hide = id => $(id).classList.remove('show');
const setValid   = id => { $(id).classList.remove('invalid'); $(id).classList.add('valid'); };
const setInvalid = id => { $(id).classList.add('invalid'); $(id).classList.remove('valid'); };
const clearMark  = id => { $(id).classList.remove('invalid','valid'); };

/* ── VALIDACIONES (espejo de n8n, pero en cliente) ── */
function validarNombre(v) {
  v = v.trim();
  if (!v || v.length < 3) return 'Nombre inválido (mínimo 3 caracteres)';
  if (!/^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s'\-]+$/.test(v)) return 'Solo letras y espacios';
  if (v.split(/\s+/).filter(Boolean).length < 2) return 'Ingresa nombre y apellido';
  return null;
}
function validarID(v) {
  v = v.trim();
  if (!v) return 'Obligatorio';
  if (!/^\d+$/.test(v)) return 'Solo dígitos (0-9)';
  if (v.length < 6) return 'Mínimo 6 dígitos';
  if (v.length > 12) return 'Máximo 12 dígitos';
  return null;
}
function validarCorreo(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? null : 'Correo inválido';
}
function validarFecha(v) {
  if (!v) return 'Requerida';
  const sel = new Date(v + 'T00:00:00');
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const hace1a = new Date(hoy); hace1a.setFullYear(hace1a.getFullYear()-1);
  if (sel > hoy) return 'No puede ser una fecha futura';
  if (sel < hace1a) return 'No puede ser mayor a 1 año atrás';
  return null;
}
function validarDesc(v) {
  v = v.trim();
  if (!v || v.length < 20) return 'Mínimo 20 caracteres';
  if (v.length > 1000) return 'Máximo 1000 caracteres';
  return null;
}

/* ── VALIDACIÓN EN TIEMPO REAL ── */
function attachLive(id, fn, errId) {
  $(id).addEventListener('input', () => {
    const err = fn($(id).value);
    if (err) { setInvalid(id); show(errId); $( errId).textContent = '⚠ ' + err; }
    else      { setValid(id);   hide(errId); }
    actualizarProgreso();
  });
  $(id).addEventListener('blur', () => {
    const err = fn($(id).value);
    if (err) { setInvalid(id); show(errId); $(errId).textContent = '⚠ ' + err; }
  });
}
attachLive('nombre',    validarNombre,  'err-nombre');
attachLive('id_estudiante', validarID, 'err-id');
attachLive('correo',    validarCorreo,  'err-correo');
attachLive('fecha_inasistencia', validarFecha, 'err-fecha');

/* ── DETECCIÓN LOCAL DE DUPLICADO ── */
$('fecha_inasistencia').addEventListener('change', () => {
  const id    = $('id_estudiante').value.trim();
  const fecha = $('fecha_inasistencia').value;
  const clave = id + '_' + fecha;
  if (id && fecha && enviados.includes(clave)) {
    $('alert-dup').classList.add('show');
  } else {
    $('alert-dup').classList.remove('show');
  }
});
$('id_estudiante').addEventListener('input', () => {
  const id    = $('id_estudiante').value.trim();
  const fecha = $('fecha_inasistencia').value;
  const clave = id + '_' + fecha;
  if (id && fecha && enviados.includes(clave)) {
    $('alert-dup').classList.add('show');
  } else {
    $('alert-dup').classList.remove('show');
  }
});

/* ── TEXTAREA contador ── */
$('descripcion').addEventListener('input', () => {
  const n = $('descripcion').value.length;
  const cc = $('char-count');
  cc.textContent = n + ' / 1000';
  cc.className = 'char-count' + (n >= 1000 ? ' warn' : n >= 20 ? ' ok' : '');
  const err = validarDesc($('descripcion').value);
  if (err) { setInvalid('descripcion'); show('err-desc'); $('err-desc').textContent = '⚠ ' + err; }
  else      { setValid('descripcion');  hide('err-desc'); }
  actualizarProgreso();
});

/* ── SELECT motivo ── */
$('motivo').addEventListener('change', () => {
  if ($('motivo').value) { setValid('motivo'); hide('err-motivo'); }
  else                   { setInvalid('motivo'); }
  actualizarProgreso();
});

/* ── ARCHIVO ── */
$('archivo').addEventListener('change', e => procesarArchivo(e.target.files[0]));

function procesarArchivo(file) {
  hide('err-archivo'); hide('err-archivo-tipo'); hide('err-archivo-size');
  if (!file) return limpiarArchivo();
  if (!TIPOS.includes(file.type)) {
    show('err-archivo-tipo'); limpiarArchivo(true); return;
  }
  if (file.size > MAX_MB * 1024 * 1024) {
    show('err-archivo-size'); limpiarArchivo(true); return;
  }
  const ext = file.name.split('.').pop().toUpperCase();
  const kb  = (file.size / 1024).toFixed(0);
  $('file-icon').textContent = ext === 'PDF' ? '📄' : '🖼️';
  $('file-name').textContent = file.name;
  $('file-name').className   = 'file-name ok';
  $('file-meta').textContent = ext + ' · ' + kb + ' KB';
  $('file-zone').classList.add('has-file');
  actualizarProgreso();
}
function limpiarArchivo(keepInput) {
  if (!keepInput) $('archivo').value = '';
  $('file-icon').textContent = '📎';
  $('file-name').textContent = 'Haz clic o arrastra tu archivo aquí';
  $('file-name').className   = 'file-name';
  $('file-meta').textContent = 'PDF, JPG o PNG · máx. 10 MB';
  $('file-zone').classList.remove('has-file');
  actualizarProgreso();
}
function removeFile(e) {
  e.stopPropagation();
  limpiarArchivo();
}
function handleDrag(e, over) {
  e.preventDefault();
  $('file-zone').classList.toggle('dragover', over);
}
function handleDrop(e) {
  e.preventDefault();
  $('file-zone').classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) {
    const dt = new DataTransfer();
    dt.items.add(file);
    $('archivo').files = dt.files;
    procesarArchivo(file);
  }
}

/* ── PROGRESO ── */
function actualizarProgreso() {
  const campos = [
    !validarNombre($('nombre').value),
    !validarID($('id_estudiante').value),
    !validarCorreo($('correo').value),
    !validarFecha($('fecha_inasistencia').value),
    !!$('motivo').value,
    !validarDesc($('descripcion').value),
    !!($('archivo').files && $('archivo').files[0])
  ];
  const pct = (campos.filter(Boolean).length / campos.length) * 100;
  $('progress').style.width = pct + '%';
}

/* ── VALIDACIÓN COMPLETA AL ENVIAR ── */
function validarTodo() {
  let ok = true;
  const checks = [
    ['nombre',          validarNombre($('nombre').value),          'err-nombre'],
    ['id_estudiante',   validarID($('id_estudiante').value),       'err-id'],
    ['correo',          validarCorreo($('correo').value),          'err-correo'],
    ['fecha_inasistencia', validarFecha($('fecha_inasistencia').value), 'err-fecha'],
    ['descripcion',     validarDesc($('descripcion').value),       'err-desc'],
  ];
  checks.forEach(([id, err, errId]) => {
    if (err) { setInvalid(id); show(errId); $(errId).textContent = '⚠ ' + err; ok = false; }
    else     { setValid(id);   hide(errId); }
  });
  if (!$('motivo').value) {
    setInvalid('motivo'); show('err-motivo'); ok = false;
  }
  if (!$('archivo').files || !$('archivo').files[0]) {
    show('err-archivo'); ok = false;
  }
  return ok;
}

/* ── ENVÍO ── */
async function enviar() {
  if (!validarTodo()) {
    document.querySelector('.invalid')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  $('form').style.display = 'none';
  $('screen-loading').style.display = 'block';

  const pasos = ['Subiendo archivo...', 'Procesando datos...', 'Conectando con IA...'];
  let pi = 0;
  const stepInterval = setInterval(() => {
    if (pi < pasos.length) { $('loading-step').textContent = pasos[pi++]; }
  }, 1800);

  const fd = new FormData($('form'));
  try {
    const res  = await fetch(WEBHOOK, { method: 'POST', body: fd });
    const text = await res.text();
    let data = {};
    try { data = JSON.parse(text); } catch(_) {}

    clearInterval(stepInterval);

    if (!res.ok || data.success === false) {
      throw new Error(data.error || 'Error del servidor: ' + res.status);
    }

    /* Guardar en localStorage para detectar duplicados futuros */
    const clave = $('id_estudiante').value.trim() + '_' + $('fecha_inasistencia').value;
    enviados.push(clave);
    localStorage.setItem('inasistencias_enviadas', JSON.stringify(enviados));

    const id = data.id_solicitud || '';
    $('screen-loading').style.display = 'none';
    $('screen-success').style.display = 'block';
    $('res-id').textContent = id ? '#' + id : 'N/A';
    $('tg-link').href = `https://t.me/${BOT}?start=${id}`;

  } catch(err) {
    clearInterval(stepInterval);
    $('screen-loading').style.display = 'none';
    $('screen-error').style.display   = 'block';
    $('error-msg').textContent = err.message;
  }
}

/* ── REINTENTAR ── */
function reintentar() {
  $('screen-error').style.display = 'none';
  $('form').style.display = 'block';
}

/* ── FECHA MAX = HOY ── */
const hoy = new Date();
const yyyy = hoy.getFullYear(), mm = String(hoy.getMonth()+1).padStart(2,'0'), dd = String(hoy.getDate()).padStart(2,'0');
$('fecha_inasistencia').max = `${yyyy}-${mm}-${dd}`;
const hace1a = new Date(hoy); hace1a.setFullYear(hace1a.getFullYear()-1);
const y2 = hace1a.getFullYear(), m2 = String(hace1a.getMonth()+1).padStart(2,'0'), d2 = String(hace1a.getDate()).padStart(2,'0');
$('fecha_inasistencia').min = `${y2}-${m2}-${d2}`;