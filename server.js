import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "API RB SITE ONLINE 🚀" });
});

app.post("/gerar-post", (req, res) => {
  const { tema } = req.body;

  res.json({
    title: `Post sobre ${tema}`,
    content: `Conteúdo gerado automaticamente sobre ${tema}`
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Rodando...");
});