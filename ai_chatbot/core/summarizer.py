"""LangGraph summarization agent."""
from langgraph.graph import StateGraph
from langchain_core.prompts import ChatPromptTemplate
from .state import SummarizeState
from .llm_factory import get_llm


def build_summarizer(custom_prompt: str = None):
    llm = get_llm()

    default_template = (
        "You are an academic document assistant. Analyze the following project/thesis "
        "document and produce a structured summary in JSON format with these keys:\n"
        "- executive_summary (2-3 sentences)\n"
        "- objectives (bullet list)\n"
        "- methodology (brief description)\n"
        "- expected_outcomes (bullet list)\n"
        "- strengths (2-3 points)\n"
        "- weaknesses_or_risks (2-3 points)\n\n"
        "Document text:\n{document_text}\n\n"
        "Respond ONLY with valid JSON."
    )

    user_template = (
        "{custom_prompt}\n\n"
        "Document text:\n{document_text}\n\n"
        "Respond ONLY with valid JSON using this shape: "
        "{{ \"executive_summary\": \"...\", \"objectives\": [\"...\"], "
        "\"methodology\": \"...\", \"expected_outcomes\": [\"...\"], "
        "\"strengths\": [\"...\"], \"weaknesses_or_risks\": [\"...\"] }}."
    )

    template = (
        user_template.replace("{custom_prompt}", custom_prompt)
        if custom_prompt and custom_prompt.strip()
        else default_template
    )

    prompt = ChatPromptTemplate.from_messages([("human", template)])
    chain = prompt | llm

    async def summarize_node(state: SummarizeState) -> dict:
        raw = state.get("document_text", "")
        if not raw:
            return {"summary": {"error": "No document text"}, "error": "No document text"}
        import json
        last_err = None
        for attempt in range(3):
            try:
                result = await chain.ainvoke({"document_text": raw[:30000], "custom_prompt": custom_prompt or ""})
                text = (result.content if hasattr(result, "content") else str(result)) or ""
                text = text.strip()
                if not text:
                    last_err = "Empty LLM response"
                    continue
                if text.startswith("```"):
                    text = text.split("\n", 1)[-1]
                    text = text.rsplit("```", 1)[0]
                summary = json.loads(text.strip())
                return {"summary": summary, "error": None}
            except Exception as e:
                last_err = str(e)
                continue
        return {"summary": {}, "error": last_err or "Summarization failed"}

    builder = StateGraph(SummarizeState)
    builder.add_node("summarize", summarize_node)
    builder.set_entry_point("summarize")
    builder.set_finish_point("summarize")
    return builder.compile()
