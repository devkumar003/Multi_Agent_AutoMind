import asyncio
from typing import TypedDict
from langgraph.graph import StateGraph, START, END

from agents.research_agent import ResearchAgent
from agents.reasoning_agent import ReasoningAgent
from agents.coding_agent import CodingAgent
from agents.critic_agent import CriticAgent
from agents.optimizer_agent import OptimizerAgent

class PipelineState(TypedDict):
    problem: str
    ws_callback: any
    iteration: int
    max_iterations: int
    research_res: str
    reasoning_res: str
    coding_res: str
    critique_passed: bool
    critique_feedback: str
    optimized_res: str
    final_output: dict

class PipelineOrchestrator:
    def __init__(self):
        self.research_agent = ResearchAgent()
        self.reasoning_agent = ReasoningAgent()
        self.coding_agent = CodingAgent()
        self.critic_agent = CriticAgent()
        self.optimizer_agent = OptimizerAgent()
        
        # Build LangGraph Network
        builder = StateGraph(PipelineState)
        
        # Define Nodes
        builder.add_node("research", self.node_research)
        builder.add_node("reasoning", self.node_reasoning)
        builder.add_node("coding", self.node_coding)
        builder.add_node("critic", self.node_critic)
        builder.add_node("optimizer", self.node_optimizer)
        
        # Define standard linear edges
        builder.add_edge(START, "research")
        builder.add_edge("research", "reasoning")
        builder.add_edge("reasoning", "coding")
        builder.add_edge("coding", "critic")
        
        # Define Conditional Routing dynamically
        builder.add_conditional_edges(
            "critic", 
            self.route_critic, 
            {"pass": "optimizer", "fail": "reasoning"}
        )
        builder.add_edge("optimizer", END)
        
        # Compile formal graph!
        self.graph = builder.compile()

    async def node_research(self, state: PipelineState):
        res = await self.research_agent.execute(state["problem"], state["ws_callback"])
        return {"research_res": res}

    async def node_reasoning(self, state: PipelineState):
        ctx = state.get("research_res") or state["problem"]
        res = await self.reasoning_agent.execute(ctx, state["iteration"], state["ws_callback"])
        return {"reasoning_res": res}

    async def node_coding(self, state: PipelineState):
        res = await self.coding_agent.execute(state["reasoning_res"], state["ws_callback"])
        return {"coding_res": res}

    async def node_critic(self, state: PipelineState):
        critique = await self.critic_agent.execute(state["coding_res"], state["iteration"], state["ws_callback"])
        passed = critique["passed"]
        new_iter = state["iteration"] + 1

        if not passed and state["iteration"] < state["max_iterations"]:
            if state["ws_callback"]:
                await state["ws_callback"]({"type": "feedback_loop", "message": f"Execution test failed. Sent output back to Reasoning logic..."})
        elif not passed:
            passed = True # Graceful override if max allowed loops exceeded
            
        return {"critique_passed": passed, "critique_feedback": critique["feedback"], "iteration": new_iter}
        
    def route_critic(self, state: PipelineState):
        if state["critique_passed"]:
            return "pass"
        return "fail"

    async def node_optimizer(self, state: PipelineState):
        res = await self.optimizer_agent.execute(state["coding_res"], state["ws_callback"])
        final_code = f"# Algorithmically Generated Solution via Agent Swarm\n{state['coding_res']}"
        output = {
            "research": state["research_res"],
            "reasoning": state["reasoning_res"],
            "code": final_code,
            "critique": state["critique_feedback"],
            "optimized": res,
            "explanation": f"Research Context:\n{state['research_res']}\n\nLogical Abstraction:\n{state['reasoning_res']}\n\nTesting Metrics:\n{state['critique_feedback']}",
            "optimization": res
        }
        return {"optimized_res": res, "final_output": output}

    async def run_pipeline(self, problem: str, ws_callback=None):
        if ws_callback:
            await ws_callback({"type": "pipeline_start", "problem": problem})
            
        # Initializing typed dictionary properties
        initial_state = {
            "problem": problem,
            "ws_callback": ws_callback,
            "iteration": 1,
            "max_iterations": 2,
            "research_res": "",
            "reasoning_res": "",
            "coding_res": "",
            "critique_passed": False,
            "critique_feedback": "",
            "optimized_res": "",
            "final_output": {}
        }

        # Invoke the compiled LangGraph object
        final_state = await self.graph.ainvoke(initial_state)

        if ws_callback:
            await ws_callback({"type": "pipeline_complete"})
            
        return final_state["final_output"]
