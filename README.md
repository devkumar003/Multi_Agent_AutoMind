# AutoThink AI

AutoThink is an entirely localized, highly scalable AI Swarm platform. It effectively merges a glassmorphic React interface with an advanced LangGraph orchestration pipeline running exclusively via your CPU using Ollama.

The platform includes six distinct modules natively embedded inside the dashboard:
1. **AI Chat (Multi-Agent Swarm)**: Deploy an autonomous pipeline consisting of Research, Reasoning, Coding, Critic, and Optimizer agents securely utilizing `Llama 3` and `Mistral`.
2. **Data Lab**: Securely upload CSV datasets directly onto your local server and interactively ask questions; the system utilizes `Qwen2.5-Coder` to write pure Pandas code locally and answers your exact prompt automatically!
3. **Code Lab**: An interactive Python sandbox execution engine testing your logical frameworks directly on your CPU's native subprocess.
4. **Daily Challenges**: Solve dynamically loaded algorithmic constraints (LeetCode-style) using the Code Lab to securely gain Streak milestones and XP points, persisted using a local SQLite architecture.
5. **Admin & Contest Engine**: A full management suite to create custom algorithmic challenges, schedule live global contests, manage user roles, and automatically generate hidden boundary test cases using AI (`Qwen2.5-Coder`).
6. **Global Arenas**: A competitive real-time split-pane IDE where users solve complex contest algorithms against hidden test assertions while racing on a live updating leaderboard.

---

## Prerequisites

Because the platform executes 100% locally to ensure total data privacy without utilizing external APIs, you must ensure your local system contains the following dependencies:

1. **[Node.js](https://nodejs.org/en)** (For the React Frontend)
2. **[Python 3.10+](https://www.python.org/downloads/)** (For the FastAPI Backend & REPL Code Execution)
3. **[Ollama](https://ollama.com/)** (The underlying local LLM engine)

### Required Ollama Models
Before starting the backend, you MUST pull the local models onto your machine. Open a terminal and run:
```bash
ollama pull llama3
ollama pull mistral
ollama pull qwen2.5-coder
```

---

## 🚀 Running the Application

AutoThink utilizes a split full-stack architecture. You will need to keep **two separate terminals open** simultaneously.

### 1. Start the Backend (FastAPI & LangGraph)
Open your first terminal window, navigate to the project folder, and enter the `backend` directory.

```bash
cd backend
```

Ensure you install the Python dependencies. It is recommended to use a virtual environment, but you can install them natively:
```bash
pip install fastapi uvicorn websockets langgraph langchain langchain_ollama pandas python-multipart sqlalchemy bcrypt python-jose
```

Start the Python Uvicorn server:
```bash
python -m uvicorn main:app --reload --port 8000
```
*Note: The SQLite database (`autothink.db`) and CSV persistent directory (`uploads/`) will be generated automatically upon your first boot.*

### 2. Start the Frontend (React & Vite)
Open a brand new, separate terminal window, navigate to the project folder, and enter the `frontend` directory.

```bash
cd frontend
```

Install the Node dependencies:
```bash
npm install
```

Launch the Vite visual server:
```bash
npm run dev
```

### 3. Access the Platform
Once both terminals are running, simply open your favorite web browser and navigate to:
```text
http://localhost:5173
```
You are now successfully inside AutoThink!

---

## Troubleshooting

- **Socket / Swarm Connection Failed**: Ensure your Python FastAPI backend is actively running on port `8000`. The frontend Axios requests rely exactly on `127.0.0.1:8000`.
- **"Ollama Not Running" errors**: Ensure the Ollama background daemon is actively running on your OS.
- **Python Code Execution Fails**: Ensure `python` is cleanly added to your OS PATH variables, as the Code Lab utilizes Python's native `subprocess.run(["python", ...])` architecture.
