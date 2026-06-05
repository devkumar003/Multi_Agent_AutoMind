from typing import TypedDict
from langgraph.graph import StateGraph, START, END
from nodes import node_research, node_reasoning, node_coding, node_critic, node_optimizer, node_router, node_general_chat

class PipelineState(TypedDict):
    problem: str
    file_context: str
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
    task_type: str
    general_res: str
    mode: str
    history: list

def route_from_start(state: dict):
    mode = state.get("mode", "smart")
    if mode == "fast":
        return "fast_path"
    elif mode == "agent":
        return "agent_path"
    return "smart_path"

def route_initial(state: dict):
    if state.get("task_type") == "coding":
        return "coding_path"
    return "general_path"

def route_critic(state: dict):
    if state.get("critique_passed"):
        return "pass"
    return "fail"

def build_graph():
    builder = StateGraph(PipelineState)
    
    builder.add_node("router", node_router)
    builder.add_node("general_chat", node_general_chat)
    builder.add_node("research", node_research)
    builder.add_node("reasoning", node_reasoning)
    builder.add_node("coding", node_coding)
    builder.add_node("critic", node_critic)
    builder.add_node("optimizer", node_optimizer)
    
    builder.add_conditional_edges(
        START,
        route_from_start,
        {"fast_path": "general_chat", "agent_path": "research", "smart_path": "router"}
    )
    
    builder.add_conditional_edges(
        "router",
        route_initial,
        {"coding_path": "research", "general_path": "general_chat"}
    )
    
    builder.add_edge("research", "reasoning")
    builder.add_edge("reasoning", "coding")
    builder.add_edge("coding", "critic")
    
    builder.add_conditional_edges(
        "critic",
        route_critic,
        {"pass": "optimizer", "fail": "reasoning"}
    )
    
    builder.add_edge("optimizer", END)
    builder.add_edge("general_chat", END)
    
    return builder.compile()

class SwarmOrchestrator:
    def __init__(self):
        self.graph = build_graph()

    async def run_pipeline(self, problem: str, state_mode: str = "smart", history: list = None, ws_callback=None, file_context: str = ""):
        if history is None:
            history = []
        if ws_callback:
            await ws_callback({"type": "pipeline_start", "problem": problem})
            
        initial_state = {
            "problem": problem,
            "file_context": file_context,
            "mode": state_mode,
            "history": history,
            "ws_callback": ws_callback,
            "iteration": 1,
            "max_iterations": 2, # Locked heavily to 2 cycles preserving CPU memory bandwidth natively
            "research_res": "",
            "reasoning_res": "",
            "coding_res": "",
            "critique_passed": False,
            "critique_feedback": "",
            "optimized_res": "",
            "final_output": {},
            "task_type": "",
            "general_res": ""
        }
        
        final_state = await self.graph.ainvoke(initial_state)
        
        if ws_callback:
            await ws_callback({"type": "pipeline_complete"})
            
        return final_state["final_output"]
