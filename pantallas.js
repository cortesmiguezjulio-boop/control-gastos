'use strict';
// Resto de pantallas (cuotas, ahorro, mes a mes, ajustes, categorías, papelera), los formularios y el arranque.

// ---------- Compras a cuotas ----------

function vistaDeudas() {
  if (!D.deudas.length) {
    return mensajeVacio('No tienes compras a cuotas.<br><br>Toca + Compra para agregar una: la registras una vez y la app te recuerda cada cuota.');
  }
  const delMes = deudasDelMes(E.mes).sort((a, b) => a.diaPago - b.diaPago);
  // Primero las que siguen activas, después las terminadas.
  const todas = D.deudas.slice().sort((a, b) =>
    (cuotasPagadas(a.id) >= a.cuotas) - (cuotasPagadas(b.id) >= b.cuotas) || (finDeuda(a) < finDeuda(b) ? -1 : 1));
  let html = `<h4 class="subtitulo">Cuotas de ${nombreMes(E.mes)}</h4>`;
  if (!delMes.length) {
    html += '<p class="suave">No hay cuotas este mes.</p>';
  } else {
    const pagado = delMes.reduce((s, d) => s + ((pagoCuota(d.id, E.mes) || {}).monto || 0), 0);
    const total = delMes.reduce((s, d) => s + ((pagoCuota(d.id, E.mes) || {}).monto || d.valorCuota), 0);
    html += `<div class="tarjeta destacada">${fila('Total de cuotas del mes', dinero(total))}${fila('Ya pagado', dinero(pagado))}${fila('Falta por pagar', dinero(total - pagado))}</div>`;
    html += delMes.map(d => {
      const pago = pagoCuota(d.id, E.mes);
      const v = fechaLimite(d, E.mes), e = estadoPorFecha(v, !!pago);
      return `<div class="tarjeta item">
        <button class="item-principal" ${on(() => abrir(pago ? { tipo: 'verPagoCuota', deudaId: d.id, pago } : pagarCuota(d)))}>
          <span class="emoji">${d.emoji}</span>
          <span class="crece"><b>${esc(d.nombre)}</b><span class="pequeno">Cuota ${numeroCuota(d, E.mes)} de ${d.cuotas}</span>
            <span class="pequeno ${colorEstado(e)}">${textoEstado(e, v, pago && pago.fecha)}${pago ? ' · ' + nombreQuincena(pago.quincena) : ''}</span></span>
          <span class="derecha"><span class="${pago ? 'negrita' : ''}">${dinero(pago ? pago.monto : d.valorCuota)}</span><span class="mini ${pago ? 'verde' : 'suave'}">${pago ? '✓ Pagada' : 'Toca para pagar'}</span></span>
        </button>
        <button class="icono" ${on(() => abrir(editarDeuda(d)))} aria-label="Editar compra">${lapiz}</button>
      </div>`;
    }).join('');
  }
  html += '<h4 class="subtitulo">Todas tus compras a cuotas</h4>';
  html += todas.map(d => {
    const pagadas = cuotasPagadas(d.id), terminada = pagadas >= d.cuotas;
    return `<button class="tarjeta boton-tarjeta" ${on(() => abrir(editarDeuda(d)))}>
      <div class="fila"><span class="titulo-item">${d.emoji} ${esc(d.nombre)}</span><span class="${terminada ? 'verde' : 'suave'}">${terminada ? '✅ Pagada' : `${pagadas} de ${d.cuotas}`}</span></div>
      ${barra(pagadas / d.cuotas)}
      ${d.valorCompra > 0 ? fila('Valor de la compra', dinero(d.valorCompra)) : ''}
      ${fila(`${d.cuotas} cuotas de ${dinero(d.valorCuota)}`, dinero(totalDeuda(d)))}
      ${terminada ? '' : fila('Falta por pagar', dinero(Math.max(0, totalDeuda(d) - pagadoDe(d.id))))}
      <div class="pequeno suave">De ${nombreMesCorto(d.mesInicio)} ${d.mesInicio.slice(0, 4)} a ${nombreMesCorto(finDeuda(d))} ${finDeuda(d).slice(0, 4)} · pago máximo el día ${d.diaPago}</div>
    </button>`;
  }).join('');
  return html;
}

// ---------- Ahorro ----------

function textoPlan(p) {
  return `Para lograrlo debes ahorrar ${dinero(p.sugeridoMes)} al mes (${dinero(Math.ceil(p.sugeridoMes / 2))} por quincena) durante ${p.mesesRestantes} ${p.mesesRestantes === 1 ? 'mes' : 'meses'}.`;
}

function vistaAhorro() {
  const aportesMes = aportesDelMes(E.mes).sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  const metas = D.metas.map(m => [m, plan(m)]).sort((a, b) => (a[1].cumplida - b[1].cumplida) || (a[0].fechaMeta < b[0].fechaMeta ? -1 : 1));
  let html = `<div class="tarjeta destacada"><div class="fila-emoji"><span class="emoji-grande">🐷</span>
      <div><div class="etiqueta">Ahorrado en ${nombreMesCorto(E.mes)}</div><div class="mediano">${dinero(suma(aportesMes))}</div></div></div>
      ${fila('Total ahorrado en todas tus metas', dinero(suma(D.aportes)))}</div>`;
  if (!metas.length) {
    html += `<p class="suave">Aún no tienes metas de ahorro.<br><br>Toca + Meta y ponle nombre, cuánto quieres juntar y para qué fecha. La app te dirá cuánto ahorrar cada mes y cada quincena para lograrlo.</p>`;
  } else {
    html += '<h4 class="subtitulo">Tus metas</h4>';
    html += metas.map(([m, p]) => `<div class="tarjeta">
      <button class="boton-tarjeta sin-fondo" ${on(() => abrir(editarMeta(m)))}>
        <div class="fila-emoji"><span class="emoji">${m.emoji}</span><div><b>${esc(m.nombre)}</b>
          <div class="pequeno suave">Meta: ${dinero(m.objetivo)} para el ${fechaLarga(m.fechaMeta)}</div></div></div>
        ${barra(p.ahorrado / m.objetivo, p.cumplida ? 'exito' : '')}
        ${fila(`${dinero(p.ahorrado)} de ${dinero(m.objetivo)}`, Math.min(100, porcentaje(p.ahorrado, m.objetivo)) + '%')}
        ${p.cumplida ? '<div class="verde negrita">🎉 ¡Felicitaciones, lograste tu meta!</div>'
          : p.vencida ? `<div class="rojo">La fecha ya pasó y te faltan ${dinero(p.falta)}. Toca la meta para cambiar la fecha.</div>`
          : `<div class="primario">${textoPlan(p)}</div>` + (p.aporteMes >= p.sugeridoMes
            ? `<div class="pequeno verde">✅ Este mes ya ahorraste lo necesario (${dinero(p.aporteMes)}). ¡Vas muy bien!</div>`
            : `<div class="pequeno suave">Este mes llevas ${dinero(p.aporteMes)}: te faltan ${dinero(p.sugeridoMes - p.aporteMes)}.</div>`)}
      </button>
      ${p.cumplida ? '' : `<button class="boton tonal" ${on(() => abrir(nuevoAporte(m.id)))}>+ Abonar</button>`}
    </div>`).join('');
  }
  if (aportesMes.length) {
    html += `<h4 class="subtitulo">Abonos de ${nombreMes(E.mes)}</h4>`;
    html += aportesMes.map(a => {
      const m = meta(a.metaId);
      return `<button class="tarjeta item" ${on(() => abrir(editarAporte(a)))}>
        <span class="emoji">${m ? m.emoji : '🐷'}</span>
        <span class="crece"><span>${esc(m ? m.nombre : 'Meta eliminada')}</span>
          <span class="pequeno suave">${esc([fechaCorta(a.fecha), nombreQuincena(a.quincena), a.nota || null].filter(Boolean).join(' · '))}</span></span>
        <b class="verde">+ ${dinero(a.monto)}</b></button>`;
    }).join('');
  }
  return html;
}

// ---------- Mes a mes ----------

function vistaHistorial() {
  const res = mesesConDatos().map(m => resumen(m));
  const grafico = res.slice(0, 6).reverse();
  const maximo = Math.max(1, ...grafico.map(r => Math.max(r.ingresos, r.gastos)));
  const alto = v => Math.max(1, Math.round(v / maximo * 100));
  let html = `<div class="tarjeta"><h3>Ingresos vs. gastos</h3>
    <div class="grafico">${grafico.map(r => `<div class="columna">
        <div class="barras"><div class="b-ingreso" style="height:${alto(r.ingresos)}%"></div><div class="b-gasto" style="height:${alto(r.gastos)}%"></div></div>
        <span class="mini">${mesAbreviado(r.mes)}</span></div>`).join('')}</div>
    <div class="leyenda"><span><i class="b-ingreso"></i> Ingresos</span><span><i class="b-gasto"></i> Gastos</span></div></div>`;
  html += res.map(r => `<button class="tarjeta boton-tarjeta" ${on(() => { E.mes = r.mes; E.quincena = null; irA('resumen'); })}>
      <div class="fila"><span class="titulo-item">${nombreMes(r.mes)}</span><b class="${r.saldo >= 0 ? 'verde' : 'rojo'}">${r.saldo >= 0 ? '+ ' : '− '}${dinero(Math.abs(r.saldo))}</b></div>
      ${fila('Ingresos', dinero(r.ingresos))}${fila('Gastos', dinero(r.gastos))}${r.ahorro > 0 ? fila('🐷 Ahorro', dinero(r.ahorro)) : ''}
      <div class="pequeno suave">${r.mayor ? 'Lo que más pesó: ' + esc(textoMayor(r)) : 'Sin gastos registrados'}</div>
    </button>`).join('');
  return html;
}

// ---------- Ajustes ----------

const puedeNotificar = () => 'Notification' in window;

function vistaAjustes() {
  const a = D.ajustes;
  const cambiar = cambios => () => { guardarAjustes(Object.assign({}, a, cambios)); render(); };
  const chip = (activo, texto, accion) => `<button class="chip ${activo ? 'activo' : ''}" ${on(accion)}>${texto}</button>`;
  return `
    <div class="tarjeta"><h3>🎨 Tema</h3><div class="chips">
      ${[['sistema', 'Según el celular'], ['claro', '☀️ Claro'], ['oscuro', '🌙 Oscuro']].map(([v, t]) => chip(a.tema === v, t, cambiar({ tema: v }))).join('')}
    </div></div>
    <div class="tarjeta"><h3>💲 Moneda</h3><div class="chips">
      ${MONEDAS.map(m => chip(a.moneda === m.codigo, m.nombre, cambiar({ moneda: m.codigo }))).join('')}
      </div><p class="primario">Así se verán tus valores: ${dinero(1250000)}</p></div>
    <div class="tarjeta"><h3>📆 Días de la quincena</h3>
      <div class="fila"><span>La 1ª quincena termina el día</span>
        <span class="paso"><button class="icono tonal" ${on(cambiar({ corteQuincena: Math.max(CORTE_MIN, a.corteQuincena - 1) }))}>−</button>
        <b class="numero">${a.corteQuincena}</b>
        <button class="icono tonal" ${on(cambiar({ corteQuincena: Math.min(CORTE_MAX, a.corteQuincena + 1) }))}>+</button></span></div>
      <p class="primario">1ª quincena: del 1 al ${a.corteQuincena} · 2ª quincena: del ${a.corteQuincena + 1} a fin de mes</p>
      <p class="pequeno suave">Se usa para proponer la quincena al registrar. Lo que ya registraste conserva la quincena que le pusiste.</p></div>
    <div class="tarjeta"><h3>🔔 Recordatorios de vencimientos</h3>
      <label class="fila interruptor"><span>Avisarme de servicios y cuotas por vencer</span>
        <input type="checkbox" ${a.recordatorios ? 'checked' : ''} ${on(el => activarRecordatorios(!a.recordatorios))}><i></i></label>
      ${a.recordatorios ? `<p class="etiqueta">¿Con cuánta anticipación?</p><div class="chips">
          ${[1, 2, 3, 5, 7].map(d => chip(a.diasAviso === d, d === 1 ? '1 día' : `${d} días`, cambiar({ diasAviso: d }))).join('')}</div>
        <p class="pequeno suave">Al abrir la app verás en el menú lo que está por vencer${puedeNotificar() ? ' y te llegará una notificación (una vez al día)' : ''}.
          En iPhone las notificaciones solo funcionan si la app está agregada a la pantalla de inicio (iOS 16.4 o superior).</p>
        <button class="boton contorno" ${on(() => mostrarRecordatorio(true))}>Enviar uno de prueba</button>` : ''}
    </div>
    <h4 class="subtitulo">Tus datos</h4>
    ${opcionFila('🧾', 'Servicios base', 'Los servicios fijos de cada mes', D.servicios.length, () => irA('serviciosBase'))}
    ${opcionFila('🏷️', 'Categorías', 'Tipos de gasto, íconos y categorías', null, () => irA('categorias'))}
    ${opcionFila('🗑️', 'Papelera', 'Recupera lo que borraste por error', `${D.papelera.length}/${MAX_PAPELERA}`, () => irA('papelera'))}
    <div class="tarjeta"><h3>💾 Respaldo</h3>
      <p class="pequeno suave">Guarda una copia de todo en un archivo (por ejemplo en iCloud Drive o Google Drive). Sirve también para pasar tus datos entre esta versión y la app de Android.</p>
      <div class="botones"><button class="boton" ${on(exportarRespaldo)}>Exportar</button><button class="boton contorno" ${on(() => document.getElementById('archivo').click())}>Importar</button></div>
    </div>`;
}

async function activarRecordatorios(activar) {
  if (activar && puedeNotificar() && Notification.permission === 'default') {
    try { await Notification.requestPermission(); } catch (e) { /* el navegador no lo permite aquí */ }
  }
  guardarAjustes(Object.assign({}, D.ajustes, { recordatorios: activar }));
  render();
}

/** Muestra lo que vence pronto como notificación (si hay permiso) o como aviso dentro de la app. */
async function mostrarRecordatorio(prueba) {
  const lista = vencimientos(D.ajustes.diasAviso);
  if (!lista.length && !prueba) return;
  const titulo = !lista.length ? 'Todo al día ✅' : lista.length === 1 ? 'Tienes 1 pago pendiente' : `Tienes ${lista.length} pagos pendientes`;
  const cuerpo = !lista.length ? `No tienes servicios ni cuotas por vencer en los próximos ${D.ajustes.diasAviso} días.`
    : lista.slice(0, 6).map(v => `${v.emoji} ${v.nombre} · ${textoCuando(v.fecha)}${v.monto > 0 ? ' · ' + dinero(v.monto) : ''}`).join('\n');
  if (puedeNotificar() && Notification.permission === 'granted' && 'serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(titulo, { body: cuerpo, icon: 'iconos/icono-192.png', badge: 'iconos/icono-192.png', tag: 'vencimientos' });
      if (prueba) aviso('Recordatorio enviado');
      return;
    } catch (e) { /* si falla, se muestra dentro de la app */ }
  }
  if (prueba) aviso(titulo + (lista.length ? ' — míralos en el menú' : ''));
}

/** Una vez al día, al abrir la app, avisa de lo que vence pronto. */
function recordatorioDelDia() {
  if (!D.ajustes.recordatorios) return;
  const clave = 'controlDeGastos.ultimoAviso';
  try {
    if (localStorage.getItem(clave) === hoyISO()) return;
    localStorage.setItem(clave, hoyISO());
  } catch (e) { return; }
  mostrarRecordatorio(false);
}

async function exportarRespaldo() {
  const nombre = `ControlDeGastos_respaldo_${hoyISO()}.json`;
  const archivo = new File([exportar()], nombre, { type: 'application/json' });
  // En iPhone, "Compartir" permite guardarlo en Archivos / iCloud Drive.
  if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
    try { await navigator.share({ files: [archivo], title: 'Respaldo de Control de Gastos' }); aviso('Respaldo listo ✅'); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(archivo);
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  setTimeout(() => { URL.revokeObjectURL(enlace.href); enlace.remove(); }, 1000);
  aviso('Respaldo descargado ✅');
}

function leerArchivoRespaldo(ev) {
  const archivo = ev.target.files[0];
  ev.target.value = '';
  if (!archivo) return;
  archivo.text().then(texto => {
    let datos;
    try { datos = normalizar(texto); } catch (e) { aviso('Ese archivo no es un respaldo de Control de Gastos'); return; }
    E.dialogo = null;
    confirmar('¿Importar respaldo?',
      `El respaldo tiene ${cantidad(datos.ingresos.length, 'ingreso')}, ${cantidad(datos.servicios.length, 'servicio')}, ${cantidad(datos.pagos.length, 'pago')}, ` +
      `${cantidad(datos.gastos.length, 'gasto')}, ${cantidad(datos.deudas.length, 'compra')} a cuotas y ${cantidad(datos.metas.length, 'meta')} de ahorro.\n\n` +
      'Esto reemplazará todos los datos y ajustes que tienes ahora.',
      'Importar', () => { importar(datos); cerrar(); aviso('Respaldo importado ✅'); });
  });
}

// ---------- Servicios base, categorías y papelera ----------

function vistaServiciosBase() {
  let html = '<p class="suave">Estos son los servicios que se repiten cada mes. Lo que cambies aquí (nombre, ícono, monto aproximado o día de vencimiento) se aplica a todos los meses.</p>';
  if (!D.servicios.length) html += mensajeVacio('No tienes servicios. Agrégalos con el botón + Servicio.');
  TIPOS_SERVICIO.forEach(tipo => {
    const lista = D.servicios.filter(s => s.tipo === tipo).sort((a, b) => a.diaVence - b.diaVence);
    if (!lista.length) return;
    html += `<h4 class="subtitulo">${tipo}</h4>` + lista.map(s => `<button class="tarjeta item" ${on(() => abrir(editarServicio(s)))}>
      <span class="emoji">${emojiDe(s)}</span>
      <span class="crece"><b>${esc(s.nombre)}</b><span class="pequeno suave">Vence el día ${s.diaVence} de cada mes${s.montoEstimado > 0 ? ' · ≈ ' + dinero(s.montoEstimado) : ''}</span></span>
      <span class="icono">${lapiz}</span></button>`).join('');
  });
  return html;
}

function vistaCategorias() {
  return '<p class="suave">Cada categoría agrupa varios tipos de gasto. Toca un tipo para cambiarle el nombre, el ícono o la categoría.</p>' +
    D.grupos.map(g => `<div class="tarjeta">
      <div class="fila"><span class="titulo-item">${g.emoji} ${esc(g.nombre)}</span><button class="icono" ${on(() => abrir(editarGrupo(g)))} aria-label="Editar categoría">${lapiz}</button></div>
      <div class="chips">${tiposDe(g.id).map(t => `<button class="chip" ${on(() => abrir(editarTipo(t)))}>${t.emoji} ${esc(t.nombre)}</button>`).join('')}
        <button class="chip agregar" ${on(() => abrir(nuevoTipo(g.id)))}>+ Agregar</button></div>
    </div>`).join('') +
    `<button class="boton contorno ancho" ${on(() => abrir(nuevoGrupo()))}>+ Nueva categoría</button>`;
}

function vistaPapelera() {
  let html = `<p class="suave">Aquí quedan las últimas ${MAX_PAPELERA} cosas que borraste (gastos, pagos, ingresos, servicios, compras, metas…). Al restaurarlas vuelven a su lugar y a tus cuentas.</p>`;
  if (!D.papelera.length) return html + mensajeVacio('🗑️<br><br>La papelera está vacía.');
  html += D.papelera.map(b => `<div class="tarjeta item">
      <span class="emoji">${b.emoji}</span>
      <span class="crece"><span>${esc(b.descripcion)}</span><span class="pequeno suave">${[b.monto > 0 ? dinero(b.monto) : null, 'Borrado el ' + fechaCorta(b.fechaBorrado)].filter(Boolean).join(' · ')}</span></span>
      <button class="boton tonal" ${on(() => { const error = restaurar(b); aviso(error || 'Restaurado ✅'); render(); })}>Restaurar</button>
    </div>`).join('');
  html += `<button class="boton texto rojo" ${on(() => confirmar('¿Vaciar la papelera?', 'Lo que está en la papelera se borrará para siempre y ya no se podrá recuperar.', 'Vaciar', () => { vaciarPapelera(); cerrar(); }))}>Vaciar papelera</button>`;
  return html;
}

// ---------- Formularios: cómo se crean ----------

const fechaInicial = () => {
  const hoy = hoyISO();
  return E.mes === mesActual() ? hoy : fechaDe(E.mes, diaDe(hoy));
};
const quincenaHoy = () => quincenaDe(hoyISO());
const texto = v => (v ? String(v) : '');

const nuevoIngreso = () => ({ tipo: 'ingreso', monto: '', descripcion: 'Sueldo', fecha: fechaInicial(), quincena: quincenaHoy() });
const editarIngreso = i => ({ tipo: 'ingreso', original: i, monto: texto(i.monto), descripcion: i.descripcion, fecha: i.fecha, quincena: i.quincena });
const nuevoServicio = () => ({ tipo: 'servicio', nombre: '', tipoServicio: TIPOS_SERVICIO[0], monto: '', dia: '15', emoji: '' });
const editarServicio = s => ({ tipo: 'servicio', original: s, nombre: s.nombre, tipoServicio: s.tipo, monto: texto(s.montoEstimado), dia: String(s.diaVence), emoji: s.emoji });
const pagarServicio = s => ({
  tipo: 'pagar', servicioId: s.id, monto: texto(s.montoEstimado),
  // En el mes actual se propone hoy; en otro mes, el día en que vence ese servicio ese mes.
  fecha: E.mes === mesActual() ? hoyISO() : fechaVence(s, E.mes), quincena: quincenaHoy(),
});
function nuevoGasto() {
  const t = tipoSugerido();
  return { tipo: 'gasto', monto: '', tipoId: t ? t.id : null, grupoId: t ? t.grupoId : (D.grupos[0] || {}).id, nota: '', fecha: fechaInicial(), quincena: quincenaHoy() };
}
function editarGasto(g) {
  const t = tipoGasto(g.tipoId);
  return { tipo: 'gasto', original: g, monto: texto(g.monto), tipoId: g.tipoId, grupoId: t ? t.grupoId : null, nota: g.nota, fecha: g.fecha, quincena: g.quincena };
}
const nuevaDeuda = () => ({ tipo: 'deuda', nombre: '', cuotas: '', valorCompra: '', valorCuota: '', inicio: E.mes, dia: '15', emoji: '💳' });
const editarDeuda = d => ({
  tipo: 'deuda', original: d, nombre: d.nombre, cuotas: String(d.cuotas), valorCompra: texto(d.valorCompra),
  valorCuota: texto(d.valorCuota), inicio: d.mesInicio, dia: String(d.diaPago), emoji: d.emoji,
});
const pagarCuota = d => ({
  tipo: 'pagarCuota', deudaId: d.id, monto: texto(d.valorCuota),
  fecha: E.mes === mesActual() ? hoyISO() : fechaLimite(d, E.mes), quincena: quincenaHoy(),
});
const nuevaMeta = () => ({ tipo: 'meta', nombre: '', objetivo: '', fecha: fechaDe(sumarMeses(mesActual(), 6), 31), emoji: '🐷' });
const editarMeta = m => ({ tipo: 'meta', original: m, nombre: m.nombre, objetivo: texto(m.objetivo), fecha: m.fechaMeta, emoji: m.emoji });
function nuevoAporte(metaId) {
  const m = meta(metaId) || D.metas[0];
  const p = m && plan(m);
  // Se propone lo que falta para cumplir lo de este mes.
  const sugerido = p && p.sugeridoMes - p.aporteMes > 0 ? String(p.sugeridoMes - p.aporteMes) : '';
  return { tipo: 'aporte', metaId: m ? m.id : null, monto: sugerido, fecha: fechaInicial(), quincena: quincenaHoy(), nota: '' };
}
const editarAporte = a => ({ tipo: 'aporte', original: a, metaId: a.metaId, monto: texto(a.monto), fecha: a.fecha, quincena: a.quincena, nota: a.nota });
const nuevoTipo = grupoId => ({ tipo: 'tipoGasto', nombre: '', emoji: '🧾', grupoId: grupoId || (D.grupos[0] || {}).id });
const editarTipo = t => ({ tipo: 'tipoGasto', original: t, nombre: t.nombre, emoji: t.emoji, grupoId: t.grupoId });
const nuevoGrupo = () => ({ tipo: 'grupo', nombre: '', emoji: '🧾' });
const editarGrupo = g => ({ tipo: 'grupo', original: g, nombre: g.nombre, emoji: g.emoji });

// ---------- Formularios: campos ----------

function campoTexto(etiqueta, d, campo, extra = '') {
  return `<label class="campo"><span>${etiqueta}</span>
    <input type="text" value="${esc(d[campo])}" autocapitalize="sentences" ${extra} ${alEscribir(el => { d[campo] = el.value; if (d.alCambiar) d.alCambiar(); })}></label>`;
}

function campoNumero(etiqueta, d, campo, max = 2) {
  return `<label class="campo"><span>${etiqueta}</span>
    <input type="text" inputmode="numeric" pattern="[0-9]*" value="${esc(d[campo])}" ${alEscribir(el => {
      el.value = soloDigitos(el.value).slice(0, max); d[campo] = el.value; if (d.alCambiar) d.alCambiar();
    })}></label>`;
}

function campoDinero(etiqueta, d, campo) {
  const ayuda = v => (Number(v) > 0 ? dinero(Number(v)) : '');
  const simbolo = simboloMoneda();
  return `<label class="campo"><span>${etiqueta}</span>
    <span class="con-prefijo">${simbolo ? `<i>${esc(simbolo)}</i>` : ''}<input type="text" inputmode="numeric" pattern="[0-9]*" value="${esc(d[campo])}" ${alEscribir(el => {
      el.value = soloDigitos(el.value); d[campo] = el.value;
      el.closest('.campo').querySelector('.ayuda').textContent = ayuda(el.value);
      if (d.alCambiar) d.alCambiar();
    })}></span><small class="ayuda">${ayuda(d[campo])}</small></label>`;
}

function campoFecha(etiqueta, d, campo, tipo = 'date') {
  return `<label class="campo"><span>${etiqueta}</span>
    <input type="${tipo}" value="${esc(d[campo])}" ${alEscribir(el => { if (el.value) { d[campo] = el.value; if (d.alCambiar) d.alCambiar(); } })}></label>`;
}

function chips(titulo, opciones, activo, elegir) {
  return `${titulo ? `<p class="etiqueta">${titulo}</p>` : ''}<div class="chips">${opciones.map(([valor, txt]) =>
    `<button class="chip ${valor === activo ? 'activo' : ''}" ${on(() => { elegir(valor); renderDialogo(); })}>${txt}</button>`).join('')}</div>`;
}

function selectorQuincena(titulo, d) {
  const c = D.ajustes.corteQuincena;
  return chips(titulo, [[1, `1ª (1 al ${c})`], [2, `2ª (${c + 1} a fin)`]], d.quincena, q => { d.quincena = q; });
}

function selectorIcono(d, campo, porDefecto) {
  const actual = d[campo] || porDefecto;
  return `<div class="fila"><span class="etiqueta">Ícono</span><span class="emoji-grande vista-icono">${actual}</span></div>
    <div class="iconos">${ICONOS.map(e => `<button class="${e === actual ? 'activo' : ''}" ${on(() => { d[campo] = e; renderDialogo(); })}>${e}</button>`).join('')}</div>
    <label class="campo"><span>…o escribe otro emoji</span><input type="text" ${alEscribir(el => {
      const v = el.value.trim();
      if (v) { d[campo] = Array.from(v).slice(0, 2).join(''); el.closest('.hoja').querySelector('.vista-icono').textContent = d[campo]; }
    })}></label>`;
}

const botonEliminar = (texto, accion) => `<button class="boton texto rojo" ${on(accion)}>🗑️ ${texto}</button>`;
const RECUPERAR = '\n\nSi te equivocas, puedes recuperarlo en ⚙️ Ajustes → Papelera.';

function hoja(titulo, cuerpo, guardarTexto, alGuardar) {
  return `<div class="fondo-hoja" ${on(cerrar)}></div>
  <div class="hoja" role="dialog" aria-label="${esc(titulo)}">
    <h2>${titulo}</h2>
    <div class="cuerpo">${cuerpo}</div>
    <div class="acciones-hoja">
      <button class="boton texto" ${on(cerrar)}>${alGuardar ? 'Cancelar' : 'Cerrar'}</button>
      ${alGuardar ? `<button class="boton" ${on(alGuardar)}>${guardarTexto}</button>` : ''}
    </div>
  </div>`;
}

function vistaConfirmar() {
  const c = E.confirmar;
  return `<div class="fondo-hoja encima" ${on(() => { E.confirmar = null; renderDialogo(); })}></div>
  <div class="confirmacion" role="alertdialog">
    <h2>${esc(c.titulo)}</h2><p>${esc(c.texto).replace(/\n/g, '<br>')}</p>
    <div class="acciones-hoja"><button class="boton texto" ${on(() => { E.confirmar = null; renderDialogo(); })}>Cancelar</button>
      <button class="boton texto rojo" ${on(c.accion)}>${esc(c.boton)}</button></div>
  </div>`;
}

const montoDe = v => Number(v) || 0;
const falta = texto => { aviso(texto); return false; };

// ---------- Formularios: cada uno ----------

function vistaDialogo(d) {
  switch (d.tipo) {
    case 'ingreso': return hoja(d.original ? 'Editar ingreso' : 'Nuevo ingreso',
      campoDinero('¿Cuánto recibiste?', d, 'monto') + campoTexto('Descripción', d, 'descripcion') +
      chips('', ['Sueldo', 'Quincena', 'Prima', 'Extra', 'Otro'].map(s => [s, s]), d.descripcion, s => { d.descripcion = s; }) +
      campoFecha('Fecha', d, 'fecha') + selectorQuincena('¿A qué quincena corresponde?', d) +
      (d.original ? botonEliminar('Eliminar ingreso', () => confirmar('¿Eliminar este ingreso?', `${d.original.descripcion}: ${dinero(d.original.monto)}` + RECUPERAR, 'Eliminar', () => { borrarIngreso(d.original); cerrar(); })) : ''),
      'Guardar', () => {
        if (!montoDe(d.monto)) return falta('Escribe cuánto recibiste');
        guardarIngreso({ id: d.original ? d.original.id : nuevoId(), fecha: d.fecha, descripcion: d.descripcion.trim() || 'Ingreso', monto: montoDe(d.monto), quincena: d.quincena });
        cerrar();
      });

    case 'servicio': {
      const emoji = d.emoji || emojiServicio(d.nombre);
      return hoja(d.original ? 'Editar servicio' : 'Nuevo servicio',
        campoTexto('Nombre (ej. Luz, Netflix)', d, 'nombre') +
        chips('', TIPOS_SERVICIO.map(t => [t, t]), d.tipoServicio, t => { d.tipoServicio = t; }) +
        campoDinero('Monto aproximado (opcional)', d, 'monto') + campoNumero('Día del mes en que vence', d, 'dia') +
        selectorIcono(d, 'emoji', emoji) +
        (d.original ? botonEliminar('Eliminar servicio', () => confirmar(`¿Eliminar ${d.original.nombre}?`, 'También se quitarán sus pagos de tus cuentas.' + RECUPERAR, 'Eliminar', () => { borrarServicio(d.original); cerrar(); })) : ''),
        'Guardar', () => {
          const dia = Number(d.dia);
          if (!d.nombre.trim()) return falta('Escribe el nombre del servicio');
          if (!(dia >= 1 && dia <= 31)) return falta('El día de vencimiento debe estar entre 1 y 31');
          guardarServicio({ id: d.original ? d.original.id : nuevoId(), nombre: d.nombre.trim(), tipo: d.tipoServicio, montoEstimado: montoDe(d.monto), diaVence: dia, emoji: d.emoji });
          cerrar();
        });
    }

    case 'pagar': {
      const s = servicio(d.servicioId);
      return hoja('Pagar ' + esc(s.nombre),
        `<p>Corresponde a ${nombreMes(E.mes)}</p>` + campoDinero('Monto pagado', d, 'monto') + campoFecha('Fecha de pago', d, 'fecha') +
        selectorQuincena('¿De qué quincena sale?', d),
        'Registrar pago', () => {
          if (!montoDe(d.monto)) return falta('Escribe cuánto pagaste');
          registrarPago({ id: nuevoId(), servicioId: s.id, mes: E.mes, monto: montoDe(d.monto), fecha: d.fecha, quincena: d.quincena });
          cerrar();
        });
    }

    case 'verPago': {
      const s = servicio(d.servicioId), p = d.pago;
      return hoja(`${emojiDe(s)} ${esc(s.nombre)}`,
        `<p class="mediano">Pagaste ${dinero(p.monto)}</p><p>El ${fechaLarga(p.fecha)}</p><p class="suave">Corresponde a ${nombreMes(p.mes)} · ${nombreQuincena(p.quincena)}</p>` +
        botonEliminar('Quitar pago', () => { quitarPago(p); cerrar(); }), null, null);
    }

    case 'gasto': {
      d.grupoId = d.grupoId || (D.grupos[0] || {}).id;
      const tipos = tiposDe(d.grupoId);
      return hoja(d.original ? 'Editar gasto' : 'Nuevo gasto',
        campoDinero('¿Cuánto gastaste?', d, 'monto') +
        chips('Categoría', D.grupos.map(g => [g.id, `${g.emoji} ${esc(g.nombre)}`]), d.grupoId, gid => {
          d.grupoId = gid;
          // Al cambiar de categoría se elige su primer tipo.
          const t = tipoGasto(d.tipoId);
          if (!t || t.grupoId !== gid) d.tipoId = (tiposDe(gid)[0] || {}).id || null;
        }) +
        `<p class="etiqueta">¿En qué?</p><div class="chips">${tipos.map(t => `<button class="chip ${t.id === d.tipoId ? 'activo' : ''}" ${on(() => { d.tipoId = t.id; renderDialogo(); })}>${t.emoji} ${esc(t.nombre)}</button>`).join('')}
          <button class="chip agregar" ${on(() => { const n = nuevoTipo(d.grupoId); n.volverA = d; abrir(n); })}>+ Nuevo</button></div>` +
        campoTexto('Nota (opcional)', d, 'nota') + campoFecha('Fecha', d, 'fecha') + selectorQuincena('¿De qué quincena sale?', d) +
        (d.original ? botonEliminar('Eliminar gasto', () => confirmar('¿Eliminar este gasto?', `${(tipoGasto(d.original.tipoId) || { nombre: 'Gasto' }).nombre}: ${dinero(d.original.monto)}` + RECUPERAR, 'Eliminar', () => { borrarGasto(d.original); cerrar(); })) : ''),
        'Guardar', () => {
          if (!montoDe(d.monto)) return falta('Escribe cuánto gastaste');
          if (!d.tipoId) return falta('Elige en qué gastaste');
          guardarGasto({ id: d.original ? d.original.id : nuevoId(), fecha: d.fecha, tipoId: d.tipoId, monto: montoDe(d.monto), nota: d.nota.trim(), quincena: d.quincena });
          cerrar();
        });
    }

    case 'deuda': {
      const previa = () => {
        const n = Number(d.cuotas), c = montoDe(d.valorCuota);
        if (!(n > 0 && c > 0) || !d.inicio) return '';
        return `${n} ${n === 1 ? 'cuota' : 'cuotas'} de ${dinero(c)} = ${dinero(c * n)} en total · De ${nombreMes(d.inicio)} a ${nombreMes(sumarMeses(d.inicio, n - 1))}`;
      };
      d.alCambiar = () => { const el = document.getElementById('previa'); if (el) el.textContent = previa(); };
      return hoja(d.original ? 'Editar compra a cuotas' : 'Nueva compra a cuotas',
        campoTexto('¿Qué compraste? (ej. Celular, Nevera)', d, 'nombre') + campoNumero('Número de cuotas', d, 'cuotas', 3) +
        campoDinero('Valor de la compra (opcional, informativo)', d, 'valorCompra') +
        campoDinero('Valor de cada cuota (con intereses)', d, 'valorCuota') +
        campoFecha('Mes de la primera cuota', d, 'inicio', 'month') + campoNumero('Día máximo de pago cada mes', d, 'dia') +
        `<p class="primario" id="previa">${previa()}</p>` + selectorIcono(d, 'emoji', '💳') +
        (d.original ? botonEliminar('Eliminar compra', () => confirmar(`¿Eliminar ${d.original.nombre}?`, 'También se quitarán sus cuotas pagadas de tus cuentas.' + RECUPERAR, 'Eliminar', () => { borrarDeuda(d.original); cerrar(); })) : ''),
        'Guardar', () => {
          const n = Number(d.cuotas), dia = Number(d.dia);
          if (!d.nombre.trim()) return falta('Escribe qué compraste');
          if (!(n >= 1 && n <= 360)) return falta('Escribe el número de cuotas');
          if (!montoDe(d.valorCuota)) return falta('Escribe el valor de cada cuota');
          if (!(dia >= 1 && dia <= 31)) return falta('El día de pago debe estar entre 1 y 31');
          guardarDeuda({ id: d.original ? d.original.id : nuevoId(), nombre: d.nombre.trim(), emoji: d.emoji, cuotas: n, valorCuota: montoDe(d.valorCuota), mesInicio: d.inicio, diaPago: dia, valorCompra: montoDe(d.valorCompra) });
          cerrar();
        });
    }

    case 'pagarCuota': {
      const dd = deuda(d.deudaId);
      return hoja('Pagar ' + esc(dd.nombre),
        `<p>Cuota ${numeroCuota(dd, E.mes)} de ${dd.cuotas} · ${nombreMes(E.mes)}<br>Fecha máxima: ${fechaLarga(fechaLimite(dd, E.mes))}</p>` +
        campoDinero('Monto pagado', d, 'monto') + campoFecha('Fecha de pago', d, 'fecha') + selectorQuincena('¿De qué quincena sale?', d),
        'Registrar pago', () => {
          if (!montoDe(d.monto)) return falta('Escribe cuánto pagaste');
          registrarPagoCuota({ id: nuevoId(), deudaId: dd.id, mes: E.mes, monto: montoDe(d.monto), fecha: d.fecha, quincena: d.quincena });
          cerrar();
        });
    }

    case 'verPagoCuota': {
      const dd = deuda(d.deudaId), p = d.pago;
      return hoja(`${dd.emoji} ${esc(dd.nombre)}`,
        `<p class="mediano">Cuota ${numeroCuota(dd, p.mes) || '?'} de ${dd.cuotas}</p><p>Pagaste ${dinero(p.monto)} el ${fechaLarga(p.fecha)} · ${nombreQuincena(p.quincena)}</p>
         <p class="suave">Van ${cuotasPagadas(dd.id)} de ${dd.cuotas} cuotas pagadas</p>` + botonEliminar('Quitar pago', () => { quitarPagoCuota(p); cerrar(); }), null, null);
    }

    case 'meta': {
      const previa = () => {
        const v = montoDe(d.objetivo);
        if (!v) return '';
        const p = plan({ id: d.original ? d.original.id : -1, objetivo: v, fechaMeta: d.fecha });
        if (p.cumplida) return '🎉 Con lo que ya ahorraste, esta meta está lograda.';
        if (p.vencida) return 'Esa fecha ya pasó. Elige una fecha futura.';
        return `Debes ahorrar ${dinero(p.sugeridoMes)} al mes (${dinero(Math.ceil(p.sugeridoMes / 2))} por quincena) durante ${p.mesesRestantes} ${p.mesesRestantes === 1 ? 'mes' : 'meses'}.`;
      };
      d.alCambiar = () => { const el = document.getElementById('previa'); if (el) el.textContent = previa(); };
      return hoja(d.original ? 'Editar meta' : 'Nueva meta de ahorro',
        campoTexto('¿Para qué ahorras? (ej. Viaje, Moto)', d, 'nombre') + campoDinero('¿Cuánto quieres juntar?', d, 'objetivo') +
        campoFecha('¿Para qué fecha?', d, 'fecha') + `<p class="primario" id="previa">${previa()}</p>` + selectorIcono(d, 'emoji', '🐷') +
        (d.original ? botonEliminar('Eliminar meta', () => confirmar(`¿Eliminar ${d.original.nombre}?`, 'También se quitarán sus abonos de tus cuentas.' + RECUPERAR, 'Eliminar', () => { borrarMeta(d.original); cerrar(); })) : ''),
        'Guardar', () => {
          if (!d.nombre.trim()) return falta('Escribe para qué ahorras');
          if (!montoDe(d.objetivo)) return falta('Escribe cuánto quieres juntar');
          guardarMeta({ id: d.original ? d.original.id : nuevoId(), nombre: d.nombre.trim(), emoji: d.emoji, objetivo: montoDe(d.objetivo), fechaMeta: d.fecha });
          cerrar();
        });
    }

    case 'aporte': {
      const m = meta(d.metaId);
      return hoja(d.original ? 'Editar abono' : 'Abonar a una meta',
        (D.metas.length > 1 ? chips('¿Para qué meta?', D.metas.map(x => [x.id, `${x.emoji} ${esc(x.nombre)}`]), d.metaId, id => { d.metaId = id; })
          : m ? `<p class="mediano">${m.emoji} ${esc(m.nombre)}</p>` : '') +
        campoDinero('¿Cuánto ahorraste?', d, 'monto') + campoFecha('Fecha', d, 'fecha') + selectorQuincena('¿De qué quincena sale?', d) +
        campoTexto('Nota (opcional)', d, 'nota') +
        (d.original ? botonEliminar('Eliminar abono', () => confirmar('¿Eliminar este abono?', dinero(d.original.monto) + RECUPERAR, 'Eliminar', () => { borrarAporte(d.original); cerrar(); })) : ''),
        'Guardar', () => {
          if (!d.metaId) return falta('Elige la meta');
          if (!montoDe(d.monto)) return falta('Escribe cuánto ahorraste');
          guardarAporte({ id: d.original ? d.original.id : nuevoId(), metaId: d.metaId, fecha: d.fecha, monto: montoDe(d.monto), quincena: d.quincena, nota: d.nota.trim() });
          cerrar();
        });
    }

    case 'tipoGasto': return hoja(d.original ? 'Editar tipo de gasto' : 'Nuevo tipo de gasto',
      campoTexto('Nombre (ej. Gasolina, Almuerzo)', d, 'nombre') +
      chips('Categoría', D.grupos.map(g => [g.id, `${g.emoji} ${esc(g.nombre)}`]), d.grupoId, gid => { d.grupoId = gid; }) +
      selectorIcono(d, 'emoji', '🧾') +
      (d.original ? botonEliminar('Eliminar tipo', () => {
        if (borrarTipo(d.original)) cerrar();
        else aviso(`Hay ${cantidad(usosDeTipo(d.original.id), 'gasto')} con este tipo. Cámbialos de tipo antes de borrarlo, o muévelo a otra categoría.`);
      }) : ''),
      'Guardar', () => {
        if (!d.nombre.trim()) return falta('Escribe el nombre');
        if (!d.grupoId) return falta('Elige la categoría');
        const t = { id: d.original ? d.original.id : nuevoId(), nombre: d.nombre.trim(), emoji: d.emoji, grupoId: d.grupoId };
        guardarTipo(t);
        if (d.volverA) {
          // Se creó desde el formulario de gasto: vuelve a él con el tipo nuevo elegido.
          d.volverA.grupoId = t.grupoId;
          d.volverA.tipoId = t.id;
          abrir(d.volverA);
        } else cerrar();
      });

    case 'grupo': return hoja(d.original ? 'Editar categoría' : 'Nueva categoría',
      campoTexto('Nombre (ej. Mascotas, Carro)', d, 'nombre') + selectorIcono(d, 'emoji', '🧾') +
      (d.original ? botonEliminar('Eliminar categoría', () => {
        if (borrarGrupo(d.original)) cerrar();
        else aviso('Esta categoría todavía tiene tipos de gasto. Muévelos a otra categoría o bórralos primero.');
      }) : ''),
      'Guardar', () => {
        if (!d.nombre.trim()) return falta('Escribe el nombre');
        guardarGrupo({ id: d.original ? d.original.id : nuevoId(), nombre: d.nombre.trim(), emoji: d.emoji });
        cerrar();
      });
  }
  return '';
}

// ---------- Arranque ----------

cargar();
history.replaceState({ p: 'portada' }, '');
document.getElementById('archivo').addEventListener('change', leerArchivoRespaldo);
render();
recordatorioDelDia();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { /* sin modo sin conexión */ }));
}
// Pide al navegador que no borre los datos de la app cuando falte espacio.
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
