# Multi-Agent AutoMind

AutoMind is an entirely localized, highly scalable AI Swarm platform. It effectively merges a glassmorphic React interface with an advanced LangGraph orchestration pipeline running exclusively via your CPU using Ollama.

The platform includes six distinct modules natively embedded inside the dashboard:
1. **AI Chat (Multi-Agent Swarm)**: Deploy an autonomous pipeline consisting of Research, Reasoning, Coding, Critic, and Optimizer agents securely utilizing `Llama 3` and `Mistral`.
2. **Data Lab**: Securely upload CSV datasets directly onto your local server and interactively ask questions; the system utilizes `Qwen2.5-Coder` to natively execute pure Pandas code using a secure `exec()` environment and answers your exact prompt automatically!
3. **Code Lab**: An interactive Python sandbox execution engine testing your logical frameworks natively.
4. **Daily Challenges**: Solve dynamically loaded algorithmic constraints (LeetCode-style) using the Code Lab to securely gain Streak milestones and XP points, persisted using a local SQLite architecture.
5. **Admin & Contest Engine**: A full management suite to create custom algorithmic challenges, schedule live global contests, manage user roles, and automatically generate hidden boundary test cases using AI (`Qwen2.5-Coder`).
6. **Global Arenas**: A competitive real-time split-pane IDE where users solve complex contest algorithms against hidden test assertions while racing on a live updating leaderboard.


---

## 📂 Folder Structure

```text
Multi_Agent_AutoMind/
├── backend/                  # Local FastAPI Backend
│   ├── models/               # Database schemas and SQLAlchemy definitions
│   │   └── schemas.py
│   ├── routers/              # API Route Handlers (Auth, Code, Data, User)
│   │   ├── auth.py
│   │   ├── code.py
│   │   ├── data.py
│   │   └── user.py
│   ├── admin.py              # Contest & challenge admin backend logic
│   ├── db.py                 # SQLite local connection initialization
│   ├── graph.py              # LangGraph multi-agent swarm state definition
│   ├── llm.py                # Ollama client initialization & configuration
│   ├── main.py               # FastAPI main server & middleware setup
│   ├── nodes.py              # LangGraph agent node execution logic (Research, Reasoning, etc.)
│   ├── run.py                # Server startup script (runs on port 1007)
│   └── tools.py              # Custom agent execution tools (sandbox python execution)
├── backend_cloud/            # Optional cloud backend features (global contests)
│   ├── routers/              # Cloud API routes
│   └── main.py               # FastAPI cloud server setup
├── frontend/                 # React (Vite) & Electron Frontend
│   ├── electron/             # Electron desktop configuration
│   │   ├── main.cjs          # Electron main background process
│   │   └── preload.cjs       # Electron secure IPC bridge preload script
│   ├── src/                  # React Application Source
│   │   ├── components/       # Reusable layout and custom UI components
│   │   │   ├── ActivityLog.jsx
│   │   │   ├── AgentWorkflow.jsx
│   │   │   ├── InputPanel.jsx
│   │   │   ├── Layout.jsx
│   │   │   └── OutputPanel.jsx
│   │   ├── pages/            # View Pages for routing
│   │   │   ├── admin/        # Challenge creation dashboard
│   │   │   ├── contest/      # Global Arena / split-pane contest UI
│   │   │   ├── AIChat.jsx    # LangGraph visual multi-agent swarm execution
│   │   │   ├── CodeLab.jsx   # Python sandbox playground
│   │   │   ├── DataLab.jsx   # Interactive CSV AI data analyst
│   │   │   └── Dashboard.jsx # Main dashboard view
│   │   ├── App.jsx           # Main routing & state setup
│   │   ├── main.jsx          # React initialization entry point
│   │   └── index.css         # Styling system (Glassmorphism & dark theme)
│   ├── tailwind.config.js    # Styling layout configs
│   └── vite.config.js        # Vite build configurations
├── Documents/                # Project Documentation
└── README.md                 # Main Documentation
```

---

## Prerequisites

Because the platform executes 100% locally to ensure total data privacy without utilizing external APIs, you must ensure your local system contains the following dependencies:

1. **[Node.js](https://nodejs.org/en)** (For the React/Electron Frontend)
2. **[Python 3.10+](https://www.python.org/downloads/)** (For the FastAPI Backend & REPL Code Execution)
3. **[Ollama](https://ollama.com/)** (The underlying local LLM engine)

### Required Ollama Models
Before starting the backend, you MUST pull the local models onto your machine. Open a terminal and run:
```bash
ollama pull llama3
ollama pull mistral
ollama pull qwen2.5-coder:7b
```

---

## 🚀 Running the Application (Development Mode)

AutoMind utilizes a split full-stack architecture. You will need to keep **two separate terminals open** simultaneously.

### 1. Start the Backend (FastAPI & LangGraph)
Open your first terminal window, navigate to the project folder, and enter the `backend` directory.

```bash
cd backend
```

Ensure you install the Python dependencies. It is recommended to use a virtual environment:
```bash
python -m venv venv
# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
```

Start the Python Uvicorn server:
```bash
python run.py
```
*Note: The SQLite database (`automind.db`) and CSV persistent directory (`uploads/`) will be generated automatically upon your first boot.*

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
You are now successfully inside AutoMind!

---

## 📥 Download Desktop Application

You can download the pre-packaged standalone executable (`.exe`) directly from:
👉 **[Download AutoMind (.exe)](https://automind-six.vercel.app/)**

---

## 📦 Building the Desktop App (Electron)

If you want to run AutoMind as a standalone desktop application:
1. Run `build_backend.bat` in the `backend` directory. This uses PyInstaller to bundle the backend into a standalone `backend.exe`.
2. In the `frontend` directory, run `npm run build` to package the frontend and electron app.
3. The desktop app will automatically spawn the packaged backend on startup!

---

## Troubleshooting

- **Socket / Swarm Connection Failed**: Ensure your Python FastAPI backend is actively running on port `1007`. The frontend Axios requests rely exactly on `127.0.0.1:1007`.
- **"Ollama Not Running" errors**: Ensure the Ollama background daemon is actively running on your OS.
- **Python Code Execution Fails**: Ensure `python` is cleanly added to your OS PATH variables, or run the app via the packaged `backend.exe` which executes natively.
