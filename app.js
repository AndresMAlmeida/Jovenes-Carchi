// ============================================================
// CONFIGURA ESTO con la URL de tu Apps Script ya publicado
// ============================================================
const API_URL = 'https://script.google.com/macros/s/AKfycby9nJ5fIwNPqOOHBPkfSASv8ewkQpOJETGo5Nun73RGBM0c9bU9pEPcbLHXcZQHY7Xj/exec';
const TOKEN = 'JEA4Carchi2026';

// Opciones exactas de Subtutor / Reasignación
const OPCIONES_REASIGNACION = [
  'Tenencia o jefatura política',
  'Puntos digitales',
  'Gestión documental Ximena R',
  'Gestión documental Patricio E',
  'Apoyo administrativo',
  'Apoyo comunitario'
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
  return hoja === 'No Presentados' || hoja === 'Sin Cantón' || hoja === 'Sin Canton';
}

function esHojaTulcanSemanal(hoja) {
  return /^s[12](_|\b)/i.test(String(hoja || '').trim());
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
    $('screen-success').classList.add('active');
    $('headerTitle').textContent = 'Envío completado';
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
  $('selfiePreview').classList.remove('show');
  $('selfieStatus').textContent = 'Aún no se ha seleccionado la foto';
  document.querySelectorAll('#estudiaRadioGroup input').forEach((r) => (r.checked = false));
  $('dondeEstudia').value = '';
  $('institucionNombre').value = '';
  $('subtutorReasignacion').value = '';
  $('cantonUbicado').value = '';
  $('observacionFoto').value = '';
  $('bloqueDondeEstudia').style.display = 'none';
  $('adminPanel').classList.remove('show');
  $('adminNuevaHoja').value = '';
  $('adminPin').value = '';
  hideAlert('searchError');
  hideAlert('searchInfo');
  hideAlert('formError');
  hideAlert('adminError');
  hideAlert('adminInfo');
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
// Panel Tutor: Traslado directo de hoja en Base Global
// ---------------------------------------------------------------
$('btnToggleAdmin').addEventListener('click', () => {
  $('adminPanel').classList.toggle('show');
  hideAlert('adminError');
  hideAlert('adminInfo');
});

$('btnEjecutarTraslado').addEventListener('click', async () => {
  hideAlert('adminError');
  hideAlert('adminInfo');

  const nuevaHoja = $('adminNuevaHoja').value;
  const pin = $('adminPin').value.trim();

  if (!nuevaHoja) {
    showAlert('adminError', 'Selecciona la nueva hoja o grupo de destino.');
    return;
  }
  if (!pin) {
    showAlert('adminError', 'Ingresa el PIN de autorización de tutor.');
    return;
  }

  const btn = $('btnEjecutarTraslado');
  btn.disabled = true;
  btn.textContent = 'Trasladando...';

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'reasignar_hoja',
        token: TOKEN,
        cedula: registro.cedula,
        nuevaHoja: nuevaHoja,
        pin: pin
      })
    });
    const data = await res.json();

    if (!data.ok) {
      showAlert('adminError', data.error || 'No se pudo completar el traslado.');
      return;
    }

    if (data.registro) {
      registro = data.registro;
      llenarFicha(registro);
      configurarModoPaso3(registro);
      renderFooter();
    }
    $('adminPin').value = '';
    showAlert('adminInfo', `✓ Trasladado correctamente a "${data.hojaDestino}" en la Base Maestra y actualizado en el Libro de Evidencias.`);
  } catch (err) {
    showAlert('adminError', 'Error de conexión al intentar trasladar el registro.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Trasladar en Base Maestra';
  }
});

// ---------------------------------------------------------------
// Poblar opciones exactas de Subtutor / Reasignación
// ---------------------------------------------------------------
function poblarSelectReasignacion() {
  const sel = $('subtutorReasignacion');
  if (!sel) return;
  sel.innerHTML = '<option value="">Selecciona tu subtutor o grupo...</option>';
  OPCIONES_REASIGNACION.forEach((op) => {
    const option = document.createElement('option');
    option.value = op;
    option.textContent = op;
    sel.appendChild(option);
  });
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
      $('dondeEstudia').value = '';
      $('institucionNombre').value = '';
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

  searching = true;
  const btn = $('btnBuscar');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Buscando...';
  showAlert('searchInfo', 'Consultando tu registro...');

  try {
    const res = await fetch(`${API_URL}?action=buscar&cedula=${encodeURIComponent(cedula)}`);
    const data = await res.json();

    if (!data.ok) {
      hideAlert('searchInfo');
      showAlert('searchError', data.error || 'No se pudo completar la búsqueda. Intenta de nuevo.');
      return;
    }
    if (!data.encontrado) {
      hideAlert('searchInfo');
      showAlert('searchError', 'No encontramos ningún registro con esa cédula. Verifica el número o consulta con tu tutor.');
      return;
    }

    hideAlert('searchInfo');
    registro = data.registro;
    $('adminPanel').classList.remove('show');
    hideAlert('adminError');
    hideAlert('adminInfo');
    llenarFicha(registro);
    configurarModoPaso3(registro);
    goToStep(2);
  } catch (err) {
    hideAlert('searchInfo');
    showAlert('searchError', 'No se pudo conectar con el sistema. Revisa tu conexión a internet e intenta de nuevo.');
  } finally {
    searching = false;
    btn.disabled = false;
    btn.textContent = 'Buscar';
  }
}

function llenarFicha(r) {
  const sinUbicacion = esHojaSinUbicacion(r.hojaBase);
  const esTulcanSem = esHojaTulcanSemanal(r.hojaBase);
  const filaFecha = $('rowFechaConvocatoria');

  const cantonMostrar = esTulcanSem ? 'TULCÁN' : (r.canton || '—');
  const ubicacionMostrar = sinUbicacion
    ? (r.cantonUbicado || 'Por confirmar')
    : (esTulcanSem ? 'Tulcán' : (r.cantonUbicado || r.hojaBase));

  $('fName').textContent = r.nombre || '—';
  $('fCedula').textContent = 'Cédula: ' + (r.cedula || '—');
  $('fTutorBadge').textContent = 'Tutor General: ' + (r.tutorGeneral || 'Otros Tutores');
  $('fCanton').textContent = cantonMostrar;
  $('fHorario').textContent = r.horario || '—';

  if (filaFecha) {
    if (esTulcanSem && r.fechaConvocatoria) {
      filaFecha.style.display = 'flex';
      $('fFechaConvocatoria').textContent = r.fechaConvocatoria;
    } else {
      filaFecha.style.display = 'none';
      $('fFechaConvocatoria').textContent = '—';
    }
  }

  $('fGrupoApoyo').textContent = r.grupoApoyo || '—';
  $('fSubtutorActual').textContent = r.subtutor || 'Sin asignar';
  $('fCantonUbicacionActual').textContent = ubicacionMostrar;
  $('fEstudiaActual').textContent = r.estudia || 'Por confirmar';

  const banner = $('fichaStatusBanner');
  if (r.yaActualizo) {
    banner.style.background = '#E7F3ED';
    banner.style.color = '#1B4B43';
    banner.textContent = '✓ Cambios realizados: ya confirmaste tus datos. Ahora solo está habilitado subir evidencia fotográfica.';
  } else if (sinUbicacion) {
    banner.style.background = '#FFF7E6';
    banner.style.color = '#7A4F01';
    banner.textContent = 'Estás en el listado de No Presentados / Sin Cantón. En el siguiente paso selecciona si estudias, tu Subtutor/Reasignación y el cantón donde te encuentras actualmente.';
  } else if (esTulcanSem && r.fechaConvocatoria) {
    banner.style.background = '#EAF1EE';
    banner.style.color = '#1B4B43';
    banner.textContent = `Convocado: ${r.fechaConvocatoria} (${r.horario || 'grupo asignado'}). En el siguiente paso confirma si estudias, tu Subtutor/Reasignación y sube tu evidencia fotográfica.`;
  } else {
    banner.style.background = '#EAF1EE';
    banner.style.color = '#1B4B43';
    banner.textContent = `Asignado en ${cantonMostrar} (${r.horario || 'grupo asignado'}). En el siguiente paso confirma si estudias, tu Subtutor/Reasignación y sube tu evidencia fotográfica.`;
  }
}

function configurarModoPaso3(r) {
  poblarSelectReasignacion();
  document.querySelectorAll('#estudiaRadioGroup input').forEach((el) => (el.checked = false));
  $('dondeEstudia').value = '';
  $('institucionNombre').value = '';
  $('subtutorReasignacion').value = '';
  $('cantonUbicado').value = '';
  $('bloqueDondeEstudia').style.display = 'none';
  selfieBase64 = null;
  $('selfiePreview').classList.remove('show');
  $('selfieStatus').textContent = 'Aún no se ha seleccionado la foto';
  $('observacionFoto').value = '';

  const sinUbicacion = esHojaSinUbicacion(r.hojaBase);
  const esTulcanSem = esHojaTulcanSemanal(r.hojaBase);
  const bloqueCanton = $('bloqueCantonUbicado');

  if (r.yaActualizo) {
    $('cardDatosEditable').style.display = 'none';
    $('cardDatosBloqueado').style.display = 'block';
    $('estudiaGuardadoTexto').textContent = r.estudia || 'Registrado';
    $('subtutorGuardadoTexto').textContent = r.subtutor || 'Registrado';
    $('cantonGuardadoTexto').textContent = esTulcanSem ? 'Tulcán' : (r.cantonUbicado || r.hojaBase || 'Registrado');
  } else {
    $('cardDatosEditable').style.display = 'block';
    $('cardDatosBloqueado').style.display = 'none';

    if (bloqueCanton) {
      bloqueCanton.style.display = sinUbicacion ? 'block' : 'none';
    }

    if (r.subtutor && r.subtutor !== 'Sin asignar') {
      const optS = Array.from($('subtutorReasignacion').options).find((o) => o.value === r.subtutor);
      if (optS) $('subtutorReasignacion').value = r.subtutor;
    }
  }
}

// ---------------------------------------------------------------
// Evidencia fotográfica: captura + compresión en canvas
// ---------------------------------------------------------------
$('btnCapture').addEventListener('click', () => $('selfieFile').click());

$('selfieFile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  $('selfieStatus').textContent = 'Procesando foto...';

  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      const MAX_W = 900;
      const scale = Math.min(1, MAX_W / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.78);
      selfieBase64 = dataUrl.split(',')[1];
      selfieMime = 'image/jpeg';

      $('selfiePreview').src = dataUrl;
      $('selfiePreview').classList.add('show');
      $('selfieStatus').textContent = 'Foto lista ✓';
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

// ---------------------------------------------------------------
// Paso 3 → Enviar
// ---------------------------------------------------------------
async function onEnviar() {
  hideAlert('formError');

  const esTulcanSem = esHojaTulcanSemanal(registro.hojaBase);
  let estadoEstudiaFinal = registro.estudia || '';
  let subtutorFinal = registro.subtutor || '';
  let cantonUbicadoFinal = esTulcanSem ? 'Tulcán' : (registro.cantonUbicado || registro.hojaBase || '');
  let actualizarDatos = false;

  if (!registro.yaActualizo) {
    const estudiaEl = document.querySelector('#estudiaRadioGroup input:checked');
    if (!estudiaEl) {
      showAlert('formError', 'Selecciona si estudias actualmente (Sí o No).');
      return;
    }

    if (estudiaEl.value === 'Sí') {
      const donde = $('dondeEstudia').value;
      if (!donde) {
        showAlert('formError', 'Selecciona dónde estudias: Universidad, Instituto o Colegio.');
        return;
      }
      const inst = $('institucionNombre').value.trim();
      estadoEstudiaFinal = inst ? `Sí - ${donde} (${inst})` : `Sí - ${donde}`;
    } else {
      estadoEstudiaFinal = 'No estudia';
    }

    subtutorFinal = $('subtutorReasignacion').value;
    if (!subtutorFinal) {
      showAlert('formError', 'Selecciona tu Subtutor / Reasignación.');
      return;
    }

    if (esHojaSinUbicacion(registro.hojaBase)) {
      cantonUbicadoFinal = $('cantonUbicado').value;
      if (!cantonUbicadoFinal) {
        showAlert('formError', 'Selecciona en qué cantón te encuentras ubicado actualmente.');
        return;
      }
    } else {
      cantonUbicadoFinal = esTulcanSem ? 'Tulcán' : (registro.cantonUbicado || registro.hojaBase);
    }

    actualizarDatos = true;
  }

  if (!selfieBase64) {
    showAlert('formError', 'Toma o sube tu evidencia fotográfica antes de enviar.');
    return;
  }
  if (submitting) return;

  submitting = true;
  const btn = $('btnEnviar');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Enviando...';

  const payload = {
    action: 'registrar',
    token: TOKEN,
    cedula: registro.cedula,
    nombre: registro.nombre,
    tutorGeneral: registro.tutorGeneral,
    canton: registro.canton,
    hojaBase: registro.hojaBase,
    hojaOrigen: registro.hojaOrigen,
    filaOrigen: registro.filaOrigen,
    actualizarDatos: actualizarDatos,
    estudia: estadoEstudiaFinal,
    subtutor: subtutorFinal,
    cantonUbicado: cantonUbicadoFinal,
    observacion: $('observacionFoto').value.trim(),
    selfieBase64: selfieBase64,
    selfieMime: selfieMime,
  };

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!data.ok) {
      showAlert('formError', data.error || 'No se pudo guardar el registro. Intenta de nuevo.');
      return;
    }

    if (actualizarDatos) {
      $('successTitle').textContent = 'Cambios realizados y evidencia enviada';
      $('successDetail').textContent =
        `Tus datos (${estadoEstudiaFinal} · ${subtutorFinal} · Ubicación: ${cantonUbicadoFinal}) quedaron guardados y bloqueados, y tu evidencia fotográfica fue enviada a tu Tutor General.`;
    } else {
      $('successTitle').textContent = 'Evidencia fotográfica enviada';
      $('successDetail').textContent =
        'Tu nueva evidencia fotográfica se registró correctamente en la carpeta de tu Tutor General.';
    }

    goToStep(4);
  } catch (err) {
    showAlert('formError', 'No se pudo conectar con el sistema. Revisa tu conexión a internet e intenta de nuevo.');
  } finally {
    submitting = false;
    btn.disabled = false;
    btn.textContent = registro && registro.yaActualizo ? 'Enviar evidencia' : 'Guardar y enviar';
  }
}

// ---------------------------------------------------------------
// Inicio
// ---------------------------------------------------------------
$('cedulaInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') onBuscar();
});

poblarSelectReasignacion();
renderFooter();
