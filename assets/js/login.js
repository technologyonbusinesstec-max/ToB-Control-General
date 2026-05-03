// ============================================================
// ToB Operations Center — login.js
// Manejo de la pantalla de inicio de sesión con Supabase Auth
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  const errorBox = document.getElementById('login-error');
  const btnLogin = document.getElementById('btn-login');
  const spinner = document.getElementById('login-spinner');
  
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Reset estado de error
    errorBox.style.display = 'none';
    errorBox.textContent = '';
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
      showError('Por favor, ingresa correo y contraseña.');
      return;
    }

    // UI Loading state
    btnLogin.disabled = true;
    spinner.style.display = 'inline-block';

    try {
      const db = window._supabaseClient;
      if (!db) throw new Error('Error interno: Cliente de base de datos no encontrado.');

      // Llamada a Supabase Auth
      const { data, error } = await db.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) {
        // Traducción de errores comunes
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Credenciales incorrectas. Verifica tu correo y contraseña.');
        } else if (error.message.includes('Email not confirmed')) {
          throw new Error('Debes confirmar tu correo electrónico.');
        } else {
          throw new Error(error.message);
        }
      }

      // auth.js detectará el SIGNED_IN o redirigimos manualmente
      window.location.replace('index.html');

    } catch (err) {
      showError(err.message);
      btnLogin.disabled = false;
      spinner.style.display = 'none';
      
      // Limpiar contraseña
      document.getElementById('password').value = '';
    }
  });

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.style.display = 'block';
  }
});
