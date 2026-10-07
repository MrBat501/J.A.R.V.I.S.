# Friday — Fase 1: esqueleto de la app

Esta es la primera fase de tu asistente personal: la estructura visual y de
navegación. Todavía no está conectada a una base de datos real (eso es la
Fase 4) ni a una IA (Fase 5) — por ahora usa datos de ejemplo guardados en el
propio código, para que puedas ver y tocar la interfaz completa.

## Qué incluye esta fase

- Pantalla **Tareas**: lista con categorías (escolar/personal), filtros y
  casillas para marcar como completada.
- Pantalla **Contactos**: lista de conocidos con buscador.
- Pantalla **Friday**: vista previa de cómo se verá el chat del asistente
  (todavía no responde de verdad).
- **Dial diario**: el círculo de latón en la parte superior muestra el % de
  tareas completadas hoy, y se actualiza en vivo cuando marcas una tarea.
- Diseño "instalable": si abres la página desde el celular y usas
  "Agregar a pantalla de inicio", se comporta como una app.

## Cómo subir esto a Vercel (gratis, sin instalar nada)

1. Ve a **https://vercel.com** y crea una cuenta gratuita (puedes usar tu
   correo o GitHub).
2. Una vez dentro, busca el botón **"Add New..." → "Project"**.
3. Verás una opción para **subir una carpeta o arrastrar archivos**
   ("Deploy" sin repositorio / drag and drop). Si no la ves directamente,
   busca la opción de **importar sin Git** — Vercel la ofrece en el flujo de
   creación de proyecto.
4. Descomprime el archivo `friday-app.zip` que te compartí y arrastra la
   **carpeta completa** (no el zip) al área de subida.
5. Déjalo todo con la configuración por defecto (no necesita "build
   command", es HTML puro) y dale a **Deploy**.
6. En menos de un minuto te dará un link tipo `friday-app.vercel.app` — esa
   es tu app, ya en internet y gratis.

> Alternativa igual de válida: crear una cuenta en GitHub, subir esta
> carpeta como un repositorio nuevo, y conectar ese repositorio desde
> Vercel. Es un paso extra pero facilita subir actualizaciones más adelante
> (te ayudo con eso cuando lleguemos ahí).

## Fase 4: guardar los datos de verdad (en el navegador)

Hasta la Fase 3, todo lo que creabas se perdía al recargar la página.
Desde esta fase, la app guarda tus tareas y contactos directamente en el
navegador donde la uses (se llama `localStorage`) — no necesitas crear
ninguna cuenta ni copiar ninguna clave, funciona automáticamente.

**Importante — entiende esta limitación:** los datos quedan guardados
**solo en ese navegador y dispositivo específico**. Si abres la app desde
el navegador de tu celular y luego la abres desde una computadora (o desde
otro navegador del mismo celular, como Chrome vs. la app de Samsung),
verás la app vacía otra vez — no hay sincronización entre ellos. Además,
si algún día borras los datos de navegación / caché de ese navegador,
perderás lo guardado.

Si en el futuro quieres que tus datos te acompañen entre varios
dispositivos (por ejemplo, celular y computadora), lo ideal sería
conectar una base de datos en la nube (como Supabase) — lo dejamos anotado
como posible mejora más adelante, tú decides si llegar a eso.

No hay ningún paso extra que hacer para esta fase: solo sube la carpeta a
Vercel como siempre y ya guardará todo automáticamente.

## Fase 5: Friday con IA real (Gemini, gratis)

Ahora la pestaña "Friday" es un chat de verdad, conectado a la API gratuita
de **Google Gemini**, y puede ver tus tareas y contactos actuales para
responder con contexto. Necesitas dos cosas:

### 1. Consigue tu clave gratuita de Gemini

1. Ve a **https://aistudio.google.com/apikey** (inicia sesión con una
   cuenta de Google).
2. Dale a **"Create API key"** (o "Crear clave de API").
3. Copia la clave que te genera — es un texto largo de letras y números.
   No necesitas tarjeta de crédito para esto; el nivel gratuito de Gemini
   alcanza de sobra para uso personal diario.

### 2. Configúrala en Vercel (sin tocar el código)

1. Entra a tu proyecto en **vercel.com** → pestaña **"Settings"** →
   **"Environment Variables"**.
2. Agrega una nueva variable:
   - **Name**: `GEMINI_API_KEY`
   - **Value**: pega tu clave copiada
3. Guarda, y vuelve a desplegar (sube este mismo zip de nuevo, o si ya
   conectaste el proyecto, dale a "Redeploy" desde el dashboard).

> Esta clave nunca queda visible en el código ni en el navegador — vive
> solo en el servidor de Vercel, así que es seguro.

### 3. Prueba a Friday

Ve a la pestaña "Friday" y pregúntale algo como "¿qué tengo pendiente
hoy?" o "¿cuál es el correo de Marco?". Si ves un mensaje de error con
un ⚠, revisa que copiaste bien la clave y que la variable se llama
exactamente `GEMINI_API_KEY`.

## Aviso diario de tareas pendientes (notificación push a las 6 am)

La app ahora puede mandarte una notificación push a tu teléfono todos los
días con las tareas que no tengan palomita — igual que una app normal,
aunque la tengas cerrada. Hay que configurarlo una sola vez.

### 1. Crea la tabla en Supabase

**SQL Editor** de tu proyecto de Supabase → pega y ejecuta:

```sql
create table if not exists push_subscriptions (
  id bigint generated by default as identity primary key,
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

create policy "anon puede insertar/actualizar su suscripción"
  on push_subscriptions for insert to anon with check (true);

create policy "anon puede ver suscripciones"
  on push_subscriptions for select to anon using (true);

create policy "anon puede borrar su suscripción"
  on push_subscriptions for delete to anon using (true);

create policy "anon puede reemplazar su suscripción (upsert)"
  on push_subscriptions for update to anon using (true) with check (true);
```

### 2. Agrega dos variables de entorno en Vercel

**Project Settings → Environment Variables** y agrega:

| Nombre | Valor |
|---|---|
| `VAPID_PRIVATE_KEY` | `v65Uz2vDaRTBwMDEBxU2TwlfD0vzO_Ywgsz1vaOTnyo` |
| `CRON_SECRET` | cualquier palabra larga que inventes, por ejemplo `friday-6am-xyz123` |

La clave `VAPID_PRIVATE_KEY` es secreta — por eso va en Vercel y no en el
código. Su pareja pública (`VAPID_PUBLIC_KEY`) ya está en `config.js`, esa sí
puede estar a la vista. `CRON_SECRET` evita que cualquiera en internet pueda
disparar el envío de notificaciones a mano; después de agregarla, vuelve a
desplegar el proyecto (Redeploy) para que tome los cambios.

### 3. Activa el aviso dentro de la app

Abre la app en tu celular (debe estar **instalada** — "Agregar a pantalla de
inicio") y toca la campana 🔔 que aparece junto al dial del encabezado. Te
va a pedir permiso de notificaciones — acéptalo. La campana se pone amarilla
cuando el aviso está activo; tócala de nuevo para desactivarlo.

- **iPhone:** necesitas iOS 16.4 o más reciente, y la app tiene que estar
  agregada a la pantalla de inicio (no sirve desde Safari directo).
- **Android:** funciona directo desde Chrome, instalada o no, aunque lo
  ideal es que esté instalada.

### Cómo funciona por dentro

Un Cron Job de Vercel (`vercel.json`) llama todos los días a
`/api/send-task-reminders`, que revisa en Supabase qué tareas siguen sin
palomita (sin importar la fecha) y le manda una notificación a cada
dispositivo que activó la campana. Si no hay ninguna tarea pendiente, ese
día no se manda nada.

**Importante sobre el horario:** el plan gratuito de Vercel no permite fijar
un minuto exacto para el Cron Job — solo garantiza que se ejecute *en algún
momento dentro de la hora* programada. Está configurado para la hora 11:00
UTC, que equivale a las 5:00 am en Querétaro (zona Centro de México, sin
horario de verano), así que el aviso puede llegar en cualquier momento
entre las 5:00 y las 5:59 am. Si alguna vez te mudas de huso horario o
quieres otra hora, cambia el `"schedule"` en `vercel.json` (usa hora UTC) y
vuelve a desplegar.

Para probarlo sin esperar al día siguiente, visita en el navegador:
`https://tu-app.vercel.app/api/send-task-reminders?secret=CRON_SECRET`
(cambia `CRON_SECRET` por el valor que pusiste en el paso 2). Deberías ver
un JSON con `"ok": true` y, si tenías tareas pendientes y la campana
activada, te llegará la notificación al momento.

## Próximas fases

2. Tareas: fechas reales, edición, prioridades.
3. Contactos: fichas completas con notas y etiquetas.
4. Base de datos real (Supabase) — lo que hagas se guardará de verdad.
5. Friday con IA real, conectada a tus datos.
6. Comandos de voz.
7. Empaquetado final.
