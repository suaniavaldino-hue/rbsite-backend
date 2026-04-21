import cors from "cors";
import express from "express";
import { createClient } from "@supabase/supabase-js";

process.on("uncaughtException", (error) => {
  console.error("UNCAUGHT_EXCEPTION", error);
});

process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED_REJECTION", reason);
});

const app = express();

const env = {
  port: Number(process.env.PORT) || 3000,
  supabaseUrl: typeof process.env.SUPABASE_URL === "string" ? process.env.SUPABASE_URL.trim() : "",
  supabaseKey:
    typeof process.env.SUPABASE_SERVICE_ROLE_KEY === "string" && process.env.SUPABASE_SERVICE_ROLE_KEY.trim()
      ? process.env.SUPABASE_SERVICE_ROLE_KEY.trim()
      : typeof process.env.SUPABASE_ANON_KEY === "string"
        ? process.env.SUPABASE_ANON_KEY.trim()
        : "",
  supabaseTable:
    typeof process.env.SUPABASE_CONTENTS_TABLE === "string" && process.env.SUPABASE_CONTENTS_TABLE.trim()
      ? process.env.SUPABASE_CONTENTS_TABLE.trim()
      : "contents",
};

const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseKey);

const supabase = isSupabaseConfigured
  ? createClient(env.supabaseUrl, env.supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

function normalizeTheme(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\s+/g, " ").slice(0, 120);
}

function buildPostCopy(theme) {
  return {
    title: `Post sobre ${theme}`,
    content: `Conteudo gerado sobre ${theme}`,
  };
}

app.disable("x-powered-by");
app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/", (_request, response) => {
  response.status(200).json({
    ok: true,
    service: "rbsite-backend",
    mode: "supabase-connected",
  });
});

app.get("/health", (_request, response) => {
  response.status(200).json({
    ok: true,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    supabaseConfigured: isSupabaseConfigured,
    table: env.supabaseTable,
  });
});

app.post("/gerar-post", async (request, response) => {
  try {
    const tema = normalizeTheme(request.body?.tema);

    if (!tema) {
      response.status(400).json({
        ok: false,
        message: "O campo 'tema' e obrigatorio.",
      });
      return;
    }

    if (!supabase) {
      response.status(503).json({
        ok: false,
        message: "Supabase nao configurado no Railway.",
      });
      return;
    }

    const { title, content } = buildPostCopy(tema);

    const { data, error } = await supabase
      .from(env.supabaseTable)
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
      console.error("SUPABASE_INSERT_ERROR", error);

      response.status(500).json({
        ok: false,
        message: "Falha ao salvar no Supabase.",
        details: error.message,
      });
      return;
    }

    response.status(200).json({
      ok: true,
      saved: true,
      title,
      content,
      data,
    });
  } catch (error) {
    console.error("POST_ROUTE_ERROR", error);

    response.status(500).json({
      ok: false,
      message: "Erro interno do servidor.",
    });
  }
});

app.use((_request, response) => {
  response.status(404).json({
    ok: false,
    message: "Rota nao encontrada.",
  });
});

const HOST = "0.0.0.0";

app.listen(env.port, HOST, () => {
  console.log(`RB Site backend listening on ${HOST}:${env.port}`);
  console.log(`Supabase configured: ${isSupabaseConfigured}`);
});
