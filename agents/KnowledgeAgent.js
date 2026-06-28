import { CATEGORIES } from "../data/categories.js";

export class KnowledgeAgent {
  constructor(blackboard) {
    this.blackboard = blackboard;
  }

  async execute() {
    const category = this.blackboard.getState().triage.category;
    this.blackboard.log("KnowledgeAgent", `Retrieving playbooks and operational guidelines for category: [${category}]...`);

    const categoryDef = CATEGORIES[category];
    const playbook = categoryDef ? categoryDef.playbook : null;

    if (playbook) {
      this.blackboard.update("knowledge.retrievedPlaybook", playbook);
      this.blackboard.update("knowledge.retrievedDocs", playbook.guidelines);
      this.blackboard.log(
        "KnowledgeAgent",
        `Successfully retrieved "${playbook.name}" containing ${playbook.guidelines.length} guidelines and ${playbook.rules.length} enforcement rules.`
      );
    } else {
      this.blackboard.log(
        "KnowledgeAgent",
        `Warning: No specific playbook found for category [${category}]. Loading general operational policy docs.`
      );
      this.blackboard.update("knowledge.retrievedPlaybook", {
        name: "General SOP",
        description: "No category-specific playbook exists yet for this issue type.",
        guidelines: ["Respond to client within SLA", "Log all communications in CRM"],
        rules: []
      });
      this.blackboard.update("knowledge.retrievedDocs", ["Respond to client within SLA", "Log all communications in CRM"]);
    }
  }
}