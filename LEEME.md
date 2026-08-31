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

## Próximas fases

2. Tareas: fechas reales, edición, prioridades.
3. Contactos: fichas completas con notas y etiquetas.
4. Base de datos real (Supabase) — lo que hagas se guardará de verdad.
5. Friday con IA real, conectada a tus datos.
6. Comandos de voz.
7. Empaquetado final.
