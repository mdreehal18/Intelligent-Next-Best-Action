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
        Retrieve relevant enterprise knowledge, playbooks, and CRM history based on customer context.
        """
        customer_id = customer.get("customer_id")
        industry = customer.get("industry", "").lower()
        risk_score = int(customer.get("risk_score", 0))
        revenue = float(customer.get("revenue", 0))
        
        knowledge_data = self._load_knowledge()
        
        relevant_playbooks = []
        # Dynamic playbook matching
        if risk_score > 70:
            relevant_playbooks.extend([pb for pb in knowledge_data.get("playbooks", []) if "risk" in pb.get("tags", [])])
        elif risk_score < 40 and revenue > 5000000:
            relevant_playbooks.extend([pb for pb in knowledge_data.get("playbooks", []) if "champion" in pb.get("tags", []) or "expansion" in pb.get("tags", [])])
        
        if revenue > 7000000:
            relevant_playbooks.extend([pb for pb in knowledge_data.get("playbooks", []) if "enterprise" in pb.get("tags", [])])
        elif revenue > 3000000:
            relevant_playbooks.extend([pb for pb in knowledge_data.get("playbooks", []) if "growth" in pb.get("tags", [])])

        # Retrieve specific CRM history
        crm_history = knowledge_data.get("crm_history_samples", {}).get(customer_id, [])

        return {
            "evidence": {
                "playbooks": relevant_playbooks[:3],  # top 3 relevant playbooks
                "crm_history": crm_history,
                "relevant_faqs": knowledge_data.get("faq", [])[:2],
                "product_docs": knowledge_data.get("product_documentation", [])
            },
            "source": "Enterprise Knowledge Library",
            "retrieval_status": "success",
            "confidence_score": 0.98 if relevant_playbooks else 0.85
        }

    def _load_knowledge(self) -> dict:
        try:
            if os.path.exists(self.knowledge_path):
                with open(self.knowledge_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            return {}
        except Exception:
            return {}
