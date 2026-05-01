"""Future modular webhook receiver routes."""

from fastapi import APIRouter

router = APIRouter(prefix="/webhooks/v2", tags=["webhook-receiver"])

