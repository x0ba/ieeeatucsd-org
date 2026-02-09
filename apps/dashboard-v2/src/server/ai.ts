export function getOpenRouterConfig() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY");
  return {
    apiKey,
    model: process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001",
    baseUrl: "https://openrouter.ai/api/v1/chat/completions",
  };
}

export async function chatWithAI(params: {
  query: string;
  messages?: Array<{ role: string; content: string }>;
  systemPrompt?: string;
}) {
  const config = getOpenRouterConfig();

  const systemPrompt =
    params.systemPrompt ||
    `You are a helpful AI assistant for IEEE at UC San Diego officers.
You help with questions about events, reimbursements, members, and organization operations.
Be concise and helpful. Current Date: ${new Date().toDateString()}`;

  const conversationMessages = [
    { role: "system", content: systemPrompt },
    ...(params.messages || [])
      .map((m) => ({ role: m.role, content: m.content }))
      .slice(-10),
    { role: "user", content: params.query },
  ];

  const response = await fetch(config.baseUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://ieeeatucsd.org",
    },
    body: JSON.stringify({
      model: config.model,
      messages: conversationMessages,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenRouter API Error:", errorText);
    throw new Error("AI Chat API Failed");
  }

  const data = await response.json();
  const reply = data.choices?.[0]?.message?.content;

  if (!reply) {
    throw new Error("No response from AI");
  }

  return { success: true, reply };
}
