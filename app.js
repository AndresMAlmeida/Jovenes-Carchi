// ============================================================
// CONFIGURA ESTO con la URL de tu Apps Script ya publicado
// ============================================================
const API_URL = 'https://script.google.com/macros/s/AKfycby9nJ5fIwNPqOOHBPkfSASv8ewkQpOJETGo5Nun73RGBM0c9bU9pEPcbLHXcZQHY7Xj/exec';
const TOKEN = 'JEA4Carchi2026';

// Opciones completas de Subtutor / Reasignación (incluye hojas de la Base Maestra)
const OPCIONES_REASIGNACION = [
  'Tulcán',
  'Parroquias Tulcán',
  'San Pedro de Huaca',
  'Montúfar',
  'Mira',
  'Bolívar',
  'Espejo',
  'Otros Cantones',
  'Ximena',
  'Patricio',
  'Grupo Prioritario',
  'Fin de Semana',
  'A1 Ximena Rodríguez',
  'A2 Jairo Portilla',
  'A3 Luis Cuasapud',
  'A4 Gabriela Montenegro',
  'A5 Marco Chamorro',
  'G1 Fernanda Almeida',
  'G2 Carlos Benavides',
  'G3 Diana Rosero',
  'G4 Cristian Revelo',
  'G5 Patricia Narváez'
];

// ---- Estado ----
let currentStep = 1;
let registro = null;
let selfieBase64 = null;
let selfieMime = 'image/jpeg';
let searching = false;
let submitting = false;

const $ = (id) => document.getElementById(id);

function esHojaSinUbicacion(hoja) {
  return hoja === 'No Presentados' || hoja === 'Sin Cantón';
}

// ---------------------------------------------------------------
// Navegación entre pasos
// ---------------------------------------------------------------
const STEP_META = {
  1: { title: 'Buscar tu registro', label: 'Paso 1 de 3 — Consulta tu cédula' },
  2: { title: 'Tus datos actuales', label: 'Paso 2 de 3 — Verifica tu asignación' },
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
  selfieBase6
