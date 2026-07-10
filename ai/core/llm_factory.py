from langchain_nvidia_ai_endpoints import ChatNVIDIA
from .config import settings

_llm = None


def get_llm():
    """Return a ChatNVIDIA instance. Raises a clear error if no API key is configured."""
    global _llm
    if _llm is None:
        if not settings.nvidia_api_key:
            raise RuntimeError(
                "NVIDIA_API_KEY is not configured. Set it in ai/.env "
                "or pass it via the 'nvidia_api_key' request field from the backend."
            )
        _llm = ChatNVIDIA(
            model=settings.llm_model,
            nvidia_api_key=settings.nvidia_api_key,
            temperature=0.2,
            max_completion_tokens=4096,
            timeout=120,
        )
    return _llm


def has_api_key() -> bool:
    return bool(settings.nvidia_api_key)
