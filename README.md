# Prospecta Clientes

Ferramenta interna para buscar comércios por nicho + cidade e listar dados de
contato (telefone, site, redes sociais, CNPJ/responsável) para prospecção de
clientes de criação de sites. Marca automaticamente comércios **sem site**
como lead quente.

## Setup

### 1. Google Places API (New)

1. Crie/abra um projeto no [Google Cloud Console](https://console.cloud.google.com/).
2. Ative a API **"Places API (New)"**.
3. Ative billing no projeto (necessário pelo Google, mas a cota grátis mensal
   de ~US$200 cobre uso pessoal folgadamente).
4. Gere uma API key e restrinja a apenas a Places API (New).

### 2. Supabase

1. Crie um projeto grátis em [supabase.com](https://supabase.com).
2. No SQL Editor, rode o conteúdo de [`supabase/schema.sql`](./supabase/schema.sql).
3. Pegue a URL do projeto, a `anon key` e a `service_role key` em
   Project Settings → API.

### 3. Variáveis de ambiente

Copie `.env.local.example` para `.env.local` e preencha:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_PLACES_API_KEY=
```

### 4. Rodar

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000), informe um nicho
(ex: "salão de beleza") e uma cidade (ex: "São Paulo, SP") e clique em Buscar.

## Roadmap

- [x] Fase 1 (MVP): busca via Google Places, tabela de resultados, filtros de
      site/avaliação, export CSV, status de lead (CRM leve).
- [ ] Fase 2: enriquecimento automático — extrair Instagram/Facebook/WhatsApp
      e CNPJ do site institucional de cada comércio.
- [ ] Fase 3: consulta de CNPJ via BrasilAPI (razão social, sócio responsável,
      situação cadastral) e histórico de buscas anteriores.
