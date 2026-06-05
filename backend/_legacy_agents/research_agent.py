import asyncio
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.tools import DuckDuckGoSearchRun
from langgraph.prebuilt import create_react_agent
from config import GEMINI_API_KEY

class ResearchAgent:
    def __init__(self):
        # Initializing Gemini and outfitting it with internet search capabilities
        llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=GEMINI_API_KEY, temperature=0.3)
        tools = [DuckDuckGoSearchRun()]
        
        # Creating a ReAct (Reasoning and Acting) LangGraph agent
        self.agent_executor = create_react_agent(llm, tools)

    async def execute(self, problem: str, ws_callback=None) -> str:
        if ws_callback:
            await ws_callback({"type": "agent_thinking", "agent": "Research Agent", "action": "Querying Gemini & live web browsing..."})
        
        prompt = f"Act as a Research Engineer. Search the web to gather current architectural patterns, documentation, and context for the following technical problem. Be concise.\n\nProblem: {problem}"
        
        try:
            response = await self.agent_executor.ainvoke({"messages": [("user", prompt)]})
            result = response["messages"][-1].content
        except Exception as e:
            result = f"Error connecting to Gemini ReAct framework: {str(e)}"
            await asyncio.sleep(2)
            
        if ws_callback:
            await ws_callback({"type": "agent_completed", "agent": "Research Agent"})
            
        return result
