/**
 * ToB Operations - Patrocinadores Module
 * Handles CRUD and CSV Import for 'patrocinadores' in Supabase
 */

// ── Configuration ──────────────────────────────────────────────
const db = window._supabaseClient;
const TABLE = 'patrocinadores';

// ── State ────────────────────────────────────────────────────
let allPatrocinadores = [];
let filteredList      = [];
let currentEditId     = null;
let parsedCsvData     = null; // Holds valid rows to import

// ── DOM References ────────────────────────────────────────────
const tbody         = document.getElementById('patros-tbody');
const patroForm     = document.getElementById('patro-form');
const btnSave       = document.getElementById('btn-save-patro');
const searchInput   = document.getElementById('search-input');
const filterEstado  = document.getElementById('filter-estado');
const filterCat     = document.getElementById('filter-categoria');
const modalOverlay  = document.getElementById('modal-form');
const modalCsv      = document.getElementById('modal-csv');
const toastEl       = document.getElementById('toast');

// ── Initialization ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (!db) {
    showToast('Error: Supabase no inicializado', 'error');
    return;
  }
  
  fetchPatrocinadores();

  // Event Listeners
  patroForm.addEventListener('submit', handleFormSubmit);
  searchInput.addEventListener('input', applyFilters);
  filterEstado.addEventListener('change', applyFilters);
  filterCat.addEventListener('change', applyFilters);

  // CSV Drag and Drop
  setupCsvUpload();
});

// ═══════════════════════════════════════════════════════════════
// READ — Fetch from Supabase
// ═══════════════════════════════════════════════════════════════
async function fetchPatrocinadores() {
  try {
    const { data, error } = await db
      .from(TABLE)
      .select('*')
      .order('id_patrocinador', { ascending: false });

    if (error) throw error;

    allPatrocinadores = data || [];
    applyFilters();
    updateStats();
  } catch (err) {
    console.error('Fetch error:', err);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--accent-red)">Error al cargar patrocinadores</td></tr>`;
    showToast('Error de conexión con la base de datos', 'error');
  }
}

// ═══════════════════════════════════════════════════════════════
// FILTER & RENDER
// ═══════════════════════════════════════════════════════════════
function applyFilters() {
  const query = searchInput.value.toLowerCase().trim();
  const st    = filterEstado.value;
  const ct    = filterCat.value;

  filteredList = allPatrocinadores.filter(p => {
    // Text search
    const textMatch = !query || 
      (p.sponsor && p.sponsor.toLowerCase().includes(query)) ||
      (p.nombre_contacto && p.nombre_contacto.toLowerCase().includes(query));
      
    // Dropdown filters
    const stMatch = st === 'all' || p.estado === st;
    const ctMatch = ct === 'all' || p.categoria === ct;

    return textMatch && stMatch && ctMatch;
  });

  renderTable();
}

function renderTable() {
  if (filteredList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            <div class="empty-state__icon">📭</div>
            <div class="empty-state__title">No se encontraron patrocinadores</div>
            <div class="empty-state__desc">Ajustá los filtros o agregá uno nuevo.</div>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filteredList.map(p => {
    // Badges
    const estadoClass = p.estado ? p.estado.toLowerCase() : 'pendiente';
    let catClass = '';
    if(p.categoria === 'Nacional') catClass = 'nacional';
    else if(p.categoria === 'Internacional') catClass = 'internac';
    else if(p.categoria === 'Internos del TEC') catClass = 'internos';

    return `
      <tr>
        <td>
          <div class="cell-sponsor">
            <strong>${p.sponsor || 'Sin nombre'}</strong>
            <small>${p.correo || 'Sin correo'}</small>
          </div>
        </td>
        <td>
          <div class="cell-contacto">
            <strong>${p.nombre_contacto || '-'}</strong>
            <small>${p.numero || '-'}</small>
          </div>
        </td>
        <td>
          <span class="cat-tag ${catClass}">${p.categoria || 'N/A'}</span>
          <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">${p.tipo_patrocinio || ''}</div>
        </td>
        <td style="max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${p.historial || ''}">
          ${p.historial || '-'}
        </td>
        <td>
          <select class="form-select estado-select" style="padding: 4px 8px; font-size:11px; width:auto;" data-id="${p.id_patrocinador}" aria-label="Cambiar estado">
            <option value="pendiente" ${estadoClass === 'pendiente' ? 'selected' : ''}>Pendiente</option>
            <option value="patrocina" ${estadoClass === 'patrocina' ? 'selected' : ''}>Patrocina</option>
            <option value="rechazado" ${estadoClass === 'rechazado' ? 'selected' : ''}>Rechazado</option>
          </select>
        </td>
        <td>
          <div class="cell-actions">
            <button class="action-btn edit" data-id="${p.id_patrocinador}" title="Editar">✏️</button>
            <button class="action-btn delete" data-id="${p.id_patrocinador}" title="Eliminar">🗑</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Bind dropdown state changes
  tbody.querySelectorAll('.estado-select').forEach(sel => {
    sel.addEventListener('change', handleInlineStateChange);
  });

  // Bind edit events
  tbody.querySelectorAll('.action-btn.edit').forEach(btn => {
    btn.addEventListener('click', handleEdit);
  });

  // Bind delete events
  tbody.querySelectorAll('.action-btn.delete').forEach(btn => {
    btn.addEventListener('click', handleDelete);
  });
}

// ═══════════════════════════════════════════════════════════════
// STATS UPDATE
// ═══════════════════════════════════════════════════════════════
function updateStats() {
  document.getElementById('stat-total').textContent = allPatrocinadores.length;
  document.getElementById('stat-patrocina').textContent = allPatrocinadores.filter(p => p.estado === 'patrocina').length;
  document.getElementById('stat-pendientes').textContent = allPatrocinadores.filter(p => p.estado === 'pendiente' || !p.estado).length;
  document.getElementById('stat-rechazados').textContent = allPatrocinadores.filter(p => p.estado === 'rechazado').length;
}

// ═══════════════════════════════════════════════════════════════
// INLINE STATE CHANGE
// ═══════════════════════════════════════════════════════════════
async function handleInlineStateChange(e) {
  const sel = e.target;
  const id = sel.dataset.id;
  const newState = sel.value;

  sel.disabled = true; // prevent double click

  try {
    const { error } = await db
      .from(TABLE)
      .update({ estado: newState })
      .eq('id_patrocinador', id);

    if (error) throw error;

    // Update local state
    const patro = allPatrocinadores.find(p => p.id_patrocinador === id);
    if (patro) patro.estado = newState;

    updateStats();
    if(window.refreshKPIBar) window.refreshKPIBar();
    showToast('Estado actualizado', 'success');

  } catch (err) {
    console.error(err);
    showToast('Error al actualizar estado', 'error');
    // Revert selection visually
    const patro = allPatrocinadores.find(p => p.id_patrocinador === id);
    if(patro) sel.value = patro.estado; 
  } finally {
    sel.disabled = false;
  }
}

// ═══════════════════════════════════════════════════════════════
// EDIT
// ═══════════════════════════════════════════════════════════════
function handleEdit(e) {
  const id = e.currentTarget.dataset.id;
  const p = allPatrocinadores.find(x => x.id_patrocinador === id);
  if (!p) return;

  currentEditId = id;
  document.getElementById('modal-title').textContent = 'Editar Patrocinador';
  document.getElementById('f-sponsor').value   = p.sponsor || '';
  document.getElementById('f-contacto').value  = p.nombre_contacto || '';
  document.getElementById('f-correo').value    = p.correo || '';
  document.getElementById('f-numero').value    = p.numero || '';
  document.getElementById('f-categoria').value = p.categoria || 'Nacional';
  document.getElementById('f-tipo').value      = p.tipo_patrocinio || '';
  document.getElementById('f-estado').value    = p.estado || 'pendiente';
  document.getElementById('f-historial').value = p.historial || '';

  openModal();
}

// ═══════════════════════════════════════════════════════════════
// INSERT / UPDATE 
// ═══════════════════════════════════════════════════════════════
async function handleFormSubmit(e) {
  e.preventDefault();
  
  btnSave.disabled = true;
  document.getElementById('save-spinner').style.display = 'inline-block';

  const payload = {
    sponsor: document.getElementById('f-sponsor').value.trim(),
    nombre_contacto: document.getElementById('f-contacto').value.trim(),
    correo: document.getElementById('f-correo').value.trim(),
    numero: document.getElementById('f-numero').value.trim(),
    categoria: document.getElementById('f-categoria').value,
    tipo_patrocinio: document.getElementById('f-tipo').value.trim(),
    estado: document.getElementById('f-estado').value,
    historial: document.getElementById('f-historial').value.trim()
  };

  try {
    let req;
    if (currentEditId) {
      req = db.from(TABLE).update(payload).eq('id_patrocinador', currentEditId).select().single();
    } else {
      req = db.from(TABLE).insert([payload]).select().single();
    }

    const { data, error } = await req;
    if (error) throw error;

    if (currentEditId) {
      const idx = allPatrocinadores.findIndex(p => p.id_patrocinador === currentEditId);
      if (idx !== -1) allPatrocinadores[idx] = data;
      showToast(`✅ Patrocinador actualizado`, 'success');
    } else {
      allPatrocinadores.unshift(data);
      showToast(`✅ Patrocinador agregado`, 'success');
    }

    applyFilters();
    updateStats();
    if (window.refreshKPIBar) window.refreshKPIBar();
    closeModal();

  } catch (err) {
    console.error(err);
    showToast('Error al guardar patrocinador', 'error');
  } finally {
    btnSave.disabled = false;
    document.getElementById('save-spinner').style.display = 'none';
  }
}

// ═══════════════════════════════════════════════════════════════
// DELETE
// ═══════════════════════════════════════════════════════════════
async function handleDelete(e) {
  const id = e.currentTarget.dataset.id;
  const patro = allPatrocinadores.find(p => p.id_patrocinador === id);
  if (!confirm(`¿Seguro que querés eliminar a ${patro.sponsor}?`)) return;

  const btn = e.currentTarget;
  btn.style.opacity = '0.5';
  btn.style.pointerEvents = 'none';

  try {
    const { error } = await db.from(TABLE).delete().eq('id_patrocinador', id);
    if (error) throw error;

    allPatrocinadores = allPatrocinadores.filter(p => p.id_patrocinador !== id);
    applyFilters();
    updateStats();
    if (window.refreshKPIBar) window.refreshKPIBar();
    showToast(`🗑 Patrocinador eliminado`, 'success');
  } catch (err) {
    console.error(err);
    showToast('Error al eliminar patrocinador', 'error');
    btn.style.opacity = '1';
    btn.style.pointerEvents = 'auto';
  }
}

// ═══════════════════════════════════════════════════════════════
// CSV IMPORT LOGIC
// ═══════════════════════════════════════════════════════════════
function setupCsvUpload() {
  const dropZone = document.getElementById('csv-drop');
  const fileInput = document.getElementById('csv-file');

  // Drag events
  dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
  dropZone.addEventListener('dragleave', e => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
  });
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
      handleCsvFile(e.dataTransfer.files[0]);
    }
  });
  fileInput.addEventListener('change', e => {
    if (e.target.files.length) {
      handleCsvFile(e.target.files[0]);
    }
  });
}

function handleCsvFile(file) {
  if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
    showToast('Por favor, seleccioná un archivo CSV válido', 'error');
    return;
  }

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: function(results) {
      if(results.errors.length && results.data.length === 0) {
        showToast('Error al leer el CSV', 'error');
        return;
      }
      previewCsvData(results.data);
    }
  });
}

function previewCsvData(data) {
  parsedCsvData = data.filter(row => row.sponsor); // Must have at least sponsor name

  if(parsedCsvData.length === 0) {
    showToast('No se encontraron filas válidas', 'error');
    return;
  }

  const prevWrap = document.getElementById('csv-preview');
  const countEl = document.getElementById('csv-count');
  const thead = document.querySelector('#csv-preview-table thead');
  const tbody = document.querySelector('#csv-preview-table tbody');
  const btnImport = document.getElementById('btn-import-db');

  countEl.textContent = parsedCsvData.length;
  
  // Headers (take from first valid row)
  const headers = Object.keys(parsedCsvData[0]);
  thead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;

  // Rows (preview up to 5)
  const rowsHtml = parsedCsvData.slice(0, 5).map(row => {
    return `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`;
  }).join('');
  
  tbody.innerHTML = rowsHtml + (parsedCsvData.length > 5 ? `<tr><td colspan="${headers.length}" style="text-align:center; font-style:italic">...y ${parsedCsvData.length - 5} filas más</td></tr>` : '');

  prevWrap.style.display = 'block';
  btnImport.disabled = false;
  document.getElementById('csv-success-msg').style.display = 'none';
}

async function processImport() {
  if(!parsedCsvData || parsedCsvData.length === 0) return;

  const btnImport = document.getElementById('btn-import-db');
  btnImport.disabled = true;
  document.getElementById('import-spinner').style.display = 'inline-block';

  // Map to DB fields. Default unmapped fields or handle gracefully
  const payload = parsedCsvData.map(row => ({
    sponsor: row.sponsor || 'Desconocido',
    categoria: row.categoria || 'Nacional',
    correo: row.correo || null,
    numero: row.numero || null,
    nombre_contacto: row.nombre_contacto || null,
    tipo_patrocinio: row.tipo_patrocinio || null,
    estado: 'pendiente' // Force to pendiente by default
  }));

  try {
    const { data, error } = await db.from(TABLE).insert(payload).select();
    if(error) throw error;

    // Success
    document.getElementById('csv-success-msg').style.display = 'block';
    document.getElementById('csv-success-msg').textContent = `¡✅ ${data.length} patrocinadores importados correctamente!`;
    
    // Refresh table
    allPatrocinadores = [...data, ...allPatrocinadores];
    applyFilters();
    updateStats();
    if(window.refreshKPIBar) window.refreshKPIBar();

    setTimeout(closeCsvModal, 2000);

  } catch(err) {
    console.error(err);
    showToast('Error al importar a base de datos', 'error');
    btnImport.disabled = false;
  } finally {
    document.getElementById('import-spinner').style.display = 'none';
  }
}

// ═══════════════════════════════════════════════════════════════
// MODAL CONTROLS
// ═══════════════════════════════════════════════════════════════
function openModal() {
  modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  if(!currentEditId) {
    document.getElementById('modal-title').textContent = 'Agregar Patrocinador';
    patroForm.reset();
  }
  document.getElementById('f-sponsor')?.focus();
}

function closeModal() {
  modalOverlay.classList.remove('open');
  document.body.style.overflow = '';
  currentEditId = null;
  patroForm.reset();
}

function openCsvModal() {
  modalCsv.classList.add('open');
  document.body.style.overflow = 'hidden';
  
  // Reset state
  parsedCsvData = null;
  document.getElementById('csv-file').value = '';
  document.getElementById('csv-preview').style.display = 'none';
  document.getElementById('btn-import-db').disabled = true;
  document.getElementById('csv-success-msg').style.display = 'none';
}

function closeCsvModal() {
  modalCsv.classList.remove('open');
  document.body.style.overflow = '';
}

// ═══════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════
let toastTimeout;
function showToast(msg, type = 'success') {
  clearTimeout(toastTimeout);
  toastEl.textContent = msg;
  toastEl.className = `toast ${type} show`;
  toastTimeout = setTimeout(() => toastEl.classList.remove('show'), 3000);
}
