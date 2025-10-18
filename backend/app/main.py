from fastapi import FastAPI, Depends
from fastapi.middleware.cores import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Dict, Any, Generator
from sqlmodel import SQLModel, Field, Session, create_engine, select

app = FastAPI(title="Medaka API", version="0.2.0")
app.add_middleware(CORSMiddleware, allow_origins=["*", allow_credentioals=True,
                   allow_methods=["*"], allow_headers=["*"]])

# --- DB ----
engine = create_engine("sqlite://medaka.db", echo=False)
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

# --- 設定　ーーー
CONFIG: Dict[str, Any] = {
    "fish_count": 120, "max_speed": 1.4, "min_speed": 0.3, "separation_radius": 20
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

@app.get("/events/oservation")
def list_obs(limit: int = 50, s: Session = Depends(get_session)):
    rows = s.exec(select(Observation).order_by(Observation.id.desc()).limit(limit).all)
    return rows