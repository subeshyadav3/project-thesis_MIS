import sys, os, json, asyncio
sys.path.insert(0, r"F:\projects\clz\se\ai")
os.environ["NVIDIA_API_KEY"] = "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"

from core.config import settings
settings.nvidia_api_key = "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"

from core.llm_factory import get_llm
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

async def test():
    result = await chain.ainvoke({"document_text": "This is a short test document about software engineering.", "criteria_text": "- Clarity: max 10 marks"})
    print("Type:", type(result))
    print("Content repr:", repr(result.content))
    print("Response metadata:", result.response_metadata)

asyncio.run(test())
