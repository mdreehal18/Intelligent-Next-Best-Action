"""
base_agent.py
-------------
Abstract base class that every pipeline agent must satisfy.

Subclasses implement :meth:`run` with whatever positional/keyword arguments
their step requires.  :meth:`run_with_wrapper` provides a consistent,
timed wrapper that returns the standard pipeline envelope regardless of
whether the underlying call succeeded or failed.

Standard envelope
-----------------
::

    {
        "agent"            : str,
        "status"           : "completed" | "failed",
        "execution_time_ms": float,
        "output"           : dict
    }

On success, ``output`` is the dict returned by :meth:`run`.
On failure, ``status`` is ``"failed"`` and ``output`` is
``{"error": "<exception message>"}``.

Timing uses :func:`time.perf_counter` for sub-millisecond resolution.
"""

from __future__ import annotations

import logging
import time
from abc import ABC, abstractmethod
from typing import Any

logger = logging.getLogger(__name__)


class BaseAgent(ABC):
    """
    Abstract base class for every agent in the decision pipeline.

    Concrete subclasses must:

    1. Set the ``name`` class attribute to a human-readable display name.
    2. Implement :meth:`run` to perform the agent's core work.

    The :meth:`run_with_wrapper` method is provided as a final helper that
    handles timing and standard envelope construction — subclasses should
    **not** override it.

    Example
    -------
    ::

        class MyAgent(BaseAgent):
            name = "MyAgent"

            def run(self, customer: dict) -> dict:
                return {"result": "ok"}

        agent = MyAgent()
        envelope = agent.run_with_wrapper(customer)
        # {
        #     "agent": "MyAgent",
        #     "status": "completed",
        #     "execution_time_ms": 0.12,
        #     "output": {"result": "ok"}
        # }
    """

    #: Human-readable display name used in traces and log messages.
    #: Every concrete subclass must override this attribute.
    name: str = "BaseAgent"

    # ── Abstract interface ────────────────────────────────────────────────

    @abstractmethod
    def run(self, *args: Any, **kwargs: Any) -> dict[str, Any]:
        """
        Execute the agent's core logic.

        Subclasses define their own positional/keyword parameter names to
        match what the pipeline passes.  This method must return a plain,
        JSON-serialisable dict.

        Parameters
        ----------
        *args : Any
            Positional arguments as required by the concrete agent.
        **kwargs : Any
            Keyword arguments as required by the concrete agent.

        Returns
        -------
        dict
            Agent result — any JSON-serialisable mapping.

        Raises
        ------
        Exception
            Any exception is caught by :meth:`run_with_wrapper` and
            converted into a ``"failed"`` envelope; callers of
            :meth:`run` directly are responsible for their own handling.
        """

    # ── Timing wrapper ────────────────────────────────────────────────────

    def run_with_wrapper(self, *args: Any, **kwargs: Any) -> dict[str, Any]:
        """
        Call :meth:`run` and wrap the result in the standard pipeline envelope.

        Timing is measured with :func:`time.perf_counter` and reported in
        milliseconds (rounded to two decimal places).  If :meth:`run` raises
        any exception the error is logged, and a ``"failed"`` envelope is
        returned so the pipeline can continue to the next step without
        crashing.

        Parameters
        ----------
        *args : Any
            Forwarded verbatim to :meth:`run`.
        **kwargs : Any
            Forwarded verbatim to :meth:`run`.

        Returns
        -------
        dict
            Standard pipeline envelope::

                {
                    "agent"            : str,   # self.name
                    "status"           : "completed" | "failed",
                    "execution_time_ms": float,  # wall-clock ms
                    "output"           : dict    # run() result or error dict
                }
        """
        t0: float = time.perf_counter()

        try:
            output: dict[str, Any] = self.run(*args, **kwargs)
            # Guard against non-dict returns from poorly written subclasses.
            if not isinstance(output, dict):
                output = {"result": output}
            status = "completed"
        except Exception as exc:
            logger.error(
                "Agent '%s' raised an exception: %s",
                self.name,
                exc,
                exc_info=True,
            )
            output = {"error": str(exc)}
            status = "failed"

        elapsed_ms: float = round((time.perf_counter() - t0) * 1_000, 2)

        return {
            "agent": self.name,
            "status": status,
            "execution_time_ms": elapsed_ms,
            "output": output,
        }
