from typing import List

from pydantic import BaseModel


class Message(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ReflectionRequest(BaseModel):
    context: str
    messages: List[Message]
    user_message: str
