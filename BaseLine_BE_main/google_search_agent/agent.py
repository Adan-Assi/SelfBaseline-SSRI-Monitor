from google.adk.agents import Agent
from google.adk.tools import google_search

BASE_INSTRUCTION = (
    "You are a supportive mental-health voice agent. "
    "Your role is to have a warm, empathetic conversation with the patient. "
    "Listen actively, validate their feelings, and gently explore the topics suggested in your context. "
    "Keep responses concise and natural — this is a voice conversation, not a written report."
)

def build_agent(personalized_prompt: str | None = None) -> Agent:
    """
    Build an ADK Agent with an optional personalised system instruction.
    Called once per WebSocket session so each patient gets their own context.
    """
    if personalized_prompt:
        instruction = f"{BASE_INSTRUCTION}\n\n{personalized_prompt}"
    else:
        instruction = BASE_INSTRUCTION

    return Agent(
        name="mental_health_agent",
        model="gemini-live-2.5-flash-native-audio",
        description="A supportive mental-health voice agent.",
        instruction=instruction,
        tools=[google_search],
    )