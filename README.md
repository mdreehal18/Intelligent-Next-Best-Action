# 🧠 Intelligent Next Best Action (INBA) Platform

Welcome to the **Intelligent Next Best Action (INBA) Platform**, an advanced, multi-agent AI system designed to assist Customer Success Managers (CSMs), support teams, and account executives. The platform automatically triages incoming customer communications, extracts key operational signals, retrieves relevant playbooks and historical case memories, runs business intelligence checks, flags risks or opportunities, and synthesizes personalized, actionable **Next Best Actions (NBAs)** with Chain-of-Thought (CoT) explanations.

This platform utilizes a **Blackboard-based Multi-Agent Architecture** coupled with **Human-in-the-Loop (HITL) validation** and **long-term semantic memory**.

---

## 🗺️ System Architecture & Workflow

The platform is designed around a centralized **Blackboard** pattern. Agents do not communicate with each other directly; instead, they read from and write to a shared, structured state (the Blackboard). This decoupled architecture allows for parallel execution, high modularity, and easy runtime extensibility.

### Architectural Data Flow

```text
+─────────────────────────────────────────────────────────+
│                  Raw Customer Input                     │
+───────────────────────────┬─────────────────────────────+
                            │
                            ▼
+─────────────────────────────────────────────────────────+
│                    Planner Agent                        │
│          (Triages & Determines Agent Plan)              │
+───────────────────────────┬─────────────────────────────+
                            │ Writes Category & Plan
                            ▼
┌─────────────────────────────────────────────────────────┐
│              CENTRALIZED BLACKBOARD (State)             │
└──────┬────────────────────┬────────────────────┬────────┘
       │                    │                    │
       │ Trigger            │ Trigger            │ Trigger
       ▼                    ▼                    ▼
+──────────────+     +──────────────+     +──────────────+
│ Interaction  │     │  Knowledge   │     │    Memory    │
│    Agent     │     │    Agent     │     │    Agent     │
│ (Sentiment,  │     │ (Playbook &  │     │  (VectorDB   │
│   Urgency)   │     │  Guidelines) │     │  Retrieval)  │
+──────┬───────+     +──────┬───────+     +──────┬───────+
       │                    │                    │
       │ Writes             │ Writes             │ Writes
       ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────┐
│              CENTRALIZED BLACKBOARD (State)             │
└──────┬────────────────────┬────────────────────┬────────┘
       │                    │                    │
       │ Trigger            │ Trigger            │ Trigger
       ▼                    ▼                    ▼
+──────────────+     +──────────────+     +──────────────+
│ Risk Analysis│     │ Opportunity  │     │ Missing Info │
│    Agent     │     │  Analysis    │     │    Agent     │
│ (Risk Score) │     │   (Upsell)   │     │  (Gaps Check)│
+──────┬───────+     +──────┬───────+     +──────┬───────+
       │                    │                    │
       │ Writes             │ Writes             │ Writes
       ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────┐
│              CENTRALIZED BLACKBOARD (State)             │
└──────┬──────────────────────────────────────────────────┘
       │
       ├───────[ Gaps Found? ]───────► (YES) ──► [ Human-in-the-Loop ]
       │                                         [   Provide Info    ]
       │                                                 │
       │ (NO)                                            ▼
       ▼                                         [ Updates Blackboard]
+───────────────────────────────────+                    │
│       Recommendation Agent        │◄───────────────────┘
│   (Synthesizes Next Best Actions) │
+───────────────────┬───────────────+
                    │ Writes NBAs
                    ▼
+───────────────────────────────────+
│         Explanation Agent         │
│   (Chain-of-Thought & Evidence)   │
+───────────────────┬───────────────+
                    │ Writes CoT
                    ▼
┌─────────────────────────────────────────────────────────┐
│              CENTRALIZED BLACKBOARD (State)             │
└──────┬──────────────────────────────────────────────────┘
       │
       ▼
+─────────────────────────────────────────────────────────+
│                 Interactive Dashboard                   │
│        (Approve / Reject Action with Feedback)          │
+───────────────────────────┬─────────────────────────────+
                            │
                            ▼
+─────────────────────────────────────────────────────────+
│                 Long-Term VectorDB                      │
│            (Saves Decision & Feedback)                  │
+─────────────────────────────────────────────────────────+
```

### Application Execution Flow

To understand how the platform processes an event from start to finish, refer to the sequence diagram and step-by-step breakdown below:

```text
 CSM/Human          Orchestrator           Blackboard             Agents             VectorDB
   (User)             (App/Runner)          (Session)          (Specialized)       (Long-term)
     │                     │                    │                    │                  │
     │  Ingest raw input   │                    │                    │                  │
     ├────────────────────►│                    │                    │                  │
     │                     │    reset()         │                    │                  │
     │                     ├───────────────────►│                    │                  │
     │                     │                    │                    │                  │
     │                     │  execute(rawInput) │                    │                  │
     │                     ├────────────────────────────────────────►│                  │
     │                     │                    │  Write category    │                  │
     │                     │                    │  & plan            │                  │
     │                     │                    │◄───────────────────┤                  │
     │                     │                    │                    │                  │
     │                     │ ─── Phase 1: Parallel Extraction ────── │                  │
     │                     │  Execute Parallel                       │                  │
     │                     ├────────────────────────────────────────►│                  │
     │                     │                    │  Write Extracted   │                  │
     │                     │                    │  Signals, Playbook │                  │
     │                     │                    │  & Past Memories   │                  │
     │                     │                    │◄───────────────────┤                  │
     │                     │                    │                    │                  │
     │                     │ ─── Phase 2: Business Intelligence ──── │                  │
     │                     │  Execute Parallel                       │                  │
     │                     ├────────────────────────────────────────►│                  │
     │                     │                    │  Write Risk,       │                  │
     │                     │                    │  Opps & Gaps       │                  │
     │                     │                    │◄───────────────────┤                  │
     │                     │                    │                    │                  │
     │      [ If Critical Gaps Detected in Blackboard ]      │                  │
     │                     │                    │                    │                  │
     │  Prompt for Gap Info│                    │                    │                  │
     │◄────────────────────┤                    │                    │                  │
     │  Provide Gap Value  │                    │                    │                  │
     ├────────────────────►│                    │                    │                  │
     │                     │  Update Context    │                    │                  │
     │                     ├───────────────────►│                    │                  │
     │                     │  Re-evaluate BI    │                    │                  │
     │                     ├────────────────────────────────────────►│                  │
     │                     │                    │  Update BI State   │                  │
     │                     │                    │◄───────────────────┤                  │
     │                     │                    │                    │                  │
     │                     │ ─── Phase 3: Synthesis ──────────────── │                  │
     │                     │  execute()         │                    │                  │
     │                     ├────────────────────────────────────────►│                  │
     │                     │                    │  Write NBAs & CoT  │                  │
     │                     │                    │◄───────────────────┤                  │
     │                     │                    │                    │                  │
     │  Render Dashboard   │                    │                    │                  │
     │◄────────────────────┤                    │                    │                  │
     │  Approve / Reject   │                    │                    │                  │
     ├────────────────────►│                    │                    │                  │
     │                     │  addMemory()       │                    │                  │
     │                     ├───────────────────────────────────────────────────────────►│
     │  Update Metrics     │                    │                    │                  │
     │◄─────────────────────────────────────────────────────────────────────────────────┤
     │                     │                    │                    │                  │
```

#### Detailed Execution Steps:

1.  **Ingestion**: The user triggers a workflow by selecting a scenario or typing custom text. The Orchestrator resets the `Blackboard` and initializes it with the raw input and account context.
2.  **Triage**: The `PlannerAgent` runs first to classify the interaction. It determines the category (e.g., *Technical*, *Pricing*) and sets the plan on the Blackboard.
3.  **Parallel Extraction (Phase 1)**: The Orchestrator reads the plan and triggers `InteractionAgent`, `KnowledgeAgent`, and `MemoryAgent` in parallel. They extract customer sentiment/urgency, retrieve the playbook guidelines, and pull similar historical cases from the `VectorDB`.
4.  **Business Intelligence (Phase 2)**: Once the extraction phase completes, the Orchestrator executes the BI agents (`RiskAnalysisAgent`, `OpportunityAnalysisAgent`, `MissingInformationAgent`) in parallel to calculate churn risk, spot upsell opportunities, and check for missing context.
5.  **Interactive Data Gathering (HITL)**: If a critical gap is found, the Orchestrator pauses the workflow, prompts the user via the UI, and updates the `Blackboard` with the user's input before re-running BI validation.
6.  **Synthesis**: The `RecommendationAgent` and `ExplanationAgent` run to generate tailored recommendations and a Chain-of-Thought (CoT) explanation based on the finalized blackboard state.
7.  **Human-in-the-Loop Action**: The user reviews the recommendations and clicks **Approve** or **Reject**. The action is executed, and the decision along with user feedback is logged into the `VectorDB` as a new long-term memory.

---

## 🤖 Meet the Agents

The system coordinates nine specialized agents to analyze customer interactions and synthesize recommendations:

| Agent | Responsibilities | Core Logic |
| :--- | :--- | :--- |
| **`PlannerAgent`** | Triages the raw input into a category and determines the execution plan (which agents should run). | **Primary**: LLM classification (`gpt-4o`). <br>**Fallback**: Key-phrase frequency matching. |
| **`InteractionAgent`** | Extracts metadata such as customer sentiment, urgency, intent, and key entities. | **Primary**: LLM extraction. <br>**Fallback**: Rule-based keyword checks. |
| **`KnowledgeAgent`** | Performs retrieval-augmented generation (RAG) by fetching the active category's playbook guidelines and enforcement rules. | In-memory lookup in the registered playbooks database. |
| **`MemoryAgent`** | Queries long-term memory for semantically similar past cases to see how they were resolved. | Queries the `VectorDB` using semantic embeddings or lexical fallbacks. |
| **`RiskAnalysisAgent`** | Evaluates customer churn and escalation risk scores based on contract value (ARR), renewal window, sentiment, and urgency. | Rule-based scoring engine returning a score (0-100) and active risk factors. |
| **`OpportunityAnalysisAgent`**| Scans the interaction and account metadata for expansion, upsell, or executive review opportunities. | Pattern matching on usage changes, account size, and key trigger phrases. |
| **`MissingInformationAgent`**| Audits the blackboard context to identify critical or medium gaps in the customer's profile. | Validates key fields (e.g., `primaryContact`, `decisionMaker`) against the current category. |
| **`RecommendationAgent`** | Synthesizes all gathered data (risks, opportunities, past memories, playbooks) to generate 3 personalized NBAs. | **Primary**: LLM synthesis. <br>**Fallback**: Parametric template instantiation. |
| **`ExplanationAgent`** | Formulates a Chain-of-Thought (CoT) explanation, cites supporting evidence, and computes a confidence score. | **Primary**: LLM explanation generation. <br>**Fallback**: Rule-based template compilation. |

---

## 💾 Memory Systems

### 1. Centralized Blackboard (`memory/Blackboard.js`)
The `Blackboard` serves as the short-term working memory for a single execution session. It maintains a highly structured JSON state:
*   `rawInput`: The unprocessed email, chat, or transcript.
*   `context`: Account metadata (Account Name, ARR, Renewal Window, Usage Change, Contacts).
*   `triage`: The identified category and execution plan.
*   `extraction`: Sentiment, urgency, intent, and extracted entities.
*   `knowledge`: Retrieved playbooks and guidelines.
*   `memory`: Semantically similar past cases.
*   `biAnalysis`: Risk score, risk factors, opportunities, and missing fields.
*   `loopState`: Flags indicating if the data gathering loop is active.
*   `recommendation`: The generated list of Next Best Actions.
*   `explanation`: Chain-of-thought, cited evidence, and confidence score.

### 2. Long-Term Vector Database (`memory/VectorDB.js`)
The `VectorDB` stores historical case outcomes and human feedback. It provides:
*   **Semantic Search**: Uses OpenAI's `text-embedding-3-small` embeddings to find similar past cases. Calculates relevance using **Cosine Similarity**.
*   **Lexical Search Fallback**: If the OpenAI API key is missing or the request fails, it falls back to a tokenized **Jaccard Similarity** keyword search.
*   **Persistence**: Automatically serializes and saves memories to `localStorage` (in the browser) or an in-memory fallback (on the server).

---

## 🔄 The Data Gathering Loop (HITL)

If the `MissingInformationAgent` identifies a **Critical** gap in the account profile (e.g., a "Pricing" ticket is active but the `decisionMaker` is `Unknown`), the orchestrator triggers the **Data Gathering Loop**:
1.  The pipeline execution **pauses** before generating recommendations.
2.  The UI prompts the user to supply the missing information.
3.  Once the user inputs the details, the `Blackboard` context is updated.
4.  The BI agents (`Risk`, `Opportunity`, `MissingInformation`) are re-run to evaluate the updated state.
5.  If no critical gaps remain, the pipeline resumes and completes the recommendation synthesis.

---

## ⚡ Runtime Playbook Extensibility

The platform is fully extensible. You can register a new issue category, playbook, and recommendation templates at runtime **without modifying any agent source code**. 

You can do this in two ways:
1.  **Via the UI**: Use the "Add New Category" form in the left sidebar.
2.  **Via Code**: Call `registerCategory(name, definition)` from `data/categories.js`.

### Example Category Definition:
```javascript
import { registerCategory } from "./data/categories.js";

registerCategory("RegulatoryCompliance", {
  label: "Regulatory / Localization Compliance",
  icon: "📜",
  keywords: ["regulatory", "tax-invoice", "compliance", "filing"],
  playbook: {
    name: "Regulatory Compliance Playbook",
    description: "SOP when a customer needs behavior to satisfy regional regulations.",
    guidelines: [
      "Confirm exact regulatory requirement and deadline.",
      "Route to Product/Localization team for feasibility."
    ],
    rules: ["Always confirm the filing deadline before committing to a timeline."]
  },
  nbaTemplates: [
    {
      title: () => "Confirm Regulatory Requirement & Deadline",
      actionType: "Schedule Meeting",
      details: (ctx) => `Get specifics from ${ctx.primaryContact} on the exact format required.`,
      impact: "Prevents committing to the wrong timeline.",
      priority: "High"
    }
  ]
});
```

---

## 🛠️ Technology Stack

*   **Frontend**: Vanilla HTML5, CSS3, ES6 JavaScript Modules.
    *   Features a premium, dark-themed glassmorphic dashboard.
    *   Includes a live agent execution node-graph visualizing active/completed agents.
    *   Interactive metrics dashboard tracking approval and rejection rates.
*   **Backend**: Node.js, Express.
    *   Acts as a secure, lightweight proxy to OpenAI's APIs.
    *   Exposes `/api/complete` (LLM completions using `gpt-4o`).
    *   Exposes `/api/embed` (Embeddings using `text-embedding-3-small`).
*   **Dependencies**: `express`, `cors`, `dotenv`, `node-fetch`.

---

## 🚀 Setup & Installation

### Prerequisites
*   [Node.js](https://nodejs.org/) (v18 or higher recommended)
*   An OpenAI API Key (optional, but recommended for full LLM reasoning and semantic memory)

### 1. Clone & Install
```bash
# Navigate to the project directory
cd Intelligent-Next-Best-Action

# Install dependencies
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
PORT=3001
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Run the Web Application
```bash
# Start the Express server
npm start
```
Open your browser and navigate to **`http://localhost:3001`**.

### 4. Run the Console Demo
The project includes an end-to-end command-line simulation that showcases the entire multi-agent pipeline, the data gathering loop, and runtime category registration:
```bash
npm run demo
```

---

## 📂 Project Directory Structure

```text
Intelligent-Next-Best-Action/
│
├── agents/                     # Specialized AI Agents
│   ├── BiAgents.js             # Risk, Opportunity, and Missing Information Agents
│   ├── ExplanationAgent.js     # Chain-of-Thought & Confidence Synthesis
│   ├── InteractionAgent.js     # Sentiment, Urgency, Intent, and Entity Extraction
│   ├── KnowledgeAgent.js       # Playbook & RAG Retrieval
│   ├── MemoryAgent.js          # Historical Case Retrieval
│   ├── PlannerAgent.js         # Triage & Workflow Planner
│   └── RecommendationAgent.js  # Next Best Action Synthesis
│
├── data/                       # System Data Configurations
│   ├── categories.js           # Playbooks, guidelines, and templates
│   └── scenarios.js            # Sample customer issues & account contexts
│
├── memory/                     # Memory Components
│   ├── Blackboard.js           # Centralized short-term session state
│   └── VectorDB.js             # Long-term semantic case database
│
├── app.js                      # Main frontend orchestrator & UI controller
├── index.html                  # Dashboard HTML structure
├── styles.css                  # Dark-themed glassmorphism CSS
├── server.js                   # Express server & OpenAI API proxy
├── workflow_runner.js          # Console-based end-to-end workflow demo
├── package.json                # Node.js scripts & dependencies
└── README.md                   # Project documentation
```

---

## 💡 How to Use the Dashboard

1.  **Select a Scenario**: Choose one of the pre-configured scenarios (e.g., *SSO Login Blocker*, *Contract Renewal*, *Drastic Usage Drop*) from the dropdown at the top. The raw customer communication and account metadata will load automatically.
2.  **Adjust Step Delay**: Set the step delay (e.g., 800ms) to watch the agent execution node-graph light up in real-time as each agent processes the request.
3.  **Run the Pipeline**: Click **"Run Intelligent Pipeline"**.
4.  **Resolve Gaps (If prompted)**: If the system detects a critical profile gap, a modal will appear. Input the requested information (e.g., a contact name) to resume the pipeline.
5.  **Review the Outputs**:
    *   **Blackboard State**: View extracted sentiment, urgency, entities, and risk scores in the left panel.
    *   **Explanation (CoT)**: Read the step-by-step reasoning and cited evidence.
    *   **Next Best Actions**: Review the generated cards showing recommended actions, their impact, and priority.
6.  **Human-in-the-Loop Decision**: Click **"Approve & Execute"** or **"Reject Action"** (with feedback) on any NBA. The outcome will immediately be saved to the long-term memory list and update the **Outcomes Dashboard** metrics!
7.  **Add Custom Playbooks**: Use the "Register New Category" section in the sidebar to define custom playbooks on the fly and test them immediately.
