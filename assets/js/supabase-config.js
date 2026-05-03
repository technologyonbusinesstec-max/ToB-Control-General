// ============================================================
// ToB Operations Center — supabase-config.js
// Configuración del cliente Supabase
// ⚠️ Completá SUPABASE_URL y SUPABASE_ANON_KEY con tus credenciales
//    las encontrás en: https://supabase.com → tu proyecto → Settings → API
// ============================================================

const SUPABASE_URL      = 'https://dgkyalpsqbhlogmvyjgr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_fF7JemUx9m5ZqVyFk9fqSA_gDiW6OGi';

// Inicializar cliente global (usa CDN cargado en el HTML)
window._supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
