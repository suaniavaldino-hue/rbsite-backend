import cors from "cors";
import express from "express";

process.on("uncaughtException", (error) => {
  console.error("UNCAUGHT_EXCEPTION", error);
});

process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED_REJECTION", reason);
});

const app = express();

app.disable("x-powered-by");
app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/", (_request, response) => {
  response.status(200).json({
    ok: true,
    service: "rbsite-backend",
    mode: "stable-mock",
  });
});

app.get("/health", (_request, response) => {
  response.status(200).json({
    ok: true,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.post("/gerar-post", (request, response) => {
  const tema = typeof request.body?.tema === "string" ? request.body.tema.trim() : "";

  if (!tema) {
    response.status(400).json({
      ok: false,
      message: "O campo 'tema' e obrigatorio.",
    });
    return;
  }

  response.status(200).json({
    ok: true,
    title: `Post sobre ${tema}`,
    content: `Conteudo gerado sobre ${tema}`,
  });
});

app.use((_request, response) => {
  response.status(404).json({
    ok: false,
    message: "Rota nao encontrada.",
  });
});

const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`RB Site backend listening on ${HOST}:${PORT}`);
});
