import requests
import os
import re
from django.conf import settings
from openai import OpenAI

GROQ_API_KEY = os.getenv("GROQ_API_KEY", settings.GROK_API_KEY)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", settings.OPENAI_API_KEY)


client = OpenAI(api_key=OPENAI_API_KEY)


def prompt_openai(full_prompt: str) -> str:
    """
    Sends a prompt to the OpenAI Chat Completions API and returns the model's response text.
    """
    response = client.chat.completions.create(
        model="gpt-4.1",
        messages=[{"role": "user", "content": full_prompt}],
        temperature=1,
        max_tokens=500,
    )

    return response.choices[0].message.content


def prompt_groq(full_prompt: str) -> str:
    """
    Sends a prompt to Groq API and returns the model's response text.
    """
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {GROQ_API_KEY}",
    }
    data = {
        "model": "meta-llama/llama-4-scout-17b-16e-instruct",
        "messages": [{"role": "user", "content": full_prompt}],
        "temperature": 0.6,
        "max_tokens": 500,
    }
    r = requests.post(url, headers=headers, json=data)
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"]


def classify_intent_groq(user_input: str) -> str:
    prompt = f"""
You are an assistant that categorizes user input into one of three categories:
GREETING, HR_QUERY, or OTHER.

- GREETING: Friendly salutations or simple hellos.
- HR_QUERY: Questions related to human resources such as employee benefits, payroll, recruitment, etc.
- OTHER: Any other input, including unrelated questions, nonsensical input, or potentially harmful or malicious commands (e.g., requests to delete data, hack, or any dangerous actions).

Input: "{user_input}"

Reply ONLY with one of these three words exactly.
"""
    response = prompt_groq(prompt).strip()
    return response.upper() if response else "OTHER"
