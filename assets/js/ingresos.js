// ============================================================
// ToB Operations Center — ingresos.js
// Lógica para el Asistente de Registro de Patrocinio (Wizard)
// ============================================================

let currentWizardStep = 1;
const totalSteps = 5;

document.addEventListener('DOMContentLoaded', () => {
  // Configurar enlace de WhatsApp dinámico
  setupWhatsAppLink();
});

window.goToWizardStep = (step) => {
  if (step < 1 || step > totalSteps) return;
  
  // Ocultar paso actual
  const currentEl = document.getElementById(`wizard-step-${currentWizardStep}`);
  if (currentEl) {
    currentEl.classList.remove('active');
  }

  // Actualizar paso
  currentWizardStep = step;

  // Mostrar nuevo paso
  const newEl = document.getElementById(`wizard-step-${currentWizardStep}`);
  if (newEl) {
    newEl.classList.add('active');
  }

  updateWizardUI();
};

function updateWizardUI() {
  const progressBar = document.getElementById('wizard-progress-bar');
  if (progressBar) {
    // 20% base for step 1, up to 100% for step 5
    const percentage = (currentWizardStep / totalSteps) * 100;
    progressBar.style.width = `${percentage}%`;
  }
}

async function setupWhatsAppLink() {
  const btnWpp = document.getElementById('btn-whatsapp');
  if (!btnWpp) return;

  let userName = 'Un coordinador';
  try {
    // Intentar obtener el nombre/email del usuario actual de Supabase
    const db = window._supabaseClient;
    if (db) {
      const { data: { session } } = await db.auth.getSession();
      if (session && session.user && session.user.email) {
        // Usar la parte antes del @ como nombre
        const emailUser = session.user.email.split('@')[0];
        userName = emailUser.charAt(0).toUpperCase() + emailUser.slice(1);
      }
    }
  } catch (e) {
    console.warn('No se pudo obtener el usuario actual para WhatsApp', e);
  }

  const phone = '50661515240';
  const text = `Hola, soy ${userName}. Acabo de registrar un próximo patrocinador para el ToB. Te invito a que revises el Histórico de Patrocinadores para confirmar la solicitud.`;
  const encodedText = encodeURIComponent(text);
  
  btnWpp.href = `https://wa.me/${phone}?text=${encodedText}`;
}
