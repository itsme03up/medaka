from datetime import datetime, timezone
from typing import Dict, Any, Generator

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response, RedirectResponse
from pydantic import BaseModel
from prometheus_fastapi_instrumentator import Instrumentator
from sqlmodel import SQLModel, Field, Session, create_engine, select

app = FastAPI(title="Medaka API", version="0.2.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prometheus /metrics
Instrumentator().instrument(app).expose(
    app, endpoint="/metrics", include_in_schema=False
)

# --- DB ---
# ※ コンテナの /app/data に保存（docker compose で ./backend/data をマウントしている想定）
engine = create_engine("sqlite:///data/medaka.db", echo=False)

def get_session() -> Generator[Session, None, None]:
    with Session(engine) as s:
        yield s

class Observation(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    ts: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    fps: float
    fish_count: int
    notes: str | None = None

@app.on_event("startup")
def on_startup():
    SQLModel.metadata.create_all(engine)

# --- 設定 ---
CONFIG: Dict[str, Any] = {
    "fish_count": 120,
    "max_speed": 1.4,
    "min_speed": 0.3,
    "separation_radius": 20,
}

@app.get("/health")
def health_check():
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}

@app.get("/config")
def get_config():
    return CONFIG

class ObservationIn(BaseModel):
    fps: float
    fish_count: int
    notes: str | None = None

@app.post("/events/observation")
def add_obs(payload: ObservationIn, s: Session = Depends(get_session)):
    obs = Observation(**payload.model_dump())
    s.add(obs)
    s.commit()
    s.refresh(obs)
    return {"id": obs.id}

@app.get("/events/observation")
def list_obs(limit: int = 50, s: Session = Depends(get_session)):
    stmt = select(Observation).order_by(Observation.id.desc()).limit(limit)
    rows = s.exec(stmt).all()
    return rows

@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse("/docs")

# faviconへの404回避
@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return Response(status_code=204)
