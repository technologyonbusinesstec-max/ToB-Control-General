// ============================================================
// ToB Operations Center — global.js  (v2)
// KPI bar: Supabase (patrocinadores + conferencistas) +
//          Google Sheets (gastos + disponible) + Countdown
// ============================================================

// ── Event Date ───────────────────────────────────────────────
const EVENT_DATE = new Date('2026-08-18T00:00:00');

// ── Google Sheets Config ─────────────────────────────────────
// ⚠️ Para que funcione, compartí el sheet como
//    "Cualquier persona con el enlace puede VER"
// ⚠️ Cambiá las celdas a las que tienen los totales en tu presupuesto
const SHEETS_CONFIG = {
  sheetId:        '10qutSMURWYvXZCP4EFKkzsFcCA4_VZ9K',
  sheetName:      '',       // nombre exacto de la hoja, vacío = primera hoja
  gastosCell:     'B5',     // ← CAMBIÁ: celda con GASTOS TOTALES
  disponibleCell: 'B6',     // ← CAMBIÁ: celda con DINERO DISPONIBLE
};

// ── Countdown ─────────────────────────────────────────────────
function getDiasRestantes() {
  const diff = EVENT_DATE - new Date();
  return diff <= 0 ? 0 : Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ── Currency Format ───────────────────────────────────────────
function formatMoney(amount) {
  if (amount === null || amount === undefined) return '—';
  return `₡${Number(amount).toLocaleString('es-CR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ── Google Sheets Fetch ───────────────────────────────────────
async function fetchSheetCell(cell) {
  const { sheetId, sheetName } = SHEETS_CONFIG;
  let url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&range=${cell}`;
  if (sheetName) url += `&sheet=${encodeURIComponent(sheetName)}`;
  const res  = await fetch(url);
  const text = await res.text();
  const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
  if (!match) return null;
  const json = JSON.parse(match[1]);
  return json?.table?.rows?.[0]?.c?.[0]?.v ?? null;
}

async function fetchSheetsKPIs() {
  try {
    const [gastos, disponible] = await Promise.all([
      fetchSheetCell(SHEETS_CONFIG.gastosCell),
      fetchSheetCell(SHEETS_CONFIG.disponibleCell),
    ]);
    return { gastos, disponible };
  } catch (e) {
    console.warn('[KPI] Google Sheets fetch failed:', e.message);
    return { gastos: null, disponible: null };
  }
}

// ── Supabase KPIs ─────────────────────────────────────────────
async function fetchSupabaseKPIs() {
  const db = window._supabaseClient;
  if (!db) return { patrocinando: 0, totalPatros: 0, totalConfs: 0 };
  try {
    const [patrosRes, confsRes] = await Promise.all([
      db.from('patrocinadores').select('estado'),
      db.from('conferencistas').select('id_conferencista', { count: 'exact', head: true }),
    ]);
    const patros = patrosRes.data || [];
    return {
      patrocinando: patros.filter(p => p.estado === 'patrocina').length,
      totalPatros:  patros.length,
      totalConfs:   confsRes.count || 0,
    };
  } catch (e) {
    console.warn('[KPI] Supabase fetch failed:', e.message);
    return { patrocinando: 0, totalPatros: 0, totalConfs: 0 };
  }
}

// ── Inject conferencistas chip dynamically ────────────────────
function injectConferencistasChip() {
  const countdown = document.getElementById('kpi-event-card');
  if (!countdown || document.getElementById('kpi-confs-card')) return;
  const el = document.createElement('div');
  el.className = 'kpi-item';
  el.id = 'kpi-confs-card';
  el.title = 'Total de conferencistas registrados';
  el.innerHTML = `
    <span class="kpi-item__icon">🎤</span>
    <div class="kpi-item__info">
      <span class="kpi-item__label">Conferencistas</span>
      <span class="kpi-item__value" id="kpi-conferencistas" style="color:var(--accent-orange)">—</span>
    </div>`;
  countdown.parentNode.insertBefore(el, countdown);
}

// ── Update DOM values ─────────────────────────────────────────
function updateKPIValues({ gastos, disponible, patrocinando, totalPatros, totalConfs }) {
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  set('kpi-gastos',         gastos      !== null ? formatMoney(gastos)      : '—');
  set('kpi-contactados',    `${patrocinando} / ${totalPatros}`);
  set('kpi-conferencistas', totalConfs);
  set('kpi-dias',           `${getDiasRestantes()} días`);

  // Disponible: coloreado según positivo/negativo
  const elDisp = document.getElementById('kpi-disponible');
  if (elDisp) {
    elDisp.textContent = disponible !== null ? formatMoney(disponible) : '—';
    if (disponible !== null) {
      elDisp.className = `kpi-item__value ${disponible >= 0 ? 'green' : 'red'}`;
    }
  }
}

// ── Main KPI refresh ──────────────────────────────────────────
async function renderKPIBar() {
  injectConferencistasChip();

  // Countdown inmediato sin esperar fetch
  const elDias = document.getElementById('kpi-dias');
  if (elDias) elDias.textContent = `${getDiasRestantes()} días`;

  const [sheets, supa] = await Promise.all([
    fetchSheetsKPIs(),
    fetchSupabaseKPIs(),
  ]);

  updateKPIValues({
    gastos:       sheets.gastos,
    disponible:   sheets.disponible,
    patrocinando: supa.patrocinando,
    totalPatros:  supa.totalPatros,
    totalConfs:   supa.totalConfs,
  });
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderKPIBar();
  setInterval(renderKPIBar, 60_000);
});

// ── Expose for module pages to trigger refresh ────────────────
window.refreshKPIBar = renderKPIBar;
