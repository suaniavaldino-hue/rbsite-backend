import { env, isSupabaseConfigured } from "../config/env.js";
import { HttpError } from "../lib/http-error.js";
import { getSupabaseClient } from "../lib/supabase.js";

function normalizeTheme(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\s+/g, " ").slice(0, 120);
}

function buildPostCopy(theme) {
  return {
    title: `Seu ${theme} pode estar te fazendo perder clientes`,
    content: `Muitas empresas nao percebem, mas ${theme} mal estruturado afasta clientes todos os dias. Um site estrategico muda completamente o jogo.`,
  };
}

export async function generateAndStorePost(payload) {
  if (!payload || typeof payload !== "object") {
    throw new HttpError(400, "O corpo da requisicao deve ser um objeto JSON.");
  }

  const theme = normalizeTheme(payload.tema);

  if (!theme) {
    throw new HttpError(400, "O campo 'tema' e obrigatorio.");
  }

  if (!isSupabaseConfigured()) {
    throw new HttpError(
      503,
      "Supabase nao configurado. Defina SUPABASE_URL e uma chave server-side ou publishable de compatibilidade.",
    );
  }

  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new HttpError(503, "Cliente Supabase indisponivel.");
  }

  const { title, content } = buildPostCopy(theme);

  const { data, error } = await supabase
    .from(env.supabaseContentsTable)
    .insert([
      {
        title,
        type: "post",
        content,
        status: "draft",
      },
    ])
    .select();

  if (error) {
    console.error("SUPABASE ERROR:", error);

    throw new HttpError(500, "Falha ao salvar conteudo no Supabase.", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
  }

  return {
    saved: true,
    title,
    content,
    data,
  };
}
