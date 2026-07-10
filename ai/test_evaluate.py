import sys, os, json, asyncio
sys.path.insert(0, r"F:\projects\clz\se\ai")
os.environ["NVIDIA_API_KEY"] = "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"

from core.config import settings
settings.nvidia_api_key = "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"

from core.marker import build_evaluator

graph = build_evaluator()
state = {
    "proposal_id": 1,
    "document_text": "This is a short test document about software engineering.",
    "criteria": [{"name": "Clarity", "maxMarks": 10}],
    "scores": [],
    "total_marks": 0.0,
    "max_marks": 0.0,
    "error": None,
}
result = asyncio.run(graph.ainvoke(state))
print("Result:", json.dumps(result, indent=2, default=str))
