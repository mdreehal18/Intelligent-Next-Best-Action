import { apiFetch } from "../api.js";

export class VectorDB {
  constructor() {
    this.storageKey = "nba_platform_vectordb_memories";
    this._memoryFallback = null;
    this.initializeDefaultMemories();
  }
  initializeDefaultMemories() {
    const existing = typeof localStorage !== 'undefined' ? localStorage.getItem(this.storageKey) : this._memoryFallback;
    if (existing) {
      this.memories = JSON.parse(existing);
      return;
    }
    this.memories = [
      {
        id: "mem_1", accountName: "Cyberdyne Systems", category: "Technical",
        rawInput: "SSO Login error with Signature mismatch after SAML upgrade.",
        outcome: "Approved immediate Sandbox creation & assigned Tier 3 engineer.",
        feedback: "Highly successful. Customer was pleased that they had a workaround while engineering fixed the SAML cert mismatch within 3 hours.",
        status: "Approved", vectorText: "", embedding: null
      },
      {
        id: "mem_2", accountName: "Weyland-Yutani Corp", category: "Pricing",
        rawInput: "Client requested 25% discount due to competitor pitch of $50k. Renewal at risk.",
        outcome: "Proposed 15% discount for a 2-year contract renewal plus free Advanced Security Add-on bundle.",
        feedback: "Approved and closed. Customer accepted the 2-year lock-in and felt they got premium value with the security bundle.",
        status: "Approved", vectorText: "", embedding: null
      },
      {
        id: "mem_3", accountName: "Tyrell Replicants", category: "Adoption",
        rawInput: "Adoption down 35% after lead admin resigned. New manager has no training.",
        outcome: "Scheduled free hands-on training workshop and set up weekly usage reports dashboard.",
        feedback: "Success. New manager ramped up, active users recovered by 22% in 3 weeks.",
        status: "Approved", vectorText: "", embedding: null
      },
      {
        id: "mem_4", accountName: "Stark Industries", category: "Pricing",
        rawInput: "Requested a 30% flat discount on renewal. Refused long-term lock-in.",
        outcome: "CSM offered a 5% discount. Recommendation was rejected by management.",
        feedback: "Rejected. Management noted that Stark Industries has high product adoption and low churn probability. Offering discounts too early ruins contract value. Better to stand firm or bundle services.",
        status: "Rejected", vectorText: "", embedding: null
      },
      {
        id: "mem_5", accountName: "Umbrella Health Systems", category: "Security",
        rawInput: "Customer flagged unauthorized login attempt and requested SOC 2 report urgently for an audit.",
        outcome: "Escalated to security on-call within 30 minutes, confirmed false alarm (employee traveling), sent SOC 2 report same day.",
        feedback: "Approved and closed fast. Customer specifically praised the response speed in a follow-up email.",
        status: "Approved", vectorText: "", embedding: null
      },
      {
        id: "mem_6", accountName: "Gallifrey Logistics", category: "Billing",
        rawInput: "Customer disputed a duplicate charge on their monthly invoice and requested a credit note.",
        outcome: "Confirmed billing system error, issued credit note within 2 business days.",
        feedback: "Approved. Customer satisfied with quick resolution; flagged the billing system bug internally to prevent recurrence.",
        status: "Approved", vectorText: "", embedding: null
      },
      {
        id: "mem_7", accountName: "Aperture Dynamics", category: "Onboarding",
        rawInput: "New account stalled on data migration five weeks post-signature with no go-live date set.",
        outcome: "Assigned dedicated implementation specialist and set a hard go-live date with weekly check-ins.",
        feedback: "Approved. Go-live achieved within 3 weeks of intervention; customer onboarding NPS improved significantly.",
        status: "Approved", vectorText: "", embedding: null
      }
    ];
    this.save();
  }
  save() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, JSON.stringify(this.memories));
    } else {
      this._memoryFallback = JSON.stringify(this.memories);
    }
  }
  async addMemory({ accountName, category, rawInput, outcome, feedback, status }) {
    const id = "mem_" + Date.now();
    let embedding = null;
    try {
      const resp = await apiFetch('/api/embed', {
        method: 'POST',
        body: JSON.stringify({ input: rawInput })
      });
      if (resp.ok) {
        const json = await resp.json();
        embedding = json.embedding;
      }
    } catch (e) { /* fallback – no embedding stored */ }
    this.memories.unshift({ id, accountName, category, rawInput, outcome, feedback, status, vectorText: "", embedding });
    this.save();
  }
  async search(queryText, category, limit = 2) {
    let queryEmbedding = null;
    try {
      const resp = await apiFetch('/api/embed', {
        method: 'POST',
        body: JSON.stringify({ input: queryText })
      });
      if (resp.ok) {
        const json = await resp.json();
        queryEmbedding = json.embedding;
      }
    } catch (e) { /* ignore */ }

    if (queryEmbedding && this.memories.some(m => m.embedding)) {
      const scored = this.memories
        .filter(m => m.embedding)
        .map(m => ({
          ...m,
          similarity: this._cosine(queryEmbedding, m.embedding) + (m.category === category ? 0.1 : 0)
        }));
      scored.sort((a, b) => b.similarity - a.similarity);
      return scored.slice(0, limit).map(s => ({
        ...s,
        similarityScore: Math.round(s.similarity * 100)
      }));
    }
    return this._lexicalSearch(queryText, category, limit);
  }
  _cosine(a, b) {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
  }
  _lexicalSearch(queryText, category, limit) {
    const queryTokens = this.tokenize(queryText);
    const scores = this.memories.map(item => {
      const itemTokens = this.tokenize((item.vectorText || `${item.accountName} ${item.category} ${item.rawInput}`));
      const intersection = new Set([...queryTokens].filter(x => itemTokens.has(x)));
      const union = new Set([...queryTokens, ...itemTokens]);
      let similarity = union.size > 0 ? intersection.size / union.size : 0;
      if (item.category.toLowerCase() === category.toLowerCase()) similarity += 0.2;
      return { ...item, similarityScore: Math.round(Math.min(similarity, 1) * 100) };
    });
    scores.sort((a, b) => b.similarityScore - a.similarityScore);
    return scores.slice(0, limit);
  }
  tokenize(text) {
    return new Set(
      text.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(t => t.length > 2)
    );
  }
  getMemories() {
    return [...this.memories];
  }
  clear() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.storageKey);
    } else {
      this._memoryFallback = null;
    }
    this.initializeDefaultMemories();
  }
}
