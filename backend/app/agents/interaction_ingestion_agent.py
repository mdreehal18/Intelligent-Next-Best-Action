"""
interaction_ingestion_agent.py
------------------------------
Ingests and summarizes customer interactions (meetings, emails, CRM updates)
from multiple data sources and extracts actionable context for the decision
pipeline.

Reads from:
  - data/meeting_notes/meetings.json
  - data/sample_crm/interactions.json

Output schema
-------------
{
    "interaction_summary": str,
    "total_interactions": int,
    "meetings_count": int,
    "emails_count": int,
    "support_tickets_count": int,
    "sentiment_trend": str,       # "positive" | "neutral" | "negative" | "mixed"
    "recent_meetings": list,
    "recent_interactions": list,
    "risk_signals": list[str],
    "action_items_pending": int,
    "last_contact_days_ago": int
}
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from typing import Any


class InteractionIngestionAgent:
    """Ingests customer interactions and extracts context for downstream agents."""

    name = "InteractionIngestionAgent"

    def __init__(self) -> None:
        base = os.path.join(os.getcwd(), "..", "data")
        self._meetings_path = os.path.join(base, "meeting_notes", "meetings.json")
        self._interactions_path = os.path.join(base, "sample_crm", "interactions.json")

    def run(self, customer: dict[str, Any]) -> dict[str, Any]:
        customer_id = customer.get("customer_id", "")

        meetings = self._load_meetings(customer_id)
        interactions = self._load_interactions(customer_id)

        # Count by type
        emails = [i for i in interactions if i.get("channel") == "email"]
        calls = [i for i in interactions if i.get("channel") == "call"]
        support = [i for i in interactions if i.get("channel") == "support"]

        # Collect risk signals from meetings
        risk_signals: list[str] = []
        for mtg in meetings:
            risk_signals.extend(mtg.get("risk_signals", []))

        # Count pending action items
        action_items = sum(
            len(mtg.get("action_items", [])) for mtg in meetings
        )

        # Determine sentiment trend
        sentiment_trend = self._analyze_sentiment(meetings)

        # Calculate days since last contact
        last_contact = self._days_since_last_contact(
            customer.get("last_interaction", "")
        )

        # Build summary
        total = len(meetings) + len(interactions)
        summary = (
            f"{customer.get('name', 'Customer')} has {total} recorded interactions: "
            f"{len(meetings)} meetings, {len(emails)} emails, {len(calls)} calls, "
            f"and {len(support)} support tickets. "
            f"Overall sentiment trend is {sentiment_trend}."
        )
        if risk_signals:
            summary += f" {len(risk_signals)} risk signal(s) detected."
        if last_contact and last_contact > 14:
            summary += f" Last contact was {last_contact} days ago — follow-up may be needed."

        return {
            "interaction_summary": summary,
            "total_interactions": total,
            "meetings_count": len(meetings),
            "emails_count": len(emails),
            "support_tickets_count": len(support),
            "sentiment_trend": sentiment_trend,
            "recent_meetings": meetings[:3],
            "recent_interactions": interactions[:5],
            "risk_signals": risk_signals,
            "action_items_pending": action_items,
            "last_contact_days_ago": last_contact,
        }

    def _load_meetings(self, customer_id: str) -> list[dict]:
        try:
            if os.path.exists(self._meetings_path):
                with open(self._meetings_path, "r") as f:
                    all_meetings = json.load(f)
                return [
                    m for m in all_meetings
                    if m.get("customer_id") == customer_id
                ]
        except Exception:
            pass
        return []

    def _load_interactions(self, customer_id: str) -> list[dict]:
        try:
            if os.path.exists(self._interactions_path):
                with open(self._interactions_path, "r") as f:
                    all_interactions = json.load(f)
                return all_interactions.get(customer_id, [])
        except Exception:
            pass
        return []

    @staticmethod
    def _analyze_sentiment(meetings: list[dict]) -> str:
        if not meetings:
            return "neutral"

        sentiments = [m.get("sentiment", "neutral") for m in meetings]
        neg = sum(1 for s in sentiments if s in ("negative", "very_negative"))
        pos = sum(1 for s in sentiments if s in ("positive", "very_positive"))

        if neg > pos and neg >= 2:
            return "negative"
        if pos > neg and pos >= 2:
            return "positive"
        if neg > 0 and pos > 0:
            return "mixed"
        if neg > 0:
            return "negative"
        if pos > 0:
            return "positive"
        return "neutral"

    @staticmethod
    def _days_since_last_contact(last_interaction: str) -> int:
        if not last_interaction:
            return 0
        try:
            last = datetime.strptime(last_interaction, "%Y-%m-%d")
            now = datetime.now()
            return max(0, (now - last).days)
        except (ValueError, TypeError):
            return 0
