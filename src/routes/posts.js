import { Router } from "express";

import { HttpError } from "../lib/http-error.js";
import { generateAndStorePost } from "../services/posts.js";

export const postsRouter = Router();

postsRouter.post("/gerar-post", async (request, response) => {
  try {
    const result = await generateAndStorePost(request.body);

    response.json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      response.status(error.status).json({
        error: true,
        message: error.message,
        details: error.details,
      });
      return;
    }

    console.error("SERVER ERROR:", error);

    response.status(500).json({
      error: true,
      message: "Erro interno do servidor.",
    });
  }
});
