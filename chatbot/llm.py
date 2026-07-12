import json
import os
from typing import Any, Optional

from groq import Groq

from prompts import SYSTEM_PROMPT, TOOL_DEFINITIONS
from tools import execute_tool

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
MAX_TOOL_ROUNDS = 5


def _get_client() -> Groq:
    if not GROQ_API_KEY:
        raise ValueError(
            "GROQ_API_KEY manquant. Créez un compte gratuit sur https://console.groq.com "
            "et ajoutez la clé dans chatbot/.env"
        )
    return Groq(api_key=GROQ_API_KEY)


async def chat_with_tools(
    user_message: str,
    token: str,
    history: Optional[list[dict]] = None,
) -> dict[str, Any]:
    client = _get_client()
    messages: list[dict] = [{"role": "system", "content": SYSTEM_PROMPT}]

    if history:
        for msg in history[-10:]:
            if msg.get("role") in ("user", "assistant") and msg.get("content"):
                messages.append({"role": msg["role"], "content": msg["content"]})

    messages.append({"role": "user", "content": user_message})

    tools_used = []

    for _ in range(MAX_TOOL_ROUNDS):
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            tools=TOOL_DEFINITIONS,
            tool_choice="auto",
            temperature=0.2,
            max_tokens=1024,
        )

        choice = response.choices[0]
        assistant_message = choice.message

        if assistant_message.tool_calls:
            messages.append({
                "role": "assistant",
                "content": assistant_message.content or "",
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments,
                        },
                    }
                    for tc in assistant_message.tool_calls
                ],
            })

            for tool_call in assistant_message.tool_calls:
                fn_name = tool_call.function.name
                try:
                    fn_args = json.loads(tool_call.function.arguments or "{}")
                except json.JSONDecodeError:
                    fn_args = {}

                tools_used.append({"name": fn_name, "args": fn_args})
                tool_result = await execute_tool(fn_name, fn_args, token)

                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": tool_result,
                })
            continue

        reply = assistant_message.content or "Je n'ai pas pu générer une réponse."
        return {"reply": reply.strip(), "tools_used": tools_used}

    return {
        "reply": "Désolé, je n'ai pas pu terminer l'analyse. Reformulez votre question.",
        "tools_used": tools_used,
    }
