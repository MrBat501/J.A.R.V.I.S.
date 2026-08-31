// Función serverless de Vercel. Se ejecuta en el servidor, nunca en el
// navegador del usuario — por eso aquí es seguro usar la clave de API.
// Vercel la publica automáticamente en /api/friday sin configuración extra.

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error:
        "Falta configurar GEMINI_API_KEY en las variables de entorno de Vercel.",
    });
    return;
  }

  const { message, history, tasks, contacts } = req.body || {};

  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "Falta el mensaje." });
    return;
  }

  const systemContext =
    "Eres 'Friday', el asistente personal dentro de una app de bitácora " +
    "para el Jefe. Responde siempre en español, de forma breve, cálida y " +
    "directa. Puedes ver sus tareas y contactos actuales en formato JSON " +
    "más abajo — úsalos para responder preguntas sobre pendientes, fechas, " +
    "prioridades o datos de contactos. No inventes tareas ni contactos que " +
    "no estén en estos datos.\n\n" +
    "TAREAS (JSON): " + JSON.stringify(tasks || []) + "\n\n" +
    "CONTACTOS (JSON): " + JSON.stringify(contacts || []);

  const contents = [
    { role: "user", parts: [{ text: systemContext }] },
    { role: "model", parts: [{ text: "Entendido, Jefe. Ya tengo tu bitácora a la vista." }] },
    ...((history || []).map((h) => ({
      role: h.role === "friday" ? "model" : "user",
      parts: [{ text: h.text }],
    }))),
    { role: "user", parts: [{ text: message }] },
  ];

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      res.status(response.status).json({
        error: (data && data.error && data.error.message) || "Error al conectar con Gemini.",
      });
      return;
    }

    const text =
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts[0] &&
      data.candidates[0].content.parts[0].text;

    res.status(200).json({ text: text || "No obtuve una respuesta clara. Intenta de nuevo." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
