# System Architecture & Design Decisions — AgentFusion

This document provides a high-level overview of the architecture, data flow, and key design decisions behind the **AgentFusion** Intelligent Next Best Action (INBA) Platform.

---

## 1. System Overview

AgentFusion is built as a **Multi-Agent SPA** using a decoupled client-server architecture:

```
                                    ┌───────────────────────┐
                                    │    USER / OPERATOR    │
                                    └───────────┬───────────┘
                                                │ Interacts (UI)
                                                ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     CLIENT (React SPA)                                      │
│                                                                                             │
│  ┌──────────────────┐       ┌───────────────────────────────┐       ┌────────────────────┐  │
│  │   Vite Router    │       │       Pipeline Context        │       │    Auth Context    │  │
│  │  (7 Page Views)  │       │ (Orchestrator & State Bridge) │       │ (JWT User Session) │  │
│  └────────┬─────────┘       └──────────────┬────────────────┘       └─────────┬──────────┘  │
│           │                                │                                  │             │
│           │ Triggers                       │ Subscribes                       │ Uses        │
│           ▼                                ▼                                  ▼             │
│  ┌───────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                                      BLACKBOARD                                       │  │
│  │  - rawInput       - triage       - extraction    - knowledge    - memory              │  │
│  │  - biAnalysis     - loopState    - execution     - explanation  - recommendation      │  │
│  └─────────────────────────────────────────▲─────────────────────────────────────────────┘  │
│                                            │                                                │
│                                  Writes    │ Reads / Writes                                 │
│                                  ┌─────────┴─────────┐                                      │
│                                  │    PlannerAgent   │ (Triage & Execution Plan)            │
│                                  └─────────┬─────────┘                                      │
│                                            │ Triggers                                       │
│                                            ▼                                                │
│                 ┌─────────────────────────────────────────────────────┐                     │
│                 │  PARALLEL AGENT EXECUTION POOL                      │                     │
│                 │                                                     │                     │
│                 │  ┌──────────────────┐  ┌──────────────────┐         │                     │
│                 │  │ InteractionAgent │  │  KnowledgeAgent  │         │                     │
│                 │  └──────────────────┘  └────────┬─────────┘         │                     │
│                 │                                 │ RAG Playbooks     │                     │
│                 │                                 ▼                   │                     │
│                 │  ┌──────────────────┐  ┌──────────────────┐         │                     │
│                 │  │   MemoryAgent    │  │  BI Agents Pool  │         │                     │
│                 │  └────────┬─────────┘  │ (Risk/Opp/Gap)   │         │                     │
│                 │           │            └──────────────────┘         │                     │
│                 │           │ Query / Write                           │                     │
│                 │           ▼                                         │                     │
│                 │  ┌──────────────────┐                               │                     │
│                 │  │  VectorDB (Local)│                               │                     │
│                 │  │  (LocalStorage)  │                               │                     │
│                 │  └──────────────────┘                               │                     │
│                 │                                                     │                     │
│                 │  ┌──────────────────┐  ┌──────────────────┐         │                     │
│                 │  │RecommendationAgt │  │ ExplanationAgent │         │                     │
│                 │  └──────────────────┘  └──────────────────┘         │                     │
│                 └──────────────────────────┬──────────────────────────┘                     │
└────────────────────────────────────────────┼────────────────────────────────────────────────┘
                                             │ HTTP Request (apiFetch with JWT Bearer)
                                             ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    SERVER (Express Node)                                    │
│                                                                                             │
│  ┌─────────────────────────┐          ┌─────────────────────────┐          ┌─────────────┐  │
│  │       Auth Router       │          │       Proxy Router      │          │  JWT Auth   │  │
│  │      (/api/auth/*)      │          │     (/api/complete)     │◀─────────┤ Middleware  │  │
│  │   (Login & Register)    │          │      (/api/embed)       │  Verify  │ (Route Guard│  │
│  │  [Persists users.json]  │          │      (/api/draft)       │  Token   │  on /api/*) │  │
│  └─────────────────────────┘          └────────────┬────────────┘          └─────────────┘  │
└────────────────────────────────────────────────────┼────────────────────────────────────────┘
                                                     │ Secure API Call (GEMINI_API_KEY Injected)
                                                     ▼
                                        ┌─────────────────────────┐
                                        │    GOOGLE GEMINI API    │
                                        │ (gemini-3.5-flash /     │
                                        │  gemini-embedding-001)  │
                                        └─────────────────────────┘
```

---

## 2. Decoupled Client-Server Architecture

### Client-Side (`client/`)
The frontend is a React Single Page Application (SPA) built with Vite. It contains all the application logic, the state of the blackboard, the local vector database, and the agent orchestration.

- **Technology**: React 19, React Router 7, Vanilla CSS (Light theme, Indigo accent).
- **State Management**: React Context (`PipelineContext`, `AuthContext`) acting as the glue between the UI and the underlying agents.
- **Agent Orchestration**: The agents run entirely in the browser.

### Server-Side (`server/`)
The backend is a stateless Express.js server. It does not store application state or vector embeddings. It serves two main purposes:
1. **User Management & Authentication**: Exposes `/api/auth/register`, `/api/auth/login`, and `/api/auth/me` endpoints using `bcryptjs` and `jsonwebtoken` (JWT).
2. **Secure LLM Proxy**: Exposes `/api/complete`, `/api/embed`, and `/api/draft` endpoints. It intercepts requests, validates the client's JWT, injects the server-side `GEMINI_API_KEY`, and forwards the request to Google's Gemini API. This keeps the API key secure from being exposed to the client.

---

## 3. Blackboard-Based Multi-Agent Architecture

The core of the platform is a **Blackboard pattern**. The Blackboard is a shared, structured memory space where agents read inputs, post intermediate findings, and coordinate their execution.

```
┌────────────────────────────────────────────────────────────────────────┐
│                              BLACKBOARD                                │
├────────────────────────────────────────────────────────────────────────┤
│  [rawInput]       ➔ User interaction text                              │
│  [triage]         ➔ Category, Confidence, Execution Plan               │
│  [extraction]     ➔ Sentiment, Urgency, Entities, Intent               │
│  [knowledge]      ➔ Playbook guidelines & compliance rules             │
│  [memory]         ➔ Similar past cases from VectorDB                   │
│  [biAnalysis]     ➔ Risk score, Churn factors, Expansion opportunities │
│  [loopState]      ➔ Missing fields, Data gathering status              │
│  [recommendation] ➔ Next Best Actions                                  │
│  [explanation]    ➔ Chain of Thought & Evidence citations              │
└────────────────────────────────────────────────────────────────────────┘
```

### The 9 Cooperative Agents
1. **PlannerAgent**: Triages the input using LLM or keyword scoring, determines the category, and builds a custom execution plan of which agents should run.
2. **InteractionAgent**: Extracts sentiment, urgency, intent, and named entities (technologies, contacts).
3. **KnowledgeAgent**: Performs RAG (Retrieval-Augmented Generation) to fetch category-specific playbooks and compliance rules.
4. **MemoryAgent**: Queries the semantic vector database to find historically similar cases and their outcomes.
5. **RiskAnalysisAgent**: Calculates a churn/escalation risk score (0-100) based on sentiment, urgency, and usage telemetry.
6. **OpportunityAnalysisAgent**: Scans for upsell, seat expansion, or executive business review (EBR) signals.
7. **MissingInformationAgent**: Identifies critical gaps in the customer profile (e.g., unknown decision maker) and triggers a data gathering loop.
8. **RecommendationAgent**: Synthesizes the Blackboard (playbooks, risks, opportunities, historical cases) to generate 3 Next Best Actions.
9. **ExplanationAgent**: Generates a transparent Chain-of-Thought (CoT) explanation, citing specific playbook rules and historical precedents.

---

## 4. Key Design Decisions

### Why run Agents on the Client?
- **Real-Time UI Updates**: As agents execute in sequence or parallel, they write to the Blackboard. The Blackboard notifies React subscribers, causing the UI (animated graph nodes, logs, metric cards) to update instantly.
- **Local Storage Vector DB**: The VectorDB is stored in the browser's `localStorage` for zero-latency lookups and persistence without needing an external database.
- **Offline CLI Capability**: The agents are designed with fallback rule-based logic (e.g., cosine similarity and lexical tokenizers for the VectorDB, keyword scoring for triage). This allows the standalone `workflow_runner.js` CLI script to run completely offline without a server.

### Stateless JWT Authentication
- Session state is not stored on the server. The server issues a signed JWT upon successful login.
- The client stores the JWT in `localStorage` and automatically attaches it as a `Bearer` token via the custom `apiFetch` wrapper.
- This secures the Gemini proxy endpoints from unauthorized access.

### Gemini 3.5 Flash & Gemini Embedding
- Migrated from OpenAI due to quota limits.
- **LLM**: `gemini-3.5-flash` handles classification, extraction, recommendation, and explanation.
- **Embeddings**: `gemini-embedding-001` converts raw text into 768-dimensional vectors for semantic search in the VectorDB.
