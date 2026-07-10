import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    backend_base_url: str = os.getenv("BACKEND_BASE_URL", "http://localhost:5000")
    nvidia_api_key: str = os.getenv("NVIDIA_API_KEY", "")
    llm_provider: str = os.getenv("LLM_PROVIDER", "nvidia")
    llm_model: str = os.getenv("LLM_MODEL", "meta/llama-3.1-8b-instruct")

settings = Settings()
