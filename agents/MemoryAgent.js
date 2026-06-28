import { VectorDB } from "../memory/VectorDB.js";

export class MemoryAgent {
  constructor(blackboard) {
    this.blackboard = blackboard;
    this.vectorDb = new VectorDB();
  }

  async execute(rawInput) {
    const category = this.blackboard.getState().triage.category;
    this.blackboard.log("MemoryAgent", `Initiating semantic retrieval in Vector DB for past customer cases related to [${category}]...`);
    const results = await this.vectorDb.search(rawInput, category);
    this.blackboard.update("memory.similarPastCases", results);
    if (results.length > 0) {
      results.forEach(res => {
        this.blackboard.log(
          "MemoryAgent",
          `Found Match: Account "${res.accountName}" (Similarity: ${res.similarityScore}%). Prev outcome: "${res.outcome.substring(0, 50)}...". Feedback: "${res.feedback}"`
        );
      });
    } else {
      this.blackboard.log("MemoryAgent", "No matching historical semantic memories found in vector database.");
    }
  }
}