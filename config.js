// ===== CONFIGURACIÓN DE SUPABASE =====
// Pega aquí los dos datos de TU proyecto de Supabase.
// Los encuentras en: Project Settings → Data API
//   - "Project URL"      -> SUPABASE_URL
//   - "anon public" key  -> SUPABASE_ANON_KEY

const SUPABASE_URL = "https://zywnqpouolnyurndhvus.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_PhxTmKC6SatUBQ5of_U4vg_VWfnyxOG";

// ===== NOTIFICACIONES PUSH (aviso diario de tareas a las 6 am) =====
// Clave pública VAPID. No es secreta, puede ir en el código del navegador.
// La clave PRIVADA correspondiente se configura solo en Vercel (variable
// de entorno VAPID_PRIVATE_KEY), nunca aquí. Ver LEEME.md para los pasos.
const VAPID_PUBLIC_KEY = "BLCqG7hCcG0PNr4h2VISNbShtPaj2Z4pVln2GVDPeuVk2F3KRZsuol5ZvBSK-SaxvdexCOhii0uMbOWmZLwI37Y";
