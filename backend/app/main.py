from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.agent_trace import router as trace_router
from app.api.analysis import router as analysis_router
from app.services.customer_service import get_customers
from app.services.recommendation_service import get_recommendation

app = FastAPI(
    title="DecisionPilot AI",
    description="Multi-agent Decision Intelligence backend.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
# /analysis/{customer_id}   → full 9-agent pipeline
# /agent-trace/{customer_id} → per-step execution trace
app.include_router(analysis_router)
app.include_router(trace_router)


# ── Core routes ───────────────────────────────────────────────────────────────


@app.get("/")
def home():
    return {"message": "DecisionPilot AI — multi-agent backend v2"}


@app.get("/customers")
def customers():
    return get_customers()


@app.get("/recommendation/{customer_id}")
def recommendation(customer_id: str):
    return get_recommendation(customer_id)
