import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

app.get("/", (req, res) => {
  res.json({ status: "API RB SITE ONLINE 🚀" });
});

app.post("/gerar-post", async (req, res) => {
  try {
    const { tema } = req.body;

    if (!tema) {
      return res.status(400).json({
        error: true,
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
        error: true,
        message: error.message,
        details: error
      });
    }

    return res.json({
      saved: true,
      title,
      content,
      data
    });
  } catch (err) {
    console.error("SERVER ERROR:", err);
    return res.status(500).json({
      error: true,
      message: err.message
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Rodando na porta ${PORT}`);
});
