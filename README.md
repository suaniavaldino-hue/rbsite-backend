# RB Site Backend

API Express simples para gerar e salvar posts da RB Site no Supabase.

## Melhorias aplicadas

- inicializacao estavel mesmo sem variaveis do Supabase
- uso de `SUPABASE_SERVICE_ROLE_KEY` no backend em vez de chave anonima
- CORS configuravel por ambiente
- validacao de payload em `/gerar-post`
- rota de saude em `/health`
- tratamento de erros consistente
- estrutura separada por `config`, `routes` e `services`

## Requisitos

- Node.js 20+
- projeto Supabase configurado

## Configuracao

1. Copie `.env.example` para seu ambiente.
2. Preencha:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` ou `SUPABASE_SECRET_KEY`
   - `SUPABASE_ANON_KEY` apenas como compatibilidade, se a tabela estiver protegida por policies adequadas
   - `SUPABASE_CONTENTS_TABLE` se a tabela tiver outro nome
3. Instale as dependencias:

```bash
npm install
```

## Executando

Desenvolvimento:

```bash
npm run dev
```

Producao:

```bash
npm start
```

## Endpoints

- `GET /`
- `GET /health`
- `POST /gerar-post`

`GET /health` agora informa tambem o modo da chave Supabase em uso:

- `service_role`
- `secret`
- `publishable`
- `missing`

## Observacao de seguranca

Para producao, prefira sempre uma chave server-side do Supabase:

- `SUPABASE_SERVICE_ROLE_KEY`, ou
- `SUPABASE_SECRET_KEY`

O backend aceita `SUPABASE_ANON_KEY` como fallback de compatibilidade, mas isso so e apropriado quando a tabela e as policies foram pensadas para esse nivel de acesso.

### Exemplo de payload

```json
{
  "tema": "site profissional"
}
```

### Exemplo de resposta

```json
{
  "saved": true,
  "title": "Seu site profissional pode estar te fazendo perder clientes",
  "content": "Muitas empresas nao percebem, mas site profissional mal estruturado afasta clientes todos os dias. Um site estrategico muda completamente o jogo.",
  "data": [
    {
      "id": 1
    }
  ]
}
```
