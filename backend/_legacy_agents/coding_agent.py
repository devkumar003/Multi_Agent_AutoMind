import asyncio
from langchain_openai import ChatOpenAI
from config import XAI_GROK_API_KEY

class CodingAgent:
    def __init__(self):
        self.llm = ChatOpenAI(
            api_key=XAI_GROK_API_KEY, 
            base_url="https://api.x.ai/v1", 
            model="grok-2-latest", 
            temperature=0.2
        )

    async def execute(self, logic_steps: str, ws_callback=None) -> str:
        if ws_callback:
            await ws_callback({"type": "agent_thinking", "agent": "Coding Agent", "action": "Generating code using Grok LLM..."})
            
        prompt = f"Act as a Senior Developer. Translate these logic steps into pure, clean Python code. Output ONLY code without markdown blocks if possible.\n\nLogic Steps:\n{logic_steps}"
        try:
            response = await self.llm.ainvoke(prompt)
            result = response.content.replace('```python', '').replace('```', '').strip()
        except Exception as e:
            result = f"Code block failed: {str(e)}"
            await asyncio.sleep(2)
        
        if ws_callback:
            await ws_callback({"type": "agent_completed", "agent": "Coding Agent"})
            
        return result
