import os
from dotenv import load_dotenv
from groq import Groq

from prompts import (
    ANALYZE_TRANSCRIPT_PROMPT,
    GENERATE_REQUIREMENTS_PROMPT,
    EVALUATE_REQUIREMENTS_PROMPT,
)


load_dotenv()

api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    raise ValueError("GROQ_API_KEY not found in .env file")


client = Groq(api_key=api_key)

MODEL = "openai/gpt-oss-20b"


def ask_ai(prompt: str):

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": "You are an expert AI Software Requirements Engineer."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.3
    )

    return response.choices[0].message.content


def analyze_transcript(transcript: str):

    prompt = ANALYZE_TRANSCRIPT_PROMPT.format(
        transcript=transcript
    )

    return ask_ai(prompt)


def generate_requirements(
    transcript: str,
    clarifications: str = ""
):

    prompt = GENERATE_REQUIREMENTS_PROMPT.format(
        transcript=transcript,
        clarifications=clarifications
    )

    return ask_ai(prompt)


def evaluate_requirements(
    before: str,
    after: str
):

    prompt = EVALUATE_REQUIREMENTS_PROMPT.format(
        before=before,
        after=after
    )

    return ask_ai(prompt)