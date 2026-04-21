import crypto from "node:crypto";

import cors from "cors";
import express from "express";
import QRCode from "qrcode";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

process.on("uncaughtException", (error) => {
  console.error("UNCAUGHT_EXCEPTION", error);
});

process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED_REJECTION", reason);
});

const app = express();
const SUBSCRIPTION_TYPE = "push_subscription";

const env = {
  port: Number(process.env.PORT) || 3000,
  panelBaseUrl:
    typeof process.env.PANEL_BASE_URL === "string" && process.env.PANEL_BASE_URL.trim()
      ? process.env.PANEL_BASE_URL.trim().replace(/\/$/, "")
      : "https://painel.rbsite.com.br",
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
  vapidPublicKey:
    typeof process.env.WEB_PUSH_VAPID_PUBLIC_KEY === "string"
      ? process.env.WEB_PUSH_VAPID_PUBLIC_KEY.trim()
      : "",
  vapidPrivateKey:
    typeof process.env.WEB_PUSH_VAPID_PRIVATE_KEY === "string"
      ? process.env.WEB_PUSH_VAPID_PRIVATE_KEY.trim()
      : "",
  vapidSubject:
    typeof process.env.WEB_PUSH_VAPID_SUBJECT === "string"
      ? process.env.WEB_PUSH_VAPID_SUBJECT.trim()
      : "mailto:contato@rbsite.com.br",
  pairingSecret:
    typeof process.env.MOBILE_PAIRING_SECRET === "string"
      ? process.env.MOBILE_PAIRING_SECRET.trim()
      : "",
};

const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseKey);
const isPushConfigured = Boolean(env.vapidPublicKey && env.vapidPrivateKey && env.vapidSubject);
const isPairingConfigured = Boolean(env.pairingSecret);

const supabase = isSupabaseConfigured
  ? createClient(env.supabaseUrl, env.supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

if (isPushConfigured) {
  webpush.setVapidDetails(env.vapidSubject, env.vapidPublicKey, env.vapidPrivateKey);
}

function normalizeTheme(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\s+/g, " ").slice(0, 120);
}

function normalizeFilter(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 40);
}

function normalizeLimit(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 20;
  }

  return Math.min(parsed, 100);
}

function sanitizeSearch(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .replace(/[,%]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

function normalizeLabel(value) {
  if (typeof value !== "string") {
    return "Android RB Site";
  }

  return value.trim().replace(/\s+/g, " ").slice(0, 80) || "Android RB Site";
}

function normalizePreferences(value) {
  return {
    posts: value?.posts !== false,
    agenda: value?.agenda !== false,
    system: value?.system !== false,
  };
}

function buildPostCopy(theme) {
  return {
    title: `Post sobre ${theme}`,
    content: `Conteudo gerado sobre ${theme}`,
  };
}

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8");
}

function signPairingPayload(encodedPayload) {
  return crypto
    .createHmac("sha256", env.pairingSecret)
    .update(encodedPayload)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function createPairingToken() {
  const expiresAt = Date.now() + 10 * 60 * 1000;
  const payload = {
    nonce: crypto.randomBytes(16).toString("hex"),
    exp: Math.floor(expiresAt / 1000),
    scope: "mobile_pairing",
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signPairingPayload(encodedPayload);

  return {
    token: `${encodedPayload}.${signature}`,
    expiresAt: new Date(expiresAt).toISOString(),
  };
}

function verifyPairingToken(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signPairingPayload(encodedPayload);
  const expectedBuffer = Buffer.from(expectedSignature);
  const receivedBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== receivedBuffer.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(expectedBuffer, receivedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));

    if (!payload?.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    if (payload.scope !== "mobile_pairing") {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function validateSubscription(subscription) {
  if (!subscription || typeof subscription !== "object") {
    return false;
  }

  if (typeof subscription.endpoint !== "string" || !subscription.endpoint.startsWith("https://")) {
    return false;
  }

  if (!subscription.keys || typeof subscription.keys !== "object") {
    return false;
  }

  return typeof subscription.keys.p256dh === "string" && typeof subscription.keys.auth === "string";
}

function parseSubscriptionRow(row) {
  try {
    const parsed = JSON.parse(row.content || "{}");

    if (!validateSubscription(parsed.subscription)) {
      return null;
    }

    return {
      id: row.id,
      title: row.title,
      status: row.status,
      created_at: row.created_at,
      endpoint: parsed.subscription.endpoint,
      subscription: parsed.subscription,
      platform: parsed.platform || "android",
      label: parsed.label || row.title,
      userAgent: parsed.userAgent || "",
      preferences: normalizePreferences(parsed.preferences),
      pairedAt: parsed.pairedAt || row.created_at || null,
      lastSeenAt: parsed.lastSeenAt || null,
    };
  } catch {
    return null;
  }
}

async function listSubscriptionRows(includeInactive = false) {
  if (!supabase) {
    return [];
  }

  let query = supabase
    .from(env.supabaseTable)
    .select("id, title, type, content, status, created_at")
    .eq("type", SUBSCRIPTION_TYPE)
    .limit(200)
    .order("created_at", { ascending: false, nullsFirst: false });

  if (!includeInactive) {
    query = query.eq("status", "active");
  }

  const { data, error } = await query;

  if (error) {
    console.error("LIST_SUBSCRIPTIONS_ERROR", error);
    return [];
  }

  return (Array.isArray(data) ? data : []).map(parseSubscriptionRow).filter(Boolean);
}

async function upsertSubscriptionRecord({ label, subscription, preferences, platform, userAgent }) {
  const existingSubscriptions = await listSubscriptionRows(true);
  const existing = existingSubscriptions.find((item) => item.endpoint === subscription.endpoint);
  const now = new Date().toISOString();
  const recordContent = JSON.stringify({
    subscription,
    preferences: normalizePreferences(preferences),
    platform: platform || "android",
    label,
    userAgent: typeof userAgent === "string" ? userAgent.slice(0, 240) : "",
    pairedAt: existing?.pairedAt || now,
    lastSeenAt: now,
  });

  if (existing) {
    const { data, error } = await supabase
      .from(env.supabaseTable)
      .update({
        title: label,
        content: recordContent,
        status: "active",
      })
      .eq("id", existing.id)
      .select("id, title, type, content, status, created_at");

    if (error) {
      throw error;
    }

    return parseSubscriptionRow(Array.isArray(data) ? data[0] : null);
  }

  const { data, error } = await supabase
    .from(env.supabaseTable)
    .insert([
      {
        title: label,
        type: SUBSCRIPTION_TYPE,
        content: recordContent,
        status: "active",
        created_at: now,
      },
    ])
    .select("id, title, type, content, status, created_at");

  if (error) {
    throw error;
  }

  return parseSubscriptionRow(Array.isArray(data) ? data[0] : null);
}

async function markSubscriptionInactive(id) {
  if (!supabase || !id) {
    return;
  }

  const { error } = await supabase
    .from(env.supabaseTable)
    .update({ status: "inactive" })
    .eq("id", id);

  if (error) {
    console.error("MARK_INACTIVE_ERROR", error);
  }
}

async function sendWelcomeNotification(subscription) {
  if (!isPushConfigured) {
    return;
  }

  const payload = JSON.stringify({
    title: "RB Site conectado no celular",
    body: "Seu Android agora esta pronto para receber alertas de posts, agenda e eventos do painel.",
    tag: "rbsite-mobile-welcome",
    url: `${env.panelBaseUrl}/dashboard.html`,
    kind: "system",
  });

  await webpush.sendNotification(subscription, payload);
}

async function notifySubscribers(kind, { title, body, url }) {
  if (!supabase || !isPushConfigured) {
    return {
      enabled: false,
      delivered: 0,
      failed: 0,
      inactive: 0,
    };
  }

  const subscriptions = await listSubscriptionRows(false);
  const activeTargets = subscriptions.filter((item) => item.preferences?.[kind] !== false);

  let delivered = 0;
  let failed = 0;
  let inactive = 0;

  for (const target of activeTargets) {
    try {
      const payload = JSON.stringify({
        title,
        body,
        tag: `rbsite-${kind}`,
        url,
        kind,
      });

      await webpush.sendNotification(target.subscription, payload);
      delivered += 1;
    } catch (error) {
      failed += 1;
      console.error("PUSH_SEND_ERROR", error?.statusCode || error?.message || error);

      if (error?.statusCode === 404 || error?.statusCode === 410) {
        inactive += 1;
        await markSubscriptionInactive(target.id);
      }
    }
  }

  return {
    enabled: true,
    delivered,
    failed,
    inactive,
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
    pushConfigured: isPushConfigured,
    pairingConfigured: isPairingConfigured,
    table: env.supabaseTable,
  });
});

app.get("/notifications/config", (_request, response) => {
  response.status(200).json({
    ok: true,
    panelBaseUrl: env.panelBaseUrl,
    pushAvailable: isPushConfigured,
    pairingAvailable: isPushConfigured && isPairingConfigured,
    publicKey: isPushConfigured ? env.vapidPublicKey : null,
  });
});

app.get("/mobile/devices", async (_request, response) => {
  try {
    if (!supabase) {
      response.status(503).json({ ok: false, message: "Supabase nao configurado no Railway." });
      return;
    }

    const items = await listSubscriptionRows(false);

    response.status(200).json({
      ok: true,
      items: items.map((item) => ({
        id: item.id,
        label: item.label,
        platform: item.platform,
        status: item.status,
        pairedAt: item.pairedAt,
        lastSeenAt: item.lastSeenAt,
        preferences: item.preferences,
      })),
    });
  } catch (error) {
    console.error("LIST_DEVICES_ERROR", error);
    response.status(500).json({ ok: false, message: "Erro ao listar dispositivos." });
  }
});

app.post("/mobile/pairing/start", async (_request, response) => {
  try {
    if (!isPushConfigured || !isPairingConfigured) {
      response.status(503).json({
        ok: false,
        message: "Pareamento mobile indisponivel. Configure VAPID e MOBILE_PAIRING_SECRET no Railway.",
      });
      return;
    }

    const { token, expiresAt } = createPairingToken();
    const pairingUrl = `${env.panelBaseUrl}/mobile-link.html?token=${encodeURIComponent(token)}`;
    const qrSvg = await QRCode.toString(pairingUrl, {
      type: "svg",
      width: 256,
      margin: 1,
      color: {
        dark: "#081726",
        light: "#0000",
      },
    });

    response.status(200).json({
      ok: true,
      expiresAt,
      pairingUrl,
      qrSvg,
    });
  } catch (error) {
    console.error("PAIRING_START_ERROR", error);
    response.status(500).json({ ok: false, message: "Falha ao gerar QR Code de pareamento." });
  }
});

app.post("/mobile/pairing/complete", async (request, response) => {
  try {
    if (!supabase || !isPushConfigured || !isPairingConfigured) {
      response.status(503).json({
        ok: false,
        message: "Pareamento mobile indisponivel no Railway.",
      });
      return;
    }

    const token = typeof request.body?.token === "string" ? request.body.token.trim() : "";
    const subscription = request.body?.subscription;
    const label = normalizeLabel(request.body?.label);
    const preferences = normalizePreferences(request.body?.preferences);
    const platform = typeof request.body?.platform === "string" ? request.body.platform.slice(0, 30) : "android";
    const userAgent = typeof request.body?.userAgent === "string" ? request.body.userAgent : "";

    if (!verifyPairingToken(token)) {
      response.status(400).json({ ok: false, message: "Token de pareamento invalido ou expirado." });
      return;
    }

    if (!validateSubscription(subscription)) {
      response.status(400).json({ ok: false, message: "Subscription push invalida." });
      return;
    }

    const device = await upsertSubscriptionRecord({
      label,
      subscription,
      preferences,
      platform,
      userAgent,
    });

    try {
      await sendWelcomeNotification(subscription);
    } catch (error) {
      console.error("WELCOME_PUSH_ERROR", error?.statusCode || error?.message || error);
    }

    response.status(200).json({
      ok: true,
      paired: true,
      device: {
        id: device?.id || null,
        label,
        platform,
        preferences,
      },
    });
  } catch (error) {
    console.error("PAIRING_COMPLETE_ERROR", error);
    response.status(500).json({ ok: false, message: "Falha ao concluir pareamento mobile." });
  }
});

app.post("/notifications/test", async (request, response) => {
  try {
    const kind = ["posts", "agenda", "system"].includes(request.body?.kind) ? request.body.kind : "system";
    const title = typeof request.body?.title === "string" && request.body.title.trim()
      ? request.body.title.trim().slice(0, 80)
      : "Teste de notificacao RB Site";
    const body = typeof request.body?.body === "string" && request.body.body.trim()
      ? request.body.body.trim().slice(0, 180)
      : "Seu painel esta pronto para enviar alertas para o Android.";

    const result = await notifySubscribers(kind, {
      title,
      body,
      url: `${env.panelBaseUrl}/dashboard.html`,
    });

    response.status(200).json({ ok: true, result });
  } catch (error) {
    console.error("TEST_NOTIFICATION_ERROR", error);
    response.status(500).json({ ok: false, message: "Falha ao enviar notificacao de teste." });
  }
});

app.get("/posts", async (request, response) => {
  try {
    if (!supabase) {
      response.status(503).json({
        ok: false,
        message: "Supabase nao configurado no Railway.",
      });
      return;
    }

    const status = normalizeFilter(request.query.status);
    const type = normalizeFilter(request.query.type) || "post";
    const sort = request.query.sort === "oldest" ? "oldest" : "newest";
    const limit = normalizeLimit(request.query.limit);
    const search = sanitizeSearch(request.query.q);

    let query = supabase
      .from(env.supabaseTable)
      .select("id, title, type, content, status, created_at")
      .limit(limit)
      .order("created_at", { ascending: sort === "oldest", nullsFirst: sort === "oldest" });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (type && type !== "all") {
      query = query.eq("type", type);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("SUPABASE_LIST_ERROR", error);

      response.status(500).json({
        ok: false,
        message: "Falha ao buscar posts no Supabase.",
        details: error.message,
      });
      return;
    }

    response.status(200).json({
      ok: true,
      items: Array.isArray(data) ? data : [],
      filters: {
        status: status || "all",
        type,
        sort,
        q: search,
        limit,
      },
    });
  } catch (error) {
    console.error("LIST_ROUTE_ERROR", error);

    response.status(500).json({
      ok: false,
      message: "Erro interno do servidor.",
    });
  }
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
    const createdAt = new Date().toISOString();

    const { data, error } = await supabase
      .from(env.supabaseTable)
      .insert([
        {
          title,
          type: "post",
          content,
          status: "draft",
          created_at: createdAt,
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

    const notificationResult = await notifySubscribers("posts", {
      title: "Novo post criado no painel",
      body: title,
      url: `${env.panelBaseUrl}/dashboard.html`,
    });

    response.status(200).json({
      ok: true,
      saved: true,
      title,
      content,
      data,
      notifications: notificationResult,
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
  console.log(`Push configured: ${isPushConfigured}`);
  console.log(`Pairing configured: ${isPairingConfigured}`);
});
