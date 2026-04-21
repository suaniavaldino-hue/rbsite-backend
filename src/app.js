import cors from "cors";
import express from "express";

import { env } from "./config/env.js";
import { healthRouter } from "./routes/health.js";
import { postsRouter } from "./routes/posts.js";

function buildCorsOptions() {
  if (env.corsOrigin === "*") {
    return { origin: true };
  }

  const allowedOrigins = env.corsOrigin.split(",").map((origin) => origin.trim());

  return {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin not allowed by CORS."));
    },
  };
}

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(cors(buildCorsOptions()));
  app.use(express.json({ limit: "1mb" }));

  app.get("/", (_request, response) => {
    response.json({
      status: "API RB SITE ONLINE",
      service: "rbsite-backend",
    });
  });

  app.use("/health", healthRouter);
  app.use("/", postsRouter);
  app.use((_request, response) => {
    response.status(404).json({
      error: true,
      message: "Rota nao encontrada.",
    });
  });

  app.use((error, _request, response, _next) => {
    if (error instanceof SyntaxError && "body" in error) {
      response.status(400).json({
        error: true,
        message: "JSON invalido no corpo da requisicao.",
      });
      return;
    }

    console.error("UNHANDLED ERROR:", error);

    response.status(500).json({
      error: true,
      message: "Erro interno do servidor.",
    });
  });

  return app;
}
