from typing import TypedDict, Optional, List


class SummarizeState(TypedDict):
    proposal_id: int
    document_text: str
    summary: dict
    error: Optional[str]


class EvaluateState(TypedDict):
    proposal_id: int
    document_text: str
    criteria: List[dict]
    scores: List[dict]
    total_marks: float
    max_marks: float
    error: Optional[str]


class AskState(TypedDict):
    proposal_id: int
    document_text: str
    question: str
    answer: str
    error: Optional[str]
