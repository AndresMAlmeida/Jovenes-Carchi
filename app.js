// ============================================================
// CONFIGURA ESTO con la URL de tu Apps Script ya publicado
// ============================================================
const API_URL = 'https://script.google.com/macros/s/AKfycby9nJ5flwNPqOOHBPkfSASv8ewkQpOJETGo5Nun73RGBM0c9bU9pEPcbLHXcZQHY7Xj/exec';
const TOKEN = 'JEA4Carchi2026'; // debe ser igual al TOKEN en Codigo.gs

// ---- Estado ----
let currentStep = 1;
let registro = null; // datos del joven encontrado
let selfieBase64 = null;
let selfieMime = 'image/jpeg';
let searching = false;
let submitting = false;

const $ = (id) => document.getElementById(id);

// ---------------------------------------------------------------
// Navegación entre pasos
// ---------------------------------------------------------------
const STEP_META = {
  1: { title: 'Buscar tu registro', label: 'Paso 1 de 3 — Consulta tu cédula' },
  2: { title: 'Tus datos actuales', label: 'Paso 2 de 3 — Verifica tu ficha' },
  3: { title: 'Evidencia y estado', label: 'Paso 3 de 3 — Registro y fotografía' },
};

function goToStep(n) {
  currentStep = n;
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  if (n <= 3) {
    $(`screen-${n}`).classList.add('active');
    $('headerTitle').textContent = STEP_META[n].title;
    $('stepLabel').textContent = STEP_META[n].label;
    document.querySelectorAll('.step-dot').forEach((d) => {
      const step = Number(d.dataset.step);
      d.classList.toggle('active', step === n);
      d.classList.toggle('done', step < n);
    });
  } else {
    $('screen-success').classList.add('active');$('headerTitle').textContent = 'Envío completado';
    $('stepLabel').textContent = 'Proceso finalizado ✓';
  }
  renderFooter();
  window.scrollTo(0, 0);
}

function renderFooter() {
  const inner = $('footerInner');
  inner.innerHTML = '';

  if (currentStep === 1) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary';
    btn.id = 'btnBuscar';
    btn.textContent = 'Buscar';
    btn.addEventListener('click', onBuscar);
    inner.appendChild(btn);
  }

  if (currentStep === 2) {
    const back = document.createElement('button');
    back.className = 'btn btn-ghost';
    back.textContent = 'Volver';
    back.addEventListener('click', () => goToStep(1));

    const next = document.createElement('button');
    next.className = 'btn btn-primary';
    next.textContent = registro && registro.yaActualizo ? 'Subir evidencia' : 'Continuar';
    next.addEventListener('click', () => goToStep(3));

    inner.appendChild(back);
    inner.appendChild(next);
  }

  if (currentStep === 3) {
    const back = document.createElement('button');
    back.className = 'btn btn-ghost';
    back.textContent = 'Volver';
    back.addEventListener('click', () => goToStep(2));

    const send = document.createElement('button');
    send.className = 'btn btn-primary';
    send.id = 'btnEnviar';
    send.textContent = registro && registro.yaActualizo ? 'Enviar evidencia' : 'Guardar y enviar';
    send.addEventListener('click', onEnviar);

    inner.appendChild(back);
    inner.appendChild(send);
  }

  if (currentStep > 3) {
    const again = document.createElement('button');
    again.className = 'btn btn-primary';
    again.textContent = 'Consultar otra cédula';
    again.addEventListener('click', resetAll);
    inner.appendChild(again);
  }
}

function resetAll() {
  registro = null;
  selfieBase64 = null;
  $('cedulaInput').value = '';
  $('selfiePreview').classList.remove('show');$('selfieStatus').textContent = 'Aún no se ha seleccionado la foto';
  document.querySelectorAll('#estudiaRadioGroup input').forEach((r) => (r.checked = false));
  $('dondeEstudia').value = '';$('institucionNombre').value = '';
  $('subtutorReasignacion').value = '';$('cantonUbicado').value = '';
  $('observacionFoto').value = '';$('bloqueDondeEstudia').style.display = 'none';
  hideAlert('searchError');
  hideAlert('searchInfo');
  hideAlert('formError');
  goToStep(1);
}

// ---------------------------------------------------------------
// Alertas
// ---------------------------------------------------------------
function showAlert(id, msg) {
  const el = $(id);
  el.textContent = msg;
  el.classList.add('show');
}
function hideAlert(id) {
  $(id).classList.remove('show');
}

// ---------------------------------------------------------------
// Mostrar/ocultar selector "¿Dónde estudias?" según Sí / No
// ---------------------------------------------------------------
document.querySelectorAll('#estudiaRadioGroup input').forEach((radio) => {
  radio.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val === 'Sí') {
      $('bloqueDondeEstudia').style.display = 'block';
    } else {
      $('bloqueDondeEstudia').style.display = 'none';
      $('dondeEstudia').value = '';$('institucionNombre').value = '';
    }
  });
});

// ---------------------------------------------------------------
// Paso 1 → Buscar por cédula
// ---------------------------------------------------------------
async function onBuscar() {
  const cedula = $('cedulaInput').value.trim();
  hideAlert('searchError');
  hideAlert('searchInfo');

  if (!/^[0-9]{10}$/.test(cedula)) {
    showAlert('searchError', 'Ingresa una cédula válida de 10 dígitos.');
    return;
  }
  if (searching) return;
  if (!API_URL || API_URL.indexOf('PEGA_AQUI') === 0) {
    showAlert('searchError', 'La app todavía no está conectada al sistema. Contacta al administrador.');
    return;
  }

  searching = true;
  const btn = $('btnBuscar');
  btn
