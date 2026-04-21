function readEnv(name, fallback = "") {
  const value = process.env[name];

  if (typeof value !== "string") {
    return fallback;
  }

  return value.trim();
}

function readPort() {
  const rawPort = Number(readEnv("PORT", "3000"));

  if (!Number.isFinite(rawPort) || rawPort <= 0) {
    return 3000;
  }

  return rawPort;
}

function resolveSupabaseKey() {
  return (
    readEnv("SUPABASE_SERVICE_ROLE_KEY") ||
    readEnv("SUPABASE_SECRET_KEY") ||
    readEnv("SUPABASE_ANON_KEY")
  );
}

function resolveSupabaseKeyMode() {
  if (readEnv("SUPABASE_SERVICE_ROLE_KEY")) {
    return "service_role";
  }

  if (readEnv("SUPABASE_SECRET_KEY")) {
    return "secret";
  }

  if (readEnv("SUPABASE_ANON_KEY")) {
    return "publishable";
  }

  return "missing";
}

export const env = {
  port: readPort(),
  corsOrigin: readEnv("CORS_ORIGIN", "*"),
  supabaseUrl: readEnv("SUPABASE_URL"),
  supabaseServerKey: resolveSupabaseKey(),
  supabaseKeyMode: resolveSupabaseKeyMode(),
  supabaseContentsTable: readEnv("SUPABASE_CONTENTS_TABLE", "contents"),
};

export function isSupabaseConfigured() {
  return Boolean(env.supabaseUrl && env.supabaseServerKey);
}
