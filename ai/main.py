"""FastAPI entry point for the TPMS AI microservice."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI
from api.router import router

app = FastAPI(title="TPMS AI Service", version="0.1.0")
app.include_router(router, prefix="/api/ai")
