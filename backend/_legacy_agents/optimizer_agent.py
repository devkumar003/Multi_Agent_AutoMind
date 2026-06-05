import asyncio
from langchain_openai import ChatOpenAI
from config import XAI_GROK_API_KEY

class OptimizerAgent:
    def __init__(self):
        self.llm = ChatOpenAI(
            api_key=XAI_GROK_API_KEY, 
            base_url="https://api.x.ai/v1", 
            model="grok-2-latest", 
            temperature=0.2
        )

    async def execute(self, code: str, ws_callback=None) -> str:
        if ws_callback:
            await ws_callback({"type": "agent_thinking", "agent": "Optimizer Agent", "action": "Grok formulating performance heuristics..."})
            
        prompt = f"Act as a Code Optimizer. Briefly explain how this structure can be optimized or what Big-O complexity it runs at (1 small paragraph).\n\nCode:\n{code}"
        try:
            response = await self.llm.ainvoke(prompt)
            result = response.content
        except Exception as e:
            result = f"Optimization feedback unavailable: {str(e)}"
            await asyncio.sleep(2)

        if ws_callback:
            await ws_callback({"type": "agent_completed", "agent": "Optimizer Agent"})
            
        return result
