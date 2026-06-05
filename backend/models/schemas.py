from pydantic import BaseModel

from typing import List, Dict, Any

class ProblemRequest(BaseModel):
    problem: str
    mode: str = "smart"
    history: List[Dict[str, Any]] = []
    file_context: str = ""

class AgentResponse(BaseModel):
    research: str = ""
    reasoning: str = ""
    code: str = ""
    critique: str = ""
    optimized: str = ""
