// ============================================================
// ToB Operations Center — auth.js
// Manejo de sesión y protección de rutas
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  const db = window._supabaseClient;
  if (!db) {
    console.error('Supabase no está inicializado.');
    return;
  }

  const isLoginPage = window.location.pathname.endsWith('login.html');

  try {
    // Comprobar la sesión actual
    const { data: { session }, error } = await db.auth.getSession();

    if (error || !session) {
      // Si NO hay sesión y NO estamos en login.html, redirigimos
      if (!isLoginPage) {
        window.location.replace('login.html');
      }
    } else {
      // Si HAY sesión y estamos en login.html, redirigimos al dashboard
      if (isLoginPage) {
        window.location.replace('index.html');
      } else {
        // Inyectar botón de Cerrar Sesión en el KPI Bar si existe y no estamos en login
        injectLogoutButton();
      }
    }

    // Escuchar cambios de sesión (ej. si expira la sesión o hace logout en otra pestaña)
    db.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        window.location.replace('login.html');
      } else if (event === 'SIGNED_IN' && isLoginPage) {
        window.location.replace('index.html');
      }
    });

  } catch (err) {
    console.error('Error verificando sesión:', err);
    if (!isLoginPage) window.location.replace('login.html');
  }
});

// Función global para cerrar sesión
window.logout = async () => {
  const db = window._supabaseClient;
  if (db) {
    // Cambiar texto de botón para feedback
    const btn = document.getElementById('btn-logout');
    if (btn) btn.innerHTML = '<span class="loading-spinner" style="width:14px;height:14px;border-width:2px;"></span> Saliendo...';
    
    await db.auth.signOut();
  }
};

// Inyectar botón de logout dinámicamente en el header
function injectLogoutButton() {
  const logoWrap = document.querySelector('.kpi-bar__logo');
  if (!logoWrap || document.getElementById('btn-logout')) return;

  const logoutBtn = document.createElement('button');
  logoutBtn.id = 'btn-logout';
  logoutBtn.className = 'btn-logout';
  logoutBtn.innerHTML = 'Salir <span aria-hidden="true">🚪</span>';
  logoutBtn.title = 'Cerrar sesión segura';
  logoutBtn.onclick = window.logout;
  
  // Estilos inline básicos para que no requiera un css nuevo en todas las páginas, 
  // aunque se pueden mover a global.css
  logoutBtn.style.cssText = `
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: var(--text-secondary);
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    margin-left: 16px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s ease;
    font-family: 'Inter', sans-serif;
  `;
  
  logoutBtn.onmouseenter = () => {
    logoutBtn.style.background = 'rgba(255, 69, 58, 0.15)';
    logoutBtn.style.borderColor = 'rgba(255, 69, 58, 0.3)';
    logoutBtn.style.color = '#ff453a';
  };
  logoutBtn.onmouseleave = () => {
    logoutBtn.style.background = 'rgba(255, 255, 255, 0.05)';
    logoutBtn.style.borderColor = 'rgba(255, 255, 255, 0.1)';
    logoutBtn.style.color = 'var(--text-secondary)';
  };

  logoWrap.appendChild(logoutBtn);
}
