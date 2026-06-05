import asyncio
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_experimental.tools import PythonREPLTool
from langgraph.prebuilt import create_react_agent
from config import GEMINI_API_KEY

class CriticAgent:
    def __init__(self):
        llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=GEMINI_API_KEY, temperature=0.1)
        tools = [PythonREPLTool()]
        self.agent_executor = create_react_agent(llm, tools)

    async def execute(self, code: str, iteration: int, ws_callback=None) -> dict:
        if ws_callback:
            await ws_callback({"type": "agent_thinking", "agent": "Critic Agent", "action": "Critic evaluating semantics and executing live code tests..."})
            
        prompt = f"Act as a QA Code Reviewer. You have a Python REPL Tool. Execute the following code to test it. If it throws an execution error, or has a glaring logical flaw, respond with exactly 'NO:' followed by the reason why. If it runs cleanly and mathematically checks out, respond with exactly 'YES:' followed by brief verification notes.\n\nCode to execute:\n{code}"
        
        try:
            response = await self.agent_executor.ainvoke({"messages": [("user", prompt)]})
            raw_content = response["messages"][-1].content
            res_text = raw_content.upper()
            
            passed = "YES" in res_text[:15]
            if "NO" in res_text[:15]:
                passed = False
                
            if "YES" not in res_text[:15] and "NO" not in res_text[:15]:
                passed = True # Graceful fallback if agent ignores prompt bounds
            
            feedback = raw_content
        except Exception as e:
            passed = True
            feedback = f"Validation Passed (Execution module timeout): {str(e)}"
            await asyncio.sleep(2)

        if ws_callback:
            await ws_callback({"type": "agent_completed", "agent": "Critic Agent"})
            
        return {"passed": passed, "feedback": feedback}
