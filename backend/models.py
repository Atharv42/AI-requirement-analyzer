from pydantic import BaseModel
from typing import List


class TranscriptRequest(BaseModel):
    transcript: str


class ClarificationAnswer(BaseModel):
    question: str
    answer: str


class RequirementsRequest(BaseModel):
    transcript: str
    clarifications: List[ClarificationAnswer] = []