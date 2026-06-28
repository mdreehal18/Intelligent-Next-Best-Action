"""
business_rules.py
-----------------
Configurable banking business-rules engine.

Rules are stored as typed dataclasses, evaluated against a customer dict,
and exposed through a small set of reusable module-level functions.  All
rules live in one place so domain experts can add, modify, or disable them
without touching agent logic.

Rule structure
--------------
  BusinessRule
    rule_id          — unique snake_case identifier
    name             — human-readable label
    description      — plain-English intent
    conditions       — list[RuleCondition], all must match (AND semantics)
    action           — "recommend" | "restrict" | "flag" | "escalate"
    recommendation   — product to suggest (action == "recommend")
    blocked_products — products to disallow (action == "restrict")
    priority         — int, lower = evaluated first (default 50)
    active           — bool, False rules are silently skipped

  RuleCondition
    field     — key to look up in the customer dict
                (risk_score, industry, segment, revenue, products)
    operator  — ">" | ">=" | "<" | "<=" | "==" | "!=" | "in" | "not_in"
    value     — threshold, string, or list to compare against

Built-in rules (loaded on import)
----------------------------------
  RULE001  risk_score > 70            →  restrict  (no loan products)
  RULE002  industry == "Technology"   →  recommend Trade Finance
  RULE003  industry == "Retail"       →  recommend Business Credit Card
  RULE004  industry == "Manufacturing"→  recommend Working Capital Loan
  RULE005  segment  == "Enterprise"   →  recommend Corporate Credit Line
  RULE006  risk_score > 70            →  flag for human review

Reusable module-level functions
--------------------------------
  evaluate_rules(customer)              → list[dict]   all matching rules
  get_recommendation(customer)          → str | None   highest-priority product
  get_blocked_products(customer)        → list[str]    all blocked product names
  is_product_allowed(customer, product) → bool
  get_flagged_rules(customer)           → list[dict]   rules with action "flag"
  add_rule(rule)                        → None
  remove_rule(rule_id)                  → bool
  get_all_rules()                       → list[dict]
"""

from __future__ import annotations

from dataclasses import dataclass, field
from threading import Lock
from typing import Any

# ─────────────────────────────────────────────────────────────────────────────
# Rule building blocks
# ─────────────────────────────────────────────────────────────────────────────


@dataclass
class RuleCondition:
    """
    One condition within a BusinessRule.

    Supported operators
    -------------------
    Numeric : ">"  ">="  "<"  "<="  "=="  "!="
    String  : "=="  "!="
    Membership: "in"  "not_in"   (value must be a list)
    """

    field: str
    operator: str
    value: Any


@dataclass
class BusinessRule:
    """
    A single configurable banking rule.

    Parameters
    ----------
    rule_id          : str              Unique snake_case identifier.
    name             : str              Human-readable label.
    description      : str              Plain-English intent.
    conditions       : list[RuleCondition]
                                        All must hold (AND semantics).
    action           : str              "recommend" | "restrict" | "flag" | "escalate"
    recommendation   : str | None       Product to suggest (action == "recommend").
    blocked_products : list[str]        Products to disallow (action == "restrict").
    priority         : int              Lower value = evaluated first.  Default 50.
    active           : bool             False rules are silently skipped.
    """

    rule_id: str
    name: str
    description: str
    conditions: list[RuleCondition]
    action: str
    recommendation: str | None = field(default=None)
    blocked_products: list[str] = field(default_factory=list)
    priority: int = field(default=50)
    active: bool = field(default=True)

    def to_dict(self) -> dict[str, Any]:
        return {
            "rule_id": self.rule_id,
            "name": self.name,
            "description": self.description,
            "conditions": [
                {"field": c.field, "operator": c.operator, "value": c.value}
                for c in self.conditions
            ],
            "action": self.action,
            "recommendation": self.recommendation,
            "blocked_products": list(self.blocked_products),
            "priority": self.priority,
            "active": self.active,
        }


# ─────────────────────────────────────────────────────────────────────────────
# Rule match result
# ─────────────────────────────────────────────────────────────────────────────


@dataclass
class RuleMatch:
    """The result of one rule firing against a customer profile."""

    rule_id: str
    name: str
    action: str
    recommendation: str | None
    blocked_products: list[str]
    priority: int
    reason: str  # human-readable match summary


# ─────────────────────────────────────────────────────────────────────────────
# Engine
# ─────────────────────────────────────────────────────────────────────────────


class BusinessRulesEngine:
    """Holds and evaluates all configurable business rules."""

    def __init__(self) -> None:
        self._rules: list[BusinessRule] = []
        self._lock: Lock = Lock()
        self._load_defaults()

    # ── Write ─────────────────────────────────────────────────────────────

    def add_rule(self, rule: BusinessRule) -> None:
        """
        Append a new rule.  Inserted in priority order.

        Parameters
        ----------
        rule : BusinessRule
        """
        with self._lock:
            self._rules.append(rule)
            self._rules.sort(key=lambda r: r.priority)

    def remove_rule(self, rule_id: str) -> bool:
        """
        Remove a rule by its ``rule_id``.

        Returns
        -------
        bool
            ``True`` if the rule was found and removed, ``False`` otherwise.
        """
        with self._lock:
            before = len(self._rules)
            self._rules = [r for r in self._rules if r.rule_id != rule_id]
            return len(self._rules) < before

    def set_active(self, rule_id: str, active: bool) -> bool:
        """Enable or disable a rule without removing it."""
        with self._lock:
            for rule in self._rules:
                if rule.rule_id == rule_id:
                    object.__setattr__(rule, "active", active) if hasattr(
                        rule, "__dataclass_fields__"
                    ) else None
                    rule.active = active  # dataclass is not frozen here
                    return True
        return False

    # ── Read / evaluate ───────────────────────────────────────────────────

    def evaluate(self, customer: dict[str, Any]) -> list[dict[str, Any]]:
        """
        Evaluate all active rules against *customer* and return every match.

        Parameters
        ----------
        customer : dict
            Customer profile with keys such as ``risk_score``, ``industry``,
            ``segment``, ``revenue``, ``products``.

        Returns
        -------
        list[dict]
            One dict per matching rule, sorted by priority ascending.
        """
        matches: list[RuleMatch] = []

        with self._lock:
            active_rules = [r for r in self._rules if r.active]

        for rule in active_rules:
            if self._match_rule(rule, customer):
                matches.append(self._build_match(rule, customer))

        return [self._match_to_dict(m) for m in matches]

    def get_recommendation(self, customer: dict[str, Any]) -> str | None:
        """
        Return the recommendation from the highest-priority matching
        ``"recommend"`` rule, or ``None`` if no such rule fires.
        """
        with self._lock:
            rules = [r for r in self._rules if r.active and r.action == "recommend"]

        for rule in rules:  # already sorted by priority
            if self._match_rule(rule, customer):
                return rule.recommendation

        return None

    def get_blocked_products(self, customer: dict[str, Any]) -> list[str]:
        """
        Return a deduplicated list of every product blocked for this customer
        by all matching ``"restrict"`` rules.
        """
        blocked: set[str] = set()

        with self._lock:
            rules = [r for r in self._rules if r.active and r.action == "restrict"]

        for rule in rules:
            if self._match_rule(rule, customer):
                blocked.update(rule.blocked_products)

        return sorted(blocked)

    def is_product_allowed(
        self,
        customer: dict[str, Any],
        product: str,
    ) -> bool:
        """
        Return ``True`` if *product* is not blocked by any active rule for
        this customer.

        Parameters
        ----------
        customer : dict
        product  : str   Case-insensitive match against blocked-product names.
        """
        product_lower = product.strip().lower()
        return product_lower not in {
            p.lower() for p in self.get_blocked_products(customer)
        }

    def get_flagged_rules(self, customer: dict[str, Any]) -> list[dict[str, Any]]:
        """Return all matching ``"flag"`` and ``"escalate"`` rules."""
        with self._lock:
            rules = [
                r for r in self._rules if r.active and r.action in ("flag", "escalate")
            ]

        return [
            self._match_to_dict(self._build_match(r, customer))
            for r in rules
            if self._match_rule(r, customer)
        ]

    def get_all_rules(self) -> list[dict[str, Any]]:
        """Return every rule (active and inactive) as a list of dicts."""
        with self._lock:
            return [r.to_dict() for r in self._rules]

    # ── Private: condition evaluation ────────────────────────────────────

    @staticmethod
    def _evaluate_condition(
        cond: RuleCondition,
        customer: dict[str, Any],
    ) -> bool:
        """
        Evaluate one condition against the customer dict.

        Missing fields always return ``False`` so rules never fire on
        incomplete data.
        """
        raw = customer.get(cond.field)
        if raw is None:
            return False

        op = cond.operator
        val = cond.value

        try:
            if op == ">":
                return float(raw) > float(val)
            if op == ">=":
                return float(raw) >= float(val)
            if op == "<":
                return float(raw) < float(val)
            if op == "<=":
                return float(raw) <= float(val)
            if op == "==":
                return str(raw) == str(val)
            if op == "!=":
                return str(raw) != str(val)
            if op == "in":
                return raw in val
            if op == "not_in":
                return raw not in val
        except (TypeError, ValueError):
            return False

        return False

    def _match_rule(
        self,
        rule: BusinessRule,
        customer: dict[str, Any],
    ) -> bool:
        """Return True only when ALL conditions of *rule* match."""
        return all(self._evaluate_condition(cond, customer) for cond in rule.conditions)

    @staticmethod
    def _build_match(
        rule: BusinessRule,
        customer: dict[str, Any],
    ) -> RuleMatch:
        """Construct a RuleMatch summary for a rule that fired."""
        condition_parts = [
            f"{c.field} {c.operator} {c.value!r}" for c in rule.conditions
        ]
        reason = (
            f"Rule '{rule.name}' fired: "
            + " AND ".join(condition_parts)
            + f" → {rule.action}"
            + (f": {rule.recommendation!r}" if rule.recommendation else "")
        )
        return RuleMatch(
            rule_id=rule.rule_id,
            name=rule.name,
            action=rule.action,
            recommendation=rule.recommendation,
            blocked_products=list(rule.blocked_products),
            priority=rule.priority,
            reason=reason,
        )

    @staticmethod
    def _match_to_dict(match: RuleMatch) -> dict[str, Any]:
        return {
            "rule_id": match.rule_id,
            "name": match.name,
            "action": match.action,
            "recommendation": match.recommendation,
            "blocked_products": match.blocked_products,
            "priority": match.priority,
            "reason": match.reason,
        }

    # ── Default rules ─────────────────────────────────────────────────────

    def _load_defaults(self) -> None:
        """Load the built-in banking rules on initialisation."""

        defaults: list[BusinessRule] = [
            # ── RULE001: High risk → no loan products ─────────────────────
            BusinessRule(
                rule_id="RULE001",
                name="High Risk — No Loan",
                description=(
                    "Customers with a risk score above 70 must not be offered "
                    "any loan or credit-extension product."
                ),
                conditions=[
                    RuleCondition(field="risk_score", operator=">", value=70),
                ],
                action="restrict",
                blocked_products=[
                    "Business Loan",
                    "Working Capital Loan",
                    "Equipment Finance",
                    "Merchant Cash Advance",
                ],
                priority=10,
            ),
            # ── RULE002: Technology → Trade Finance ───────────────────────
            BusinessRule(
                rule_id="RULE002",
                name="Technology — Recommend Trade Finance",
                description=(
                    "Technology sector customers have high international trade "
                    "activity and benefit most from Trade Finance."
                ),
                conditions=[
                    RuleCondition(field="industry", operator="==", value="Technology"),
                ],
                action="recommend",
                recommendation="Trade Finance",
                priority=30,
            ),
            # ── RULE003: Retail → Business Credit Card ────────────────────
            BusinessRule(
                rule_id="RULE003",
                name="Retail — Recommend Business Credit Card",
                description=(
                    "Retail customers have high day-to-day transaction volumes "
                    "that are best served by a Business Credit Card."
                ),
                conditions=[
                    RuleCondition(field="industry", operator="==", value="Retail"),
                ],
                action="recommend",
                recommendation="Business Credit Card",
                priority=30,
            ),
            # ── RULE004: Manufacturing → Working Capital Loan ─────────────
            BusinessRule(
                rule_id="RULE004",
                name="Manufacturing — Recommend Working Capital Loan",
                description=(
                    "Manufacturing customers carry inventory and supply-chain "
                    "costs that require working-capital financing."
                ),
                conditions=[
                    RuleCondition(
                        field="industry", operator="==", value="Manufacturing"
                    ),
                ],
                action="recommend",
                recommendation="Working Capital Loan",
                priority=30,
            ),
            # ── RULE005: Enterprise → Corporate Credit Line ───────────────
            BusinessRule(
                rule_id="RULE005",
                name="Enterprise — Recommend Corporate Credit Line",
                description=(
                    "Enterprise segment customers require flexible revolving "
                    "credit to manage large-scale operations."
                ),
                conditions=[
                    RuleCondition(field="segment", operator="==", value="Enterprise"),
                ],
                action="recommend",
                recommendation="Corporate Credit Line",
                priority=20,
            ),
            # ── RULE006: High risk → flag for review ──────────────────────
            BusinessRule(
                rule_id="RULE006",
                name="High Risk — Flag for Human Review",
                description=(
                    "Any recommendation for a customer with risk score > 70 "
                    "must be reviewed by a relationship manager before delivery."
                ),
                conditions=[
                    RuleCondition(field="risk_score", operator=">", value=70),
                ],
                action="flag",
                priority=10,
            ),
        ]

        for rule in defaults:
            self._rules.append(rule)
        self._rules.sort(key=lambda r: r.priority)


# ─────────────────────────────────────────────────────────────────────────────
# Module-level singleton + convenience functions
# ─────────────────────────────────────────────────────────────────────────────

_engine: BusinessRulesEngine = BusinessRulesEngine()


def evaluate_rules(customer: dict[str, Any]) -> list[dict[str, Any]]:
    """Return every rule that matches *customer*, sorted by priority."""
    return _engine.evaluate(customer)


def get_recommendation(customer: dict[str, Any]) -> str | None:
    """
    Return the product recommended by the highest-priority matching rule,
    or ``None`` if no ``"recommend"`` rule fires.
    """
    return _engine.get_recommendation(customer)


def get_blocked_products(customer: dict[str, Any]) -> list[str]:
    """Return every product blocked for *customer* by active restrict rules."""
    return _engine.get_blocked_products(customer)


def is_product_allowed(customer: dict[str, Any], product: str) -> bool:
    """Return ``True`` if *product* is not blocked for *customer*."""
    return _engine.is_product_allowed(customer, product)


def get_flagged_rules(customer: dict[str, Any]) -> list[dict[str, Any]]:
    """Return all ``"flag"`` and ``"escalate"`` rules that match *customer*."""
    return _engine.get_flagged_rules(customer)


def add_rule(rule: BusinessRule) -> None:
    """Add a new rule to the engine (inserted by priority)."""
    _engine.add_rule(rule)


def remove_rule(rule_id: str) -> bool:
    """Remove a rule by ID. Returns ``True`` if found and removed."""
    return _engine.remove_rule(rule_id)


def get_all_rules() -> list[dict[str, Any]]:
    """Return every rule (active and inactive) as a list of plain dicts."""
    return _engine.get_all_rules()
