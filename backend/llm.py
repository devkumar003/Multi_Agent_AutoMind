from langchain_ollama import ChatOllama

def get_llama3():
    """
    Initializes a highly reliable, deterministic, local Ollama LLM execution thread.
    Temperature is locked aggressively to 0.5 to keep logic rigid.
    """
    return ChatOllama(model="llama3", temperature=0.5)

def get_mistral():
    """
    Initializes Mistral 7B for specialized specific tasks.
    """
    return ChatOllama(model="mistral", temperature=0.5)

def get_qwen():
    """
    Initializes Qwen2.5-Coder precisely optimized for data analytics and Pandas scripting.
    Temperature is locked heavily to 0.1 for high fidelity math generation.
    """
    return ChatOllama(model="qwen2.5-coder:7b", temperature=0.1)
