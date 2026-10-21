'use strict';
// Datos y reglas de Control de Gastos (versión web).
// Usa el mismo formato JSON que la app de Android, así los respaldos sirven en las dos.

// ---------- Fechas: todo en hora local, "AAAA-MM-DD" para días y "AAAA-MM" para meses ----------

const pad = n => String(n).padStart(2, '0');
const isoDe = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hoyISO = () => isoDe(new Date());
const mesActual = () => hoyISO().slice(0, 7);
const aFecha = iso => { const [a, m, d] = iso.split('-').map(Number); return new Date(a, m - 1, d); };
const diaDe = iso => Number(iso.slice(8, 10));

function diasEnMes(mes) { const [a, m] = mes.split('-').map(Number); return new Date(a, m, 0).getDate(); }
function sumarMeses(mes, n) {
  let [a, m] = mes.split('-').map(Number);
  m += n;
  a += Math.floor((m - 1) / 12);
  m = ((m - 1) % 12 + 12) % 12 + 1;
  return `${a}-${pad(m)}`;
}
/** El día [dia] de [mes]; si el mes es más corto, el último día (ej. 31 → 30 de noviembre). */
const fechaDe = (mes, dia) => `${mes}-${pad(Math.min(Math.max(dia, 1), diasEnMes(mes)))}`;
function mesesEntre(desde, hasta) {
  const [a1, m1] = desde.split('-').map(Number), [a2, m2] = hasta.split('-').map(Number);
  return (a2 - a1) * 12 + (m2 - m1);
}
function sumarDias(iso, n) { const d = aFecha(iso); d.setDate(d.getDate() + n); return isoDe(d); }
const diasEntre = (a, b) => Math.round((aFecha(b) - aFecha(a)) / 86400000);

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const capitalizar = s => s.charAt(0).toUpperCase() + s.slice(1);

const nombreMes = mes => capitalizar(`${MESES[Number(mes.slice(5)) - 1]} ${mes.slice(0, 4)}`);
const nombreMesCorto = mes => MESES[Number(mes.slice(5)) - 1];
const mesAbreviado = mes => capitalizar(MESES_CORTOS[Number(mes.slice(5)) - 1]);
function fechaCorta(iso) { const d = aFecha(iso); return `${DIAS_CORTOS[d.getDay()]} ${d.getDate()} ${MESES_CORTOS[d.getMonth()]}`; }
function fechaLarga(iso) { const d = aFecha(iso); return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`; }

// ---------- Dinero ----------

const MONEDAS = [
  { codigo: 'COP', nombre: 'Peso colombiano', locale: 'es-CO' },
  { codigo: 'USD', nombre: 'Dólar', locale: 'en-US' },
  { codigo: 'EUR', nombre: 'Euro', locale: 'es-ES' },
  { codigo: 'MXN', nombre: 'Peso mexicano', locale: 'es-MX' },
  { codigo: 'PEN', nombre: 'Sol peruano', locale: 'es-PE' },
  { codigo: 'CLP', nombre: 'Peso chileno', locale: 'es-CL' },
  { codigo: 'ARS', nombre: 'Peso argentino', locale: 'es-AR' },
  { codigo: 'NADA', nombre: 'Sin símbolo', locale: 'es-CO' },
];
const formatos = {};
function formato(codigo) {
  if (!formatos[codigo]) {
    const m = MONEDAS.find(x => x.codigo === codigo) || MONEDAS[0];
    // Los valores se guardan sin centavos, así que se muestran sin decimales en todas las monedas.
    formatos[codigo] = m.codigo === 'NADA'
      ? new Intl.NumberFormat(m.locale, { maximumFractionDigits: 0 })
      : new Intl.NumberFormat(m.locale, { style: 'currency', currency: m.codigo, maximumFractionDigits: 0, minimumFractionDigits: 0 });
  }
  return formatos[codigo];
}
const dinero = v => formato(D.ajustes.moneda).format(v);
const dineroConSigno = v => (v < 0 ? '− ' + dinero(-v) : dinero(v));
function simboloMoneda() {
  if (D.ajustes.moneda === 'NADA') return '';
  const partes = formato(D.ajustes.moneda).formatToParts(0);
  return (partes.find(p => p.type === 'currency') || {}).value || '$';
}
const porcentaje = (parte, total) => (total <= 0 ? 0 : Math.round(parte * 100 / total));
const cantidad = (n, palabra) => (n === 1 ? `1 ${palabra}` : `${n} ${palabra}s`);

// ---------- Catálogos ----------

const TIPOS_SERVICIO = ['Hogar', 'Personal'];
const CORTE_MIN = 10, CORTE_MAX = 20, MAX_PAPELERA = 10;

const CATALOGO_INICIAL = [
  ['Comida', '🍽️', [['Mercado', '🛒'], ['Desayuno', '🥐'], ['Almuerzo', '🍛'], ['Cena', '🍝'], ['Comida rápida', '🍔'], ['Café y snacks', '☕']]],
  ['Transporte', '🚗', [['Gasolina', '⛽'], ['Bus / Metro', '🚌'], ['Taxi / App', '🚕'], ['Parqueadero', '🅿️'], ['Peajes', '🛣️'], ['Mantenimiento carro', '🔧']]],
  ['Salud', '🏥', [['Citas médicas', '🩺'], ['Medicamentos', '💊'], ['Exámenes', '🧪'], ['Odontología', '🦷']]],
  ['Hogar', '🏠', [['Aseo', '🧽'], ['Reparaciones', '🛠️'], ['Muebles y electrodomésticos', '🛋️']]],
  ['Ropa', '👕', [['Ropa', '👕'], ['Calzado', '👟']]],
  ['Entretenimiento', '🎬', [['Salidas', '🎉'], ['Cine', '🎬'], ['Suscripciones', '📺'], ['Viajes', '✈️']]],
  ['Educación', '📚', [['Matrícula / pensión', '🎓'], ['Libros y útiles', '📚'], ['Cursos', '💻']]],
  ['Otros', '🧾', [['Regalos', '🎁'], ['Mascotas', '🐶'], ['Cuidado personal', '💇'], ['Otros', '🧾']]],
];

/** Íconos de las categorías fijas que tenía la app de Android antes de la versión 1.3. */
const EMOJI_CATEGORIA_VIEJA = {
  Comida: '🍔', Transporte: '🚌', Salud: '💊', Hogar: '🏠', Ropa: '👕', Entretenimiento: '🎬', 'Educación': '📚', Otros: '🧾',
};

const ICONOS = [
  '🛒', '🥐', '🍛', '🍝', '🍔', '🍕', '🌮', '🍣', '🥗', '🍞', '🥩', '🍗', '🍎', '🥛', '☕', '🧃', '🍺', '🍷', '🍦', '🍽️',
  '⛽', '🚗', '🚌', '🚕', '🏍️', '🚲', '🚇', '🅿️', '🛣️', '🔧', '✈️',
  '🩺', '💊', '🧪', '🦷', '🏥', '👓', '💉',
  '🏠', '🧽', '🛠️', '🛋️', '🧺', '💡', '💧', '🔥', '🌐', '📱',
  '👕', '👟', '👜', '💇', '💄', '👶', '🐶', '🐱', '🎁',
  '🎓', '📚', '💻', '🎮', '🎬', '🎉', '📺', '🎵', '⚽', '🏋️',
  '💳', '🏦', '💵', '🛍️', '📦', '⛪', '❤️', '🧾',
];

function emojiServicio(nombre) {
  const n = (nombre || '').toLowerCase();
  if (n.includes('luz') || n.includes('energ')) return '💡';
  if (n.includes('agua') || n.includes('acueducto')) return '💧';
  if (n.includes('gas')) return '🔥';
  if (n.includes('internet') || n.includes('wifi')) return '🌐';
  if (n.includes('celular') || n.includes('teléfono') || n.includes('telefono') || n.includes('plan')) return '📱';
  if (n.includes('tv') || n.includes('netflix') || n.includes('spotify')) return '📺';
  if (n.includes('arriendo') || n.includes('renta') || n.includes('administraci')) return '🏠';
  return '🧾';
}
const emojiDe = s => s.emoji || emojiServicio(s.nombre);

// ---------- Reglas ----------

/** 1 = primera quincena (del 1 al día de corte), 2 = segunda (el resto del mes). */
const quincenaDe = (iso, corte = D.ajustes.corteQuincena) => (diaDe(iso) <= corte ? 1 : 2);
const nombreQuincena = q => (q === 1 ? '1ª quincena' : '2ª quincena');

const fechaVence = (s, mes) => fechaDe(mes, s.diaVence);
const inicioDeuda = d => d.mesInicio;
const finDeuda = d => sumarMeses(d.mesInicio, d.cuotas - 1);
const totalDeuda = d => d.valorCuota * d.cuotas;
/** Número de la cuota que toca en [mes] (1 = la primera), o null si ese mes no hay cuota. */
function numeroCuota(d, mes) { const n = mesesEntre(d.mesInicio, mes) + 1; return n >= 1 && n <= d.cuotas ? n : null; }
const fechaLimite = (d, mes) => fechaDe(mes, d.diaPago);

/** 'pagado', 'vencido', 'pronto' (vence en 3 días o menos) o 'pendiente'. */
function estadoPorFecha(vence, pagado) {
  if (pagado) return 'pagado';
  const hoy = hoyISO();
  if (vence < hoy) return 'vencido';
  if (vence <= sumarDias(hoy, 3)) return 'pronto';
  return 'pendiente';
}
function textoEstado(estado, vence, fechaPago) {
  switch (estado) {
    case 'pagado': return 'Pagado el ' + fechaCorta(fechaPago);
    case 'vencido': return 'Venció el ' + fechaCorta(vence);
    case 'pronto': return vence === hoyISO() ? '¡Vence hoy!' : 'Vence pronto: ' + fechaCorta(vence);
    default: return 'Vence el ' + fechaCorta(vence);
  }
}

// ---------- Almacenamiento ----------

const CLAVE = 'controlDeGastos.datos';
const ajustesIniciales = () => ({ tema: 'sistema', moneda: 'COP', corteQuincena: 15, recordatorios: false, diasAviso: 2 });

/** Todos los datos de la app. Mismo formato que el archivo de la app de Android. */
let D = null;

function vacio() {
  return {
    app: 'MisCuentas', siguienteId: 1, ajustes: ajustesIniciales(),
    servicios: [], pagos: [], grupos: [], tipos: [], gastos: [], ingresos: [],
    deudas: [], pagosCuota: [], metas: [], aportes: [], papelera: [],
  };
}

function sembrarCatalogo(datos, nuevoId) {
  CATALOGO_INICIAL.forEach(([nombre, emoji, tipos]) => {
    const grupo = { id: nuevoId(), nombre, emoji };
    datos.grupos.push(grupo);
    tipos.forEach(([n, e]) => datos.tipos.push({ id: nuevoId(), nombre: n, emoji: e, grupoId: grupo.id }));
  });
}

function semilla() {
  const datos = vacio();
  const nuevoId = () => datos.siguienteId++;
  [['Luz', 'Hogar'], ['Agua', 'Hogar'], ['Gas', 'Hogar'], ['Internet', 'Hogar'], ['Celular', 'Personal']]
    .forEach(([nombre, tipo]) => datos.servicios.push({ id: nuevoId(), nombre, tipo, montoEstimado: 0, diaVence: 15, emoji: '' }));
  sembrarCatalogo(datos, nuevoId);
  return datos;
}

/**
 * Convierte el JSON de un respaldo (o de una versión anterior) al formato actual.
 * Lanza un error si el texto no es un respaldo de Control de Gastos.
 */
function normalizar(texto) {
  const o = typeof texto === 'string' ? JSON.parse(texto) : texto;
  if (!o || !Array.isArray(o.servicios) || !Array.isArray(o.pagos) || !Array.isArray(o.gastos)) {
    throw new Error('No es un respaldo de Control de Gastos');
  }
  const a = Object.assign(ajustesIniciales(), o.ajustes || {});
  a.corteQuincena = Math.min(CORTE_MAX, Math.max(CORTE_MIN, Number(a.corteQuincena) || 15));
  // Antes de la versión 1.7 no se guardaba la quincena: se deduce de la fecha.
  const q = x => (x.quincena === 1 || x.quincena === 2 ? x.quincena : quincenaDe(x.fecha, a.corteQuincena));
  const num = v => Number(v) || 0;
  const datos = vacio();
  datos.ajustes = a;
  datos.servicios = o.servicios.map(s => ({
    id: s.id, nombre: s.nombre, tipo: s.tipo || 'Hogar', montoEstimado: num(s.montoEstimado), diaVence: num(s.diaVence) || 15, emoji: s.emoji || '',
  }));
  datos.pagos = o.pagos.map(p => ({ id: p.id, servicioId: p.servicioId, mes: p.mes, monto: num(p.monto), fecha: p.fecha, quincena: q(p) }));
  datos.ingresos = (o.ingresos || []).map(i => ({ id: i.id, fecha: i.fecha, descripcion: i.descripcion || 'Ingreso', monto: num(i.monto), quincena: q(i) }));
  datos.grupos = (o.grupos || []).map(g => ({ id: g.id, nombre: g.nombre, emoji: g.emoji || '🧾' }));
  datos.tipos = (o.tipos || []).map(t => ({ id: t.id, nombre: t.nombre, emoji: t.emoji || '🧾', grupoId: t.grupoId }));
  datos.deudas = (o.deudas || []).map(d => ({
    id: d.id, nombre: d.nombre, emoji: d.emoji || '💳', cuotas: num(d.cuotas), valorCuota: num(d.valorCuota),
    mesInicio: d.mesInicio, diaPago: num(d.diaPago) || 15, valorCompra: num(d.valorCompra),
  }));
  datos.pagosCuota = (o.pagosCuota || []).map(p => ({ id: p.id, deudaId: p.deudaId, mes: p.mes, monto: num(p.monto), fecha: p.fecha, quincena: q(p) }));
  datos.metas = (o.metas || []).map(m => ({ id: m.id, nombre: m.nombre, emoji: m.emoji || '🐷', objetivo: num(m.objetivo), fechaMeta: m.fechaMeta }));
  datos.aportes = (o.aportes || []).map(x => ({ id: x.id, metaId: x.metaId, fecha: x.fecha, monto: num(x.monto), quincena: q(x), nota: x.nota || '' }));
  datos.papelera = (o.papelera || []).slice(0, MAX_PAPELERA);

  const ids = [].concat(datos.servicios, datos.pagos, datos.ingresos, datos.grupos, datos.tipos, o.gastos,
    datos.deudas, datos.pagosCuota, datos.metas, datos.aportes, datos.papelera).map(x => Number(x.id) || 0);
  datos.siguienteId = Math.max(Number(o.siguienteId) || 1, Math.max(0, ...ids) + 1);
  const nuevoId = () => datos.siguienteId++;

  // Respaldos anteriores a la versión 1.3 no traen categorías: se crean las iniciales.
  if (!o.grupos) sembrarCatalogo(datos, nuevoId);
  datos.gastos = o.gastos.map(g => {
    let tipoId = g.tipoId;
    if (tipoId == null) tipoId = tipoParaCategoriaVieja(datos, g.categoria || 'Otros', nuevoId);
    return { id: g.id, fecha: g.fecha, tipoId, monto: num(g.monto), nota: g.nota || '', quincena: q(g) };
  });

  // Pagos sueltos de cosas ya eliminadas (versiones anteriores a la 1.9.1) dejan de contar.
  datos.pagos = datos.pagos.filter(p => datos.servicios.some(s => s.id === p.servicioId));
  datos.pagosCuota = datos.pagosCuota.filter(p => datos.deudas.some(d => d.id === p.deudaId));
  datos.aportes = datos.aportes.filter(x => datos.metas.some(m => m.id === x.metaId));
  return datos;
}

function tipoParaCategoriaVieja(datos, categoria, nuevoId) {
  let grupo = datos.grupos.find(g => g.nombre === categoria) || datos.grupos.find(g => g.nombre === 'Otros');
  if (!grupo) { grupo = { id: nuevoId(), nombre: 'Otros', emoji: '🧾' }; datos.grupos.push(grupo); }
  const existente = datos.tipos.find(t => t.grupoId === grupo.id && t.nombre === categoria);
  if (existente) return existente.id;
  const tipo = { id: nuevoId(), nombre: categoria, emoji: EMOJI_CATEGORIA_VIEJA[categoria] || '🧾', grupoId: grupo.id };
  datos.tipos.push(tipo);
  return tipo.id;
}

function cargar() {
  let texto = null;
  try { texto = localStorage.getItem(CLAVE); } catch (e) { /* almacenamiento no disponible */ }
  if (!texto) { D = semilla(); guardar(); return; }
  try {
    D = normalizar(texto);
  } catch (e) {
    // Datos dañados: se guarda una copia aparte para no perderlos y se empieza de nuevo.
    try { localStorage.setItem(CLAVE + '.danado.' + Date.now(), texto); } catch (e2) { /* sin espacio */ }
    D = semilla();
    guardar();
  }
}

let errorAlGuardar = null;
function guardar() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(D));
    errorAlGuardar = null;
  } catch (e) {
    errorAlGuardar = 'No se pudo guardar en este dispositivo. Exporta un respaldo para no perder tus datos.';
  }
}

const exportar = () => JSON.stringify(D, null, 2);
function importar(datos) { D = datos; guardar(); }
const nuevoId = () => D.siguienteId++;

function reemplazar(lista, item) {
  const i = lista.findIndex(x => x.id === item.id);
  if (i >= 0) lista[i] = item; else lista.push(item);
}

// ---------- Consultas ----------

const pagosDelMes = mes => D.pagos.filter(p => p.mes === mes);
const gastosDelMes = mes => D.gastos.filter(g => g.fecha.startsWith(mes));
const ingresosDelMes = mes => D.ingresos.filter(i => i.fecha.startsWith(mes));
const aportesDelMes = mes => D.aportes.filter(a => a.fecha.startsWith(mes));
const pagoDe = (servicioId, mes) => D.pagos.find(p => p.servicioId === servicioId && p.mes === mes);
const tipoGasto = id => D.tipos.find(t => t.id === id);
const grupoGasto = id => D.grupos.find(g => g.id === id);
const tiposDe = grupoId => D.tipos.filter(t => t.grupoId === grupoId);
const usosDeTipo = tipoId => D.gastos.filter(g => g.tipoId === tipoId).length;
const servicio = id => D.servicios.find(s => s.id === id);
const deuda = id => D.deudas.find(d => d.id === id);
const meta = id => D.metas.find(m => m.id === id);
const deudasDelMes = mes => D.deudas.filter(d => numeroCuota(d, mes) != null);
const pagoCuota = (deudaId, mes) => D.pagosCuota.find(p => p.deudaId === deudaId && p.mes === mes);
const cuotasPagadas = deudaId => D.pagosCuota.filter(p => p.deudaId === deudaId).length;
const pagadoDe = deudaId => D.pagosCuota.filter(p => p.deudaId === deudaId).reduce((s, p) => s + p.monto, 0);
const suma = lista => lista.reduce((s, x) => s + x.monto, 0);

function tipoSugerido() {
  const ultimo = D.gastos.reduce((a, g) => (!a || g.id > a.id ? g : a), null);
  return (ultimo && tipoGasto(ultimo.tipoId)) || D.tipos[0];
}

/** Arqueo del mes completo, o solo de una [quincena] (1 o 2) si se indica. */
function resumen(mes, quincena = null) {
  const en = x => quincena == null || x.quincena === quincena;
  const pagos = pagosDelMes(mes).filter(en);
  const cuotas = D.pagosCuota.filter(p => p.mes === mes && en(p));
  const gastos = gastosDelMes(mes).filter(en);
  const ingresos = ingresosDelMes(mes).filter(en);
  const aportes = aportesDelMes(mes).filter(en);
  const rubros = [];
  const porGrupo = {};
  gastos.forEach(g => {
    const t = tipoGasto(g.tipoId);
    const clave = t ? t.grupoId : 'x';
    (porGrupo[clave] = porGrupo[clave] || []).push(g);
  });
  Object.entries(porGrupo).forEach(([gid, lista]) => {
    const g = grupoGasto(Number(gid));
    const porTipo = {};
    lista.forEach(x => { (porTipo[x.tipoId] = porTipo[x.tipoId] || []).push(x); });
    const detalle = Object.entries(porTipo).map(([tid, l]) => {
      const t = tipoGasto(Number(tid));
      return { nombre: t ? t.nombre : 'Sin tipo', emoji: t ? t.emoji : '🧾', monto: suma(l) };
    }).sort((a, b) => b.monto - a.monto);
    rubros.push({ nombre: g ? g.nombre : 'Sin categoría', emoji: g ? g.emoji : '🧾', monto: suma(lista), detalle });
  });
  const agrupar = (lista, campo, buscar, sinNombre, sinEmoji) => {
    const porId = {};
    lista.forEach(p => { (porId[p[campo]] = porId[p[campo]] || []).push(p); });
    Object.entries(porId).forEach(([id, l]) => {
      const x = buscar(Number(id));
      rubros.push({ nombre: x ? x.nombre : sinNombre, emoji: x ? emojiDe(x) : sinEmoji, monto: suma(l), detalle: [] });
    });
  };
  agrupar(pagos, 'servicioId', servicio, 'Servicio eliminado', '🧾');
  agrupar(cuotas, 'deudaId', deuda, 'Compra eliminada', '💳');
  rubros.sort((a, b) => b.monto - a.monto);
  const r = {
    mes, quincena, ingresos: suma(ingresos), servicios: suma(pagos), cuotas: suma(cuotas),
    diarios: suma(gastos), ahorro: suma(aportes), rubros,
  };
  r.gastos = r.servicios + r.cuotas + r.diarios;
  r.saldo = r.ingresos - r.gastos - r.ahorro;
  r.mayor = rubros[0] || null;
  return r;
}

/** "🍽️ Comida (41%) · sobre todo 🛒 Mercado" */
function textoMayor(r) {
  const m = r.mayor;
  if (!m) return '';
  const principal = m.detalle.length > 1 ? m.detalle[0] : null;
  return `${m.emoji} ${m.nombre} (${porcentaje(m.monto, r.gastos)}%)` + (principal ? ` · sobre todo ${principal.emoji} ${principal.nombre}` : '');
}

/** Todos los meses desde el primer dato registrado hasta hoy, del más reciente al más antiguo. */
function mesesConDatos() {
  const meses = [].concat(
    D.pagos.map(p => p.mes), D.gastos.map(g => g.fecha.slice(0, 7)), D.ingresos.map(i => i.fecha.slice(0, 7)),
    D.pagosCuota.map(p => p.mes), D.aportes.map(a => a.fecha.slice(0, 7)), [mesActual()],
  ).sort();
  const lista = [];
  for (let m = meses[meses.length - 1]; m >= meses[0]; m = sumarMeses(m, -1)) lista.push(m);
  return lista;
}

/** Cómo va una meta y cuánto hay que ahorrar en el mes actual para llegar a tiempo. */
function plan(m) {
  const hoy = mesActual();
  const deLaMeta = D.aportes.filter(a => a.metaId === m.id);
  const ahorrado = suma(deLaMeta);
  const aporteMes = suma(deLaMeta.filter(a => a.fecha.startsWith(hoy)));
  const meses = Math.max(0, mesesEntre(hoy, m.fechaMeta.slice(0, 7)) + 1);
  // Se calcula con lo que faltaba al empezar el mes, así abonar no cambia la cifra que se debe cumplir este mes.
  const faltaba = Math.max(0, m.objetivo - (ahorrado - aporteMes));
  const sugeridoMes = meses > 0 ? Math.ceil(faltaba / meses) : faltaba;
  const falta = Math.max(0, m.objetivo - ahorrado);
  return { ahorrado, falta, mesesRestantes: meses, sugeridoMes, aporteMes, cumplida: falta === 0, vencida: meses === 0 && falta > 0 };
}

/** Servicios y cuotas sin pagar que vencen de hoy a [dias] días, más los ya vencidos este mes. */
function vencimientos(dias) {
  const hoy = hoyISO(), hasta = sumarDias(hoy, dias), inicioMes = hoy.slice(0, 7) + '-01';
  const lista = [];
  for (let mes = hoy.slice(0, 7); mes + '-01' <= hasta; mes = sumarMeses(mes, 1)) {
    D.servicios.filter(s => !pagoDe(s.id, mes)).forEach(s =>
      lista.push({ emoji: emojiDe(s), nombre: s.nombre, monto: s.montoEstimado, fecha: fechaVence(s, mes) }));
    deudasDelMes(mes).filter(d => !pagoCuota(d.id, mes)).forEach(d =>
      lista.push({ emoji: d.emoji, nombre: `Cuota ${numeroCuota(d, mes)}/${d.cuotas} ${d.nombre}`, monto: d.valorCuota, fecha: fechaLimite(d, mes) }));
  }
  return lista.filter(v => v.fecha >= inicioMes && v.fecha <= hasta).sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
}

function textoCuando(fecha) {
  const dias = diasEntre(hoyISO(), fecha);
  if (dias < 0) return 'venció el ' + fechaCorta(fecha);
  if (dias === 0) return 'vence HOY';
  if (dias === 1) return 'vence mañana';
  return `vence en ${dias} días (${fechaCorta(fecha)})`;
}

// ---------- Cambios ----------

function guardarServicio(s) { reemplazar(D.servicios, s); guardar(); }
function guardarGasto(g) { reemplazar(D.gastos, g); guardar(); }
function guardarIngreso(i) { reemplazar(D.ingresos, i); guardar(); }
function guardarDeuda(d) { reemplazar(D.deudas, d); guardar(); }
function guardarMeta(m) { reemplazar(D.metas, m); guardar(); }
function guardarAporte(a) { reemplazar(D.aportes, a); guardar(); }
function guardarGrupo(g) { reemplazar(D.grupos, g); guardar(); }
function guardarTipo(t) { reemplazar(D.tipos, t); guardar(); }
function guardarAjustes(a) { D.ajustes = a; guardar(); }

function registrarPago(p) {
  D.pagos = D.pagos.filter(x => !(x.servicioId === p.servicioId && x.mes === p.mes));
  D.pagos.push(p);
  guardar();
}
function registrarPagoCuota(p) {
  D.pagosCuota = D.pagosCuota.filter(x => !(x.deudaId === p.deudaId && x.mes === p.mes));
  D.pagosCuota.push(p);
  guardar();
}

/** Copia los ingresos del mes anterior a [mes], en el mismo día. Útil para el sueldo fijo. */
function copiarIngresosDelMesAnterior(mes) {
  ingresosDelMes(sumarMeses(mes, -1)).forEach(i => {
    D.ingresos.push(Object.assign({}, i, { id: nuevoId(), fecha: fechaDe(mes, diaDe(i.fecha)) }));
  });
  guardar();
}

// ---------- Papelera: todo lo que se borra pasa por aquí ----------

const conPagos = (n, uno, varios) => (n === 0 ? '' : ` (con ${n} ${n === 1 ? uno : varios})`);

function aPapelera(clase, descripcion, emoji, monto, datos) {
  D.papelera.unshift({ id: nuevoId(), clase, descripcion, emoji, monto, fechaBorrado: hoyISO(), datos });
  D.papelera = D.papelera.slice(0, MAX_PAPELERA);
}

function borrarServicio(s) {
  const suyos = D.pagos.filter(p => p.servicioId === s.id);
  aPapelera('servicio', `Servicio: ${s.nombre}` + conPagos(suyos.length, 'pago', 'pagos'), emojiDe(s), suma(suyos), { servicio: s, pagos: suyos });
  D.servicios = D.servicios.filter(x => x.id !== s.id);
  D.pagos = D.pagos.filter(p => p.servicioId !== s.id);
  guardar();
}
function quitarPago(p) {
  const s = servicio(p.servicioId);
  aPapelera('pago', `Pago de ${s ? s.nombre : 'servicio'} · ${nombreMes(p.mes)}`, s ? emojiDe(s) : '🧾', p.monto, { pago: p });
  D.pagos = D.pagos.filter(x => x.id !== p.id);
  guardar();
}
function borrarGasto(g) {
  const t = tipoGasto(g.tipoId);
  aPapelera('gasto', `Gasto: ${t ? t.nombre : 'gasto'}` + (g.nota ? ` (${g.nota})` : ''), t ? t.emoji : '🛒', g.monto, { gasto: g });
  D.gastos = D.gastos.filter(x => x.id !== g.id);
  guardar();
}
function borrarIngreso(i) {
  aPapelera('ingreso', `Ingreso: ${i.descripcion}`, '💰', i.monto, { ingreso: i });
  D.ingresos = D.ingresos.filter(x => x.id !== i.id);
  guardar();
}
function borrarDeuda(d) {
  const suyos = D.pagosCuota.filter(p => p.deudaId === d.id);
  aPapelera('compra', `Compra: ${d.nombre}` + conPagos(suyos.length, 'cuota pagada', 'cuotas pagadas'), d.emoji, suma(suyos), { compra: d, pagos: suyos });
  D.deudas = D.deudas.filter(x => x.id !== d.id);
  D.pagosCuota = D.pagosCuota.filter(p => p.deudaId !== d.id);
  guardar();
}
function quitarPagoCuota(p) {
  const d = deuda(p.deudaId);
  aPapelera('cuota', `Cuota de ${d ? d.nombre : 'compra'} · ${nombreMes(p.mes)}`, d ? d.emoji : '💳', p.monto, { pago: p });
  D.pagosCuota = D.pagosCuota.filter(x => x.id !== p.id);
  guardar();
}
function borrarMeta(m) {
  const suyos = D.aportes.filter(a => a.metaId === m.id);
  aPapelera('meta', `Meta: ${m.nombre}` + conPagos(suyos.length, 'abono', 'abonos'), m.emoji, suma(suyos), { meta: m, abonos: suyos });
  D.metas = D.metas.filter(x => x.id !== m.id);
  D.aportes = D.aportes.filter(a => a.metaId !== m.id);
  guardar();
}
function borrarAporte(a) {
  const m = meta(a.metaId);
  aPapelera('abono', `Abono a ${m ? m.nombre : 'meta'}`, m ? m.emoji : '🐷', a.monto, { abono: a });
  D.aportes = D.aportes.filter(x => x.id !== a.id);
  guardar();
}
/** Solo se puede borrar una categoría vacía. Devuelve false si todavía tiene tipos. */
function borrarGrupo(g) {
  if (tiposDe(g.id).length) return false;
  aPapelera('categoria', `Categoría: ${g.nombre}`, g.emoji, 0, { categoria: g });
  D.grupos = D.grupos.filter(x => x.id !== g.id);
  guardar();
  return true;
}
/** Solo se puede borrar un tipo que ningún gasto usa. Devuelve false si está en uso. */
function borrarTipo(t) {
  if (usosDeTipo(t.id)) return false;
  aPapelera('tipo', `Tipo de gasto: ${t.nombre}`, t.emoji, 0, { tipo: t });
  D.tipos = D.tipos.filter(x => x.id !== t.id);
  guardar();
  return true;
}

/** Devuelve a su lugar algo de la papelera. null si se pudo, o un mensaje explicando por qué no. */
function restaurar(b) {
  const d = b.datos;
  switch (b.clase) {
    case 'servicio': D.servicios.push(d.servicio); D.pagos.push(...d.pagos); break;
    case 'pago':
      if (!servicio(d.pago.servicioId)) return 'Primero restaura el servicio de este pago.';
      if (pagoDe(d.pago.servicioId, d.pago.mes)) return 'Ese servicio ya tiene un pago registrado en ese mes.';
      D.pagos.push(d.pago); break;
    case 'compra': D.deudas.push(d.compra); D.pagosCuota.push(...d.pagos); break;
    case 'cuota':
      if (!deuda(d.pago.deudaId)) return 'Primero restaura la compra de esta cuota.';
      if (pagoCuota(d.pago.deudaId, d.pago.mes)) return 'Esa cuota ya tiene un pago registrado.';
      D.pagosCuota.push(d.pago); break;
    case 'meta': D.metas.push(d.meta); D.aportes.push(...d.abonos); break;
    case 'abono':
      if (!meta(d.abono.metaId)) return 'Primero restaura la meta de este abono.';
      D.aportes.push(d.abono); break;
    case 'gasto':
      if (!tipoGasto(d.gasto.tipoId)) return 'Primero restaura el tipo de gasto.';
      D.gastos.push(d.gasto); break;
    case 'ingreso': D.ingresos.push(d.ingreso); break;
    case 'tipo':
      if (!grupoGasto(d.tipo.grupoId)) return 'Primero restaura su categoría.';
      D.tipos.push(d.tipo); break;
    case 'categoria': D.grupos.push(d.categoria); break;
    default: return 'No se reconoce este elemento.';
  }
  D.papelera = D.papelera.filter(x => x.id !== b.id);
  guardar();
  return null;
}

function vaciarPapelera() { D.papelera = []; guardar(); }
