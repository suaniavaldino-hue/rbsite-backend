import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ ok: true });
});

app.post("/gerar-post", (req, res) => {
  const { tema } = req.body;

  return res.json({
    ok: true,
    title: `Post sobre ${tema}`,
    content: `Conteúdo gerado sobre ${tema}`
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("rodando");
});
