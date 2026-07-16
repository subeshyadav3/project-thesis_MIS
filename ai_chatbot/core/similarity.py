"""Proposal similarity / soft-plagiarism checker.

Given a new proposal's embedded vector, compare it against the stored
embeddings and return the closest matches with similarity scores.
"""
from __future__ import annotations

from typing import List, Dict, Optional


async def find_similar(
    target_vector: List[float],
    candidates: List[Dict],
    top_k: int = 5,
    threshold: float = 0.0,
) -> List[Dict]:
    """Return the top-k candidates ranked by cosine similarity.

    candidates: list of dicts with keys ('id', 'vector', and any metadata).
    threshold: drop any candidate below this similarity (0..1).
    """
    from .embeddings import cosine_similarity

    if not target_vector:
        return []

    scored: List[Dict] = []
    for c in candidates:
        v = c.get("vector") or []
        score = cosine_similarity(target_vector, v)
        if score >= threshold:
            item = {**c}
            item.pop("vector", None)
            item["similarity"] = round(float(score), 4)
            scored.append(item)
    scored.sort(key=lambda x: x["similarity"], reverse=True)
    return scored[:top_k]
