# Localtopsh

**Local AI Agent for Your PC**

Localtopsh is a lightweight autonomous agent designed for **simple local tasks** on your personal computer. One model, multiple isolated contexts, zero cloud dependency.

## 🎯 Philosophy

> "Your PC. Your model. Your data."

We focus on **practical local automation** — not competing with cloud APIs on complex reasoning. Localtopsh excels at:

- File operations and code editing
- Git workflows automation  
- Web research and scraping
- Browser automation
- Running scripts and commands

All running locally on your hardware, with your data never leaving your machine.

## 🏗️ Architecture: Isolated Context Agents

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interface                            │
│                  (Telegram / CLI / API)                          │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                   CLASSIFIER AGENT                               │
│                    (GPT-OSS-20B)                                 │
│                                                                  │
│   Analyzes task → Routes to specialist → Merges results         │
└────────┬────────────────┬────────────────┬─────────────────────┘
         │                │                │
    ┌────▼────┐     ┌────▼────┐     ┌────▼────┐
    │  CODE   │     │  WEB    │     │ BROWSER │     ...more
    │  AGENT  │     │  AGENT  │     │  AGENT  │     agents
    └────┬────┘     └────┬────┘     └────┬────┘
         │                │                │
    ┌────▼────┐     ┌────▼────┐     ┌────▼────┐
    │ISOLATED │     │ISOLATED │     │ISOLATED │
    │CONTEXT  │     │CONTEXT  │     │CONTEXT  │
    └─────────┘     └─────────┘     └─────────┘
    
         ▲                ▲                ▲
         └────────────────┴────────────────┘
                    Same Model
                  (GPT-OSS-20B)
```

### Key Principles

1. **One Model, Many Agents** — All agents run on the same local model (e.g., GPT-OSS-20B), just with isolated contexts. No need for multiple deployments.

2. **Context Isolation** — Each sub-agent operates in its own context window. This prevents cross-contamination and enables parallel execution.

3. **Classifier-First** — The classifier analyzes incoming tasks and routes them to the best-suited specialist agent with appropriate system prompt.

4. **Local-First** — Everything runs on your machine. Your files, your data, your control.

## 🤖 Recommended Models

| Model | VRAM | Best For |
|-------|------|----------|
| [**GPT-OSS-20B**](https://huggingface.co/openai/gpt-oss-20b) | 16GB | Default choice — OpenAI's open model |
| [**Qwen2.5-7B**](https://huggingface.co/Qwen/Qwen2.5-7B-Instruct) | 8GB | Budget option, great for simple tasks |
| [**Qwen3-Coder-30B-A3B**](https://huggingface.co/Qwen/Qwen3-Coder-30B-A3B-Instruct) | 8GB | Code-focused tasks |
| [**GLM-4.6V-Flash**](https://huggingface.co/zai-org/GLM-4.6V-Flash) | 12GB | When you need vision capabilities |
| [**Phi-4**](https://huggingface.co/microsoft/phi-4) | 8GB | Lightweight reasoning |

## 🚀 Features

- **25+ tools** — Files, bash, git, browser, web search, Python/JS execution
- **Telegram interface** — Chat with your agent from anywhere
- **Docker-ready** — Simple deployment via docker-compose
- **OpenAI-compatible** — Works with vLLM, Ollama, LM Studio, llama.cpp
- **Memory system** — Persistent memory across sessions
- **Parallel execution** — Multiple isolated agents working simultaneously

## 📦 Quick Start

```bash
# Clone
git clone https://github.com/vakovalskii/Localtopsh.git
cd Localtopsh

# Configure
cp .env.example .env
# Edit .env - add TELEGRAM_BOT_TOKEN and LLM settings

# Run
docker-compose up -d
```

## ⚙️ Configuration

```env
# Local LLM (vLLM, Ollama, LM Studio, etc.)
OPENAI_BASE_URL=http://localhost:8000/v1
OPENAI_API_KEY=dummy
OPENAI_MODEL=openai/gpt-oss-20b

# Telegram Bot
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_ALLOWED_USERS=123456789

# Workspace for file operations
AGENT_CWD=/workspace
```

## 🛠️ Tool Suite

| Category | Tools |
|----------|-------|
| **Files** | read_file, write_file, edit_file, search_files, search_text |
| **Shell** | run_command |
| **Git** | git_status, git_log, git_diff, git_commit, git_push... |
| **Browser** | browser_navigate, browser_click, browser_type, browser_screenshot |
| **Web** | search_web, extract_page, fetch_html, fetch_json |
| **Code** | execute_python, execute_js |
| **Memory** | manage_memory, manage_todos |

## 💡 Use Cases

- **Automate git workflows** — "commit all changes with a meaningful message"
- **File management** — "find all TODO comments in the codebase"
- **Web research** — "search for Python best practices and summarize"
- **Code editing** — "add error handling to this function"
- **Browser tasks** — "take a screenshot of this webpage"

## 📄 License

MIT

---

**Localtopsh** = **Local** + **top** + **sh**ell — your local shell assistant.

*"Simple tasks. Local models. Full control."*
