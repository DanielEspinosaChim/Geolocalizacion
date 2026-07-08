/* ══════════════════════════════════════════════════════════════════════════
   admin.js — Panel de administración (solo rol admin)
   ══════════════════════════════════════════════════════════════════════════ */

let _adminUsuarios  = [];   // cache de usuarios
let _adminCampanas  = [];   // cache de campañas para asignación

// ── Inicializar ───────────────────────────────────────────────────────────────

async function cargarPanelAdmin() {
  _renderMiCuenta();
  await Promise.all([cargarUsuariosAdmin(), cargarCampanasAdmin()]);
}

function _renderMiCuenta() {
  const u = window._currentUser;
  if (!u) return;
  const av = document.getElementById('mi-cuenta-avatar');
  const em = document.getElementById('mi-cuenta-email');
  const ro = document.getElementById('mi-cuenta-role');
  if (av) av.textContent = (u.email || '?')[0].toUpperCase();
  if (em) em.textContent = u.email || '—';
  if (ro) {
    ro.textContent = u.role === 'admin' ? 'Admin' : 'Técnico';
    ro.style.background = u.role === 'admin' ? '#166534' : '#78350f';
    ro.style.color      = u.role === 'admin' ? '#86efac' : '#fde68a';
  }
}

function abrirModalCambiarPass() {
  document.getElementById('form-cambiar-pass')?.reset();
  const msg = document.getElementById('cambiar-pass-msg');
  if (msg) msg.style.display = 'none';
  const modal = document.getElementById('modal-cambiar-pass');
  if (modal) modal.style.display = 'flex';
}

function cerrarModalCambiarPass() {
  const modal = document.getElementById('modal-cambiar-pass');
  if (modal) modal.style.display = 'none';
  document.getElementById('form-cambiar-pass')?.reset();
  const msg = document.getElementById('cambiar-pass-msg');
  if (msg) msg.style.display = 'none';
}

async function cambiarContrasena(e) {
  e.preventDefault();
  const actual    = document.getElementById('pass-actual').value;
  const nueva     = document.getElementById('nueva-pass').value;
  const confirmar = document.getElementById('confirmar-pass').value;
  const msg       = document.getElementById('cambiar-pass-msg');
  const show = (txt, ok) => {
    msg.textContent = txt; msg.style.display = 'block';
    msg.style.background = ok ? 'rgba(22,101,52,.4)' : 'rgba(127,29,29,.4)';
    msg.style.color      = ok ? '#86efac' : '#fca5a5';
    msg.style.border     = `1px solid ${ok ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.3)'}`;
  };
  if (nueva !== confirmar) { show('Las contraseñas no coinciden', false); return; }
  if (nueva.length < 8)    { show('Mínimo 8 caracteres', false); return; }
  try {
    const user       = firebase.auth().currentUser;
    const credential = firebase.auth.EmailAuthProvider.credential(user.email, actual);
    await user.reauthenticateWithCredential(credential);
    await user.updatePassword(nueva);
    show('Contraseña actualizada correctamente', true);
    document.getElementById('form-cambiar-pass').reset();
    setTimeout(cerrarModalCambiarPass, 1500);
  } catch (err) {
    const msgs = {
      'auth/wrong-password':      'Contraseña actual incorrecta',
      'auth/invalid-credential':  'Contraseña actual incorrecta',
      'auth/too-many-requests':   'Demasiados intentos, espera unos minutos',
    };
    show(msgs[err.code] || 'Error: ' + (err.message || err.code), false);
  }
}

// ── Usuarios ──────────────────────────────────────────────────────────────────

async function cargarUsuariosAdmin() {
  try {
    const r = await fetch('/api/admin/usuarios');
    if (!r.ok) { console.warn('[admin] No se pudieron cargar usuarios:', r.status); return; }
    _adminUsuarios = await r.json();
    _renderUsuarios();
  } catch (e) {
    console.warn('[admin] Error cargando usuarios:', e.message);
  }
}

function _renderUsuarios() {
  const el = document.getElementById('admin-usuarios-lista');
  if (!el) return;
  if (!_adminUsuarios.length) {
    el.innerHTML = `<div style="color:#475569;font-size:12px;padding:20px;text-align:center">Sin usuarios</div>`;
    return;
  }
  el.innerHTML = _adminUsuarios.map(u => {
    const roleColor  = u.role === 'admin' ? '#22c55e' : '#f59e0b';
    const disabledBg = u.disabled ? 'opacity:.4;' : '';
    return `
    <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid #1e293b;${disabledBg}">
      <div style="width:36px;height:36px;border-radius:50%;background:#334155;display:flex;align-items:center;
                  justify-content:center;font-size:14px;font-weight:700;color:#94a3b8;flex-shrink:0">
        ${(u.nombre||u.email||'?')[0].toUpperCase()}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600;color:#f1f5f9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
          ${u.nombre || '—'}
        </div>
        <div style="font-size:11px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${u.email}</div>
      </div>
      <select onchange="cambiarRoleUsuario('${u.uid}', this.value)"
              style="background:#0f172a;border:1px solid #334155;color:${roleColor};
                     font-size:11px;font-weight:700;padding:3px 8px;border-radius:6px;cursor:pointer">
        <option value="tecnico" ${u.role==='tecnico'?'selected':''}>Técnico</option>
        <option value="admin"   ${u.role==='admin'  ?'selected':''}>Admin</option>
      </select>
      <button onclick="toggleUsuario('${u.uid}', ${!u.disabled})"
              title="${u.disabled ? 'Habilitar' : 'Deshabilitar'}"
              style="background:${u.disabled?'#166534':'#7f1d1d'};border:none;color:#fff;
                     padding:4px 8px;border-radius:5px;cursor:pointer;font-size:11px">
        ${u.disabled ? '✓ Habilitar' : '✗ Deshabilitar'}
      </button>
      <button onclick="eliminarUsuario('${u.uid}', '${u.email}')"
              style="background:transparent;border:1px solid #7f1d1d;color:#f87171;
                     padding:4px 8px;border-radius:5px;cursor:pointer;font-size:11px">
        Eliminar
      </button>
    </div>`;
  }).join('');
}

// PATCH /api/admin/usuarios/{uid} — un solo endpoint que acepta {role} o {disabled}
async function cambiarRoleUsuario(uid, role) {
  try {
    const r = await fetch(`/api/admin/usuarios/${uid}`, {
      method: 'PATCH',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ role }),
    });
    if (r.ok) {
      _showAdminToast(`Rol actualizado a ${role} — aplica en el próximo inicio de sesión`);
      await cargarUsuariosAdmin();
      _renderAsignaciones();
    } else {
      const d = await r.json();
      alert('Error: ' + (d.detail || 'No se pudo cambiar el rol'));
    }
  } catch (e) {
    alert('Error de conexión: ' + e.message);
  }
}

async function toggleUsuario(uid, disabled) {
  if (disabled) {
    const asignadas = _adminCampanas.filter(c => c.asignado_a === uid);
    if (asignadas.length) {
      const nombres = asignadas.map(c => `• ${c.nombre}`).join('\n');
      const u = _adminUsuarios.find(u => u.uid === uid);
      alert(`No puedes deshabilitar a ${u?.email || uid} mientras tenga campañas asignadas:\n\n${nombres}\n\nDesasígnalo primero.`);
      return;
    }
  }
  try {
    await fetch(`/api/admin/usuarios/${uid}`, {
      method: 'PATCH',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ disabled }),
    });
    await cargarUsuariosAdmin();
    _renderAsignaciones();
  } catch (e) {
    alert('Error de conexión: ' + e.message);
  }
}

async function eliminarUsuario(uid, email) {
  const asignadas = _adminCampanas.filter(c => c.asignado_a === uid);
  if (asignadas.length) {
    const nombres = asignadas.map(c => `• ${c.nombre}`).join('\n');
    alert(`No puedes eliminar a ${email} mientras tenga campañas asignadas:\n\n${nombres}\n\nDesasígnalo primero.`);
    return;
  }
  if (!confirm(`¿Eliminar a ${email}? Esta acción no se puede deshacer.`)) return;
  try {
    const r = await fetch(`/api/admin/usuarios/${uid}`, { method: 'DELETE' });
    if (r.ok) { _showAdminToast('Usuario eliminado'); await cargarUsuariosAdmin(); }
    else { const d = await r.json(); alert(d.detail || 'Error al eliminar'); }
  } catch (e) {
    alert('Error de conexión: ' + e.message);
  }
}

// ── Crear usuario ─────────────────────────────────────────────────────────────

function mostrarModalCrearUsuario() {
  document.getElementById('modal-crear-usuario').style.display = 'flex';
}
function cerrarModalCrearUsuario() {
  document.getElementById('modal-crear-usuario').style.display = 'none';
  document.getElementById('form-crear-usuario').reset();
}

async function crearUsuario(e) {
  e.preventDefault();
  const body = {
    email:    document.getElementById('nu-email').value,
    password: document.getElementById('nu-pass').value,
    nombre:   document.getElementById('nu-nombre').value,
    role:     document.getElementById('nu-role').value,
  };
  try {
    const r = await fetch('/api/admin/usuarios', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (r.ok) {
      cerrarModalCrearUsuario();
      _showAdminToast(`Usuario ${body.email} creado con rol ${body.role}`);
      await cargarUsuariosAdmin();
      _renderAsignaciones();
    } else {
      alert('Error: ' + (d.detail || 'No se pudo crear el usuario'));
    }
  } catch (e) {
    alert('Error de conexión: ' + e.message);
  }
}

// ── Asignación de campañas ────────────────────────────────────────────────────
// NOTA: el backend no tiene endpoint /api/admin/campanas/{id}/asignar todavía.
// Usamos el PATCH /api/campanas/{id} para guardar el campo asignado_a en Firestore.

async function cargarCampanasAdmin() {
  try {
    const r = await fetch('/api/campanas');
    if (!r.ok) return;
    _adminCampanas = await r.json();
    _renderAsignaciones();
  } catch (e) {
    console.warn('[admin] Error cargando campañas:', e.message);
  }
}

function _renderAsignaciones() {
  const el = document.getElementById('admin-asignaciones-lista');
  if (!el) return;
  if (!_adminCampanas.length) {
    el.innerHTML = `<div style="color:#475569;font-size:12px;padding:20px;text-align:center">
      No hay campañas. Créalas en la pestaña Campañas.</div>`;
    return;
  }
  const tecnicos = _adminUsuarios.filter(u => u.role === 'tecnico' && !u.disabled);
  el.innerHTML = _adminCampanas.map(c => {
    const stColor = {activa:'#22c55e', cerrada:'#64748b', cancelada:'#f87171'}[c.status] || '#64748b';
    const pct     = c.total_negocios ? Math.round((c.total_completados/c.total_negocios)*100) : 0;
    const asignadoNombre = _adminUsuarios.find(u => u.uid === c.asignado_a)?.nombre
                        || _adminUsuarios.find(u => u.uid === c.asignado_a)?.email
                        || null;
    const tecSelect = `
      <select onchange="asignarCampana('${c.id}', this.value)"
              style="background:#0f172a;border:1px solid #334155;color:#94a3b8;
                     font-size:12px;padding:4px 8px;border-radius:6px;cursor:pointer;flex-shrink:0">
        <option value="">Sin asignar</option>
        ${tecnicos.map(t => `<option value="${t.uid}" ${c.asignado_a===t.uid?'selected':''}>${t.nombre||t.email}</option>`).join('')}
      </select>`;
    return `
    <div style="padding:14px 16px;border-bottom:1px solid #1e293b">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:700;color:#f1f5f9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            ${c.nombre}
          </div>
          <div style="font-size:11px;color:#64748b">
            ${c.colonia||'Sin colonia'} &nbsp;·&nbsp;
            <span style="color:${stColor}">${c.status}</span> &nbsp;·&nbsp;
            ${c.total_completados}/${c.total_negocios} visitados (${pct}%)
          </div>
        </div>
        ${tecSelect}
      </div>
      ${asignadoNombre
        ? `<div style="font-size:11px;color:#2563eb;padding:3px 8px;background:#172554;border-radius:4px;display:inline-block">
             Asignada a: ${asignadoNombre}</div>`
        : `<div style="font-size:11px;color:#475569;padding:3px 8px;background:#1e293b;border-radius:4px;display:inline-block">
             Sin técnico asignado</div>`}
    </div>`;
  }).join('');
}

// Guarda asignado_a directamente en el documento de campaña vía PATCH status endpoint
// (reutilizamos el mismo endpoint que actualiza status — acepta cualquier campo)
async function asignarCampana(campanaId, uid) {
  try {
    const r = await fetch(`/api/campanas/${campanaId}/asignar`, {
      method: 'PATCH',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ asignado_a: uid || null }),
    });
    if (r.ok) {
      const nombre = uid
        ? (_adminUsuarios.find(u => u.uid === uid)?.nombre || uid)
        : 'nadie';
      _showAdminToast(uid ? `Campaña asignada a ${nombre}` : 'Asignación removida');
    }
    await cargarCampanasAdmin();
  } catch (e) {
    alert('Error de conexión: ' + e.message);
  }
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function _showAdminToast(msg) {
  let t = document.getElementById('admin-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'admin-toast';
    t.style.cssText = `position:fixed;bottom:24px;right:24px;background:#166534;color:#dcfce7;
      padding:12px 20px;border-radius:8px;font-size:13px;font-weight:600;z-index:9999;
      box-shadow:0 4px 20px rgba(0,0,0,.4);transition:opacity .3s`;
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.opacity = '0'; }, 3000);
}
