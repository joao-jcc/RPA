# Portal RPA — Frontend

Dashboard React + Vite para monitoramento de buscas automatizadas no Portal da Transparência.

## Setup

```bash
npm install
npm run dev
```

O servidor de desenvolvimento roda em `http://localhost:5173` e faz proxy das requisições `/api` para `http://localhost:8000` (backend FastAPI).

## Estrutura

```
src/
├── api/client.ts          # Chamadas HTTP ao backend
├── context/AppContext.tsx # Estado global (sessions)
├── hooks/useJobStream.ts  # SSE por job
├── types/index.ts         # Tipos + helpers de progresso
├── utils/formatters.ts    # Formatação de datas, CPF, duração
├── components/
│   ├── layout/            # Sidebar + Header
│   ├── SearchBar.tsx      # Input de busca
│   ├── SessionCard.tsx    # Card de cada busca
│   ├── ProgressTimeline.tsx
│   ├── BenefitTracker.tsx
│   └── BenefitTable.tsx
└── pages/
    ├── Home.tsx           # Dashboard + feed de sessões
    └── DataExplorer.tsx   # Tabela de resultados concluídos
```

## Fluxo

1. Usuário digita um termo e submete
2. `POST /api/v1/rpa/persona/{termo}/save` cria o job
3. `EventSource` abre stream SSE e recebe eventos em tempo real
4. Ao receber `done`, busca o resultado completo via `GET /api/v1/rpa/jobs/{id}`
5. SessionCard exibe os dados com tabelas de benefícios expansíveis
