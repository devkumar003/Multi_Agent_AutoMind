import asyncio
from langchain_openai import ChatOpenAI
from config import XAI_GROK_API_KEY

class ReasoningAgent:
    def __init__(self):
        # The user requested 'Groq' but provided an 'xai-' key (Grok)
        # We hook into xAI's OpenAI-compatible API to authenticate correctly!
        self.llm = ChatOpenAI(
            api_key=XAI_GROK_API_KEY, 
            base_url="https://api.x.ai/v1", 
            model="grok-2-latest", 
            temperature=0.4
        )

    async def execute(self, context: str, iteration: int = 1, ws_callback=None) -> str:
        if ws_callback:
            action = f"Synthesizing logical steps via Grok (Iteration: {iteration})..."
            if iteration > 1:
                action = f"Refining logic based on Critic feedback (Iteration: {iteration})..."
            await ws_callback({"type": "agent_thinking", "agent": "Reasoning Agent", "action": action})
        
        prompt = f"Act as a System Architect. Break down the following context into a numbered logical algorithmic flow.\n\nContext:\n{context}"
        try:
            response = await self.llm.ainvoke(prompt)
            result = response.content
        except Exception as e:
            result = f"Error logic formulation: {str(e)}"
            await asyncio.sleep(2)
        
        if ws_callback:
            await ws_callback({"type": "agent_completed", "agent": "Reasoning Agent"})
            
        return result
