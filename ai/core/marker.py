"""LangGraph evaluator agent."""
from langgraph.graph import StateGraph
from langchain_core.prompts import ChatPromptTemplate
from .state import EvaluateState
from .llm_factory import get_llm


def build_evaluator(custom_instructions: str = None):
    llm = get_llm()

    base_instructions = (
        "You are an academic evaluator. Given a document and evaluation criteria, "
        "score each criterion with a mark out of its maxMarks and provide brief reasoning."
    )
    extras = f"\n\nAdditional instructions from evaluator:\n{custom_instructions}" if custom_instructions and custom_instructions.strip() else ""

    template = (
        f"{base_instructions}{extras}\n\n"
        "Document text:\n{{document_text}}\n\n"
        "Criteria:\n{{criteria_text}}\n\n"
        "Respond ONLY with a JSON array of objects, each with:\n"
        "- criterion_name: string\n"
        "- marks: number (0 to maxMarks)\n"
        "- max_marks: number\n"
        "- reasoning: string\n\n"
        "Be objective and fair."
    )

    prompt = ChatPromptTemplate.from_messages([("human", template)])
    chain = prompt | llm

    def evaluate_node(state: EvaluateState) -> dict:
        raw = state.get("document_text", "")
        criteria = state.get("criteria", [])
        if not raw or not criteria:
            return {"scores": [], "total_marks": 0, "max_marks": 0, "error": "Missing document or criteria"}

        criteria_text = "\n".join(
            f"- {c.get('name', 'Criterion')}: max {c.get('maxMarks', 0)} marks"
            for c in criteria
        )

        try:
            result = chain.invoke({"document_text": raw[:30000], "criteria_text": criteria_text})
            import json
            text = result.content if hasattr(result, "content") else str(result)
            text = text.strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[-1]
                text = text.rsplit("```", 1)[0]
            scores = json.loads(text)
            total = sum(s.get("marks", 0) for s in scores)
            max_total = sum(s.get("max_marks", 0) for s in scores)
            return {"scores": scores, "total_marks": total, "max_marks": max_total, "error": None}
        except Exception as e:
            return {"scores": [], "total_marks": 0, "max_marks": 0, "error": str(e)}

    builder = StateGraph(EvaluateState)
    builder.add_node("evaluate", evaluate_node)
    builder.set_entry_point("evaluate")
    builder.set_finish_point("evaluate")
    return builder.compile()
