// ============================================================
// ToB Operations Center — gastos.js
// Lógica de Gestión de Gastos (Mini-ERP)
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  const db = window._supabaseClient;
  if (!db) { console.error('Supabase no está inicializado.'); return; }

  // DOM
  const tbody       = document.getElementById('gastos-tbody');
  const searchInput = document.getElementById('search-gastos');
  const filterSelect = document.getElementById('filter-estado');
  const kpiGastos   = document.getElementById('kpi-gastos');
  const kpiDisponible = document.getElementById('kpi-disponible');
  const toast       = document.getElementById('toast');

  // Modals
  const modalNew    = document.getElementById('modal-new-expense');
  const modalReview = document.getElementById('modal-review-expense');

  // Número admin para WhatsApp (Andrey/Abril)
  const ADMIN_WHATSAPP = '50661515240';

  // State
  let currentUser = null;
  let isAdmin = false;
  let allExpenses = [];
  let currentExpense = null;

  // ── Sesión ──────────────────────────────────────────────────
  const { data: { session } } = await db.auth.getSession();
  if (!session?.user) return;
  currentUser = session.user;
  const email = currentUser.email.toLowerCase();
  isAdmin = ['andrey', 'abril', 'figueroa', 'admin'].some(k => email.includes(k));

  // ── Carga inicial ────────────────────────────────────────────
  await fetchGastos();

  // ── Event Listeners: Filtros ─────────────────────────────────
  searchInput.addEventListener('input', renderTable);
  filterSelect.addEventListener('change', renderTable);

  // ── Event Listeners: Modal Nueva Solicitud ───────────────────
  document.getElementById('btn-new-expense').addEventListener('click', () => {
    document.getElementById('form-new-expense').reset();
    openModal(modalNew);
  });

  document.getElementById('btn-close-new').addEventListener('click', () => closeModal(modalNew));
  document.getElementById('btn-cancel-new').addEventListener('click', () => closeModal(modalNew));

  document.getElementById('btn-submit-new').addEventListener('click', async () => {
    const form = document.getElementById('form-new-expense');
    if (!form.checkValidity()) { form.reportValidity(); return; }
    await submitNewExpense();
  });

  modalNew.addEventListener('click', e => { if (e.target === modalNew) closeModal(modalNew); });

  // ── Event Listeners: Modal Revisión ──────────────────────────
  document.getElementById('btn-close-review').addEventListener('click', () => closeModal(modalReview));
  modalReview.addEventListener('click', e => { if (e.target === modalReview) closeModal(modalReview); });

  document.getElementById('btn-admin-save').addEventListener('click', updateExpenseStatus);
  document.getElementById('btn-exec-save').addEventListener('click', closeExpenseExecution);

  // ── Helpers: Modals ──────────────────────────────────────────
  function openModal(modal) { modal.classList.add('open'); }
  function closeModal(modal) { modal.classList.remove('open'); }

  // ── Helper: Toast ────────────────────────────────────────────
  function showToast(msg, type = 'success') {
    toast.textContent = msg;
    toast.className = `toast show ${type}`;
    setTimeout(() => { toast.className = 'toast'; }, 3000);
  }

  // ── SUPABASE: Fetch ──────────────────────────────────────────
  async function fetchGastos() {
    tbody.innerHTML = `<tr class="loading-row"><td colspan="7"><span class="loading-spinner"></span> Cargando gastos...</td></tr>`;

    const { data, error } = await db
      .from('gastos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01') {
        tbody.innerHTML = `<tr class="loading-row"><td colspan="7" style="color:var(--accent-red);">⚠️ La tabla "gastos" no existe. Por favor ejecuta el script SQL en Supabase.</td></tr>`;
      } else {
        tbody.innerHTML = `<tr class="loading-row"><td colspan="7">Error al cargar datos.</td></tr>`;
      }
      console.error(error);
      return;
    }

    allExpenses = data || [];
    renderTable();
    updateStats();
    calculateKPIs();
  }

  // ── Render Tabla ─────────────────────────────────────────────
  function renderTable() {
    const search = searchInput.value.toLowerCase();
    const status = filterSelect.value;

    const filtered = allExpenses.filter(g => {
      const matchSearch =
        (g.codigo_unico   || '').toLowerCase().includes(search) ||
        (g.nombre_completo|| '').toLowerCase().includes(search) ||
        (g.categoria      || '').toLowerCase().includes(search) ||
        (g.titulo         || '').toLowerCase().includes(search);
      const matchStatus = status === 'todos' || g.estado === status;
      return matchSearch && matchStatus;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr class="loading-row"><td colspan="7">No se encontraron gastos con esos filtros.</td></tr>`;
      return;
    }

    tbody.innerHTML = '';
    filtered.forEach(g => {
      const stateClass = (g.estado || 'pendiente').toLowerCase().replace(' ', '-');
      const dateStr = new Date(g.created_at).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' });
      const monto = Number(g.monto_estimado).toLocaleString('es-CR');

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><span class="status-pill ${stateClass}">${g.estado}</span></td>
        <td><span class="cell-codigo">${g.codigo_unico}</span></td>
        <td>${g.nombre_completo}</td>
        <td>
          <div style="font-weight:600;">${g.categoria}</div>
          <div style="font-size:11px;color:var(--text-muted);">${g.modalidad}</div>
        </td>
        <td style="font-weight:700;">₡${monto}</td>
        <td style="color:var(--text-muted);font-size:12px;">${dateStr}</td>
        <td>
          <button class="action-btn" data-id="${g.id}">Ver Detalles →</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    document.querySelectorAll('.action-btn').forEach(btn => {
      btn.addEventListener('click', e => openReviewModal(e.currentTarget.dataset.id));
    });
  }

  // ── Estadísticas ─────────────────────────────────────────────
  function updateStats() {
    document.getElementById('stat-total').textContent       = allExpenses.length;
    document.getElementById('stat-aprobados').textContent   = allExpenses.filter(g => g.estado === 'Aprobado').length;
    document.getElementById('stat-pendientes').textContent  = allExpenses.filter(g => g.estado === 'Pendiente').length;
    document.getElementById('stat-completados').textContent = allExpenses.filter(g => g.estado === 'Completado').length;
  }

  function calculateKPIs() {
    const totalAprobado = allExpenses
      .filter(g => ['Aprobado','En proceso','Completado'].includes(g.estado))
      .reduce((s, g) => s + Number(g.monto_final || g.monto_estimado), 0);

    const PRESUPUESTO = 5000000;
    kpiGastos.textContent     = `₡${totalAprobado.toLocaleString('es-CR')}`;
    kpiDisponible.textContent = `₡${(PRESUPUESTO - totalAprobado).toLocaleString('es-CR')}`;
  }

  // ── Generar Código Único ─────────────────────────────────────
  function generateCode() {
    const n = allExpenses.length + 1;
    return `TOB-GASTO-${n.toString().padStart(3, '0')}`;
  }

  // ── Submit Nueva Solicitud ───────────────────────────────────
  async function submitNewExpense() {
    const btn = document.getElementById('btn-submit-new');
    const spinner = document.getElementById('spinner-new');
    btn.disabled = true;
    spinner.style.display = 'inline-block';

    try {
      const codigoUnico = generateCode();

      const newExpense = {
        codigo_unico:    codigoUnico,
        solicitante_id:  currentUser.id,
        nombre_completo: document.getElementById('solicitante_nombre').value.trim(),
        coordinacion:    document.getElementById('solicitante_coordinacion').value.trim(),
        telefono:        document.getElementById('solicitante_telefono').value.trim(),
        titulo:          document.getElementById('gasto_titulo').value.trim(),
        descripcion:     document.getElementById('gasto_descripcion').value.trim(),
        categoria:       document.getElementById('gasto_categoria').value,
        modalidad:       document.getElementById('gasto_modalidad').value,
        monto_estimado:  parseFloat(document.getElementById('gasto_monto').value),
        prioridad:       document.getElementById('gasto_prioridad').value,
        estado:          'Pendiente'
      };

      const { error } = await db.from('gastos').insert([newExpense]);
      if (error) throw error;

      closeModal(modalNew);
      showToast(`✅ Solicitud ${codigoUnico} registrada exitosamente.`);
      await fetchGastos();

      // WhatsApp a administradores
      const text = `Hola, nueva solicitud de gasto registrada en el sistema ToB 2026.\n\n*Código:* ${codigoUnico}\n*Solicitante:* ${newExpense.nombre_completo}\n*Monto:* ₡${newExpense.monto_estimado.toLocaleString('es-CR')}\n*Categoría:* ${newExpense.categoria}`;
      if (confirm('¿Deseas notificar a Finanzas (Andrey/Abril) por WhatsApp?')) {
        window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(text)}`, '_blank');
      }

    } catch (err) {
      console.error(err);
      showToast('Error al registrar la solicitud.', 'error');
    } finally {
      btn.disabled = false;
      spinner.style.display = 'none';
    }
  }

  // ── Abrir Modal de Revisión ───────────────────────────────────
  function openReviewModal(id) {
    const g = allExpenses.find(x => x.id === id);
    if (!g) return;
    currentExpense = g;

    // Llenar encabezado
    document.getElementById('review-title').textContent    = `Gasto: ${g.codigo_unico}`;
    document.getElementById('review-subtitle').textContent = `${g.categoria} — ${g.modalidad}`;
    document.getElementById('review-code').textContent     = g.codigo_unico;

    // Estado pill
    const pill = document.getElementById('review-status');
    pill.textContent = g.estado;
    pill.className = `status-pill ${(g.estado || 'pendiente').toLowerCase().replace(' ', '-')}`;

    // Detalles
    document.getElementById('detail-solicitante').textContent  = g.nombre_completo;
    document.getElementById('detail-coordinacion').textContent = g.coordinacion;
    document.getElementById('detail-titulo').textContent       = g.titulo;
    document.getElementById('detail-motivo').textContent       = g.descripcion;
    document.getElementById('detail-categoria').textContent    = g.categoria;
    document.getElementById('detail-modalidad').textContent    = g.modalidad;
    document.getElementById('detail-prioridad').textContent    = g.prioridad;
    document.getElementById('detail-monto').textContent        = `₡${Number(g.monto_estimado).toLocaleString('es-CR')}`;

    // Paneles de acción
    const adminPanel   = document.getElementById('admin-actions-panel');
    const execPanel    = document.getElementById('execution-actions-panel');
    const readonlyPanel = document.getElementById('readonly-panel');

    adminPanel.classList.add('hidden');
    execPanel.classList.add('hidden');
    readonlyPanel.classList.add('hidden');

    if (isAdmin) {
      adminPanel.classList.remove('hidden');
      document.getElementById('admin_update_status').value = g.estado;
    }

    const canClose = (g.estado === 'Aprobado' || g.estado === 'En proceso') &&
                     (isAdmin || g.solicitante_id === currentUser.id);
    if (canClose) {
      execPanel.classList.remove('hidden');
      document.getElementById('exec_monto_final').value = '';
      document.getElementById('exec_comentarios').value = '';
    }

    if (!isAdmin && !canClose) {
      readonlyPanel.classList.remove('hidden');
    }

    openModal(modalReview);
  }

  // ── Admin: Actualizar Estado ──────────────────────────────────
  async function updateExpenseStatus() {
    if (!currentExpense || !isAdmin) return;

    const btn = document.getElementById('btn-admin-save');
    const spinner = document.getElementById('spinner-admin');
    btn.disabled = true;
    spinner.style.display = 'inline-block';

    const nuevoEstado = document.getElementById('admin_update_status').value;

    try {
      const { error } = await db.from('gastos')
        .update({
          estado:           nuevoEstado,
          aprobado_por:     currentUser.id,
          fecha_aprobacion: new Date().toISOString()
        })
        .eq('id', currentExpense.id);

      if (error) throw error;

      closeModal(modalReview);
      showToast(`Estado actualizado a: ${nuevoEstado}`);
      await fetchGastos();

      // WhatsApp al coordinador si aplica
      if (['Aprobado','Rechazado'].includes(nuevoEstado)) {
        let phone = (currentExpense.telefono || '').replace(/\D/g, '');
        if (phone.length === 8) phone = '506' + phone;
        const text = `Hola ${currentExpense.nombre_completo}, tu solicitud *${currentExpense.codigo_unico}* fue *${nuevoEstado}* por Finanzas ToB 2026.`;
        if (phone && confirm(`¿Notificar a ${currentExpense.nombre_completo} por WhatsApp?`)) {
          window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
        }
      }

    } catch (err) {
      console.error(err);
      showToast('Error al actualizar el estado.', 'error');
    } finally {
      btn.disabled = false;
      spinner.style.display = 'none';
    }
  }

  // ── Cierre de Gasto ───────────────────────────────────────────
  async function closeExpenseExecution() {
    if (!currentExpense) return;

    const btn = document.getElementById('btn-exec-save');
    const spinner = document.getElementById('spinner-exec');
    btn.disabled = true;
    spinner.style.display = 'inline-block';

    try {
      const montoFinal = parseFloat(document.getElementById('exec_monto_final').value) || currentExpense.monto_estimado;
      const comentarios = document.getElementById('exec_comentarios').value.trim();

      const { error } = await db.from('gastos')
        .update({
          estado:             'Completado',
          monto_final:        montoFinal,
          comentarios_finales: comentarios,
          fecha_realizacion:  new Date().toISOString()
        })
        .eq('id', currentExpense.id);

      if (error) throw error;

      closeModal(modalReview);
      showToast(`🎉 Gasto ${currentExpense.codigo_unico} marcado como Completado.`);
      await fetchGastos();

    } catch (err) {
      console.error(err);
      showToast('Error al cerrar el gasto.', 'error');
    } finally {
      btn.disabled = false;
      spinner.style.display = 'none';
    }
  }

});
