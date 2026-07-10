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

# First invoke synchronously
from core.llm_factory import get_llm, _llm
from langchain_core.prompts import ChatPromptTemplate

llm = get_llm()
template = (
    "You are an academic evaluator. Given a document and evaluation criteria, "
    "score each criterion with a mark out of its maxMarks and provide brief reasoning.\n\n"
    "Document text:\n{document_text}\n\n"
    "Criteria:\n{criteria_text}\n\n"
    "Respond ONLY with a JSON array of objects, each with:\n"
    "- criterion_name: string\n"
    "- marks: number (0 to maxMarks)\n"
    "- max_marks: number\n"
    "- reasoning: string\n\n"
    "Be objective and fair."
)
prompt = ChatPromptTemplate.from_messages([("human", template)])
chain = prompt | llm

# Test sync invoke
print("=== SYNC INVOKE ===")
result = chain.invoke({"document_text": "This is a short test document about software engineering.", "criteria_text": "- Clarity: max 10 marks"})
print("content:", repr(result.content[:200]))

# Test async invoke via graph
print("\n=== ASYNC GRAPH AINVOKE ===")
result2 = asyncio.run(graph.ainvoke(state))
print("error:", result2.get("error"))
print("scores:", result2.get("scores"))

# Test async chain ainvoke
print("\n=== ASYNC CHAIN AINVOKE ===")
result3 = asyncio.run(chain.ainvoke({"document_text": "This is a short test document about software engineering.", "criteria_text": "- Clarity: max 10 marks"}))
print("content:", repr(result3.content[:200]))
