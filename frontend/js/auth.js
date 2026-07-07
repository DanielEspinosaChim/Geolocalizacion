/* ══════════════════════════════════════════════════════════════════════════
   auth.js — Firebase Auth + roles (admin / tecnico)
   ══════════════════════════════════════════════════════════════════════════ */

window._currentUser  = null;   // { uid, email, role, token }
window._authReady    = false;

// ── Login screen — overlay (no reemplaza el body para evitar doble reload) ───

function _renderLoginScreen() {
  if (document.getElementById('login-overlay')) return; // ya visible
  const overlay = document.createElement('div');
  overlay.id = 'login-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;' +
    'justify-content:center;background:radial-gradient(ellipse at 30% 40%, #0f2660 0%, #070f1f 60%)';
  overlay.innerHTML = `
  <div id="login-wrap" style="background:#0d1830;border:1px solid #1a2d56;border-radius:20px;padding:44px;width:380px;
              max-width:95vw;box-shadow:0 32px 80px rgba(0,0,0,.7),0 0 0 1px rgba(59,130,246,.06)">
    <div style="text-align:center;margin-bottom:32px">
      <div style="width:52px;height:52px;background:linear-gradient(135deg,#2563eb,#3b82f6);
                  border-radius:14px;margin:0 auto 14px;display:flex;align-items:center;
                  justify-content:center;font-size:26px;box-shadow:0 8px 24px rgba(59,130,246,.4)">🗺️</div>
      <div style="font-family:'Plus Jakarta Sans','Inter',sans-serif;color:#dde9ff;font-size:22px;
                  font-weight:800;letter-spacing:-.3px">GeoFormal</div>
      <div style="color:#3b6ab5;font-size:12px;margin-top:5px;font-weight:500">
        Sistema de Geolocalización · Mérida, Yucatán
      </div>
    </div>
    <div id="login-error" style="display:none;background:rgba(127,29,29,.3);border:1px solid rgba(220,38,38,.3);
         color:#fca5a5;padding:10px 14px;border-radius:10px;font-size:13px;margin-bottom:16px"></div>
    <div style="margin-bottom:14px">
      <label style="color:#3b6ab5;font-size:10px;font-weight:700;display:block;margin-bottom:6px;
                    text-transform:uppercase;letter-spacing:.8px">Correo</label>
      <input id="login-email" type="email" placeholder="usuario@canaco.mx"
             style="width:100%;background:#0a1428;border:1px solid #1a2d56;color:#dde9ff;
                    padding:11px 14px;border-radius:10px;font-size:14px;outline:none;box-sizing:border-box;
                    font-family:'Inter',sans-serif;transition:border-color .15s"
             onfocus="this.style.borderColor='#3b82f6'"
             onblur="this.style.borderColor='#1a2d56'"
             onkeydown="if(event.key==='Enter')doLogin()"/>
    </div>
    <div style="margin-bottom:24px">
      <label style="color:#3b6ab5;font-size:10px;font-weight:700;display:block;margin-bottom:6px;
                    text-transform:uppercase;letter-spacing:.8px">Contraseña</label>
      <div style="position:relative">
        <input id="login-pass" type="password" placeholder="••••••••"
               style="width:100%;background:#0a1428;border:1px solid #1a2d56;color:#dde9ff;
                      padding:11px 44px 11px 14px;border-radius:10px;font-size:14px;outline:none;
                      box-sizing:border-box;font-family:'Inter',sans-serif;transition:border-color .15s"
               onfocus="this.style.borderColor='#3b82f6'"
               onblur="this.style.borderColor='#1a2d56'"
               onkeydown="if(event.key==='Enter')doLogin()"/>
        <button type="button" onclick="_togglePass()"
                style="position:absolute;right:12px;top:50%;transform:translateY(-50%);
                       background:transparent;border:none;cursor:pointer;
                       color:#3b6ab5;font-size:16px;padding:0;line-height:1"
                id="login-pass-eye">👁</button>
      </div>
    </div>
    <button onclick="doLogin()" id="login-btn"
            style="width:100%;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;border:none;
                   border-radius:10px;padding:13px;font-size:14px;font-weight:700;cursor:pointer;
                   margin-bottom:12px;font-family:'Inter',sans-serif;
                   box-shadow:0 6px 18px rgba(37,99,235,.4);transition:all .2s">
      Iniciar sesión
    </button>
    <div style="display:flex;align-items:center;gap:10px;margin:14px 0">
      <div style="flex:1;height:1px;background:#131f3a"></div>
      <div style="color:#243351;font-size:11px;font-weight:600">o</div>
      <div style="flex:1;height:1px;background:#131f3a"></div>
    </div>
    <button onclick="doLoginGoogle()" id="login-google-btn"
            style="width:100%;background:#fff;color:#1e293b;border:none;border-radius:10px;
                   padding:11px;font-size:13px;font-weight:600;cursor:pointer;display:flex;
                   align-items:center;justify-content:center;gap:10px;font-family:'Inter',sans-serif">
      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" style="width:18px"/>
      Continuar con Google
    </button>
    <div style="color:#1e3060;font-size:11px;text-align:center;margin-top:24px;font-weight:500">
      Municipio de Mérida, Yucatán · Uso interno
    </div>
  </div>`;
  document.body.appendChild(overlay);
}

function _togglePass() {
  const inp = document.getElementById('login-pass');
  const btn = document.getElementById('login-pass-eye');
  if (!inp) return;
  const show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  if (btn) btn.textContent = show ? '🙈' : '👁';
}

async function doLogin() {
  const email = document.getElementById('login-email')?.value?.trim();
  const pass  = document.getElementById('login-pass')?.value;
  const err   = document.getElementById('login-error');
  const btn   = document.getElementById('login-btn');

  if (!email || !pass) { _showLoginError('Ingresa correo y contraseña'); return; }

  btn.disabled = true;
  btn.textContent = 'Entrando…';
  err.style.display = 'none';

  try {
    await _auth.signInWithEmailAndPassword(email, pass);
    // onAuthStateChanged se encarga del resto
  } catch (e) {
    const msgs = {
      'auth/user-not-found':    'Usuario no encontrado',
      'auth/wrong-password':    'Contraseña incorrecta',
      'auth/invalid-email':     'Correo inválido',
      'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos.',
      'auth/invalid-credential':'Correo o contraseña incorrectos',
    };
    _showLoginError(msgs[e.code] || e.message);
    btn.disabled = false;
    btn.textContent = 'Iniciar sesión';
  }
}

function _showLoginError(msg) {
  const el = document.getElementById('login-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

async function doLoginGoogle() {
  const btn = document.getElementById('login-google-btn');
  btn.disabled = true;
  btn.innerHTML = '<span style="opacity:.6">Abriendo Google…</span>';
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    await _auth.signInWithPopup(provider);
    // onAuthStateChanged se encarga del resto
  } catch (e) {
    const msgs = {
      'auth/popup-closed-by-user':    'Cerraste la ventana de Google',
      'auth/popup-blocked':           'Popup bloqueado — permite popups para este sitio',
      'auth/cancelled-popup-request': '',
    };
    const msg = msgs[e.code] || e.message;
    if (msg) _showLoginError(msg);
    btn.disabled = false;
    btn.innerHTML = '<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" style="width:20px"/> Continuar con Google';
  }
}

// ── Auth state observer ───────────────────────────────────────────────────────

_auth.onAuthStateChanged(async (fbUser) => {
  if (!fbUser) {
    window._currentUser = null;
    window._authReady   = true;
    _renderLoginScreen();
    return;
  }

  // Usar token cacheado (rápido). Solo forzar refresh si aún no tiene claim de role
  // (caso: admin acaba de asignar el rol por primera vez)
  let idTokenResult = await fbUser.getIdTokenResult(false);
  if (!idTokenResult.claims.role) {
    idTokenResult = await fbUser.getIdTokenResult(true);
  }
  const role  = idTokenResult.claims.role || 'tecnico';
  const token = idTokenResult.token;

  window._currentUser = { uid: fbUser.uid, email: fbUser.email, role, token };
  window._authReady   = true;

  // Inyectar token en todas las peticiones fetch
  _patchFetch(token);

  // Renderizar la app
  _bootApp(role);
});

// ── Patch global fetch para incluir Authorization header ─────────────────────

function _patchFetch(token) {
  const origFetch = window._origFetch || window.fetch;
  window._origFetch = origFetch;
  window.fetch = (url, opts = {}) => {
    // Solo patchear las llamadas a nuestra API
    if (typeof url === 'string' && url.startsWith('/api')) {
      opts.headers = { ...(opts.headers || {}), 'Authorization': `Bearer ${token}` };
    }
    return origFetch(url, opts);
  };
}

// ── Logout ────────────────────────────────────────────────────────────────────

function logout() {
  _auth.signOut();
}

// ── Boot: inyectar user info en el header y aplicar restricciones de rol ─────

function _bootApp(role) {
  // Quitar el overlay de login sin recargar la página (si existe)
  const overlay = document.getElementById('login-overlay');
  if (overlay) {
    overlay.remove();
    if (typeof map !== 'undefined' && map && map.invalidateSize) {
      setTimeout(() => map.invalidateSize(), 50);
    }
  }
  // Cargar datos siempre — tanto si venía del overlay como si ya estaba logueado
  if (!window._appBooted) {
    window._appBooted = true;
    setTimeout(() => {
      if (typeof cargarDatosIniciales === 'function') cargarDatosIniciales();
      if (typeof cargarMetricas === 'function') cargarMetricas();
      if (typeof _iniciarPrecargas === 'function') _iniciarPrecargas();
    }, 0);
  }

  // Añadir info de usuario al header
  const header = document.getElementById('header');
  if (header && !document.getElementById('user-info')) {
    const u = window._currentUser;
    const roleColor = u.role === 'admin' ? '#22c55e' : '#f59e0b';
    const roleLabel = u.role === 'admin' ? 'Admin' : 'Técnico';
    const div = document.createElement('div');
    div.id = 'user-info';
    div.style.cssText = 'display:flex;align-items:center;gap:12px;margin-left:auto';
    div.innerHTML = `
      <div style="text-align:right">
        <div style="color:#dde9ff;font-size:12px;font-weight:600;letter-spacing:-.1px">${u.email}</div>
        <div style="font-size:10px;padding:2px 8px;border-radius:10px;font-weight:700;margin-top:2px;
                    background:${roleColor}18;color:${roleColor};display:inline-block;border:1px solid ${roleColor}30">${roleLabel}</div>
      </div>
      <button onclick="logout()" style="background:transparent;border:1px solid #1a2d56;color:#4a6490;
              padding:6px 14px;border-radius:8px;cursor:pointer;font-size:11px;font-weight:600;
              font-family:'Inter',sans-serif;transition:all .15s"
              onmouseover="this.style.borderColor='#2d4488';this.style.color='#94a3b8'"
              onmouseout="this.style.borderColor='#1a2d56';this.style.color='#4a6490'">Salir</button>`;
    header.appendChild(div);
  }

  // Mostrar tab admin solo para administradores
  if (role === 'admin') {
    const tabAdmin = document.getElementById('tab-admin');
    if (tabAdmin) tabAdmin.style.display = '';
  }

  // Aplicar restricciones de rol para técnico
  if (role === 'tecnico') {
    _applyTecnicoRestrictions();
  }

  // Revelar tabs ya con el rol correcto aplicado (evita flash de tabs incorrectos)
  const tabsEl = document.getElementById('tabs');
  if (tabsEl) tabsEl.style.visibility = 'visible';
}

// ── Restricciones para rol técnico ───────────────────────────────────────────

function _applyTecnicoRestrictions() {
  window._tecnicoMode = true;

  // Ocultar tabs irrelevantes — técnico solo necesita Campañas, Ruta y Reportes
  ['mapa', 'val', 'pred'].forEach(tab => {
    const btn = document.querySelector(`.tab[onclick*="'${tab}'"]`);
    if (btn) btn.style.display = 'none';
  });
  // Ocultar también el separador visual entre grupos de tabs si queda vacío
  document.querySelectorAll('#nav-tabs > div').forEach(sep => {
    sep.style.display = 'none';
  });

  // Ocultar tab Admin (por si quedó visible de una sesión admin previa)
  const tabAdmin = document.getElementById('tab-admin');
  if (tabAdmin) tabAdmin.style.display = 'none';

  // Ocultar botones de gestión administrativa en campañas
  ['btn-nueva-campana', 'btn-finalizar-campana',
   'btn-borrar-campana', 'btn-plantillas-campana',
   'btn-toggle-agregar'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  // Adaptar header de lista de campañas
  const u = window._currentUser;
  const titulo    = document.getElementById('campanas-lista-titulo');
  const subtitulo = document.getElementById('campanas-lista-subtitulo');
  if (titulo)    titulo.textContent    = 'Mis campañas';
  if (subtitulo) subtitulo.textContent = 'Campañas asignadas a ti para visita de campo';

  // Ir directo a Campañas al cargar
  const tabCampanas = document.querySelector(".tab[onclick*=\"'campanas'\"]");
  showTab('campanas', tabCampanas);

  // Ocultar el filtro de status (técnico solo ve las suyas, sin necesidad de filtrar)
  const filtro = document.getElementById('filtro-status-campana');
  if (filtro) filtro.closest('div')?.style.setProperty('display', 'none');
}

// ── Helper para obtener token fresco (para llamadas manuales) ─────────────────

async function getAuthToken() {
  const u = _auth.currentUser;
  if (!u) return null;
  return u.getIdToken();
}
