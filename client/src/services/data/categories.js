export const CATEGORIES = {
  Technical: {
    label: "Technical / Product Issue",
    icon: "🛠️",
    keywords: ["sso", "login", "saml", "okta", "bug", "down", "error", "broken", "unstable", "integration", "patch", "blocker", "crash", "outage", "latency", "timeout", "api error", "500 error", "failing"],
    playbook: {
      name: "Technical Escalation Playbook",
      description: "Standard operating procedure when customer reports critical software bugs, integration failures, or performance issues.",
      guidelines: [
        "Categorize urgency: P1 blocker requires immediate developer response, P2/P3 can be handled asynchronously.",
        "Identify impact: Is it affecting all users or just the administrator?",
        "Required actions: Schedule technical bridge meeting, check server logs, assign dedicated engineer.",
        "Communications: Keep customer informed every 4 hours until resolution."
      ],
      rules: [
        "Do not upsell premium plans while a P1 blocker is open.",
        "Offer temporary sandbox environment if production is down."
      ]
    },
    nbaTemplates: [
      {
        title: (ctx) => `Escalate ${ctx.entityHint || "Issue"} to Tier 3 Engineering & Open War Room`,
        actionType: "Create Ticket",
        details: (ctx) => `Spawn a P1 ticket for the reported failure. Notify the on-call engineer and request a technical bridge call with ${ctx.primaryContact || "the customer contact"}.`,
        impact: "Critical resolution speed boost. Minimizes contract churn hazard.",
        priority: "High"
      },
      {
        title: () => "Provision Temporary Workaround / Sandbox Environment",
        actionType: "Sandbox Provisioning",
        details: (ctx) => `Send a backup environment or workaround to ${ctx.primaryContact || "the customer"} so their team can continue working while engineering fixes the root cause.`,
        impact: "Restores team productivity while the underlying defect is fixed.",
        priority: "Medium"
      },
      {
        title: () => "Schedule Recurring SLA Status Updates",
        actionType: "Email Customer",
        details: (ctx) => `Send automated status updates every 2-4 hours to ${ctx.primaryContact || "stakeholders"} until resolution, including logs reviewed and ETA.`,
        impact: "Maintains trust during downtime.",
        priority: "Medium"
      }
    ]
  },
  Pricing: {
    label: "Pricing / Renewal Negotiation",
    icon: "💰",
    keywords: ["price", "discount", "budget", "cost", "renewal", "contract", "competitor", "billing", "add-on", "addon", "pay", "$", "invoice", "quote", "expensive"],
    playbook: {
      name: "Renewal and Pricing Negotiations Playbook",
      description: "Best practices when discussing contract value, license counts, renewal terms, or pricing complaints.",
      guidelines: [
        "Assess discount eligibility: Up to 15% discount allowed for multi-year commits.",
        "Check usage alignment: Are they paying for unused licenses?",
        "Required actions: Schedule executive business review (EBR), offer consolidation of addon modules.",
        "Value mapping: Remind customer of ROI metrics achieved in past 6 months."
      ],
      rules: [
        "Always request a long-term commitment (24+ months) in exchange for pricing concessions.",
        "Loop in Sales VP if ARR exceeds $100k."
      ]
    },
    nbaTemplates: [
      {
        title: () => "Propose 15% Contract Discount in Exchange for 24-Month Lock-in",
        actionType: "Send Email",
        details: (ctx) => `Draft a discount proposal tying a 15% savings directly to a contract extension for ${ctx.accountName || "the account"}, defending Net Revenue Retention.`,
        impact: "Secures long-term Gross Revenue Retention while addressing budget pressure.",
        priority: "High"
      },
      {
        title: (ctx) => ctx.hasCrossSell ? "Offer Add-on Module Bundle at Reduced Rate" : "Schedule Executive Business Review (EBR)",
        actionType: (ctx) => ctx.hasCrossSell ? "Draft Deal Terms" : "Schedule Meeting",
        details: (ctx) => ctx.hasCrossSell
          ? "Bundle the requested add-on module at a reduced rate if the renewal is signed by end of month."
          : "Schedule an EBR with the decision maker to demonstrate platform ROI and usage growth achieved.",
        impact: "Defends ARR value against lower-cost competitors.",
        priority: "High"
      },
      {
        title: () => "Loop In Sales Leadership for Custom Terms Review",
        actionType: "Task Creation",
        details: (ctx) => `Set up an internal briefing to review ${ctx.accountName || "this account"}'s pricing request with sales leadership before responding.`,
        impact: "Prevents unauthorized or inconsistent discount rates.",
        priority: "Medium"
      }
    ]
  },
  Adoption: {
    label: "Adoption / Usage Decline",
    icon: "📉",
    keywords: ["adoption", "usage", "onboarding", "training", "drop", "decline", "inactive", "churned admin", "left the company", "don't know how", "engagement"],
    playbook: {
      name: "Customer Adoption Boost Playbook",
      description: "Applied when client usage drops by more than 20% month-over-month or onboarding milestones are missed.",
      guidelines: [
        "Analyze usage telemetry: Identify which core features have drop-offs.",
        "Engagement campaign: Send targeted onboarding materials/guides.",
        "Required actions: Schedule training session, set up automated weekly usage digest.",
        "Success milestone: Goal is to see active daily users increase by 15% in 30 days."
      ],
      rules: [
        "Offer free enablement workshop for user drop-off > 30%.",
        "Confirm if key admin has left the company (a common cause of adoption drop)."
      ]
    },
    nbaTemplates: [
      {
        title: () => "Schedule Hands-On Enablement & Training Workshop",
        actionType: "Schedule Meeting",
        details: (ctx) => `Reach out to ${ctx.primaryContact || "the new point of contact"} and propose a live walkthrough covering core workflows and reporting.`,
        impact: "Drives product enablement and rebuilds engagement after a contact change.",
        priority: "High"
      },
      {
        title: () => "Set Up Automated Weekly Usage Digest",
        actionType: "System Configuration",
        details: (ctx) => `Configure a weekly usage report for ${ctx.primaryContact || "the account team"}, highlighting wins and optimization tips.`,
        impact: "Re-engages dormant users and rebuilds engagement score.",
        priority: "Medium"
      },
      {
        title: () => "Launch Economic Sponsor Discovery Sequence",
        actionType: "Send Email",
        details: (ctx) => `Since the decision maker is unclear, send a discovery email asking ${ctx.primaryContact || "the contact"} who owns the renewal budget.`,
        impact: "Mitigates silent churn risk from an unknown decision maker.",
        priority: "High"
      }
    ]
  },
  Security: {
    label: "Security / Compliance Concern",
    icon: "🔒",
    keywords: ["security", "breach", "vulnerability", "compliance", "audit", "gdpr", "soc 2", "soc2", "hipaa", "data leak", "penetration test", "pen test", "incident", "unauthorized access", "encryption"],
    playbook: {
      name: "Security & Compliance Response Playbook",
      description: "Applied when a customer raises a security concern, compliance audit request, or potential data incident.",
      guidelines: [
        "Triage severity: Confirmed breach vs. theoretical vulnerability vs. routine audit/questionnaire request.",
        "Loop in Security/Compliance team within 1 hour for any confirmed incident.",
        "Provide requested compliance documentation (SOC 2, GDPR DPA) promptly to avoid stalling renewal/legal review.",
        "Never speculate on root cause publicly before the security team confirms findings."
      ],
      rules: [
        "Any suspected data breach must be escalated immediately — do not wait for the next business day.",
        "Compliance documentation requests should be fulfilled within 48 hours to avoid blocking procurement."
      ]
    },
    nbaTemplates: [
      {
        title: () => "Escalate to Security Incident Response Team",
        actionType: "Create Ticket",
        details: (ctx) => `Open a security incident ticket and notify the Security on-call lead. Provide ${ctx.primaryContact || "the customer"} an initial acknowledgement within the hour.`,
        impact: "Limits exposure and demonstrates incident-response rigor to the customer.",
        priority: "High"
      },
      {
        title: () => "Provide Compliance Documentation Package",
        actionType: "Send Email",
        details: (ctx) => `Send current SOC 2 report, DPA, and security questionnaire responses to ${ctx.primaryContact || "the requester"}.`,
        impact: "Unblocks procurement/legal review and reduces renewal friction.",
        priority: "Medium"
      },
      {
        title: () => "Schedule Security Debrief Call",
        actionType: "Schedule Meeting",
        details: (ctx) => `Arrange a call with the customer's security team and ${ctx.decisionMaker || "their technical lead"} to walk through findings and remediation timeline.`,
        impact: "Builds trust and keeps the account informed during a sensitive period.",
        priority: "Medium"
      }
    ]
  },
  Onboarding: {
    label: "Onboarding / Implementation",
    icon: "🚀",
    keywords: ["onboarding", "implementation", "kickoff", "go-live", "setup", "migration", "data import", "new account", "getting started", "configure", "provisioning"],
    playbook: {
      name: "Customer Onboarding & Implementation Playbook",
      description: "Applied during early-lifecycle setup, data migration, or go-live coordination for new or expanding accounts.",
      guidelines: [
        "Confirm a named implementation owner on the customer side before scheduling kickoff.",
        "Set a go-live date within the first 30 days of contract start.",
        "Track milestone completion: data migration, integration setup, admin training.",
        "Flag accounts at risk of onboarding delay past 45 days as at-risk."
      ],
      rules: [
        "Do not consider onboarding complete until the customer has logged in and completed first core workflow.",
        "Escalate to Implementation Manager if go-live slips more than once."
      ]
    },
    nbaTemplates: [
      {
        title: () => "Schedule Kickoff / Implementation Planning Call",
        actionType: "Schedule Meeting",
        details: (ctx) => `Coordinate with ${ctx.primaryContact || "the implementation owner"} to confirm scope, timeline, and go-live date.`,
        impact: "Establishes momentum and a clear shared timeline for go-live.",
        priority: "High"
      },
      {
        title: () => "Assign Dedicated Implementation Specialist",
        actionType: "Task Creation",
        details: (ctx) => `Assign a specialist to guide ${ctx.accountName || "the account"} through data migration and integration setup.`,
        impact: "Reduces time-to-value and risk of onboarding stall.",
        priority: "High"
      },
      {
        title: () => "Send Onboarding Milestone Tracker",
        actionType: "Email Customer",
        details: (ctx) => `Share a milestone checklist with ${ctx.primaryContact || "the customer"} so progress toward go-live is visible to both sides.`,
        impact: "Improves transparency and reduces perceived implementation risk.",
        priority: "Medium"
      }
    ]
  },
  Billing: {
    label: "Billing / Operations Issue",
    icon: "🧾",
    keywords: ["invoice", "billing error", "overcharge", "duplicate charge", "payment failed", "refund", "credit note", "wrong amount", "billing cycle", "purchase order", "po number"],
    playbook: {
      name: "Billing Operations Playbook",
      description: "Applied when a customer reports a billing discrepancy, payment failure, or invoicing/PO issue.",
      guidelines: [
        "Verify the discrepancy against the signed order form before responding.",
        "Issue credit notes within 5 business days of a confirmed billing error.",
        "Route purchase-order or procurement-portal issues to the billing operations team, not engineering.",
        "Communicate clearly whether an issue is a billing error or a usage-based charge the customer misunderstood."
      ],
      rules: [
        "Never issue a refund or credit without confirming the discrepancy against the contract.",
        "Loop in Finance for any credit note exceeding $5,000."
      ]
    },
    nbaTemplates: [
      {
        title: () => "Audit Invoice Against Signed Order Form",
        actionType: "Task Creation",
        details: (ctx) => `Compare the disputed invoice for ${ctx.accountName || "the account"} against the contract to confirm whether this is a billing error or a usage charge.`,
        impact: "Establishes facts before committing to a credit or refund.",
        priority: "High"
      },
      {
        title: () => "Issue Credit Note or Corrected Invoice",
        actionType: "Send Email",
        details: (ctx) => `If the discrepancy is confirmed, issue a corrected invoice or credit note to ${ctx.primaryContact || "billing contact"} within 5 business days.`,
        impact: "Resolves the financial dispute and protects the relationship.",
        priority: "Medium"
      },
      {
        title: () => "Route to Billing Operations / Finance",
        actionType: "Create Ticket",
        details: () => "Hand off the procurement/PO-specific portion of the issue to Billing Operations for resolution outside the CS team's scope.",
        impact: "Ensures the right team owns financial reconciliation.",
        priority: "Medium"
      }
    ]
  }
};

export function getCategoryNames() {
  return Object.keys(CATEGORIES);
}

export function registerCategory(name, definition) {
  if (CATEGORIES[name]) throw new Error(`Category "${name}" already exists.`);
  CATEGORIES[name] = definition;
}