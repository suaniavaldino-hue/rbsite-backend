import express from "express";
import cors from "cors";

const app = express();

app.use(cors({
  origin: "*"
}));

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "API RB SITE ONLINE 🚀" });
});

app.post("/gerar-post", async (req, res) => {
  const { tema } = req.body;

  const title = `Seu ${tema} pode estar te fazendo perder clientes`;
  const content = `Muitas empresas não percebem, mas ${tema} mal estruturado afasta clientes todos os dias. Um site estratégico muda completamente o jogo.`;

  res.json({
    title,
    content
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Rodando...");
});
