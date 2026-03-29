"""LLM client for answer generation using DeepSeek via OpenAI-compatible API."""

from __future__ import annotations

import logging
from typing import Optional

import config

logger = logging.getLogger(__name__)

_client = None


def _get_client():
    """Lazy-initialize the OpenAI client pointed at DeepSeek."""
    global _client
    if _client is not None:
        return _client

    if not config.DEEPSEEK_API_KEY:
        logger.warning("DEEPSEEK_API_KEY not set — LLM answer generation disabled")
        return None

    try:
        from openai import OpenAI
        _client = OpenAI(
            api_key=config.DEEPSEEK_API_KEY,
            base_url=config.DEEPSEEK_BASE_URL,
        )
        logger.info("DeepSeek LLM client initialized (model=%s)", config.DEEPSEEK_MODEL)
        return _client
    except Exception as e:
        logger.error("Failed to initialize DeepSeek client: %s", e)
        return None


def generate_answer(prompt: str) -> Optional[str]:
    """Generate an answer from the LLM using the assembled RAG prompt.

    Args:
        prompt: The full prompt including context and question.

    Returns:
        The LLM-generated answer, or None if LLM is unavailable.
    """
    client = _get_client()
    if client is None:
        return None

    try:
        response = client.chat.completions.create(
            model=config.DEEPSEEK_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=config.LLM_MAX_TOKENS,
            temperature=config.LLM_TEMPERATURE,
        )
        answer = response.choices[0].message.content
        if answer:
            logger.info("LLM generated answer (%d chars)", len(answer))
        return answer or None
    except Exception as e:
        logger.error("LLM generation failed: %s", e)
        return None
