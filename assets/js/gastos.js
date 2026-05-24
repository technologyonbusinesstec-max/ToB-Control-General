// ============================================================
// ToB Operations Center — gastos.js
// Lógica de Gestión de Gastos (Mini-ERP)
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  const db = window._supabaseClient;
  if (!db) {
    console.error('Supabase no está inicializado.');
    return;
  }

  // Elementos DOM principales
  const tbody = document.getElementById('gastos-tbody');
  const searchInput = document.getElementById('search-gastos');
  const filterSelect = document.getElementById('filter-estado');
  
  // KPIs
  const kpiGastos = document.getElementById('kpi-gastos');
  const kpiDisponible = document.getElementById('kpi-disponible');
  
  // Modals
  const modalNew = document.getElementById('modal-new-expense');
  const modalReview = document.getElementById('modal-review-expense');
  const btnNew = document.getElementById('btn-new-expense');
  
  // Configuración del Administrador Principal
  const ADMIN_WHATSAPP = '50661515240'; // Reemplazar con el número real de los administradores

  // Variables globales
  let currentUser = null;
  let isAdmin = false;
  let allExpenses = [];
  let currentExpenseReview = null;

  // 1. Inicialización de Sesión
  const { data: { session } } = await db.auth.getSession();
  if (session && session.user) {
    currentUser = session.user;
    // Determinamos si es Admin Financiero (Andrey o Abril) de forma básica por correo
    const email = currentUser.email.toLowerCase();
    isAdmin = email.includes('andrey') || email.includes('abril') || email.includes('admin');
  } else {
    // Si no hay sesión, se manejará por auth.js, pero detenemos aquí
    return;
  }

  // 2. Carga inicial de datos
  await fetchGastos();

  // ==========================================
  // EVENT LISTENERS: BUSCADOR Y FILTROS
  // ==========================================
  searchInput.addEventListener('input', renderTable);
  filterSelect.addEventListener('change', renderTable);

  // ==========================================
  // EVENT LISTENERS: MODAL NUEVA SOLICITUD
  // ==========================================
  btnNew.addEventListener('click', () => {
    document.getElementById('form-new-expense').reset();
    modalNew.classList.remove('hidden');
  });

  document.getElementById('btn-close-new').addEventListener('click', () => {
    modalNew.classList.add('hidden');
  });

  document.getElementById('btn-cancel-new').addEventListener('click', () => {
    modalNew.classList.add('hidden');
  });

  document.getElementById('form-new-expense').addEventListener('submit', async (e) => {
    e.preventDefault();
    await submitNewExpense();
  });

  // ==========================================
  // EVENT LISTENERS: MODAL REVISIÓN
  // ==========================================
  document.getElementById('btn-close-review').addEventListener('click', () => {
    modalReview.classList.add('hidden');
  });

  document.getElementById('btn-admin-save').addEventListener('click', async () => {
    await updateExpenseStatus();
  });

  document.getElementById('btn-exec-save').addEventListener('click', async () => {
    await closeExpenseExecution();
  });


  // ==========================================
  // Función auxiliar para enviar notificaciones
  // Función para abrir WhatsApp manualmente con mensajes predefinidos
  function openWhatsAppManual(type, data) {
    let phone = '';
    let text = '';

    if (type === 'NUEVO_GASTO') {
      phone = ADMIN_WHATSAPP;
      text = `Hola, se ha registrado una nueva solicitud de gasto.\n\n*Código:* ${data.codigo_unico}\n*Solicitante:* ${data.nombre_completo}\n*Monto:* ₡${data.monto_estimado}\n*Categoría:* ${data.categoria}`;
      
      if (confirm('¿Deseas enviar un mensaje de WhatsApp a Finanzas (Andrey/Abril) notificando este gasto?')) {
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
      }
    } 
    else if (type === 'ESTADO_ACTUALIZADO') {
      // Necesita que el coordinador haya puesto su teléfono, le agregamos 506 si no lo tiene.
      // Quitar espacios o guiones del teléfono
      phone = (data.telefono || '').replace(/\D/g, ''); 
      if (!phone.startsWith('506') && phone.length === 8) phone = '506' + phone;

      text = `Hola ${data.solicitante}, tu solicitud de gasto *${data.codigo_unico}* ha sido *${data.estado}* por Finanzas.`;
      
      if (phone && confirm('¿Deseas notificar al coordinador por WhatsApp sobre esta actualización?')) {
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
      } else if (!phone) {
        alert('El coordinador no proporcionó un número de teléfono válido para notificar.');
      }
    }
  }

  // Obtener gastos de la base de datos
  async function fetchGastos() {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Cargando gastos...</td></tr>';
    
    const { data, error } = await db
      .from('gastos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error cargando gastos:', error);
      // Si la tabla no existe aún, mostramos datos de prueba o vacío
      if (error.code === '42P01') {
         tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--accent-red);">La tabla "gastos" no existe en Supabase aún. Por favor ejecuta el script SQL.</td></tr>';
      } else {
         tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Error cargando datos.</td></tr>';
      }
      return;
    }

    allExpenses = data || [];
    renderTable();
    calculateKPIs();
  }

  // Renderizar la tabla de datos
  function renderTable() {
    const searchTerm = searchInput.value.toLowerCase();
    const filterStatus = filterSelect.value;

    const filtered = allExpenses.filter(g => {
      const matchSearch = 
        (g.codigo_unico || '').toLowerCase().includes(searchTerm) ||
        (g.nombre_completo || '').toLowerCase().includes(searchTerm) ||
        (g.categoria || '').toLowerCase().includes(searchTerm) ||
        (g.titulo || '').toLowerCase().includes(searchTerm);
        
      const matchStatus = filterStatus === 'todos' || g.estado === filterStatus;
      
      return matchSearch && matchStatus;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr class="empty-state"><td colspan="7">No se encontraron gastos con esos filtros.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    filtered.forEach(g => {
      const tr = document.createElement('tr');
      
      // Determinar clase de estado
      const stateClass = (g.estado || 'pendiente').toLowerCase().replace(' ', '-');
      
      // Fecha formateada
      const dateStr = new Date(g.created_at).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' });

      tr.innerHTML = `
        <td style="font-weight:600; font-family:'Outfit', sans-serif;">${g.codigo_unico}</td>
        <td style="color:var(--text-secondary); font-size:13px;">${dateStr}</td>
        <td>${g.nombre_completo}</td>
        <td>${g.categoria}</td>
        <td style="font-weight:600;">₡${Number(g.monto_estimado).toLocaleString('es-CR')}</td>
        <td><span class="status-pill ${stateClass}">${g.estado}</span></td>
        <td>
          <button class="btn-action" data-id="${g.id}">Ver Detalles</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Agregar listeners a los botones de "Ver Detalles"
    document.querySelectorAll('.btn-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        openReviewModal(id);
      });
    });
  }

  // Calcular y actualizar KPIs
  function calculateKPIs() {
    const totalAprobadoYCompletado = allExpenses
      .filter(g => g.estado === 'Aprobado' || g.estado === 'En proceso' || g.estado === 'Completado')
      .reduce((sum, g) => sum + Number(g.monto_final || g.monto_estimado), 0);

    kpiGastos.textContent = `₡${totalAprobadoYCompletado.toLocaleString('es-CR')}`;
    
    // Si hubiera un presupuesto total, aquí calcularíamos el disponible.
    // Ejemplo: Presupuesto Total = 5,000,000
    const PRESUPUESTO_TOTAL = 5000000;
    const disponible = PRESUPUESTO_TOTAL - totalAprobadoYCompletado;
    kpiDisponible.textContent = `₡${disponible.toLocaleString('es-CR')}`;
  }

  // Enviar nueva solicitud de gasto
  async function submitNewExpense() {
    const btnSubmit = document.querySelector('#form-new-expense button[type="submit"]');
    const originalText = btnSubmit.textContent;
    btnSubmit.textContent = 'Enviando...';
    btnSubmit.disabled = true;

    try {
      // 1. Generar Código Único
      const count = allExpenses.length + 1;
      const codigoUnico = `TOB-GASTO-${count.toString().padStart(3, '0')}`;

      // 2. Subir archivo (si hay)
      let fileUrl = null;
      const fileInput = document.getElementById('gasto_evidencia_solicitud');
      if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const fileName = `${codigoUnico}_${Date.now()}_${file.name}`;
        
        const { data: uploadData, error: uploadError } = await db.storage
          .from('gastos_evidencia')
          .upload(fileName, file);
          
        if (uploadError) throw uploadError;
        
        // Obtener URL pública
        const { data: { publicUrl } } = db.storage
          .from('gastos_evidencia')
          .getPublicUrl(fileName);
          
        fileUrl = publicUrl;
      }

      // 3. Insertar en Base de Datos
      const newExpense = {
        codigo_unico: codigoUnico,
        solicitante_id: currentUser.id,
        nombre_completo: document.getElementById('solicitante_nombre').value,
        coordinacion: document.getElementById('solicitante_coordinacion').value,
        telefono: document.getElementById('solicitante_telefono').value,
        titulo: document.getElementById('gasto_titulo').value,
        descripcion: document.getElementById('gasto_descripcion').value,
        categoria: document.getElementById('gasto_categoria').value,
        modalidad: document.getElementById('gasto_modalidad').value,
        monto_estimado: parseFloat(document.getElementById('gasto_monto').value),
        prioridad: document.getElementById('gasto_prioridad').value,
        evidencia_solicitud: fileUrl,
        estado: 'Pendiente'
      };

      const { error } = await db.from('gastos').insert([newExpense]);
      if (error) throw error;

      // Éxito
      alert(`✅ Solicitud registrada con éxito.\nCódigo: ${codigoUnico}`);
      modalNew.classList.add('hidden');
      await fetchGastos(); // Recargar tabla
      
      // Enviar Notificación (Abre WhatsApp)
      openWhatsAppManual('NUEVO_GASTO', newExpense);

    } catch (error) {
      console.error('Error registrando gasto:', error);
      alert('Hubo un error al registrar el gasto. Revisa la consola para más detalles.');
    } finally {
      btnSubmit.textContent = originalText;
      btnSubmit.disabled = false;
    }
  }

  // Abrir Modal de Revisión
  function openReviewModal(id) {
    const g = allExpenses.find(x => x.id === id);
    if (!g) return;
    
    currentExpenseReview = g;

    // Llenar detalles
    document.getElementById('review-title').textContent = `Detalle de Gasto: ${g.codigo_unico}`;
    document.getElementById('detail-solicitante').textContent = g.nombre_completo;
    document.getElementById('detail-coordinacion').textContent = g.coordinacion;
    document.getElementById('detail-titulo').textContent = g.titulo;
    document.getElementById('detail-motivo').textContent = g.descripcion;
    document.getElementById('detail-categoria').textContent = g.categoria;
    document.getElementById('detail-modalidad').textContent = g.modalidad;
    document.getElementById('detail-monto').textContent = `₡${Number(g.monto_estimado).toLocaleString('es-CR')}`;
    document.getElementById('detail-prioridad').textContent = g.prioridad;
    
    const statusPill = document.getElementById('review-status');
    statusPill.textContent = g.estado;
    statusPill.className = `status-pill ${(g.estado || 'pendiente').toLowerCase().replace(' ', '-')}`;

    // Evidencia
    const evBox = document.getElementById('detail-evidencia-box');
    if (g.evidencia_solicitud) {
      evBox.style.display = 'block';
      document.getElementById('detail-evidencia-link').href = g.evidencia_solicitud;
    } else {
      evBox.style.display = 'none';
    }

    // Control de Paneles de Acción
    const adminPanel = document.getElementById('admin-actions-panel');
    const execPanel = document.getElementById('execution-actions-panel');
    
    adminPanel.classList.add('hidden');
    execPanel.classList.add('hidden');

    // Lógica de Permisos
    if (isAdmin) {
      adminPanel.classList.remove('hidden');
      document.getElementById('admin_update_status').value = g.estado;
    }

    // Si está Aprobado o En proceso, el solicitante (o admin) puede marcarlo como completado
    if ((g.estado === 'Aprobado' || g.estado === 'En proceso') && (isAdmin || g.solicitante_id === currentUser.id)) {
      execPanel.classList.remove('hidden');
    }

    modalReview.classList.remove('hidden');
  }

  // Administrador actualiza estado
  async function updateExpenseStatus() {
    if (!currentExpenseReview || !isAdmin) return;
    
    const btnSave = document.getElementById('btn-admin-save');
    btnSave.textContent = 'Guardando...';
    btnSave.disabled = true;

    const nuevoEstado = document.getElementById('admin_update_status').value;

    try {
      const { error } = await db.from('gastos')
        .update({ 
          estado: nuevoEstado,
          aprobado_por: currentUser.id,
          fecha_aprobacion: new Date().toISOString()
        })
        .eq('id', currentExpenseReview.id);

      if (error) throw error;
      
      alert(`Estado actualizado a: ${nuevoEstado}`);
      modalReview.classList.add('hidden');
      await fetchGastos();
      
      // Notificar si fue aprobado o rechazado (Abre WhatsApp)
      if (nuevoEstado === 'Aprobado' || nuevoEstado === 'Rechazado') {
        openWhatsAppManual('ESTADO_ACTUALIZADO', {
          codigo_unico: currentExpenseReview.codigo_unico,
          solicitante: currentExpenseReview.nombre_completo,
          telefono: currentExpenseReview.telefono,
          estado: nuevoEstado
        });
      }

    } catch (error) {
      console.error('Error actualizando estado:', error);
      alert('Error al actualizar el estado.');
    } finally {
      btnSave.textContent = 'Guardar Cambios';
      btnSave.disabled = false;
    }
  }

  // Cierre de gasto (Ejecución)
  async function closeExpenseExecution() {
    if (!currentExpenseReview) return;
    
    const btnSave = document.getElementById('btn-exec-save');
    btnSave.textContent = 'Procesando...';
    btnSave.disabled = true;

    try {
      const montoFinal = parseFloat(document.getElementById('exec_monto_final').value);
      const comentarios = document.getElementById('exec_comentarios').value;
      
      // La factura ahora se sube por Google Forms, por lo que no la procesamos aquí en Supabase Storage.
      // Puedes guardar el link del Google Form si quisieras, pero de momento solo actualizamos estado.

      // Actualizar Base de datos
      const { error } = await db.from('gastos')
        .update({ 
          estado: 'Completado',
          monto_final: montoFinal || currentExpenseReview.monto_estimado,
          comentarios_finales: comentarios,
          fecha_realizacion: new Date().toISOString()
        })
        .eq('id', currentExpenseReview.id);

      if (error) throw error;
      
      alert('Gasto marcado como COMPLETADO exitosamente.');
      modalReview.classList.add('hidden');
      await fetchGastos();
      
      // Ya no notificamos automáticamente aquí, pero se podría llamar a openWhatsAppManual si se deseara.

    } catch (error) {
      console.error('Error al cerrar gasto:', error);
      alert('Error al cerrar el gasto.');
    } finally {
      btnSave.textContent = 'Marcar como Completado';
      btnSave.disabled = false;
    }
  }
});
