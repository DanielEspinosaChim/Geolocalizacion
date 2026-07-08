/* ══════════════════════════════════════════════════════════════════════════
   camera.js — Cámara adaptativa: modal getUserMedia en PC, capture nativo en móvil
   ══════════════════════════════════════════════════════════════════════════ */

function _esMobil() {
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent)); // iPad
}

// Punto de entrada: detecta PC vs móvil y actúa en consecuencia.
// inputId   — id del <input type="file"> oculto (para móvil)
// onFileReady — callback(File) para PC (después de captura con modal)
function _abrirCamara(inputId, onFileReady) {
  if (_esMobil()) {
    // Móvil: dispara el input nativo con capture; la app de cámara del SO se abre sola
    const inp = document.getElementById(inputId);
    inp.setAttribute('capture', 'environment');
    inp.click();
    // Resetear capture para que el botón Galería siga funcionando
    setTimeout(() => inp.removeAttribute('capture'), 300);
  } else {
    // PC: modal getUserMedia
    _abrirCamaraModal(onFileReady);
  }
}

let _cameraStream   = null;
let _cameraCallback = null;   // function(File) llamada al aceptar la foto

async function _abrirCamaraModal(onFileReady) {
  _cameraCallback = onFileReady;

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert('Tu navegador no soporta acceso a cámara. Usa Galería.');
    _cameraCallback = null;
    return;
  }

  try {
    // Trasera en móvil, cualquier cámara en PC
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
    } catch {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
    }
    _cameraStream = stream;

    const video = document.getElementById('cam-video');
    video.srcObject = stream;
    await video.play();

    document.getElementById('camera-modal').style.display = 'flex';
    _cameraShowLive();
  } catch (e) {
    const msgs = {
      'NotAllowedError':  'Permiso denegado — permite el acceso a la cámara en tu navegador.',
      'NotFoundError':    'No se encontró ninguna cámara.',
      'NotReadableError': 'La cámara está siendo usada por otra aplicación.',
    };
    alert(msgs[e.name] || ('Error de cámara: ' + e.message));
    _cameraCallback = null;
  }
}

function _cameraShowLive() {
  document.getElementById('cam-video').style.display      = 'block';
  document.getElementById('cam-live-btns').style.display  = 'flex';
  document.getElementById('cam-prev-wrap').style.display  = 'none';
}

function _cameraCancelar() {
  _cameraDetenerStream();
  document.getElementById('camera-modal').style.display = 'none';
  _cameraCallback = null;
}

function _cameraDetenerStream() {
  if (_cameraStream) {
    _cameraStream.getTracks().forEach(t => t.stop());
    _cameraStream = null;
  }
}

function _cameraCapturar() {
  const video  = document.getElementById('cam-video');
  const canvas = document.getElementById('cam-canvas');
  canvas.width  = video.videoWidth  || 1280;
  canvas.height = video.videoHeight || 720;
  canvas.getContext('2d').drawImage(video, 0, 0);

  document.getElementById('cam-prev-img').src      = canvas.toDataURL('image/jpeg', 0.92);
  document.getElementById('cam-video').style.display     = 'none';
  document.getElementById('cam-live-btns').style.display = 'none';
  document.getElementById('cam-prev-wrap').style.display = 'flex';
}

function _cameraReintentar() {
  _cameraShowLive();
}

function _cameraUsar() {
  const canvas = document.getElementById('cam-canvas');
  canvas.toBlob(blob => {
    const file = new File([blob], `camara_${Date.now()}.jpg`, { type: 'image/jpeg' });
    if (_cameraCallback) _cameraCallback(file);
    _cameraDetenerStream();
    document.getElementById('camera-modal').style.display = 'none';
    _cameraCallback = null;
  }, 'image/jpeg', 0.92);
}
