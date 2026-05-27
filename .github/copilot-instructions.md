---
applyTo: '**'
---

# Contexto do Projeto Personal-Scrum

Antes de responder qualquer pergunta neste repositório, leia o arquivo de memória do projeto via ferramenta MCP `obsidian-vault`:

```
Memoria/Projetos/Personal-Scrum.md
```

E os arquivos de contexto global:
```
Memoria/Global/preferencias.md
Memoria/Global/decisoes.md
```

## Resumo Rápido
- Backend: Java 17 + Spring Boot 3.2 + Spring Security 6 + JWT (HS256)
- Banco: PostgreSQL 16 com Flyway migrations
- Frontend: React 18 + TypeScript + Vite 5
- Deploy: Railway; ambiente local via Docker Compose
- Arquitetura Clean Architecture no backend (domain / application / infrastructure / web)
- Funcionalidades: Kanban, alertas proativos de sprint, velocity tracking, backlog com story points

## Regras do Projeto
- Migrations via Flyway (nunca scripts manuais avulsos)
- JWT stateless — sem sessão server-side
- Frontend React + Vite — não adicionar outro bundler ou framework de UI
- Rodar tudo localmente com `docker-compose up --build`
- DTOs como Java records nos use cases
- Atualizar `Memoria/Projetos/Personal-Scrum.md` via MCP quando houver mudanças relevantes na arquitetura
