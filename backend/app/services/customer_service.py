import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[3]

DATA_FILE = PROJECT_ROOT / "data" / "sample_customers" / "customers.json"


def get_customers():
    with open(DATA_FILE, "r", encoding="utf-8") as file:
        return json.load(file)
