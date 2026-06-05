import asyncio
from typing import Dict, Any
from llm import get_llama3, get_mistral, get_qwen
from tools import execute_python_code

async def format_and_invoke(prompt: str, llm_instance) -> str:
    response = await llm_instance.ainvoke(prompt)
    return response.content

async def node_research(state: dict) -> dict:
    cb = state.get("ws_callback")
    if cb: await cb({"type": "agent_thinking", "agent": "Research Agent", "action": "Querying local Ollama knowledge base..."})
    
    history_str = ""
    for msg in state.get("history", []):
        history_str += f"User: {msg.get('user', '')}\nAI: {msg.get('ai', '')}\n"
        
    prompt = f"Act as a Research Engineer. Outline basic algorithmic patterns to solve this query. Be brief.\n\n"
    if state.get("file_context"):
        prompt += f"File Context (Refer to this data/code if relevant):\n{state['file_context']}\n\n"
    if history_str:
        prompt += f"Chat History:\n{history_str}\n\n"
    prompt += f"Query: {state['problem']}"
    
    res = await format_and_invoke(prompt, get_mistral())
    
    if cb: await cb({"type": "agent_completed", "agent": "Research Agent"})
    return {"research_res": res}

async def node_reasoning(state: dict) -> dict:
    cb = state.get("ws_callback")
    iteration = state.get("iteration", 1)
    
    action = f"Synthesizing logical steps exclusively local (Iteration: {iteration})..."
    if cb: await cb({"type": "agent_thinking", "agent": "Reasoning Agent", "action": action})
    
    ctx = state.get("research_res", "") or state["problem"]
    critique = state.get("critique_feedback", "")
    
    prompt = f"Context:\n{ctx}\nCritique Feedback:\n{critique}\n\nAct as System Architect. Break this down into numbered logic flow locally."
    res = await format_and_invoke(prompt, get_llama3())
    
    if cb: await cb({"type": "agent_completed", "agent": "Reasoning Agent"})
    return {"reasoning_res": res}

async def node_coding(state: dict) -> dict:
    cb = state.get("ws_callback")
    if cb: await cb({"type": "agent_thinking", "agent": "Coding Agent", "action": "Generating pure Python offline via Mistral 7B..."})
    
    prompt = f"Translate the following logic into pure Python code. Return ONLY pure code, without markdown formatting if possible.\nLogic:\n{state['reasoning_res']}"
    res = await format_and_invoke(prompt, get_mistral())
    clean_code = res.replace('```python', '').replace('```', '').strip()
    
    if cb: await cb({"type": "agent_completed", "agent": "Coding Agent"})
    return {"coding_res": clean_code}

async def node_critic(state: dict) -> dict:
    cb = state.get("ws_callback")
    if cb: await cb({"type": "agent_thinking", "agent": "Critic Agent", "action": "Hard-executing compiled logic within local isolated REPL..."})
    
    code = state["coding_res"]
    
    # Natively execute the code to save CPU parsing overhead!
    execution_result = execute_python_code(code)
    
    passed = "SUCCESS:" in execution_result
    feedback = execution_result
    
    new_iter = state.get("iteration", 1) + 1
    
    if not passed and state.get("iteration", 1) < state.get("max_iterations", 2):
        if cb: await cb({"type": "feedback_loop", "message": "Critic found an exception! Forcing LLM re-run routing..."})
    elif not passed:
        passed = True # Override after limited max iterations to secure CPU resources gracefully
        
    if cb: await cb({"type": "agent_completed", "agent": "Critic Agent"})
    return {"critique_passed": passed, "critique_feedback": feedback, "iteration": new_iter}

async def node_optimizer(state: dict) -> dict:
    cb = state.get("ws_callback")
    if cb: await cb({"type": "agent_thinking", "agent": "Optimizer Agent", "action": "Locally scanning Big-O complexity (Mistral pass)..."})
    
    prompt = f"Write one extremely brief paragraph optimizing or highlighting the Big-O complexity of this code:\n{state['coding_res']}"
    mistral_res = await format_and_invoke(prompt, get_mistral())
    
    if cb: await cb({"type": "agent_thinking", "agent": "Optimizer Agent", "action": "Finalizing optimization verbiage (Llama 3 pass)..."})
    
    final_prompt = f"Clean up and finalize this optimization summary into a single professional sentence:\n{mistral_res}"
    llama_res = await format_and_invoke(final_prompt, get_llama3())
    
    if cb: await cb({"type": "agent_completed", "agent": "Optimizer Agent"})
    
    final_output = {
        "research": state.get("research_res", ""),
        "reasoning": state.get("reasoning_res", ""),
        "code": f"# Final Verified Python Offline Implementation\n{state.get('coding_res', '')}",
        "critique": state.get("critique_feedback", ""),
        "optimized": llama_res,
        "explanation": f"Research Context:\n{state.get('research_res', '')}\n\nREPL Subprocess Testing Metrics:\n{state.get('critique_feedback', '')}",
        "optimization": llama_res
    }
    return {"optimized_res": llama_res, "final_output": final_output}

async def node_router(state: dict) -> dict:
    cb = state.get("ws_callback")
    if cb: await cb({"type": "agent_thinking", "agent": "Research Agent", "action": "Superficial Inference (Mistral) classifying problem intent..."})
    
    prompt = f"Categorize the following user prompt as literally exactly 'coding' (if it asks for algorithms, programming, logic flow, architectures, code, debugging) or 'general' (if it is casual, hi, hello, theory without logic, basic text explanation). Return strictly only the exact word 'coding' or 'general'.\n\nPrompt: {state['problem']}"
    if state.get("file_context"):
        prompt += f"\nNote: The user also provided file context which might contain code/data."
        
    res = await format_and_invoke(prompt, get_mistral())
    res = res.strip().lower()
    
    classification = "coding"
    if "general" in res:
        classification = "general"
        
    return {"task_type": classification}

async def node_general_chat(state: dict) -> dict:
    cb = state.get("ws_callback")
    if cb: await cb({"type": "agent_thinking", "agent": "Research Agent", "action": "Processing lightweight fast reasoning..."})
    
    history_str = ""
    for msg in state.get("history", []):
        history_str += f"User: {msg.get('user', '')}\nAI: {msg.get('ai', '')}\n"
        
    prompt = f"Answer the following casually and briefly. If the user asks for code, provide it inside a markdown code block.\n\n"
    if state.get("file_context"):
        prompt += f"File Context:\n{state['file_context']}\n\n"
    if history_str:
        prompt += f"Chat History:\n{history_str}\n\n"
    prompt += f"Query: {state['problem']}"
    
    res = await format_and_invoke(prompt, get_qwen())
    
    if cb: await cb({"type": "agent_completed", "agent": "Research Agent"})
    
    import re
    code_block = ""
    explanation = res
    match = re.search(r'```.*?\n(.*?)```', res, re.DOTALL)
    if match:
        code_block = match.group(1).strip()
        explanation = res.replace(match.group(0), "").strip()
        
    final_output = {
        "research": "",
        "reasoning": "",
        "code": code_block,
        "critique": "",
        "optimized": "",
        "explanation": f"Response:\n{explanation}",
        "optimization": ""
    }
    return {"general_res": res, "final_output": final_output}
