export const SCENARIOS = [
  {
    id: "scen_technical",
    title: "SSO Login Blocker",
    description: "Enterprise client reporting critical SSO integration failures during rollout.",
    category: "Technical",
    rawInput: `From: Sarah Jenkins <sjenkins@acmecorp.com>
Subject: URGENT: Okta SSO Integration Down
Date: June 27, 2026
Hi Team,
Our teams are completely blocked from logging in since the update you pushed last night. We have 450 engineers sitting idle because the Okta SAML token validation keeps returning a 'Signature mismatch' error.
This is a critical P1 blocker for us. Our VP of Engineering is breathing down my neck. Please assign an engineer immediately and let us know what the fix is. We cannot roll out this tool if authentication is this unstable.`,
    context: {
      accountName: "Acme Corp",
      arr: "$120,000",
      renewalDays: 45,
      usageChange: "-5%",
      primaryContact: "Sarah Jenkins (IT Administrator)",
      decisionMaker: "Robert Chen (VP of Engineering)"
    }
  },
  {
    id: "scen_pricing",
    title: "Contract Renewal & Pricing Complaint",
    description: "Account complains about pricing and threatens to churn at upcoming renewal.",
    category: "Pricing",
    rawInput: `Meeting Transcript Excerpt (T-90 Days Renewal Sync)
Customer: "Look, we like the platform, but $85k/year is just too steep for our current budget constraints. Competitors are pitching us at $60k. If we don't get a substantial discount—at least 20%—we will have to transition off. We also want to know if you can bundle the Advanced Security addon for free."
CSM: "I understand the budget pressure. Let me review what options we have to keep your account active."`,
    context: {
      accountName: "NovaLogistics Inc",
      arr: "$85,000",
      renewalDays: 90,
      usageChange: "+15%",
      primaryContact: "David Vance (Ops Director)",
      decisionMaker: "David Vance (Ops Director)"
    }
  },
  {
    id: "scen_adoption",
    title: "Drastic Usage Drop",
    description: "CRM alert showing user activity has dropped significantly, with risk of churn.",
    category: "Adoption",
    rawInput: `CRM Activity Log Alert:
Customer: Vertex Software
Telemetry Alert: User engagement score dropped from 84/100 to 32/100 over the past 30 days. Weekly active users decreased by 42%.
Notes from Account Manager:
'Had a check-in call. The original project sponsor, Chloe Miller, left the company last month. The new team lead, James, isn't familiar with our platform and doesn't know how to run reports. He's asking if we have training sessions, or if they should cancel their subscription.'`,
    context: {
      accountName: "Vertex Software",
      arr: "$45,000",
      renewalDays: 120,
      usageChange: "-42%",
      primaryContact: "James Patel (Team Lead)",
      decisionMaker: "Unknown"
    }
  },
  {
    id: "scen_security",
    title: "Potential Data Security Incident",
    description: "Customer reports a possible unauthorized access event and asks for compliance documentation.",
    category: "Security",
    rawInput: `Slack message from customer's IT Security lead:
"Hey, one of our analysts noticed an unusual login from an unrecognized IP on one of our admin accounts in your platform last night. We need to know immediately if this was a breach on your end or ours. Also — our legal team is asking for your latest SOC 2 report and DPA ahead of our security audit next week, this is somewhat urgent as the audit is compliance-mandated."`,
    context: {
      accountName: "Halcyon Biotech",
      arr: "$95,000",
      renewalDays: 200,
      usageChange: "0%",
      primaryContact: "Priya Nair (IT Security Lead)",
      decisionMaker: "Unknown"
    }
  },
  {
    id: "scen_onboarding",
    title: "Stalled Implementation / Go-Live Delay",
    description: "New account is behind schedule on data migration and has no clear go-live date.",
    category: "Onboarding",
    rawInput: `Internal CS note after kickoff follow-up call:
"Talked to the new account, Meridian Freight. They signed 5 weeks ago but haven't started the data migration yet — they said their internal IT team has been slow to provision API credentials. No go-live date has been set. The contact, Tom Reyes, seems uncertain about how to configure the integration and is waiting on us to walk him through setup."`,
    context: {
      accountName: "Meridian Freight",
      arr: "$60,000",
      renewalDays: 330,
      usageChange: "0%",
      primaryContact: "Tom Reyes (Operations Manager)",
      decisionMaker: "Unknown"
    }
  },
  {
    id: "scen_billing",
    title: "Duplicate Invoice Charge Dispute",
    description: "Customer was billed twice for the same invoicing cycle and is requesting an immediate refund.",
    category: "Billing",
    rawInput: `Email from billing@northstarretail.com:
Subject: Duplicate Charge on Invoice #88213 — Please Refund
"We were charged twice for our May subscription — once on the 1st and again on the 14th, both for $7,500. Our finance team has flagged this and our purchase order only authorizes one charge per month. Please confirm this is an error and issue a credit note as soon as possible, this is holding up our month-end reconciliation."`,
    context: {
      accountName: "Northstar Retail Group",
      arr: "$90,000",
      renewalDays: 250,
      usageChange: "+2%",
      primaryContact: "billing@northstarretail.com",
      decisionMaker: "Unknown"
    }
  },
  {
    id: "scen_blank",
    title: "🆕 Write Your Own / Paste New Issue",
    description: "Start from a blank input. Paste any real customer email, transcript, or CRM note — the pipeline works on any text, not just the examples above.",
    category: "Adoption",
    rawInput: "",
    context: {
      accountName: "",
      arr: "",
      renewalDays: "",
      usageChange: "0%",
      primaryContact: "",
      decisionMaker: ""
    }
  }
];