# AgentFusion — Intelligent Next Best Action Platform

AgentFusion is an advanced, AI-powered **Intelligent Next Best Action (INBA) Platform** designed for Customer Success (CS) and Operations teams. Powered by a client-side **Blackboard-based Multi-Agent System** and integrated with **Google Gemini 3.5 Flash**, it triages customer communications, extracts sentiment and intent, retrieves playbooks, searches historical memory, evaluates account churn risk, and generates actionable, compliance-aligned Next Best Actions with transparent Chain-of-Thought explanations.

---

## 👥 Team Details — `smartcrew`

We are a team of 3 :

1. **Saisathwik Anchuri** (Roll No: `23071A12D5`)
2. **Reehal MD** (Roll No: `23071A12G6`)
3. **Madeehah** (Roll No: `23071A12H1`)

---

## 🔗 GitHub Repository Link

Please find our project source code here:
👉 **[GitHub Repository Lin]** *(Placeholder:https://github.com/mdreehal18/Intelligent-Next-Best-Action)*

---

## 🚀 Key Features

- **🔐 JWT Authentication**: Complete sign-in and sign-up user flows. All API requests are guarded by secure, stateless JWT tokens.
- **🤖 9 Cooperative Agents**: Cooperative pipeline orchestrated through a shared **Blackboard state**.
- **✉️ AI-Powered Email Draft Generator**: Generates highly personalized, context-aware emails or meeting agendas for approved actions using the Gemini API.
- **✏️ Interactive Blackboard Editor (HITL)**: Allows operators to manually override triage categories, urgency levels, sentiment, and risk scores, with a one-click **Recalculate Recommendations** trigger.
- **⚙️ Visual Playbook Builder**: An in-app manager to visually author, edit, and configure trigger keywords, guidelines, and compliance rules for all issue types.
- **📊 Rich Analytics Dashboard**: Fully responsive, CSS-only interactive charts showing case distribution, urgency ratios, approval metrics, and historical risk trends.
- **🧠 Hybrid Vector DB**: Semantic memory search in local storage with a complete fallback to lexical tokenization for offline usage.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, React Router 7, Vanilla CSS (Light theme, Indigo primary accent), Vite 6.
- **Backend**: Node.js, Express, `bcryptjs` (password hashing), `jsonwebtoken` (JWT authentication).
- **AI/LLM**: Google Gemini API (`gemini-3.5-flash` for chat/completion, `gemini-embedding-001` for vector embeddings).

---

## 📋 System Architecture & Execution Flow

AgentFusion utilizes a decoupled client-server architecture. The agents run entirely in the browser, writing to a shared Blackboard state that automatically synchronizes with the React UI. The Express backend acts as a secure, authenticated proxy to the Gemini API, keeping API keys safe.

### Operational Flow

```
                      ┌──────────────────────────────┐
                      │   Customer Interaction Text  │
                      └──────────────┬───────────────┘
                                     │
                                     ▼
                      ┌──────────────────────────────┐
                      │    [1] PLANNER / TRIAGE      │
                      │  Classifies issue & plans    │
                      └──────────────┬───────────────┘
                                     │
            ┌────────────────────────┼────────────────────────┐
            ▼                        ▼                        ▼
┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│   [2] EXTRACTION     │  │   [3] KNOWLEDGE      │  │     [4] MEMORY       │
│ Extracts sentiment,  │  │ Retrieves playbooks  │  │ Searches historical  │
│ urgency, & entities  │  │   & compliance rules │  │  cases in VectorDB   │
└───────────┬──────────┘  └──────────┬───────────┘  └──────────┬───────────┘
            │                        │                         │
            └────────────────────────┼─────────────────────────┘
                                     │
                                     ▼
                      ┌──────────────────────────────┐
                      │   [5] BUSINESS INTELLIGENCE  │
                      │ Calculates risk, upsells, &  │
                      │  identifies profile gaps     │
                      └──────────────┬───────────────┘
                                     │
                                     ├────────────────────────┐
                                     ▼ Gaps Found?            ▼ No Gaps
                      ┌──────────────────────────────┐        │
                      │     [6] DATA GATHERING       │        │
                      │ Pauses pipeline for operator │        │
                      │ input (HITL Loop)            │        │
                      └──────────────┬───────────────┘        │
                                     │                        │
                                     └────────────────────────┤
                                                              │
                                                              ▼
                                               ┌──────────────────────────────┐
                                               │      [7] RECOMMENDATION      │
                                               │ Synthesizes playbooks, memory│
                                               │ & risk to generate 3 NBAs    │
                                               └──────────────┬───────────────┘
                                                              │
                                                              ▼
                                               ┌──────────────────────────────┐
                                               │       [8] EXPLANATION        │
                                               │ Generates Chain-of-Thought   │
                                               │  & cites playbook evidence   │
                                               └──────────────────────────────┘
```

---

## ⚡ Setup & Installation

Follow these steps to set up and run the project locally:

### Prerequisites
- **Node.js** (v18 or higher recommended)
- A **Google Gemini API Key** (Get one from [Google AI Studio](https://aistudio.google.com/))

### 1. Clone the Repository
```bash
git clone <repository-url>
cd AgentFusion
```

### 2. Configure Environment Variables
Create a `.env` file inside the `server/` directory:
```bash
# Create the file
touch server/.env
```
Add the following variables to `server/.env`:
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
JWT_SECRET=inba_platform_jwt_secret_key_2026
```
*(Note: A robust fallback JWT secret is configured in the code, but it is highly recommended to set a custom secret here.)*

### 3. Install All Dependencies
We have provided a root-level helper script to install all dependencies for the root, client, and server in a single command:
```bash
npm run install:all
```

### 4. Start the Development Servers
Start both the React frontend and Express backend concurrently:
```bash
npm run dev
```
- **React Frontend**: Runs on `http://localhost:5173`
- **Express Backend**: Runs on `http://localhost:3001`

Open `http://localhost:5173` in your browser. You will be automatically redirected to the **Sign In** page.

---

## 💻 Running the Standalone CLI Demo

We have preserved a standalone command-line interface (CLI) script at the root of the project to demonstrate the entire multi-agent pipeline in the terminal.

The agents are designed with **hybrid fallback logic** (e.g., local cosine similarity and lexical tokenizers for the VectorDB, keyword scoring for triage). This allows the CLI script to run **completely offline without an active server or API key**!

To execute the CLI demo:
```bash
npm run demo
```
This will run four sequential scenarios (Technical SAML Blocker, Security Incident, Generalization Test, and Extensibility Test) directly in your terminal, showing full agent logs, risk calculations, and generated actions.
