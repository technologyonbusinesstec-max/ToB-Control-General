// ============================================================
// ToB Operations Center — global.js  (v2)
// KPI bar: Supabase (patrocinadores + conferencistas) +
//          Google Sheets (gastos + disponible) + Countdown
// ============================================================

// ── Event Date ───────────────────────────────────────────────
const EVENT_DATE = new Date('2026-08-18T00:00:00');

// ── Google Sheets Config ─────────────────────────────────────
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQcsR6tfI-W0Ur-YbjHMKvdkFqK_mJc103N6zjMgwzE0PJYj6-3jlVJjkeP8hcRqKeTcBqwaQj1PdPg/pub?gid=1783383453&single=true&output=csv';

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
async function fetchPresupuestoCSV() {
  try {
    const res = await fetch(CSV_URL);
    const text = await res.text();
    const lines = text.trim().split('\n');
    if (lines.length > 0) {
      const cols = lines[0].split(',');
      if (cols.length > 1) {
        return parseFloat(cols[cols.length - 1].replace(/[^\d.-]/g, ''));
      }
    }
  } catch (e) {
    console.warn('[KPI] CSV fetch failed:', e.message);
  }
  return null;
}

// ── Supabase KPIs ─────────────────────────────────────────────
async function fetchSupabaseKPIs() {
  const db = window._supabaseClient;
  if (!db) return { patrocinando: 0, totalPatros: 0, totalConfs: 0 };
  try {
    const [patrosRes, confsRes, gastosRes] = await Promise.all([
      db.from('patrocinadores').select('estado'),
      db.from('conferencistas').select('id_conferencista', { count: 'exact', head: true }),
      db.from('gastos').select('monto_estimado, monto_final, estado')
    ]);
    const patros = patrosRes.data || [];
    const gastos = gastosRes.data || [];

    const totalGastos = gastos
      .filter(g => ['Aprobado','En proceso','Completado'].includes(g.estado))
      .reduce((s, g) => s + Number(g.monto_final || g.monto_estimado), 0);

    return {
      patrocinando: patros.filter(p => p.estado === 'patrocina').length,
      totalPatros:  patros.length,
      totalConfs:   confsRes.count || 0,
      totalGastos:  totalGastos
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

  const [excelTotal, supa] = await Promise.all([
    fetchPresupuestoCSV(),
    fetchSupabaseKPIs(),
  ]);

  const gastos = supa.totalGastos;
  const disponible = excelTotal !== null ? excelTotal - gastos : null;

  updateKPIValues({
    gastos:       gastos,
    disponible:   disponible,
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
