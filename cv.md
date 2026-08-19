# Luca Gandolfi — Curriculum Vitae

> AI Engineer | Full-Stack Developer | Embedded Systems Engineer
> Fidenza (PR), Italy · [github.com/LucaGandolfi77/random](https://github.com/LucaGandolfi77/random) · [github.com/LucaGandolfi77/portfolio](https://github.com/LucaGandolfi77/portfolio)

---

## Professional Summary

AI engineer and full-stack developer with a track record of shipping **80+ personal projects** spanning multi-agent AI systems, LLM-powered simulations, games, web SaaS platforms, PWAs, embedded firmware, and quantum computing research. Combined with professional experience in **aerospace software engineering** (DO-178C documentation, ECSS standards, RISC-V/rad-hard SoC test porting at ALTEN for Thales Alenia Space and Leonardo), I bring a rare mix of rigorous, safety-critical engineering discipline and fast-moving AI product development.

I specialize in designing **multi-agent LLM orchestration** (up to 37 coordinated agents), **offline-first / zero-dependency architectures**, and **full-stack IoT** — from ESP32-S3 firmware to cloud AI backends and hardware integration.

---

## Professional Experience

**Software Consultant — ALTEN** (Aerospace & Defence)

- Produced **DO-178C aerospace certification documentation** and worked to **ECSS (European Cooperation for Space Standardization)** standards for **Thales Alenia Space**.
- Performed **refactoring of the OPLS application** for **Leonardo**.
- Ported **test environments and functional, unit, and integration test suites** for **SAMRH71, SAMRH707, and PolarFire** boards using **VectorCAST**, **Renode emulators**, and **RISC-V** targets — for Thales Alenia Space.

---

## Technical Skills

### Programming Languages
- **Python** — 30+ projects (agent orchestration, CLI tools, simulations, ML)
- **JavaScript / TypeScript** — 35+ projects (games, PWAs, SaaS frontends and backends)
- **C / C++** — 4 projects (ESP32 firmware, Qt6 desktop app, embedded testing)
- **Rust** — 1 project (auth sidecar in a load-balancing platform)
- **HTML/CSS** — 20+ projects; **Bash, YAML** for tooling; **LaTeX** for documentation

### AI & Machine Learning
- **LLM integration**: OpenRouter, OpenAI API, local LLM inference (MLX, llama-cpp-python, Transformers), free-model-first cost engineering
- **Multi-agent systems**: orchestration of up to 37 agents, role specialization (architect/writer/critic/judge/editor), hot-reloadable configs, parallel dispatch, persistent short/long-term memory
- **Structured outputs** (Pydantic), deterministic fallbacks for LLM-free operation
- **ML/RL**: scikit-learn, Stable-Baselines3, ONNX Runtime (WebGPU), PyTorch, audio classification
- **NLP/speech**: Web Speech API, TTS (online + offline), speech recognition pipelines
- **Quantum computing**: Qiskit (QAOA, ADMM decomposition, batch execution)

### Web Development
- **Frontend**: React 18/19, Next.js 15/16, Vite, Tailwind CSS 4, Zustand, Framer Motion, Three.js, Canvas 2D
- **Backend**: FastAPI, Flask, Express.js, Node.js
- **Databases**: SQLite, PostgreSQL (+pgvector), Redis, Prisma ORM, SQLAlchemy, aiosqlite, better-sqlite3
- **SaaS integrations**: Stripe payments, Clerk auth, OpenAI content moderation

### PWA & Offline-First
- Service Workers, IndexedDB, vite-plugin-pwa, Web Audio API, Web Speech API, WebRTC, Socket.IO, installable offline apps with autosave and zero-server architectures

### Embedded & IoT
- ESP32-S3: FreeRTOS, LittleFS filesystem, I2S audio, OLED/TFT displays, rotary encoders, WS2812B LEDs, WiFi management
- PlatformIO, Arduino
- PolarFire SoC (RISC-V RV64): virtual platform, GDB stub, ELF loader, multi-hart
- SAMRH71/SAMRH707 (rad-hard): MPLAB X, VectorCAST-style test automation
- Full-stack IoT: firmware + cloud AI backend + real hardware integration

### Desktop & Graphics
- Qt6 (C++17) with OpenGL, PyQt6, Tkinter/CustomTkinter, Panda3D (3D), Pygame
- Custom real-time 3D renderers (Canvas-based), neural style transfer, procedural generation

### DevOps & Testing
- Docker, Docker Compose, AWS CloudFormation, Ansible, Packer, GitHub Actions
- pytest, Vitest, Playwright, Puppeteer, custom VectorCAST-style harness generation (tree-sitter based)

### Scientific & Simulation
- NumPy, SciPy, Pandas, Matplotlib, SimPy, Monte Carlo methods, NetworkX lineage/relationship modeling

---

## Key Competencies

- **Multi-agent system design** — not just using LLM APIs, but architecting role hierarchies, memory systems, orchestration, and editorial workflows
- **Offline-first philosophy** — many projects work with no internet (vendored dependencies, deterministic fallbacks, local inference, PWA offline support)
- **Zero-dependency mastery** — multiple projects with zero external libraries, showing deep understanding of fundamentals
- **Full-stack IoT integration** — combining firmware, cloud AI, and real hardware into single end-to-end systems
- **Production engineering mindset** — Docker deployment, CI/CD, E2E tests, authentication, monitoring
- **Safety-critical discipline** — DO-178C/ECSS documentation and rigorous test porting in aerospace

---

## Selected Project Highlights

### AI & Multi-Agent Systems

**Atlas Editorial House** — Multi-Agent Editorial Production System
- Designed a 37-agent editorial system across 5 imprints and 14 launcher scenarios with autonomous book production
- Built Hermes-native agent orchestration with hot-reloadable YAML configs and parallel dispatch
- Integrated a Telegram bot bridge and systemd service management for remote control
- *Python, Shell, YAML, Hermes, OpenRouter, Telegram Bot API*

**Agents-Writers-03** — AI Book Factory Framework
- Built a framework automating end-to-end book production using LLM free models
- Engineered A/B chapter variant generation with automated scoring and selection
- Created 14 genre templates with EPUB/PDF export and SQLite-backed job persistence
- *Python, httpx, aiosqlite, Pydantic, OpenRouter API*

**Hermes** — Multi-Agent Specialist Workspace
- Orchestrated 11 specialist agents with hot-reloadable configs, parallel dispatch, and a TUI
- Implemented persistent memory; produced 60+ literary pieces
- *Python, YAML, OpenRouter*

**Ctrl-Fabric** — AI-Driven Fashion Company Simulation
- Simulated a company with 27 agents across 5 departments, GitHub-style issues/PRs, Flask dashboard, Docker
- *Python, Flask, Docker*

**Dynasty Sim** — LLM-Powered Dynasty Simulator
- Implemented genetic inheritance (dominant/recessive genes, mutations) and a relationship engine with meeting, bonding, feuds, and drift mechanics
- Built checkpoint save system with interactive HTML report export
- *Python, Typer, Pydantic, OpenRouter*

### Web Applications & SaaS

**Reel TV** — Premium Video Broadcasting SaaS
- Built a full SaaS combining YouTube, TikTok, and TV channel concepts
- Integrated Stripe payments, Clerk authentication, pgvector similarity search, Redis caching
- Implemented OpenAI-powered content moderation/embeddings with Playwright E2E tests
- *Next.js 16, React 19, Tailwind CSS 4, Prisma, PostgreSQL, Redis, Stripe, Clerk*

**Tarot App** — Full-Stack Tarot Reading Web App
- 78 cards, achievements, shop system, daily draws, JWT auth on Next.js 16
- *TypeScript, Next.js 16, PostgreSQL*

**Interactive World Map** — Global Data Platform (120+ Countries)
- Designed a full-stack data platform with interactive vector maps, country comparison, and charts
- Built a Flask REST API with search, filtering, ranking, and CSV export; Docker Compose deployment
- *Python, Flask, jsVectorMap, Chart.js, Docker*

### Games & Interactive

**Echoes of the Last Dawn** — 3D Browser JRPG
- Built a complete browser JRPG with Three.js low-poly graphics (characters from primitives)
- Engineered a timing-based parry combat system; vendored Three.js for true offline play
- *JavaScript, Three.js, Canvas 2D, Web Audio API*

**Due Lumi** — Retro Pixel Art Adventure RPG
- Built a complete adventure RPG where all sprites, tiles, and music are procedurally generated (zero external assets)
- Implemented turn-based combat with action commands; 4 endings
- *JavaScript, Canvas 2D, Web Audio API*

**Friends Tycoon** — Idle Tycoon with Custom 3D Engine
- Wrote a custom Canvas 3D renderer, 8 characters, 18 activities, offline progress
- *JavaScript, Canvas 3D*

### Embedded & IoT

**ESP32 AI Radio Director** — AI-Powered Internet Radio Station
- Designed a full-stack IoT system: ESP32-S3 firmware, FastAPI cloud AI backend, hardware simulator
- Implemented 7 radio modes with AI-generated DJ commentary via OpenRouter
- Integrated real hardware: TFT display, rotary encoder, WS2812B mood LEDs, I2S audio
- *C++ (PlatformIO), Python (FastAPI), OpenRouter, I2S, TFT*

**ESP32 OS** — Mini Unix Operating System for Microcontrollers
- Implemented a Unix-like OS with interactive shell (20+ commands), FreeRTOS task management, LittleFS virtual filesystem, WiFi management
- *C++, Arduino, FreeRTOS, LittleFS, PlatformIO*

### Systems & Tools

**VeriTest** — C/C++ Unit Testing Automation
- Built a VectorCAST-inspired platform with tree-sitter C/C++ AST parsing, automated test harness generation, stub/mock creation, and coverage analysis
- *Python, tree-sitter, SQLAlchemy, Jinja2, Click, Rich*

**PolarFire VP** — RISC-V Virtual Platform
- RV64 CPU with GDB stub, ELF loader, multi-hart, YAML board config
- *Python*

---

## What Makes This Profile Unique

1. **Multi-agent AI engineering** — designing agent orchestration, memory, and editorial workflows (up to 37 agents), not just calling LLM APIs
2. **Aerospace + AI** — DO-178C/ECSS safety-critical discipline combined with cutting-edge AI development
3. **Full-stack IoT** — ESP32 firmware + cloud AI + hardware integration (rare combination)
4. **Offline-first design** — PWAs, vendored dependencies, local LLM inference, deterministic fallbacks
5. **Zero-dependency mastery** — multiple projects built from scratch with no external libraries
6. **Production engineering** — Docker, CI/CD, E2E tests, auth, monitoring — not toy projects
7. **Italian localization** — many projects with Italian UI, ready for the Italian market

---

*Skills and competencies derived from a catalog of 80+ projects maintained at [PROJECTS-CATALOG.md](PROJECTS-CATALOG.md).*
