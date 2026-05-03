// ============================================================
// ToB Operations Center — conferencistas.js
// CRUD completo con Supabase para la tabla "conferencistas"
// ============================================================

// ── Supabase client ───────────────────────────────────────────
const db = window._supabaseClient;
const TABLE = 'conferencistas';

// ── State ────────────────────────────────────────────────────
let allConferencistas = [];
let filteredList      = [];
let currentEditId     = null;

// ── DOM References ────────────────────────────────────────────
const tbody         = document.getElementById('conf-tbody');
const searchInput   = document.getElementById('conf-search');
const filterEstado  = document.getElementById('conf-filter-estado');
const modalOverlay  = document.getElementById('modal-overlay');
const confForm      = document.getElementById('conf-form');
const btnSave       = document.getElementById('btn-save-conf');
const toastEl       = document.getElementById('toast');

// Stats
const statTotal       = document.getElementById('stat-total');
const statConfirmados = document.getElementById('stat-confirmados');
const statPendientes  = document.getElementById('stat-pendientes');

// ═══════════════════════════════════════════════════════════════
// FETCH — Load all conferencistas
// ═══════════════════════════════════════════════════════════════
async function loadConferencistas() {
  showLoading();

  const { data, error } = await db
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    showError(`Error al cargar datos: ${error.message}`);
    showToast('❌ Error al conectar con Supabase', 'error');
    return;
  }

  allConferencistas = data || [];
  applyFilters();
  updateStats();
}

// ═══════════════════════════════════════════════════════════════
// RENDER — Build table rows
// ═══════════════════════════════════════════════════════════════
function renderTable(list) {
  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">
            <div class="empty-state__icon">🎤</div>
            <div class="empty-state__title">Sin conferencistas aún</div>
            <div class="empty-state__desc">
              ${searchInput.value || filterEstado.value
                ? 'No hay resultados para el filtro actual.'
                : 'Agregá el primer postulante con el botón de arriba.'}
            </div>
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = list.map(c => `
    <tr data-id="${c.id_conferencista}">

      <!-- Estado toggle -->
      <td>
        <div class="estado-wrap">
          <label class="toggle-switch" title="${c.estado === 'Confirmado' ? 'Confirmado — clic para cambiar' : 'Pendiente — clic para confirmar'}">
            <input
              type="checkbox"
              class="estado-toggle"
              data-id="${c.id_conferencista}"
              ${c.estado === 'Confirmado' ? 'checked' : ''}
              aria-label="Estado de ${c.nombre || 'conferencista'}"
            />
            <div class="toggle-track">
              <div class="toggle-thumb"></div>
            </div>
          </label>
          <span class="estado-label ${c.estado === 'Confirmado' ? 'confirmado' : 'pendiente'}">
            ${c.estado === 'Confirmado' ? 'Confirmado' : 'Pendiente'}
          </span>
        </div>
      </td>

      <!-- Nombre -->
      <td>
        <div class="cell-name">
          <strong>${esc([c.nombre, c.apellido].filter(Boolean).join(' ') || '—')}</strong>
          ${c.email ? `<small>✉ ${esc(c.email)}</small>` : ''}
        </div>
      </td>

      <!-- Cargo / Empresa -->
      <td>
        <div class="cell-empresa">
          ${c.cargo_actual ? `<strong>${esc(c.cargo_actual)}</strong>` : '<strong style="color:var(--text-muted)">—</strong>'}
          ${c.empresa ? `<small>${esc(c.empresa)}</small>` : ''}
        </div>
      </td>

      <!-- Especialidad -->
      <td>
        ${c.especialidad
          ? `<span class="esp-tag" title="${esc(c.especialidad)}">${esc(c.especialidad)}</span>`
          : '<span style="color:var(--text-muted);font-size:12px;">—</span>'}
      </td>

      <!-- Contacto (teléfono) -->
      <td style="color:var(--text-secondary);font-size:12px;">
        ${c.telefono ? esc(c.telefono) : '—'}
      </td>

      <!-- Años experiencia -->
      <td style="text-align:center;font-weight:600;color:var(--accent-orange);">
        ${c.anios_experiencia != null ? `${c.anios_experiencia}` : '—'}
      </td>

      <!-- Acciones -->
      <td>
        <div class="cell-actions">

          <!-- LinkedIn -->
          ${c.linkedin_url
            ? `<a href="${esc(c.linkedin_url)}" target="_blank" rel="noopener"
                 class="action-btn linkedin" title="Ver LinkedIn">
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="color:#0a66c2;">
                   <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                 </svg>
               </a>`
            : `<span class="action-btn linkedin disabled" title="Sin LinkedIn">
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                   <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                 </svg>
               </span>`}

          <!-- Currículum -->
          ${c.curriculum_url
            ? `<a href="${esc(c.curriculum_url)}" target="_blank" rel="noopener"
                 class="action-btn cv" title="Ver Currículum">📄</a>`
            : `<span class="action-btn cv disabled" title="Sin currículum cargado">📄</span>`}

          <!-- Editar -->
          <button
            class="action-btn edit"
            data-id="${c.id_conferencista}"
            title="Editar"
            aria-label="Editar conferencista"
          >✏️</button>

          <!-- Eliminar -->
          <button
            class="action-btn delete"
            data-id="${c.id_conferencista}"
            data-name="${esc([c.nombre, c.apellido].filter(Boolean).join(' ') || 'este conferencista')}"
            title="Eliminar"
            aria-label="Eliminar conferencista"
          >🗑</button>

        </div>
      </td>
    </tr>
  `).join('');

  // Bind toggle events
  tbody.querySelectorAll('.estado-toggle').forEach(cb => {
    cb.addEventListener('change', handleEstadoToggle);
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
// TOGGLE ESTADO
// ═══════════════════════════════════════════════════════════════
async function handleEstadoToggle(e) {
  const cb     = e.target;
  const id     = cb.dataset.id;
  const nuevoEstado = cb.checked ? 'Confirmado' : 'Pendiente';
  const row    = cb.closest('tr');

  // Optimistic UI update
  const label = row.querySelector('.estado-label');
  if (label) {
    label.textContent = nuevoEstado;
    label.className = `estado-label ${nuevoEstado === 'Confirmado' ? 'confirmado' : 'pendiente'}`;
  }

  const { error } = await db
    .from(TABLE)
    .update({ estado: nuevoEstado })
    .eq('id_conferencista', id);

  if (error) {
    // Revert
    cb.checked = !cb.checked;
    if (label) {
      const revertado = cb.checked ? 'Confirmado' : 'Pendiente';
      label.textContent = revertado;
      label.className = `estado-label ${revertado === 'Confirmado' ? 'confirmado' : 'pendiente'}`;
    }
    showToast('❌ Error al actualizar estado', 'error');
    return;
  }

  // Update local state
  const local = allConferencistas.find(c => c.id_conferencista === id);
  if (local) local.estado = nuevoEstado;
  updateStats();

  showToast(`✅ Estado actualizado: ${nuevoEstado}`, 'success');
}

// ═══════════════════════════════════════════════════════════════
// DELETE
// ═══════════════════════════════════════════════════════════════
async function handleDelete(e) {
  const btn  = e.currentTarget;
  const id   = btn.dataset.id;
  const name = btn.dataset.name;

  if (!confirm(`¿Eliminar a ${name}? Esta acción no se puede deshacer.`)) return;

  const { error } = await db
    .from(TABLE)
    .delete()
    .eq('id_conferencista', id);

  if (error) {
    showToast('❌ Error al eliminar', 'error');
    return;
  }

  allConferencistas = allConferencistas.filter(c => c.id_conferencista !== id);
  applyFilters();
  updateStats();
  if (window.refreshKPIBar) window.refreshKPIBar(); // Notify KPI bar
  showToast(`🗑 ${name} eliminado`, 'success');
}

// ═══════════════════════════════════════════════════════════════
// EDIT
// ═══════════════════════════════════════════════════════════════
function handleEdit(e) {
  const id = e.currentTarget.dataset.id;
  const conf = allConferencistas.find(c => c.id_conferencista === id);
  if (!conf) return;

  currentEditId = id;
  document.getElementById('modal-title').textContent = 'Editar Conferencista';
  document.getElementById('f-nombre').value     = conf.nombre || '';
  document.getElementById('f-apellido').value   = conf.apellido || '';
  document.getElementById('f-email').value      = conf.email || '';
  document.getElementById('f-telefono').value   = conf.telefono || '';
  document.getElementById('f-cargo').value      = conf.cargo_actual || '';
  document.getElementById('f-empresa').value    = conf.empresa || '';
  document.getElementById('f-especialidad').value = conf.especialidad || '';
  document.getElementById('f-anios').value      = conf.anios_experiencia || '';
  document.getElementById('f-linkedin').value   = conf.linkedin_url || '';
  document.getElementById('f-cv').value         = conf.curriculum_url || '';
  document.getElementById('f-estado').value     = conf.estado || 'Pendiente';

  openModal();
}

// ═══════════════════════════════════════════════════════════════
// INSERT / UPDATE — Save conferencista
// ═══════════════════════════════════════════════════════════════
async function handleFormSubmit(e) {
  e.preventDefault();
  btnSave.disabled = true;
  document.getElementById('save-spinner').style.display = 'inline-block';

  const fd = new FormData(confForm);
  const payload = {};

  const fields = [
    'nombre', 'apellido', 'email', 'telefono',
    'cargo_actual', 'empresa', 'especialidad',
    'linkedin_url', 'curriculum_url', 'estado'
  ];

  fields.forEach(f => {
    const val = fd.get(f)?.toString().trim();
    if (val) payload[f] = val;
  });

  const anios = fd.get('anios_experiencia')?.toString().trim();
  if (anios && !isNaN(anios)) payload.anios_experiencia = parseInt(anios);

  // Default estado
  if (!payload.estado) payload.estado = 'Pendiente';

  let req;
  if (currentEditId) {
    req = db.from(TABLE).update(payload).eq('id_conferencista', currentEditId).select().single();
  } else {
    req = db.from(TABLE).insert([payload]).select().single();
  }

  const { data, error } = await req;

  btnSave.disabled = false;
  document.getElementById('save-spinner').style.display = 'none';

  if (error) {
    showToast(`❌ Error: ${error.message}`, 'error');
    return;
  }

  if (currentEditId) {
    const idx = allConferencistas.findIndex(c => c.id_conferencista === currentEditId);
    if (idx !== -1) allConferencistas[idx] = data;
    showToast(`✅ Conferencista actualizado`, 'success');
  } else {
    allConferencistas.unshift(data);
    showToast(`✅ Conferencista agregado exitosamente`, 'success');
  }

  applyFilters();
  updateStats();
  if (window.refreshKPIBar) window.refreshKPIBar(); // Notify KPI bar to sync counts
  closeModal();
}

// ═══════════════════════════════════════════════════════════════
// FILTERS
// ═══════════════════════════════════════════════════════════════
function applyFilters() {
  const query  = searchInput.value.toLowerCase().trim();
  const estado = filterEstado.value;

  filteredList = allConferencistas.filter(c => {
    const fullName  = [c.nombre, c.apellido].filter(Boolean).join(' ').toLowerCase();
    const empresa   = (c.empresa || '').toLowerCase();
    const esp       = (c.especialidad || '').toLowerCase();
    const email     = (c.email || '').toLowerCase();

    const matchSearch = !query ||
      fullName.includes(query) ||
      empresa.includes(query) ||
      esp.includes(query) ||
      email.includes(query);

    const matchEstado = !estado || c.estado === estado;

    return matchSearch && matchEstado;
  });

  renderTable(filteredList);
}

function updateStats() {
  const total       = allConferencistas.length;
  const confirmados = allConferencistas.filter(c => c.estado === 'Confirmado').length;
  const pendientes  = total - confirmados;

  if (statTotal)       statTotal.textContent       = total;
  if (statConfirmados) statConfirmados.textContent  = confirmados;
  if (statPendientes)  statPendientes.textContent   = pendientes;
}

// ═══════════════════════════════════════════════════════════════
// MODAL CONTROL
// ═══════════════════════════════════════════════════════════════
function openModal() {
  modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  if (!currentEditId) {
    document.getElementById('modal-title').textContent = 'Agregar Conferencista';
    confForm.reset();
  }
  document.getElementById('f-nombre')?.focus();
}

function closeModal() {
  modalOverlay.classList.remove('open');
  document.body.style.overflow = '';
  currentEditId = null;
  confForm.reset();
}

// ═══════════════════════════════════════════════════════════════
// UI HELPERS
// ═══════════════════════════════════════════════════════════════
function showLoading() {
  tbody.innerHTML = `
    <tr class="loading-row">
      <td colspan="7">
        <span class="loading-spinner"></span>
        Cargando conferencistas...
      </td>
    </tr>`;
}

function showError(msg) {
  tbody.innerHTML = `
    <tr class="loading-row">
      <td colspan="7" style="color:var(--accent-red);">
        ❌ ${msg}
      </td>
    </tr>`;
}

function showToast(msg, type = 'success') {
  toastEl.textContent = msg;
  toastEl.className = `toast ${type}`;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 3000);
}

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ═══════════════════════════════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════════════════════════════
document.getElementById('btn-open-modal')?.addEventListener('click', openModal);
document.getElementById('btn-close-modal')?.addEventListener('click', closeModal);
document.getElementById('btn-cancel-modal')?.addEventListener('click', closeModal);

// Close modal clicking outside
modalOverlay?.addEventListener('click', e => {
  if (e.target === modalOverlay) closeModal();
});

// Escape key closes modal
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && modalOverlay.classList.contains('open')) closeModal();
});

// Form submit
confForm?.addEventListener('submit', handleFormSubmit);
btnSave?.addEventListener('click', (e) => {
  e.preventDefault();
  confForm.dispatchEvent(new Event('submit'));
});

// Live search & filter
searchInput?.addEventListener('input', applyFilters);
filterEstado?.addEventListener('change', applyFilters);

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadConferencistas();
});
