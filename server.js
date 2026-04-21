import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

app.get("/", (req, res) => {
  return res.status(200).json({
    ok: true,
    message: "API RB SITE ONLINE"
  });
});

app.post("/gerar-post", async (req, res) => {
  try {
    const { tema } = req.body;

    if (!tema) {
      return res.status(400).json({
        ok: false,
        message: "O campo 'tema' é obrigatório."
      });
    }

    const title = `Seu ${tema} pode estar te fazendo perder clientes`;
    const content = `Muitas empresas não percebem, mas ${tema} mal estruturado afasta clientes todos os dias. Um site estratégico muda completamente o jogo.`;

    const { data, error } = await supabase
      .from("contents")
      .insert([
        {
          title,
          type: "post",
          content,
          status: "draft"
        }
      ])
      .select();

    if (error) {
      console.error("SUPABASE ERROR:", error);
      return res.status(500).json({
        ok: false,
        message: error.message
      });
    }

    return res.status(200).json({
      ok: true,
      title,
      content,
      saved: true,
      data
    });
  } catch (err) {
    console.error("SERVER ERROR:", err);
    return res.status(500).json({
      ok: false,
      message: err.message
    });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`Servidor rodando em ${HOST}:${PORT}`);
});
