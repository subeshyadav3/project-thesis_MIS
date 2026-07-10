from langchain_nvidia_ai_endpoints import ChatNVIDIA
from .config import settings

_llm = None

def get_llm():
    global _llm
    if _llm is None:
        _llm = ChatNVIDIA(
            model=settings.llm_model,
            nvidia_api_key=settings.nvidia_api_key,
            temperature=0.2,
            max_tokens=4096,
        )
    return _llm
