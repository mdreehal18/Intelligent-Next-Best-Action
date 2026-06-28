export class InteractionAgent {
  constructor(blackboard) {
    this.blackboard = blackboard;
  }

  async execute(rawInput) {
    this.blackboard.log("InteractionAgent", "Extracting sentiment, urgency, intent, and entities...");

    // Try LLM extraction
    const llmResult = await this._llmExtract(rawInput);
    if (llmResult) {
      this.blackboard.update("extraction.sentiment", llmResult.sentiment);
      this.blackboard.update("extraction.sentimentScore", llmResult.sentimentScore);
      this.blackboard.update("extraction.urgency", llmResult.urgency);
      this.blackboard.update("extraction.intent", llmResult.intent);
      this.blackboard.update("extraction.entities", llmResult.entities);
    } else {
      // Original keyword-based extraction (unchanged)
      const text = rawInput.toLowerCase();
      let sentiment = "Neutral";
      let sentimentScore = 0.5;
      if (text.includes("urgent") || text.includes("down") || text.includes("blocked") || text.includes("frustrated") || text.includes("unstable") || text.includes("too steep") || text.includes("threaten") || text.includes("cancel")) {
        sentiment = "Negative";
        sentimentScore = 0.15;
      } else if (text.includes("like the platform") || text.includes("success") || text.includes("pleased") || text.includes("happy")) {
        sentiment = "Positive";
        sentimentScore = 0.85;
      }
      let urgency = "Medium";
      if (text.includes("critical") || text.includes("p1") || text.includes("immediately") || text.includes("down")) {
        urgency = "P1 Blocker";
      } else if (text.includes("urgent") || text.includes("cancel") || text.includes("threat") || text.includes("sjenkins") || text.includes("breathing down my neck")) {
        urgency = "High";
      } else if (text.includes("how to run") || text.includes("training") || text.includes("inquiry")) {
        urgency = "Low";
      }
      let intent = "Inquiry";
      if (text.includes("sso") && text.includes("down")) {
        intent = "Critical System Integration Blocker";
      } else if (text.includes("discount") || text.includes("renewal") || text.includes("budget")) {
        intent = "Renewal / Pricing concession renegotiation";
      } else if (text.includes("onboarding") || text.includes("drop") || text.includes("training")) {
        intent = "Adoption Enablement Request";
      }
      const entities = [];
      if (text.includes("okta")) entities.push("Okta SAML Provider");
      if (text.includes("sso")) entities.push("Single Sign-On");
      if (text.includes("discount")) entities.push("Discount Proposal");
      if (text.includes("training") || text.includes("workshop")) entities.push("Training & Enablement");
      const matchName = rawInput.match(/(Sarah Jenkins|Robert Chen|Chloe Miller|James Patel|David Vance)/gi);
      if (matchName) matchName.forEach(name => { if (!entities.includes(name)) entities.push(name); });

      this.blackboard.update("extraction.sentiment", sentiment);
      this.blackboard.update("extraction.sentimentScore", sentimentScore);
      this.blackboard.update("extraction.urgency", urgency);
      this.blackboard.update("extraction.intent", intent);
      this.blackboard.update("extraction.entities", entities);
    }
    const state = this.blackboard.getState();
    this.blackboard.log("InteractionAgent",
      `Extraction complete: Sentiment = ${state.extraction.sentiment} (${state.extraction.sentimentScore}), Urgency = ${state.extraction.urgency}, Intent = "${state.extraction.intent}".`
    );
  }

  async _llmExtract(text) {
    try {
      const resp = await fetch('/api/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: `Extract from the message:
- sentiment: positive, neutral, negative
- urgency: low, medium, high, critical
- intent: short phrase describing the customer's goal
- entities: list of names, products, or technologies mentioned

Output ONLY valid JSON: {"sentiment":"...","urgency":"...","intent":"...","entities":[...]}` },
            { role: 'user', content: text }
          ],
          temperature: 0.1,
          max_tokens: 300
        })
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      const parsed = JSON.parse(data.content);
      // Convert sentiment to numeric score
      parsed.sentimentScore = parsed.sentiment === 'positive' ? 0.85 :
                              parsed.sentiment === 'negative' ? 0.15 : 0.5;
      return parsed;
    } catch (e) { return null; }
  }
}