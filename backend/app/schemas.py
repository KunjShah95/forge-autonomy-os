from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from datetime import datetime

class EventSchema(BaseModel):
    source: str
    type: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    trace_id: str
    payload: Dict[str, Any] = Field(default_factory=dict)

class DecisionSchema(BaseModel):
    id: str
    trace_id: str
    agent: str
    action: str
    reason: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    risk: int = Field(..., ge=0, le=100)
    evidence: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class AuditSchema(BaseModel):
    trace_id: str
    events: List[EventSchema] = Field(default_factory=list)
    decisions: List[DecisionSchema] = Field(default_factory=list)
    status: str = "INVESTIGATING"  # "INVESTIGATING", "RESOLVED", "FAILED"
    outcome: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
