import os
from typing import Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from llm import chat_with_tools

load_dotenv()

app = FastAPI(
    title="Marjane Security Chatbot",
    description="Assistant conversationnel pour le dashboard admin Marjane Security",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MARJANE_API_URL = os.getenv("MARJANE_API_URL", "http://localhost:5000").rstrip("/")


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    history: Optional[list[ChatMessage]] = None


class ChatResponse(BaseModel):
    reply: str
    tools_used: list[dict] = []


async def require_admin(token: str) -> dict:
    """Verify JWT with Marjane API and ensure the user is admin."""
    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.get(
            f"{MARJANE_API_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        if response.status_code == 401:
            raise HTTPException(status_code=401, detail="Session expirée. Reconnectez-vous.")
        if response.status_code >= 400:
            raise HTTPException(status_code=403, detail="Impossible de vérifier l'utilisateur.")
        user = response.json()
        if user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Chatbot réservé aux administrateurs.")
        return user


@app.get("/health")
async def health():
    groq_configured = bool(os.getenv("GROQ_API_KEY"))
    return {
        "status": "ok",
        "service": "marjane-chatbot",
        "groq_configured": groq_configured,
        "marjane_api": MARJANE_API_URL,
    }


@app.post("/chat", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    authorization: Optional[str] = Header(None),
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token JWT requis (Authorization: Bearer ...)")

    token = authorization.replace("Bearer ", "", 1).strip()
    if not token:
        raise HTTPException(status_code=401, detail="Token JWT invalide")

    await require_admin(token)

    history = None
    if body.history:
        history = [{"role": m.role, "content": m.content} for m in body.history]

    try:
        result = await chat_with_tools(body.message, token, history)
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur chatbot: {e}") from e

    return ChatResponse(reply=result["reply"], tools_used=result.get("tools_used", []))


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT") or os.getenv("CHATBOT_PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
