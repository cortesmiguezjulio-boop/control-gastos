'use strict';
// Pantallas de Control de Gastos (versión web). Cada pantalla es una función que devuelve HTML;
// los botones llaman funciones registradas con on() / alEscribir().

// ---------- Estado de la interfaz ----------

const E = {
  pantalla: 'portada',
  mes: mesActual(),
  /** Vista del resumen: null = mes completo, 1 o 2 = esa quincena. */
  quincena: null,
  /** Formulario abierto (objeto con sus campos) o null. */
  dialogo: null,
  /** Confirmación encima del formulario: { titulo, texto, boton, accion }. */
  confirmar: null,
  /** Categorías abiertas en "¿En qué se va tu dinero?". */
  abiertos: {},
};

const SECCIONES = {
  resumen: 'Resumen del mes', ingresos: 'Ingresos', menuGastos: 'Gastos', servicios: 'Servicios',
  gastos: 'Gastos diarios', deudas: 'Compras a cuotas', ahorro: 'Ahorro', historial: 'Mes a mes',
  ajustes: 'Ajustes', categorias: 'Categorías', serviciosBase: 'Servicios base', papelera: 'Papelera',
};
const SIN_MES = ['historial', 'ajustes', 'categorias', 'serviciosBase', 'papelera'];

// ---------- Ayudas para armar HTML ----------

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let acciones = [];
/** Registra una función para un clic; devuelve el atributo que va en el elemento. */
function on(fn) { acciones.push(fn); return `data-a="${acciones.length - 1}"`; }
/** Igual que on(), pero para cuando se escribe en un campo. */
function alEscribir(fn) { acciones.push(fn); return `data-i="${acciones.length - 1}"`; }

const soloDigitos = s => String(s).replace(/\D/g, '').slice(0, 12);

function aviso(texto) {
  const t = document.getElementById('aviso');
  t.textContent = texto;
  t.classList.add('visible');
  clearTimeout(aviso.temporizador);
  aviso.temporizador = setTimeout(() => t.classList.remove('visible'), 3000);
}

// ---------- Navegación ----------

function irA(pantalla) {
  history.pushState({ p: pantalla }, '');
  E.pantalla = pantalla;
  render();
  window.scrollTo(0, 0);
}
const volver = () => history.back();

window.addEventListener('popstate', ev => {
  // El botón "atrás" (o deslizar) primero cierra el formulario abierto.
  if (E.confirmar || E.dialogo) {
    E.confirmar = null;
    E.dialogo = null;
    history.pushState({ p: E.pantalla }, '');
    render();
    return;
  }
  E.pantalla = (ev.state && ev.state.p) || 'menu';
  render();
});

function abrir(dialogo) { E.dialogo = dialogo; E.confirmar = null; render(); }
function cerrar() { E.dialogo = null; E.confirmar = null; render(); }
function confirmar(titulo, texto, boton, accion) {
  E.confirmar = { titulo, texto, boton, accion };
  renderDialogo();
}

// ---------- Dibujo ----------

function render() {
  acciones = [];
  document.documentElement.dataset.tema = D.ajustes.tema;
  const app = document.getElementById('app');
  app.innerHTML = E.pantalla === 'portada' ? vistaPortada()
    : E.pantalla === 'menu' ? vistaMenu() : vistaSeccion(E.pantalla);
  renderDialogo();
  if (errorAlGuardar) aviso(errorAlGuardar);
}

/** Vuelve a dibujar solo el formulario, conservando su posición de desplazamiento. */
function renderDialogo() {
  const capa = document.getElementById('capa');
  const hoja = capa.querySelector('.hoja');
  const desplazado = hoja ? hoja.scrollTop : 0;
  capa.innerHTML = (E.dialogo ? vistaDialogo(E.dialogo) : '') + (E.confirmar ? vistaConfirmar() : '');
  capa.classList.toggle('abierta', !!(E.dialogo || E.confirmar));
  document.body.classList.toggle('sin-scroll', !!(E.dialogo || E.confirmar));
  const nueva = capa.querySelector('.hoja');
  if (nueva) nueva.scrollTop = desplazado;
}

document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-a]');
  if (!el) return;
  ev.preventDefault();
  const fn = acciones[Number(el.dataset.a)];
  if (fn) fn(el, ev);
});
document.addEventListener('input', ev => {
  const el = ev.target.closest('[data-i]');
  if (!el) return;
  const fn = acciones[Number(el.dataset.i)];
  if (fn) fn(el, ev);
});

// ---------- Piezas comunes ----------

const flechaAtras = `<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>`;
const flechaIzq = `<svg viewBox="0 0 24 24" width="26" height="26"><path fill="currentColor" d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>`;
const flechaDer = `<svg viewBox="0 0 24 24" width="26" height="26"><path fill="currentColor" d="M8.59 16.59 10 18l6-6-6-6-1.41 1.41L13.17 12z"/></svg>`;
const lapiz = `<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`;

function selectorMes() {
  const actual = mesActual();
  const cambiar = m => () => { E.mes = m; render(); };
  return `<div class="selector-mes">
    <div class="fila-mes">
      <button class="icono" ${on(cambiar(sumarMeses(E.mes, -1)))} aria-label="Mes anterior">${flechaIzq}</button>
      <button class="nombre-mes" ${on(cambiar(actual))}>${nombreMes(E.mes)}</button>
      <button class="icono" ${on(cambiar(sumarMeses(E.mes, 1)))} aria-label="Mes siguiente">${flechaDer}</button>
    </div>
    ${E.mes !== actual ? `<button class="texto" ${on(cambiar(actual))}>Volver a ${nombreMesCorto(actual)}</button>` : ''}
  </div>`;
}

const fila = (etiqueta, valor, clase = '') => `<div class="fila ${clase}"><span>${etiqueta}</span><b>${valor}</b></div>`;
const barra = (fraccion, clase = '') => `<div class="barra ${clase}"><div style="width:${Math.min(100, Math.max(0, fraccion * 100)).toFixed(1)}%"></div></div>`;
const mensajeVacio = texto => `<div class="vacio">${texto}</div>`;
const colorEstado = e => ({ pagado: 'verde', vencido: 'rojo', pronto: 'naranja', pendiente: 'suave' }[e]);

function tarjetaBalance(r) {
  const usado = r.ingresos > 0 ? r.gastos / r.ingresos : 0;
  return `<div class="tarjeta destacada">
    <div class="etiqueta">${r.quincena ? 'Disponible en la ' + nombreQuincena(r.quincena) : 'Disponible'}</div>
    <div class="grande ${r.saldo < 0 ? 'rojo' : ''}">${dineroConSigno(r.saldo)}</div>
    ${fila('💰 Ingresos', dinero(r.ingresos))}
    ${fila('🧾 Servicios', '− ' + dinero(r.servicios))}
    ${r.cuotas > 0 ? fila('💳 Cuotas', '− ' + dinero(r.cuotas)) : ''}
    ${fila('🛒 Gastos diarios', '− ' + dinero(r.diarios))}
    ${r.ahorro > 0 ? fila('🐷 Ahorro', '− ' + dinero(r.ahorro)) : ''}
    ${r.ingresos > 0
      ? barra(usado, usado > 0.9 ? 'alerta' : '') + `<div class="pequeno">Has gastado el ${porcentaje(r.gastos, r.ingresos)}% de tus ingresos${r.ahorro > 0 ? ` y ahorrado el ${porcentaje(r.ahorro, r.ingresos)}%` : ''}</div>`
      : '<div class="pequeno">Registra tus ingresos para saber cuánto te queda.</div>'}
  </div>`;
}

function tarjetaArqueo() {
  const q = [resumen(E.mes, 1), resumen(E.mes, 2)];
  const filas = q.map(r => `<button class="fila-arqueo" ${on(() => { E.quincena = r.quincena; irA('resumen'); })}>
      <div><b>${capitalizar(nombreQuincena(r.quincena))}</b>
        <div class="pequeno suave">Entró ${dinero(r.ingresos)} · Salió ${dinero(r.gastos)}${r.ahorro > 0 ? ' · Ahorro ' + dinero(r.ahorro) : ''}</div></div>
      <b class="${r.saldo < 0 ? 'rojo' : 'verde'}">${dineroConSigno(r.saldo)}</b>
    </button>`).join('');
  const cubre = q[0].saldo > 0 && q[1].saldo < 0
    ? `<div class="pequeno suave">Lo que sobró de la 1ª quincena cubre ${dinero(Math.min(q[0].saldo, -q[1].saldo))} de la 2ª.</div>` : '';
  return `<div class="tarjeta"><h3>Arqueo por quincena</h3>${filas}${cubre}</div>`;
}

/** Avisos de lo que vence pronto (en la web los recordatorios se muestran al abrir la app). */
function tarjetaPorVencer() {
  if (!D.ajustes.recordatorios || E.mes !== mesActual()) return '';
  const lista = vencimientos(D.ajustes.diasAviso);
  if (!lista.length) return '';
  return `<div class="tarjeta aviso-vence"><h3>⏰ Por pagar pronto</h3>
    ${lista.slice(0, 6).map(v => `<div class="fila"><span>${v.emoji} ${esc(v.nombre)}</span><span class="${v.fecha < hoyISO() ? 'rojo' : 'naranja'}">${textoCuando(v.fecha)}</span></div>`).join('')}
    ${lista.length > 6 ? `<div class="pequeno suave">y ${lista.length - 6} más</div>` : ''}
  </div>`;
}

const opcion = (emoji, titulo, detalle, accion) =>
  `<button class="opcion" ${on(accion)}><span class="emoji">${emoji}</span><b>${titulo}</b><span class="pequeno suave">${detalle}</span></button>`;
const opcionFila = (emoji, titulo, detalle, valor, accion) =>
  `<button class="tarjeta opcion-fila" ${on(accion)}><span class="emoji">${emoji}</span>
    <span class="crece"><b>${titulo}</b><span class="pequeno suave">${detalle}</span></span>${valor != null ? `<b>${valor}</b>` : ''}</button>`;

// ---------- Portada y menú ----------

function vistaPortada() {
  return `<div class="portada">
    <div class="portada-centro">
      <img src="iconos/portada.svg" alt="" width="240" height="240">
      <h1>Control de Gastos</h1>
      <p>Tus ingresos, servicios y gastos,<br>claros mes a mes</p>
    </div>
    <button class="boton-portada" ${on(() => { history.replaceState({ p: 'menu' }, ''); E.pantalla = 'menu'; render(); })}>Entrar</button>
  </div>`;
}

function vistaMenu() {
  const r = resumen(E.mes);
  return `<header class="barra-superior"><h1>Control de Gastos</h1></header>
  <main class="contenido">
    ${selectorMes()}
    ${tarjetaPorVencer()}
    ${tarjetaBalance(r)}
    ${tarjetaArqueo()}
    ${r.mayor ? `<p class="suave">Lo que más pesa en ${nombreMesCorto(E.mes)}: ${esc(textoMayor(r))}</p>` : ''}
    <div class="rejilla">
      ${opcion('📊', 'Resumen del mes', 'Balance y en qué se va', () => { E.quincena = null; irA('resumen'); })}
      ${opcion('💰', 'Ingresos', 'Sueldo, quincena, extras', () => irA('ingresos'))}
      ${opcion('💸', 'Gastos', 'Servicios, cuotas y diarios', () => irA('menuGastos'))}
      ${opcion('🐷', 'Ahorro', 'Metas y lo que guardas', () => irA('ahorro'))}
      ${opcion('📅', 'Mes a mes', 'Compara tus meses', () => irA('historial'))}
      ${opcion('⚙️', 'Ajustes', 'Tema, moneda, papelera…', () => irA('ajustes'))}
    </div>
  </main>`;
}

// ---------- Secciones ----------

function vistaSeccion(s) {
  const botones = {
    ingresos: ['Ingreso', () => abrir(nuevoIngreso())],
    servicios: ['Servicio', () => abrir(nuevoServicio())],
    serviciosBase: ['Servicio', () => abrir(nuevoServicio())],
    gastos: ['Gasto', () => abrir(nuevoGasto())],
    deudas: ['Compra', () => abrir(nuevaDeuda())],
    ahorro: ['Meta', () => abrir(nuevaMeta())],
    categorias: ['Tipo de gasto', () => abrir(nuevoTipo(null))],
  };
  const contenido = {
    resumen: vistaResumen, ingresos: vistaIngresos, menuGastos: vistaMenuGastos, servicios: vistaServicios,
    gastos: vistaGastos, deudas: vistaDeudas, ahorro: vistaAhorro, historial: vistaHistorial, ajustes: vistaAjustes,
    categorias: vistaCategorias, serviciosBase: vistaServiciosBase, papelera: vistaPapelera,
  }[s] || vistaMenu;
  const fab = botones[s];
  return `<header class="barra-superior">
      <button class="icono" ${on(volver)} aria-label="Volver">${flechaAtras}</button>
      <h1>${SECCIONES[s] || ''}</h1>
    </header>
    <main class="contenido ${fab ? 'con-fab' : ''}">
      ${SIN_MES.includes(s) ? '' : selectorMes()}
      ${contenido()}
    </main>
    ${fab ? `<button class="fab" ${on(fab[1])}><span>+</span> ${fab[0]}</button>` : ''}`;
}

function vistaResumen() {
  const q = E.quincena;
  const r = resumen(E.mes, q);
  const anterior = resumen(sumarMeses(E.mes, -1), q);
  const enVista = fecha => q == null || quincenaDe(fecha) === q;
  const deLaVista = D.servicios.filter(s => enVista(fechaVence(s, E.mes)));
  const pendientes = deLaVista.filter(s => !pagoDe(s.id, E.mes)).sort((a, b) => a.diaVence - b.diaVence);
  const chip = (valor, texto) => `<button class="chip ${q === valor ? 'activo' : ''}" ${on(() => { E.quincena = valor; render(); })}>${texto}</button>`;
  let html = `<div class="chips">${chip(null, 'Mes completo')}${chip(1, '1ª quincena')}${chip(2, '2ª quincena')}</div>`;
  html += tarjetaBalance(r);
  if (q == null) html += tarjetaArqueo();

  if (E.mes === mesActual() && q == null) {
    const hoy = hoyISO();
    html += `<div class="tarjeta">${fila('Hoy llevas', dinero(suma(gastosDelMes(E.mes).filter(g => g.fecha === hoy))))}
      ${fila('Promedio diario', dinero(Math.round(r.diarios / diaDe(hoy))))}</div>`;
  }

  // ¿En qué se va tu dinero?
  html += '<div class="tarjeta"><h3>¿En qué se va tu dinero?</h3>';
  if (!r.mayor) {
    html += `<p class="suave">${q == null ? 'Aún no hay gastos este mes.' : 'Aún no hay gastos en esta quincena.'}</p>`;
  } else {
    html += `<p class="primario">Lo que más pesa: ${esc(textoMayor(r))}</p>`;
    if (anterior.gastos > 0) {
      const dif = r.gastos - anterior.gastos;
      html += `<div class="pequeno suave">${dif > 0 ? '▲' : '▼'} ${dinero(Math.abs(dif))} ${dif > 0 ? 'más' : 'menos'} que en ${q ? 'la ' + nombreQuincena(q) + ' de ' : ''}${nombreMesCorto(anterior.mes)}</div>`;
    }
    if (r.rubros.some(x => x.detalle.length)) html += '<div class="pequeno suave">Toca una categoría para ver el detalle.</div>';
    r.rubros.forEach(rubro => {
      const abierto = E.abiertos[rubro.nombre];
      const conDetalle = rubro.detalle.length > 0;
      html += `<div class="rubro" ${conDetalle ? on(() => { E.abiertos[rubro.nombre] = !abierto; render(); }) : ''}>
        <div class="fila"><span>${rubro.emoji} ${esc(rubro.nombre)}${conDetalle ? (abierto ? ' ▴' : ' ▾') : ''}</span>
          <span><span class="pequeno suave">${porcentaje(rubro.monto, r.gastos)}%</span>&nbsp; <b>${dinero(rubro.monto)}</b></span></div>
        ${barra(rubro.monto / r.mayor.monto)}
        ${abierto ? rubro.detalle.map(d => `<div class="fila detalle"><span>${d.emoji} ${esc(d.nombre)}</span><span><span class="pequeno suave">${porcentaje(d.monto, r.gastos)}%</span>&nbsp; ${dinero(d.monto)}</span></div>`).join('') : ''}
      </div>`;
    });
  }
  html += '</div>';

  // Servicios pendientes
  html += `<button class="tarjeta boton-tarjeta" ${on(() => irA('servicios'))}><h3>Servicios</h3>
    <div>${deLaVista.length - pendientes.length} de ${deLaVista.length} pagados${q ? ' (vencen en esta quincena)' : ''}</div>`;
  if (pendientes.length) {
    const estimado = pendientes.reduce((s, x) => s + x.montoEstimado, 0);
    if (estimado > 0) html += `<div>Falta por pagar (aprox.): ${dinero(estimado)}</div>`;
    pendientes.slice(0, 5).forEach(s => {
      const v = fechaVence(s, E.mes), e = estadoPorFecha(v, false);
      html += `<div class="fila"><span>${emojiDe(s)} ${esc(s.nombre)}</span><span class="${colorEstado(e)}">${textoEstado(e, v)}</span></div>`;
    });
  } else if (deLaVista.length) {
    html += '<div class="verde">¡Todo pagado! ✅</div>';
  }
  html += '</button>';

  // Cuotas pendientes
  const deudas = deudasDelMes(E.mes).filter(d => enVista(fechaLimite(d, E.mes))).sort((a, b) => a.diaPago - b.diaPago);
  if (deudas.length) {
    const sinPagar = deudas.filter(d => !pagoCuota(d.id, E.mes));
    html += `<button class="tarjeta boton-tarjeta" ${on(() => irA('deudas'))}><h3>Cuotas</h3>
      <div>${deudas.length - sinPagar.length} de ${deudas.length} pagadas</div>`;
    if (!sinPagar.length) {
      html += '<div class="verde">¡Todas las cuotas pagadas! ✅</div>';
    } else {
      html += `<div>Falta por pagar: ${dinero(sinPagar.reduce((s, d) => s + d.valorCuota, 0))}</div>`;
      sinPagar.forEach(d => {
        const v = fechaLimite(d, E.mes), e = estadoPorFecha(v, false);
        html += `<div class="fila"><span>${d.emoji} ${esc(d.nombre)} ${numeroCuota(d, E.mes)}/${d.cuotas}</span><span class="${colorEstado(e)}">${textoEstado(e, v)}</span></div>`;
      });
    }
    html += '</button>';
  }
  return html;
}

/** Total con su desglose por quincena. */
function totalPorQuincena(titulo, lista) {
  return `<div class="tarjeta destacada">${fila(titulo, dinero(suma(lista)), 'titulo')}
    ${fila('1ª quincena', dinero(suma(lista.filter(x => x.quincena === 1))))}
    ${fila('2ª quincena', dinero(suma(lista.filter(x => x.quincena === 2))))}</div>`;
}

function vistaIngresos() {
  const lista = ingresosDelMes(E.mes).sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  if (!lista.length) {
    const anterior = sumarMeses(E.mes, -1);
    return `<div class="vacio"><div class="emoji-grande">💰</div>No hay ingresos en ${nombreMes(E.mes)}.<br>Agrega tu sueldo u otros ingresos con el botón + Ingreso.
      ${ingresosDelMes(anterior).length ? `<br><button class="boton contorno" ${on(() => { copiarIngresosDelMesAnterior(E.mes); render(); })}>Copiar los ingresos de ${nombreMesCorto(anterior)}</button>` : ''}</div>`;
  }
  return totalPorQuincena('Total ingresos', lista) + lista.map(i => `<button class="tarjeta item" ${on(() => abrir(editarIngreso(i)))}>
      <span class="emoji">💰</span>
      <span class="crece"><span>${esc(i.descripcion)}</span><span class="pequeno suave">${capitalizar(fechaLarga(i.fecha))} · ${nombreQuincena(i.quincena)}</span></span>
      <b class="verde">+ ${dinero(i.monto)}</b></button>`).join('');
}

function vistaMenuGastos() {
  const r = resumen(E.mes);
  const pagados = D.servicios.filter(s => pagoDe(s.id, E.mes)).length;
  const cuotas = deudasDelMes(E.mes);
  const cuotasPag = cuotas.filter(d => pagoCuota(d.id, E.mes)).length;
  return `<div class="tarjeta destacada">${fila('Total gastado en ' + nombreMesCorto(E.mes), dinero(r.gastos), 'titulo')}</div>
    ${opcionFila('🧾', 'Servicios', `${pagados} de ${D.servicios.length} pagados`, dinero(r.servicios), () => irA('servicios'))}
    ${opcionFila('💳', 'Compras a cuotas', cuotas.length ? `${cuotasPag} de ${cuotas.length} cuotas pagadas` : 'Sin cuotas este mes', dinero(r.cuotas), () => irA('deudas'))}
    ${opcionFila('🛒', 'Gastos diarios', `${cantidad(gastosDelMes(E.mes).length, 'gasto')} registrados`, dinero(r.diarios), () => irA('gastos'))}`;
}

function vistaServicios() {
  if (!D.servicios.length) return mensajeVacio('No tienes servicios.<br>Agrégalos con el botón + Servicio.');
  return TIPOS_SERVICIO.map(tipo => {
    const lista = D.servicios.filter(s => s.tipo === tipo).sort((a, b) => a.diaVence - b.diaVence);
    if (!lista.length) return '';
    return `<h4 class="subtitulo">${tipo}</h4>` + lista.map(s => {
      const pago = pagoDe(s.id, E.mes);
      const v = fechaVence(s, E.mes), e = estadoPorFecha(v, !!pago);
      const monto = pago ? dinero(pago.monto) : s.montoEstimado > 0 ? '≈ ' + dinero(s.montoEstimado) : '';
      return `<div class="tarjeta item">
        <button class="item-principal" ${on(() => abrir(pago ? { tipo: 'verPago', servicioId: s.id, pago } : pagarServicio(s)))}>
          <span class="emoji">${emojiDe(s)}</span>
          <span class="crece"><b>${esc(s.nombre)}</b><span class="pequeno ${colorEstado(e)}">${textoEstado(e, v, pago && pago.fecha)}${pago ? ' · ' + nombreQuincena(pago.quincena) : ''}</span></span>
          <span class="derecha"><span class="${pago ? 'negrita' : ''}">${monto}</span><span class="mini ${pago ? 'verde' : 'suave'}">${pago ? '✓ Pagado' : 'Toca para pagar'}</span></span>
        </button>
        <button class="icono" ${on(() => abrir(editarServicio(s)))} aria-label="Editar">${lapiz}</button>
      </div>`;
    }).join('');
  }).join('');
}

function vistaGastos() {
  const gastos = gastosDelMes(E.mes);
  if (!gastos.length) return mensajeVacio(`Sin gastos en ${nombreMes(E.mes)}.<br>Toca + Gasto para agregar uno.`);
  const porDia = {};
  gastos.forEach(g => { (porDia[g.fecha] = porDia[g.fecha] || []).push(g); });
  let html = totalPorQuincena('Total del mes', gastos);
  Object.keys(porDia).sort().reverse().forEach(fecha => {
    const lista = porDia[fecha].sort((a, b) => b.id - a.id);
    html += `<div class="fila dia"><span>${capitalizar(fechaLarga(fecha))}</span><span>${dinero(suma(lista))}</span></div>`;
    html += lista.map(g => {
      const t = tipoGasto(g.tipoId);
      const grupo = t && grupoGasto(t.grupoId);
      // La categoría solo se muestra si dice algo más que el tipo (evita "Comida · Comida").
      const detalle = [grupo && grupo.nombre !== t.nombre ? grupo.nombre : null, g.nota || null, nombreQuincena(g.quincena)].filter(Boolean).join(' · ');
      return `<button class="tarjeta item" ${on(() => abrir(editarGasto(g)))}>
        <span class="emoji">${t ? t.emoji : '🧾'}</span>
        <span class="crece"><span>${esc(t ? t.nombre : 'Sin tipo')}</span><span class="pequeno suave">${esc(detalle)}</span></span>
        <b>${dinero(g.monto)}</b></button>`;
    }).join('');
  });
  return html;
}
