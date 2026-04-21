import { Router } from "express";

import { env, isSupabaseConfigured } from "../config/env.js";

export const healthRouter = Router();

healthRouter.get("/", (_request, response) => {
  response.json({
    ok: true,
    service: "rbsite-backend",
    supabaseConfigured: isSupabaseConfigured(),
    supabaseKeyMode: env.supabaseKeyMode,
  });
});
