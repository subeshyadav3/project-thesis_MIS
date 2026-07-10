"""LangGraph Q&A agent using Gemini."""
from langgraph.graph import StateGraph
from langchain_core.prompts import ChatPromptTemplate
from .state import AskState
from .llm_factory import get_llm


def build_ask_agent() -> StateGraph:
    llm = get_llm()

    prompt = ChatPromptTemplate.from_messages([
        (
            "human",
            "You are a helpful academic assistant. Answer the question based ONLY on the "
            "given proposal document text. If the answer cannot be found in the text, say so.\n\n"
            "Proposal text:\n{document_text}\n\n"
            "Question: {question}\n\n"
            "Answer concisely and accurately."
        )
    ])

    chain = prompt | llm

    def ask_node(state: AskState) -> dict:
        raw = state.get("document_text", "")
        question = state.get("question", "")
        if not raw:
            return {"answer": "No document text available.", "error": None}
        if not question:
            return {"answer": "No question asked.", "error": None}
        try:
            result = chain.invoke({"document_text": raw[:30000], "question": question})
            answer = result.content if hasattr(result, "content") else str(result)
            return {"answer": answer.strip(), "error": None}
        except Exception as e:
            return {"answer": "", "error": str(e)}

    builder = StateGraph(AskState)
    builder.add_node("ask", ask_node)
    builder.set_entry_point("ask")
    builder.set_finish_point("ask")
    return builder.compile()
