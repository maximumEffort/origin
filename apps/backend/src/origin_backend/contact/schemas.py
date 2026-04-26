"""
Pydantic schemas for the contact API.

Mirrors apps/backend/src/contact/dto/create-contact.dto.ts and the
response shape returned by ContactService.create.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class CreateContactRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=20)
    subject: str | None = Field(default=None, max_length=200)
    message: str = Field(..., min_length=10, max_length=2000)

    model_config = ConfigDict(extra="forbid")


class CreateContactResponse(BaseModel):
    id: str
    received: bool = True
