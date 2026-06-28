import json
import os
from typing import Any
from app.agents.base_agent import BaseAgent

class KnowledgeRetrievalAgent(BaseAgent):
    name = "KnowledgeRetrievalAgent"

    def __init__(self, knowledge_path: str = None):
        if knowledge_path is None:
            # Default path relative to project root
            self.knowledge_path = os.path.join(os.getcwd(), "..", "data", "enterprise_knowledge.json")
        else:
            self.knowledge_path = knowledge_path

    def run(self, customer: dict[str, Any]) -> dict[str, Any]:
        """
        Retrieve relevant enterprise knowledge based on customer context.
        """
        customer_id = customer.get("customer_id")
        industry = customer.get("industry", "").lower()
        
        knowledge_data = self._load_knowledge()
        
        relevant_playbooks = []
        # Simple keyword matching for demo purposes
        if int(customer.get("risk_score", 0)) > 70:
            relevant_playbooks.extend([pb for pb in knowledge_data.get("playbooks", []) if "risk" in pb.get("tags", [])])
        
        if float(customer.get("revenue", 0)) > 7000000:
            relevant_playbooks.extend([pb for pb in knowledge_data.get("playbooks", []) if "enterprise" in pb.get("tags", [])])

        crm_history = knowledge_data.get("crm_history_samples", {}).get(customer_id, [])

        return {
            "evidence": {
                "playbooks": relevant_playbooks,
                "crm_history": crm_history,
                "relevant_faqs": knowledge_data.get("faq", [])[:1] # Just return one for demo
            },
            "source": "Enterprise Knowledge Base (JSON)",
            "retrieval_status": "success",
            "confidence_score": 0.95
        }

    def _load_knowledge(self) -> dict:
        try:
            if os.path.exists(self.knowledge_path):
                with open(self.knowledge_path, "r") as f:
                    return json.load(f)
            return {}
        except Exception:
            return {}
