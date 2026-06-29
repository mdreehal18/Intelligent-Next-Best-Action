# 🎨 UI/UX Design & Layout Specification

This document provides a comprehensive blueprint of the **Intelligent Next Best Action (INBA) Platform** frontend. It details the visual design system, layout architecture, component placement, and user interaction states.

---

## 💎 Visual Design System

The platform uses a premium, dark-mode **glassmorphic** theme. The interface is designed to feel immersive, modern, and highly responsive.

### 🎨 Color Palette

| Token | Hex/Value | Visual Application |
| :--- | :--- | :--- |
| `background-primary` | `#0a0e17` | Deep space blue main background |
| `background-secondary`| `#121826` | Darker container/modal background |
| `glass-bg` | `rgba(18, 25, 41, 0.7)` | Panel background |
| `border-light` | `rgba(255, 255, 255, 0.06)`| Subtle divider lines |
| `color-primary` | `#8b5cf6` | Vibrant violet (active nodes, primary buttons, accents) |
| `color-secondary` | `#06b6d4` | Bright cyan (running state, impact highlights, borders) |
| `color-accent` | `#ec4899` | Pink (special highlights) |
| `color-risk-high` | `#f43f5e` | Rose/Red (negative sentiment, high risk, rejected cards) |
| `color-risk-med` | `#fb923c` | Orange (neutral sentiment, medium risk/priority) |
| `color-risk-low` | `#10b981` | Emerald/Green (positive sentiment, low risk, approved cards) |

### 🌌 Background Effects
*   **Gradients**: The body features two fixed, low-opacity radial gradients that simulate ambient lighting:
    *   Top-Left: `radial-gradient(circle at 10% 20%, rgba(139, 92, 246, 0.08) 0%, transparent 40%)`
    *   Bottom-Right: `radial-gradient(circle at 80% 80%, rgba(6, 182, 212, 0.06) 0%, transparent 40%)`
*   **Glassmorphism**: Panels use a combination of translucent background, backdrop blur, and thin borders:
    ```css
    background: rgba(18, 25, 41, 0.7);
    backdrop-filter: blur(14px);
    border: 1px solid rgba(255, 255, 255, 0.07);
    box-shadow: 0 12px 40px 0 rgba(0, 0, 0, 0.4);
    ```

### 🔤 Typography
*   **Sans-Serif (Body & Inputs)**: `Plus Jakarta Sans` — Chosen for clean, modern readability at small sizes.
*   **Display (Headers & Badges)**: `Space Grotesk` — A geometric sans-serif that gives the headers a tech-forward look.
*   **Monospace (Logs & Metrics)**: `JetBrains Mono` — Used for console logs, badges, and raw metric values.

---

## 🔲 Layout Architecture (Grid System)

The interface is structured as a **Single Page Application (SPA)** dashboard designed to fit exactly within the viewport (`100vh`) without body scrolling. It is divided into three main columns:

```text
+─────────────────────────────────────────────────────────────────────────────────────────────────────────────+
│ [AI] Agentic Decision Intelligence Platform                                    ● PLATFORM ENGINE: ACTIVE   │
+─────────────────────────────────────────────────────────────────────────────────────────────────────────────+
│  COLUMN 1: CONFIGURATION (340px)   │  COLUMN 2: CENTRAL ORCHESTRATION & OUTPUT (Flex)  │ COLUMN 3: STATE (400px)    │
│                                    │                                                   │                            │
│  ┌──────────────────────────────┐  │  ┌─────────────────────────────────────────────┐  │  ┌──────────────────────┐  │
│  │ 📥 1. Ingestion Workspace    │  │  │ 🧬 Dynamic Agent Graph Orchestration        │  │  │ 📋 4. Shared BB      │  │
│  ├──────────────────────────────┤  │  ├─────────────────────────────────────────────┤  │  ├──────────────────────┤  │
│  │ Load Scenario: [Dropdown v]  │  │  │ (Planner)─►(Extract)─►(RAG)─►(Mem)─►(BI)─►(NBA) │  │  │ Triage: Technical    │  │
│  │                              │  │  │   [🧠]      [🕵️]   [📖]   [💾]  [📊]  [🎯]  │  │  │ Confidence: 95%      │  │
│  │ Raw Input:                   │  │  └─────────────────────────────────────────────┘  │  │ Sentiment: Negative  │  │
│  │ +──────────────────────────+ │  │  ┌─────────────────────────────────────────────┐  │  │ Urgency: P1 Blocker  │  │
│  │ │                          │ │  │  │ 💡 Generated Next Best Actions & Evidence   │  │  ├──────────────────────┤  │
│  │ │                          │ │  │  ├─────────────────────────────────────────────┤  │  │ Account Telemetry:   │  │
│  │ +──────────────────────────+ │  │  │  [ Explanation & Confidence - 92% ]         │  │  │ - Acme Corp ($120k)  │  │
│  │                              │  │  │  CoT: The interaction was triaged as...     │  │  ├──────────────────────┤  │
│  │ Delay: [1.5s v]  Override [v]│  │  │  Evidence: Playbook Citation, Semantic Match│  │  │ BI Risk Assessment:  │  │
│  │                              │  │  │  ─────────────────────────────────────────  │  │  │ Risk Score: 75%      │  │
│  │ [🚀 Trigger Triage & Analyze]│  │  │  Top Recommendations:                       │  │  │ [██████████░░░]      │  │
│  │ [🧹 Reset Vector DB Memory ] │  │  │  ┌───────────────────────────────────────┐  │  │  │ Factors: SSO down... │  │
│  │ └──────────────────────────────┘  │  │  │ 1. Escalate to Tier 3 [High Priority] │  │  ├──────────────────────┤  │
│  │ ┌──────────────────────────────┐  │  │  │ Details: Spawn a P1 ticket...         │  │  │ Extracted Entities:  │  │
│  │ │ 🧩 Define New Issue Type     │  │  │  │ [Approve & Execute]  [Reject Action]  │  │  │ [Okta SAML] [SSO]    │  │
│  │ ├──────────────────────────────┤  │  │  └───────────────────────────────────────┘  │  └──────────────────────┘  │
│  │ │ Cat Name: [                ] │  │  │  ┌───────────────────────────────────────┐  │  ┌──────────────────────┐  │
│  │ │ Keywords: [                ] │  │  │  │ 2. Provision Sandbox  [Med Priority]  │  │  │ 🧠 Long-Term Memory  │  │
│  │ │ Guideline:[                ] │  │  │  │ Details: Send backup environment...   │  │  ├──────────────────────┤  │
│  │ │                              │  │  │  │ [Approve & Execute]  [Reject Action]  │  │  │ Cyberdyne (SSO down) │  │
│  │ │ [➕ Register Category]       │  │  │  └───────────────────────────────────────┘  │  │ - Outcome: Approved  │  │
│  │ └──────────────────────────────┘  │  │  └─────────────────────────────────────────────┘  │  └──────────────────────┘  │
│                                    │  ┌─────────────────────────────────────────────┐  │  ┌──────────────────────┐  │
│                                    │  │ 🖥️ CONSOLE LOGS                             │  │  │ 📊 Outcomes Dashboard│  │
│                                    │  ├─────────────────────────────────────────────┤  │  ├──────────────────────┤  │
│                                    │  │ [00:12:34] Triage Complete: [Technical]     │  │  │ Appr: 85%  Rej: 15%  │  │
│                                    │  │ [00:12:36] Risk score calculated: 75%       │  │  │ Avg Churn Risk: 42   │  │
│                                    │  │                                             │  │  │ Trend: █ █ ▄ █ ▄ █   │  │
│                                    │  └─────────────────────────────────────────────┘  │  └──────────────────────┘  │
+─────────────────────────────────────────────────────────────────────────────────────────────────────────────+
│ Account Workspace: nba_platform                               Session Memory State: Synchronized (LocalDB)  │
+─────────────────────────────────────────────────────────────────────────────────────────────────────────────+
```

---

## 🧱 Component Breakdown & Placement

### 1. Header & Navigation (Height: 70px)
*   **Brand Section (Left)**: Contains an `AI` gradient icon (violet to cyan) with a soft outer glow, and the text "Agentic Decision Intelligence Platform" rendered in a white-to-violet text gradient.
*   **Status Badge (Right)**: A pill-shaped badge showing `PLATFORM ENGINE: ACTIVE` with a pulsing green dot (`@keyframes pulse`) indicating a live connection.

### 2. Left Column: Ingestion & Configuration (Width: 340px)
*   **Ingestion Workspace Panel**:
    *   **Dropdown Selection**: Loads pre-configured test scenarios (SSO Login Blocker, Contract Renewal, etc.).
    *   **Textarea**: Receptions raw, unstructured text. Focused states transition borders to violet with a soft shadow.
    *   **Controls**: Two dropdowns side-by-side to adjust the **Pipeline Step Delay** (1.5s for visual walkthroughs, 0.5s, or 0.0s) and **Planner Override** (manually forcing a playbook).
    *   **Action Buttons**:
        *   `Trigger Triage & Analyze`: Primary button styled with a violet gradient. On hover, it translates slightly upward (`translateY(-2px)`) and increases its glow.
        *   `Reset Vector DB Memory`: Secondary button styled in flat translucent gray.
*   **Define New Issue Type Panel**:
    *   An input form allowing users to register new categories on the fly. Consists of text inputs for *Category Name*, *Keywords*, and *Guideline*, and a secondary action button.

### 3. Center Column: Orchestration & Results (Flex-Grow)
*   **Dynamic Agent Graph Orchestration (Height: 280px)**:
    *   A horizontal graph visualizing the active state of the agentic pipeline.
    *   **Connector Line**: A background line represents the pipeline path. An active gradient overlay (`#graph-connector-fill`) expands from 0% to 100% width in sync with agent progress.
    *   **Agent Nodes**: Six circular nodes representing:
        1.  `Planner Triage` 🧠
        2.  `Extraction` 🕵️
        3.  `Knowledge RAG` 📖
        4.  `Memory Retrieval` 💾
        5.  `BI Group` 📊
        6.  `NBA Synthesis` 🎯
    *   **Node States**:
        *   *Idle*: Dimmed icons and gray text (`var(--text-muted)`).
        *   *Active*: Cyan border, glowing shadow, and icon animation (`@keyframes nodeGlow`).
        *   *Completed*: Solid violet border and highlighted text.
*   **Generated Next Best Actions & Evidence**:
    *   **Gaps Overlay Modal**: A full-panel blur overlay (`.gathering-overlay`) that blocks the output area if the `MissingInformationAgent` detects a critical profile gap, forcing the user to resolve the gap before continuing.
    *   **Explanation Block**: A violet-tinted box (`rgba(139, 92, 246, 0.04)`) showing:
        *   A Chain-of-Thought (CoT) explanation paragraph.
        *   A confidence score badge (green for >85%, orange for >65%, red for lower).
        *   Citations/evidence list (citing specific playbooks or VectorDB matches).
    *   **NBA Cards**: A scrollable vertical stack of action cards. Each card has:
        *   Title, Priority Badge (High/Medium/Low), and Action Type.
        *   Detailed instructions and predicted business impact.
        *   A button row: `Approve & Execute` (turns the card green and logs an approval) and `Reject Action` (slides open a text input to log a rejection reason, turning the card semi-transparent red).
*   **Console Logs Panel (Height: 180px)**:
    *   Placed at the bottom of the center column. Displays running console outputs with timestamps.
    *   Color-coded text: green for successes, yellow for warnings/errors, and cyan for standard steps.

### 4. Right Column: Shared Blackboard & Analytics (Width: 400px)
*   **Shared Blackboard Panel**:
    *   A visual inspector of the current session state.
    *   **State Cards**: Grid-aligned cards showing Triage Category, Confidence, Sentiment, and Urgency.
    *   **Account Telemetry**: Lists active client statistics (ARR, Renewal Days, Usage Change).
    *   **BI Risk Assessment**: Displays the computed churn risk percentage accompanied by an animated progress bar that changes color (green -> orange -> red) depending on severity, followed by a list of active risk factors.
    *   **Extracted Entities**: A flex-wrap collection of glassmorphic badges.
*   **Long-Term Memory (Vector DB) Panel**:
    *   A scrollable list showing historical outcomes stored in the database.
*   **Outcomes Dashboard Panel**:
    *   **Metrics Grid**: A 2x2 layout displaying high-level success rates (Approval Rate, Rejection Rate, Avg. Churn Risk, Avg. Time to Recommendation).
    *   **Risk Trend Chart**: A bar chart displaying the risk scores of the last 12 cases as vertical bars (red for high risk, blue for low risk).

---

## 🔄 UI State Transitions

```text
+───────────────+      Trigger Analyze      +───────────────────+
│   1. IDLE     ├──────────────────────────►│   2. RUNNING      │
│               │                           │                   │
│  - Empty Output                           │  - Graph Animating│
│  - Nodes Gray                             │  - Nodes Pulsing  │
+───────────────+                           +─────────┬─────────+
                                                      │
                                                      │ Gaps Found?
                                                      ▼
+───────────────+      Resolve Gaps         +───────────────────+
│ 4. REC READY  │◄──────────────────────────┤ 3. GAP OVERLAY    │
│               │                           │                   │
│ - Show CoT    │                           │ - Blur Background │
│ - Show Cards  │                           │ - Input Prompted  │
+───────────────+                           +───────────────────+
```
