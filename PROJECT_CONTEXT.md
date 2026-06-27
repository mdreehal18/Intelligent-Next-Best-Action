# PROJECT_CONTEXT

## 1. Project Vision

**DecisionPilot AI** is an enterprise AI platform designed to help SaaS customer success teams identify and execute the next best action for every account, user segment, and customer interaction. The platform combines customer telemetry, CRM context, support signals, product usage data, and AI-driven reasoning to recommend timely, explainable, and high-impact actions.

The goal of the MVP is to deliver a production-quality foundation that demonstrates how AI can improve customer retention, expansion, adoption, and operational efficiency in Customer Success organizations.

For the hackathon, the platform should clearly show how structured business context, data signals, and AI-assisted planning can work together to support customer-facing teams in making better decisions faster.

---

## 2. Business Domain

### Domain Focus
**Customer Success for SaaS Companies**

DecisionPilot AI operates in the Customer Success domain, where teams are responsible for ensuring customers achieve value from a SaaS product throughout the customer lifecycle.

### Typical Customer Success Objectives
- Improve customer onboarding outcomes
- Increase product adoption and feature usage
- Reduce churn risk
- Improve renewal rates
- Identify expansion and upsell opportunities
- Prioritize accounts based on business impact and health
- Standardize best practices across Customer Success Managers (CSMs)

### Business Context
Customer Success teams often work across disconnected systems such as:
- CRM platforms
- Support ticketing systems
- Product analytics tools
- Communication tools
- Billing and subscription systems

Because data is fragmented, teams struggle to determine which customer requires attention, why intervention is needed, and what action should be taken next. DecisionPilot AI addresses this gap by synthesizing customer context into actionable recommendations.

---

## 3. Business Goals

The platform should support the following business goals:

1. **Improve retention** by detecting churn signals early and recommending proactive interventions.
2. **Increase expansion revenue** by identifying accounts with strong adoption, unmet needs, or cross-sell potential.
3. **Accelerate time-to-value** by guiding onboarding and adoption workflows.
4. **Improve team productivity** by reducing manual analysis and prioritizing the highest-value actions.
5. **Standardize decision-making** by making recommendations consistent, explainable, and auditable.
6. **Provide leadership visibility** into account health, risk trends, action effectiveness, and pipeline opportunities.
7. **Enable scalable customer engagement** with AI-assisted playbooks and agent-driven workflows.

---

## 4. Functional Requirements

### 4.1 Core Platform Capabilities
- Ingest and normalize customer data from multiple business systems.
- Maintain a unified customer/account profile.
- Compute account health and business signals.
- Generate AI-driven next best action recommendations.
- Display recommendations with rationale, priority, and confidence.
- Allow users to review, accept, reject, assign, and track recommended actions.
- Record action history for auditability and performance analysis.

### 4.2 Customer Data Management
- Store account metadata such as company, segment, contract value, renewal date, and lifecycle stage.
- Store customer contacts, roles, and engagement history.
- Store product usage metrics and trend indicators.
- Store support interactions and sentiment indicators.
- Store subscription, billing, and renewal-related details.

### 4.3 Recommendation Engine Requirements
- Identify churn-risk accounts based on usage decline, support burden, inactivity, negative sentiment, or renewal proximity.
- Identify adoption opportunities for underused features or workflows.
- Identify expansion opportunities based on product maturity, engagement patterns, and account fit.
- Prioritize recommendations based on urgency, business value, and confidence.
- Generate human-readable explanations for each recommendation.
- Support configurable playbooks and decision rules.

### 4.4 User Workflow Requirements
- Provide a dashboard showing prioritized accounts and recommended actions.
- Provide account detail views with key signals, history, and recommendation context.
- Allow manual override and feedback on recommendations.
- Support role-based views for leadership, CSMs, and operations users.
- Enable filtering by account segment, risk level, owner, region, or lifecycle stage.

### 4.5 AI and Agent Workflow Requirements
- Support AI-assisted summarization of account status.
- Support AI-generated action plans for customer engagement.
- Support planner-style workflows that break recommendations into executable steps.
- Support agent handoffs between data analysis, recommendation generation, and action planning stages.

### 4.6 Reporting Requirements
- Show account health distribution.
- Show churn-risk and opportunity pipeline summaries.
- Show action completion and action effectiveness metrics.
- Show recommendation acceptance rate and feedback trends.

---

## 5. Non-Functional Requirements

### Reliability
- The platform should provide stable behavior under normal MVP workloads.
- Core recommendation and dashboard workflows should fail gracefully.
- Errors should be observable and traceable.

### Performance
- Dashboard and account detail pages should load with acceptable interactive latency for demo and MVP usage.
- API response times should support responsive user workflows.
- Recommendation generation should complete within reasonable bounded time for targeted accounts.

### Scalability
- Architecture should support future scaling of API services, background processing, and AI orchestration.
- Data model should support growth in accounts, events, and recommendations.

### Security
- Enforce authentication and authorization.
- Protect sensitive customer and account information.
- Use secure handling for secrets and API credentials.
- Support audit logging for key user and system actions.

### Maintainability
- Use modular architecture with clear separation of concerns.
- Maintain high readability and documentation quality.
- Prefer configuration-driven behavior where possible.

### Observability
- Centralize logs, error tracking, and system metrics.
- Track recommendation generation, API health, and workflow outcomes.

### Explainability
- AI-generated outputs should include rationale and business context.
- Recommendations should be reviewable by human users.

### Compliance Readiness
- Design with future enterprise requirements in mind, including access control, auditability, and data governance.

---

## 6. High-Level System Architecture

DecisionPilot AI should follow a modular, service-oriented MVP architecture with clear boundaries between presentation, API orchestration, business logic, data storage, and AI workflows.

### Architecture Layers

#### 1. Frontend Application
- Provides dashboards, account views, recommendation views, and reporting screens.
- Consumes backend APIs.
- Presents explainable AI recommendations and user actions.

#### 2. Backend API Layer
- Exposes REST endpoints for accounts, recommendations, actions, reports, and admin functions.
- Handles authentication, authorization, validation, and orchestration.
- Coordinates with AI services and persistence layers.

#### 3. Business Logic Layer
- Computes account health signals.
- Applies business rules and scoring logic.
- Manages recommendation lifecycle and action tracking.

#### 4. AI Orchestration Layer
- Synthesizes structured customer data into recommendations and summaries.
- Coordinates planner workflows and agent responsibilities.
- Produces explainable next best action outputs.

#### 5. Data Layer
- Stores structured operational data.
- Stores recommendation records, action history, and configuration.
- Supports analytics and reporting views.

#### 6. Integration Layer
- Connects with CRM, support, analytics, and billing data sources.
- Supports ingestion pipelines or mocked data sources for the hackathon MVP.

### Conceptual Flow
1. Source systems provide customer and product signals.
2. Backend normalizes and stores unified account data.
3. Business logic derives health indicators and triggers.
4. AI orchestration generates recommendations and action plans.
5. Frontend displays prioritized insights to users.
6. User feedback and action outcomes are captured for future tuning.

---

## 7. Folder Structure

The project should use a clean, scalable structure that separates application layers and documentation.

```text
/
├─ backend/
│  ├─ src/
│  │  ├─ api/
│  │  ├─ config/
│  │  ├─ controllers/
│  │  ├─ services/
│  │  ├─ domain/
│  │  ├─ repositories/
│  │  ├─ middleware/
│  │  ├─ agents/
│  │  ├─ planners/
│  │  ├─ utils/
│  │  └─ app/
│  ├─ tests/
│  ├─ scripts/
│  └─ docs/
├─ frontend/
│  ├─ src/
│  │  ├─ app/
│  │  ├─ pages/
│  │  ├─ components/
│  │  ├─ features/
│  │  ├─ services/
│  │  ├─ hooks/
│  │  ├─ state/
│  │  ├─ types/
│  │  └─ utils/
│  ├─ public/
│  └─ tests/
├─ docs/
│  ├─ architecture/
│  ├─ api/
│  ├─ product/
│  ├─ decisions/
│  └─ runbooks/
├─ data/
│  ├─ mock/
│  ├─ seeds/
│  ├─ samples/
│  └─ mappings/
├─ infra/
│  ├─ docker/
│  ├─ deployment/
│  └─ monitoring/
├─ shared/
│  ├─ schemas/
│  ├─ constants/
│  └─ types/
├─ .github/
│  └─ workflows/
└─ PROJECT_CONTEXT.md
```

### Folder Intent
- `backend/`: API, domain logic, integrations, recommendation orchestration
- `frontend/`: user interface and client-side state management
- `docs/`: architecture, ADRs, API docs, and product documentation
- `data/`: mock datasets, seed data, transformation mappings
- `infra/`: deployment and environment configuration artifacts
- `shared/`: reusable contracts, schemas, and domain types

---

## 8. Technology Stack

The following stack is appropriate for a production-quality MVP:

### Frontend
- **React** for UI development
- **Next.js** or **Vite-based React app** for frontend application structure
- **TypeScript** for type safety
- **Tailwind CSS** or a component library for rapid, consistent UI development

### Backend
- **Node.js** for backend runtime
- **Express** or **NestJS** for API development
- **TypeScript** for maintainability and shared typing

### Database
- **PostgreSQL** as the primary relational database
- **Prisma** or equivalent ORM/query layer for schema management and data access

### AI Layer
- LLM-based recommendation and summarization workflows
- Prompt-driven or planner-driven orchestration for next best action generation
- Optional vector search in future phases for retrieval-enhanced context

### Data and Integration
- CSV, JSON, or mocked connectors for MVP ingestion
- Future support for CRM, support, analytics, and billing integrations

### DevOps and Tooling
- **Docker** for containerization
- **GitHub Actions** for CI
- **ESLint** and **Prettier** for quality and formatting
- **Jest** and/or **Vitest** for testing
- **Postman** or OpenAPI tooling for API validation and documentation

### Observability
- Structured logging
- Error tracking and metrics collection

---

## 9. Coding Standards

The team should align on the following coding standards:

### General Principles
- Prefer clarity over cleverness.
- Keep modules small and single-purpose.
- Favor explicit naming over abbreviations.
- Avoid duplicated business logic.
- Keep domain rules centralized.

### Type Safety
- Use TypeScript consistently across frontend and backend.
- Avoid `any` unless unavoidable and documented.
- Define clear interfaces/types for API contracts and domain models.

### API Design
- Use consistent naming conventions for endpoints and payloads.
- Validate all external input.
- Return structured error responses.
- Keep controller logic thin and move business logic to services/domain modules.

### Frontend Standards
- Build reusable UI components.
- Keep page logic separated from presentation components.
- Centralize API client configuration.
- Use consistent loading, empty, and error states.

### Backend Standards
- Separate controllers, services, repositories, and domain logic.
- Keep side effects isolated.
- Use configuration files or environment variables for runtime configuration.
- Avoid embedding infrastructure concerns into business logic.

### Testing Standards
- Add unit tests for business-critical logic.
- Add integration tests for core API workflows.
- Test recommendation logic with representative mock scenarios.

### Documentation Standards
- Document important architectural decisions.
- Keep API documentation updated as endpoints evolve.
- Write concise README or runbook content for local setup and demo steps.

---

## 10. Git Branch Strategy

A lightweight but disciplined branching model should be used.

### Branches
- `main`: stable, demo-ready branch
- `develop`: active integration branch for team collaboration
- `feature/<short-name>`: feature development branches
- `fix/<short-name>`: bug fix branches
- `docs/<short-name>`: documentation-only branches

### Workflow Rules
- Branch from `develop` for day-to-day work.
- Open pull requests into `develop`.
- Merge `develop` into `main` when a stable milestone is ready.
- Keep pull requests small and focused.
- Require at least one teammate review when possible.

### Naming Examples
- `feature/account-health-dashboard`
- `feature/next-best-action-engine`
- `fix/recommendation-priority-bug`
- `docs/project-context`

---

## 11. Team Responsibilities (3 Members)

### Member 1: Frontend Lead
**Primary ownership:** user interface and user experience

Responsibilities:
- Build dashboard, account detail, and recommendation management screens
- Implement frontend routing, state handling, and API integration
- Ensure usability, responsive layouts, and consistent interaction design
- Handle loading, error, and empty states
- Collaborate on demo flow and UX polish

### Member 2: Backend Lead
**Primary ownership:** API, business logic, and persistence

Responsibilities:
- Design and implement backend API structure
- Define domain models and database schema
- Implement account, recommendation, and action management logic
- Integrate mock or real data ingestion sources
- Ensure validation, security basics, and service modularity

### Member 3: AI/Platform Lead
**Primary ownership:** AI workflows, recommendation logic, and project integration

Responsibilities:
- Design next best action reasoning workflow
- Build planner prompts, explainability format, and agent orchestration
- Define scoring inputs and recommendation templates
- Support analytics and reporting logic for business insights
- Coordinate architecture, documentation, and end-to-end demo readiness

### Shared Responsibility Areas
- Code reviews
- Documentation updates
- Testing and demo preparation
- Sprint planning and task coordination

---

## 12. AI Agent Responsibilities

The AI layer should be structured into specialized responsibilities rather than one opaque model output.

### 1. Signal Analysis Agent
- Reads structured account signals
- Detects risks, opportunities, anomalies, and lifecycle triggers
- Produces normalized insight summaries

### 2. Recommendation Agent
- Converts signals into next best action recommendations
- Assigns priority, confidence, and business rationale
- Aligns output to Customer Success playbooks

### 3. Explanation Agent
- Produces concise, human-readable justification for recommendations
- Highlights the key data points behind each suggestion
- Supports transparency and trust

### 4. Planner Agent
- Breaks a recommendation into step-by-step actions
- Suggests owner, timing, and expected outcome
- Converts insight into execution guidance

### 5. Summarization Agent
- Generates account summaries for dashboards or account review pages
- Supports leadership and CSM briefings

### 6. Feedback Learning Agent
- Captures acceptance, rejection, and outcome feedback
- Supports future tuning of rules, prompts, and prioritization logic

---

## 13. Planner Workflow

The planner workflow should translate raw data into actionable operational steps.

### Workflow Stages

1. **Context Collection**
   - Gather account profile, product usage, support activity, renewal timeline, and engagement signals.

2. **Signal Detection**
   - Detect trends such as usage drop, support escalation, champion inactivity, or high feature adoption.

3. **Opportunity/Risk Classification**
   - Classify the situation into categories such as churn risk, onboarding risk, adoption gap, renewal intervention, or expansion opportunity.

4. **Recommendation Generation**
   - Produce one or more next best actions with rationale and priority.

5. **Plan Construction**
   - Convert the top recommendation into a concise action plan.
   - Example plan elements: owner, outreach type, timing, supporting evidence, success measure.

6. **Human Review**
   - Present recommendation and action plan to a user for approval or override.

7. **Execution Tracking**
   - Capture whether the action was completed and what outcome occurred.

8. **Feedback Loop**
   - Use outcome data to improve rules, prompts, and prioritization over time.

### Planner Output Example Structure
- Account name
- Current health/risk status
- Recommended action
- Why this action is suggested
- Suggested owner
- Suggested deadline
- Expected business impact
- Follow-up metric to monitor

---

## 14. Database Overview

The MVP database should be designed around a unified customer success data model.

### Core Entities
- **Accounts**: company-level customer records
- **Contacts**: people associated with accounts
- **Subscriptions**: plan, contract, renewal, and billing attributes
- **UsageMetrics**: feature usage, logins, active users, trends
- **SupportTickets**: ticket counts, severity, sentiment, resolution metrics
- **HealthScores**: calculated account health and contributing factors
- **Recommendations**: generated next best actions
- **ActionPlans**: structured execution plans tied to recommendations
- **ActionOutcomes**: user actions and business outcomes
- **Users**: internal platform users such as CSMs and managers
- **AuditLogs**: system and user activity records

### Data Modeling Considerations
- Use relational links centered around `Account` as the core entity.
- Preserve timestamps for all operational records.
- Store recommendation rationale and planner outputs for auditing.
- Support status tracking for recommendation lifecycle.
- Keep raw ingestion data logically separate from normalized application data where appropriate.

### MVP Data Sources
- Seeded mock account data
- Mock product usage events
- Mock support and subscription data
- Optionally imported CSV datasets for demonstration

---

## 15. API Overview

The backend should expose a clean API surface for frontend and workflow orchestration.

### API Domains

#### Authentication
- User login/session endpoints
- Role and permission checks

#### Accounts
- List accounts
- Get account details
- Filter accounts by owner, segment, health, or risk

#### Recommendations
- List recommendations
- Generate recommendations for an account or cohort
- Get recommendation details
- Update recommendation status such as accepted, rejected, or completed

#### Action Plans
- Get plan for a recommendation
- Update plan status and ownership
- Record outcome notes

#### Reports
- Health summary metrics
- Risk and opportunity summaries
- Recommendation acceptance metrics
- Action completion metrics

#### Admin/Configuration
- Manage scoring weights, thresholds, and playbook settings
- Manage seed or mock data refresh operations for the MVP

### API Design Principles
- Use RESTful resource naming
- Version APIs, for example `/api/v1/...`
- Return predictable JSON shapes
- Include request validation and error metadata
- Support pagination and filtering for list endpoints

---

## 16. Development Milestones

### Milestone 1: Project Foundation
- Finalize project context and architecture
- Set up repository structure
- Define domain model and API boundaries
- Establish coding standards and branching workflow

### Milestone 2: Core Data and Backend
- Set up database schema
- Implement account and recommendation core entities
- Create baseline API endpoints
- Load mock or seed datasets

### Milestone 3: Frontend MVP
- Build dashboard and account detail pages
- Integrate API calls
- Show recommendations, rationale, and account summaries

### Milestone 4: AI Recommendation Flow
- Implement signal analysis logic
- Implement next best action recommendation generation
- Implement planner workflow and explanation output

### Milestone 5: Reporting and Workflow Completion
- Add action tracking and status flows
- Add summary reporting for risk, adoption, and expansion
- Improve explainability and user feedback capture

### Milestone 6: MVP Hardening and Demo Readiness
- Test end-to-end flows
- Improve reliability and UX polish
- Prepare seeded demo scenarios
- Finalize documentation and presentation materials

---

## 17. Risks and Assumptions

### Key Risks
1. **Data quality risk**
   - Recommendations are only as good as the quality of customer data and signal mapping.

2. **Scope risk**
   - Attempting too many enterprise features during the hackathon may reduce MVP quality.

3. **AI reliability risk**
   - LLM outputs may be inconsistent without structured prompts, constraints, and human review.

4. **Integration risk**
   - Real third-party integrations may be too time-consuming for hackathon scope.

5. **Explainability risk**
   - Users may not trust recommendations if rationale is weak or opaque.

6. **Demo risk**
   - Incomplete seed data or unstable workflows could undermine the final demonstration.

### Core Assumptions
- The MVP will primarily use mock or seeded datasets.
- Authentication and authorization will be basic but thoughtfully structured.
- External integrations may be simulated rather than fully live.
- The primary audience is Customer Success stakeholders and hackathon judges.
- Explainability is mandatory for all major recommendations.
- Human review remains part of the workflow for important actions.

---

## 18. Future Enhancements

After the hackathon MVP, the platform could evolve with the following enhancements:

### Product Enhancements
- Real-time ingestion from CRM, support, product analytics, and billing systems
- Deeper health scoring models with configurable weighting
- Playbook automation and triggered workflows
- Multi-tenant enterprise account support
- Role-specific workspaces for executives, managers, and CSMs

### AI Enhancements
- Retrieval-augmented generation using historical account notes and playbooks
- Fine-tuned scoring and recommendation ranking models
- Outcome-aware recommendation optimization
- Conversational copilot for account review and planning
- Multi-agent orchestration with specialized domain skills

### Platform Enhancements
- Advanced access control and tenant isolation
- Event-driven architecture for near real-time recommendations
- Data warehouse integration for long-term analytics
- Alerting and notification system
- Audit-ready governance and compliance tooling

### Operational Enhancements
- Experimentation framework to compare recommendation strategies
- Recommendation performance dashboards
- SLA monitoring and production observability improvements
- Full CI/CD and environment promotion workflow

---

## Summary

DecisionPilot AI is intended to be a practical, explainable, and extensible enterprise AI platform for Customer Success teams in SaaS companies. The MVP should demonstrate a strong foundation across business context, data modeling, AI-assisted recommendation generation, planner workflows, and user-facing execution support.

This document provides the shared project context needed to align product, architecture, engineering, and AI workflow decisions for the hackathon build.