import { Router } from "express";
import { anthropic } from "@ai-sdk/anthropic";
import { streamText, generateText, convertToModelMessages, type UIMessage } from "ai";

export const aiRouter = Router();

const SYSTEM_PROMPT = `Você é o brAIn, um assistente especializado em PKM (Personal Knowledge Management) integrado ao Second Brain do usuário.

Seu papel é ajudar o usuário a:
- **Processar Fleeting Notes**: transformar ideias brutas em notas permanentes bem estruturadas
- **Conectar conhecimento**: identificar relações entre notas e sugerir conexões não óbvias
- **Escrever Permanent Notes**: redigir notas atômicas e autocontidas no estilo Zettelkasten
- **Organizar pelo PARA**: classificar informações em Projetos, Áreas, Recursos ou Arquivo
- **Sintetizar literatura**: extrair insights de livros, artigos e podcasts

Princípios que você segue:
- Notas devem ser **atômicas**: uma ideia por nota
- Notas permanentes são escritas **com suas próprias palavras**, não cópias
- Conexões entre notas são mais valiosas do que notas isoladas
- O objetivo final é gerar **conhecimento ativo**, não apenas armazenar informação
- Prefira profundidade a quantidade

Ao sugerir uma nota permanente, use este formato:
---
**Título**: (uma frase declarativa que resume a ideia)
**Conteúdo**: (a ideia em 2-5 parágrafos, suas próprias palavras)
**Conexões sugeridas**: (títulos de notas que poderiam se conectar)
**Tags**: (3-5 tags relevantes)
---

Responda sempre em português do Brasil, de forma direta e útil.`;

// ─── POST /ai/suggest-areas ────────────────────────────────────────────────────

aiRouter.post("/suggest-areas", async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: "ANTHROPIC_API_KEY not configured." });
  }

  const notes = (req.body.notes ?? []) as Array<{ title: string; type: string; tags: string[] }>;
  if (notes.length === 0) {
    return res.json({ suggestions: "No notes found yet. Create some notes first, then I can suggest areas for you!" });
  }

  const noteList = notes
    .map((n) => `- "${n.title}" [${n.type}]${n.tags.length ? ` #${n.tags.join(" #")}` : ""}`)
    .join("\n");

  try {
    const { text } = await generateText({
      model: anthropic("claude-haiku-4-5-20251001"),
      prompt: `You are a PKM assistant helping organize a Second Brain using the PARA method.

Here are the user's notes:
${noteList}

Suggest 3-6 PARA **Areas** that would meaningfully group this knowledge. An Area is an ongoing sphere of activity with a standard you want to maintain (e.g., "Artificial Intelligence", "Personal Finance", "Health & Fitness").

For each area:
1. Give a concise name (2-4 words, title case)
2. List which notes from above fit in it (use exact titles)
3. One sentence explaining why these notes belong together

Format as markdown with ## headers for each area. Focus on themes that genuinely emerge from the notes — don't force groupings. If notes don't cluster naturally, say so.`,
      maxOutputTokens: 1500,
    });
    return res.json({ suggestions: text });
  } catch (err) {
    console.error("[AI] suggest-areas error:", err);
    return res.status(500).json({ error: "Error generating area suggestions." });
  }
});

// ─── POST /ai/chat ────────────────────────────────────────────────────────────

aiRouter.post("/chat", async (req, res) => {
  const { messages, vaultContext } = req.body as {
    messages: UIMessage[];
    vaultContext?: {
      total: number;
      permanent: number;
      fleeting: number;
      pending: number;
      healthScore: number;
    };
  };

  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(503).json({
      error: "ANTHROPIC_API_KEY não configurada. Adicione a chave no arquivo .env do servidor.",
    });
    return;
  }

  const systemWithContext = vaultContext
    ? `${SYSTEM_PROMPT}\n\n## Contexto da Vault do usuário\n- Total de notas: ${vaultContext.total}\n- Permanent Notes: ${vaultContext.permanent}\n- Fleeting Notes pendentes: ${vaultContext.pending}\n- Saúde da vault: ${vaultContext.healthScore}%`
    : SYSTEM_PROMPT;

  try {
    const result = streamText({
      model: anthropic("claude-sonnet-4-6"),
      system: systemWithContext,
      messages: await convertToModelMessages(messages),
    });

    result.pipeUIMessageStreamToResponse(res);
  } catch (err) {
    console.error("[AI] streamText error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Erro ao processar resposta da IA." });
    }
  }
});
