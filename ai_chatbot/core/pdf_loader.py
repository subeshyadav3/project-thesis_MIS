import httpx
import logging

logger = logging.getLogger(__name__)


async def fetch_proposal_text(backend_url: str, proposal_id: int, jwt_token: str = "") -> str:
    """Fetch proposal document from the Node backend and extract text."""
    url = f"{backend_url}/api/proposals/{proposal_id}"
    headers = {"Cookie": f"token={jwt_token}"} if jwt_token else {}
    
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=headers)
        if resp.status_code != 200:
            raise Exception(f"Backend returned {resp.status_code}: {resp.text}")
        data = resp.json()
    
    document_url = data.get("documentUrl")
    if not document_url:
        raise Exception("No documentUrl in proposal response")
    
    full_url = f"{backend_url}{document_url}"
    async with httpx.AsyncClient() as client:
        doc_resp = await client.get(full_url, headers=headers)
        if doc_resp.status_code != 200:
            raise Exception(f"Document fetch returned {doc_resp.status_code}")
        content_type = doc_resp.headers.get("content-type", "")
        raw = doc_resp.content
    
    if "pdf" in content_type:
        from io import BytesIO
        from PyPDF2 import PdfReader
        reader = PdfReader(BytesIO(raw))
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
        return text[:50000]
    
    return raw.decode("utf-8", errors="ignore")[:50000]
