const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const http = require('http');

let mainWindow;
let backendProcess = null;

// Setup logging
const logsDir = path.join(app.getPath('userData'), 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}
const backendLogPath = path.join(logsDir, 'backend.log');
const electronLogPath = path.join(logsDir, 'electron.log');

// Clear old logs on each startup to prevent stale error confusion
try { fs.writeFileSync(backendLogPath, ''); } catch(e) {}
try { fs.writeFileSync(electronLogPath, ''); } catch(e) {}

const backendLogStream = fs.createWriteStream(backendLogPath, { flags: 'a' });
const electronLogStream = fs.createWriteStream(electronLogPath, { flags: 'a' });

function log(msg) {
    const time = new Date().toISOString();
    const line = `[${time}] ${msg}\n`;
    electronLogStream.write(line);
    console.log(line);
}

log('Starting Electron app...');

// Determine backend path
const backendExePath = app.isPackaged
    ? path.join(process.resourcesPath, 'backend.exe')
    : path.join(__dirname, '../../backend/dist/backend.exe');

function startBackend() {
    log(`Starting backend at: ${backendExePath}`);
    if (fs.existsSync(backendExePath)) {
        // Run the backend in the user data directory so it has permissions to create 'uploads' folder and SQLite DB
        backendProcess = spawn(backendExePath, [], {
            detached: false,
            cwd: app.getPath('userData'),
            stdio: ['ignore', 'pipe', 'pipe']
        });

        backendProcess.stdout.on('data', (data) => {
            backendLogStream.write(`[STDOUT] ${data}`);
        });

        backendProcess.stderr.on('data', (data) => {
            backendLogStream.write(`[STDERR] ${data}`);
        });

        backendProcess.on('close', (code) => {
            log(`Backend process exited with code ${code}`);
        });
    } else {
        log(`WARNING: Backend executable not found at ${backendExePath}`);
    }
}

function checkOllamaApi() {
    return new Promise((resolve) => {
        http.get('http://127.0.0.1:11434/api/tags', (res) => {
            resolve(res.statusCode === 200);
        }).on('error', () => resolve(false));
    });
}

function checkOllamaInstalled() {
    return new Promise((resolve) => {
        exec('ollama -v', (error) => {
            resolve(!error);
        });
    });
}

function startOllama() {
    log('Starting Ollama background process...');
    const ollamaProcess = spawn('ollama', ['serve'], {
        detached: true,
        stdio: 'ignore'
    });
    ollamaProcess.unref();
}

function verifyAndPullModels() {
    return new Promise((resolve) => {
        exec('ollama list', (error, stdout, stderr) => {
            if (error) {
                log('Failed to run ollama list: ' + error.message);
                resolve();
                return;
            }
            const requiredModel = 'qwen2.5-coder'; // Target model prefix
            if (!stdout.includes(requiredModel)) {
                log(`Model ${requiredModel} not found. Pulling in background...`);
                // Spawn the pull process detached so it downloads silently
                const pullProcess = spawn('ollama', ['pull', 'qwen2.5-coder:7b'], {
                    detached: true,
                    stdio: 'ignore'
                });
                pullProcess.unref();
            } else {
                log(`Model ${requiredModel} is already installed.`);
            }
            resolve();
        });
    });
}

async function handleOllamaFlow() {
    log('Checking Ollama API status...');
    const isRunning = await checkOllamaApi();
    if (isRunning) {
        log('Ollama is already running.');
        await verifyAndPullModels();
        return;
    }

    log('Ollama is not running. Checking if it is installed...');
    const isInstalled = await checkOllamaInstalled();
    if (isInstalled) {
        log('Ollama is installed. Attempting to start it automatically...');
        startOllama();
        // Give it a couple of seconds to boot
        await new Promise(r => setTimeout(r, 2000));
        await verifyAndPullModels();
    } else {
        log('Ollama is NOT installed. The frontend will prompt the user to install via Winget.');
    }
}

function waitForBackend(callback) {
    const maxRetries = 60;
    let retries = 0;
    const interval = setInterval(() => {
        http.get('http://127.0.0.1:1007/health', (res) => {
            if (res.statusCode === 200) {
                clearInterval(interval);
                log('Backend is ready!');
                callback();
            }
        }).on('error', (err) => {
            retries++;
            if (retries >= maxRetries) {
                clearInterval(interval);
                log('Failed to connect to backend after 30 seconds.');
                // create window anyway, so user can see error
                callback();
            }
        });
    }, 500);
}

const UI_PORT = 42813;

function startUIServer() {
    const server = http.createServer((req, res) => {
        let requestUrl = req.url.split('?')[0].split('#')[0];
        if (requestUrl === '/' || requestUrl === '') requestUrl = '/index.html';
        
        let filePath = path.join(__dirname, '../dist', requestUrl);
        
        if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
            filePath = path.join(__dirname, '../dist/index.html');
        }
        
        const extname = String(path.extname(filePath)).toLowerCase();
        const mimeTypes = {
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.wav': 'audio/wav',
            '.mp4': 'video/mp4',
            '.woff': 'application/font-woff',
            '.ttf': 'application/font-ttf',
            '.eot': 'application/vnd.ms-fontobject',
            '.otf': 'application/font-otf',
            '.wasm': 'application/wasm'
        };

        const contentType = mimeTypes[extname] || 'application/octet-stream';

        fs.readFile(filePath, (error, content) => {
            if (error) {
                res.writeHead(500);
                res.end('Server error: ' + error.code);
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content, 'utf-8');
            }
        });
    });

    server.on('error', (e) => {
        if (e.code === 'EADDRINUSE') {
            log(`Port ${UI_PORT} already in use. Assuming UI server is already running from another instance.`);
        } else {
            log(`UI server error: ${e}`);
        }
    });

    server.listen(UI_PORT, '127.0.0.1', () => {
        log(`UI HTTP server running on http://127.0.0.1:${UI_PORT}`);
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        title: 'AutoMind',
        webPreferences: {
            contextIsolation: true,
            sandbox: true,
            nodeIntegration: false,
            preload: path.join(__dirname, 'preload.cjs')
        }
    });

    if (app.isPackaged) {
        mainWindow.loadURL(`http://127.0.0.1:${UI_PORT}`);
    } else {
        mainWindow.loadURL('http://localhost:5173');
    }
}

app.whenReady().then(async () => {
    if (app.isPackaged) {
        startUIServer();
    }
    
    startBackend();
    await handleOllamaFlow();
    
    log('Waiting for backend...');
    waitForBackend(() => {
        createWindow();
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('will-quit', () => {
    if (backendProcess) {
        log('Killing backend process...');
        backendProcess.kill();
    }
});

// IPC handlers for winget and Ollama
ipcMain.handle('install-ollama', async () => {
    return new Promise((resolve, reject) => {
        log('Attempting to install Ollama via winget...');
        exec('winget install Ollama.Ollama --accept-source-agreements --accept-package-agreements', (error, stdout, stderr) => {
            if (error) {
                log(`Error installing Ollama: ${error.message}`);
                resolve({ success: false, message: error.message });
                return;
            }
            log(`Ollama installation output: ${stdout}`);
            resolve({ success: true, message: 'Ollama installed successfully.' });
        });
    });
});
