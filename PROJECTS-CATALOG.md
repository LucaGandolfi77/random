# Complete Projects Catalog

> 80+ projects across AI, games, IoT, web, embedded systems, quantum computing, and more.

---

## Languages Used

| Language | Count | Projects |
|----------|-------|----------|
| **Python** | 30+ | agent-library-wrapper, agents-writers-02/03, ai-courtroom-cli, atlas-editorial-house, cat-translator, ctrl-fabric, dynasty-sim, eco_simulator, ecosystem-evolution-simulator, graveyard-chorus, hermes, hermes-principina, holographic-story-builder, interview-coach, italian-startup-simulator, life-operating-system, lingua-evolver, local-llm-run, lunar-mining-simulator, memory_clash, ml-patterns, mlxcli, polarfire-vp, qiskit, quantum-circuit-simulator, rave, sims-ai-city, trend-meme-factory, vertest, whispering_archive, edge-load-balancer-platform |
| **JavaScript/TypeScript** | 35+ | agents-writers, agents-writers-faster, audio-editor-pwa, candy-crush, card-games, coop-game, due-lumi, echoes-of-the-last-dawn, ev-personale, expedition33_game, friends-tycoon, instable-country-generator, interactive-world-map, multi-screen-streamer, openrouter-free-model-comparator, orto-magico, photo-editor-web, pixel-stretch-app, pokopia-clone, quotesmith, reel-boost, reel-tv, shhh-reader, shotmind, slot-*, tailssh-pwa, tarot-app, termux-web-app, voice-fact-check-pwa, wurstverse, ultimo-sveglio |
| **C/C++** | 4 | ai-dj-internet-radio, esp32-os, photoshop-clone, samrh-mplab-linux-env |
| **Rust** | 1 | edge-load-balancer-platform (auth sidecar) |
| **LaTeX/Markdown** | 2 | cv-jb, cv-lg |
| **HTML/CSS** | 20+ | candy-crush, coop-game, ev-personale, expedition33_game, friends-tycoon, openrouter-free-model-comparator, quotesmith, slot-*, etc. |

---

## Frameworks & Technologies

| Category | Technologies |
|----------|-------------|
| **AI/LLM** | OpenRouter, OpenAI API, Hermes agents, llama-cpp-python, mlx-lm, Transformers, Stable-Baselines3 |
| **Web Backend** | FastAPI, Flask, Express.js, Next.js 15/16, Node.js |
| **Frontend** | React 18/19, Vite 6/8, Tailwind CSS 4, Next.js, vanilla JS, Zustand, Framer Motion |
| **Mobile/PWA** | Service Worker, Web Audio API, IndexedDB, vite-plugin-pwa |
| **Databases** | SQLite, PostgreSQL, Redis, aiosqlite, Prisma ORM, SQLAlchemy, better-sqlite3 |
| **Embedded/IoT** | ESP32-S3, PlatformIO, Arduino, FreeRTOS, LittleFS, I2S, OLED, TFT |
| **Desktop GUI** | Qt6, PyQt6, Tkinter, CustomTkinter, Panda3D, Pygame |
| **DevOps** | Docker, Docker Compose, CloudFormation, Ansible, Packer, GitHub Actions |
| **ML/Data** | NumPy, SciPy, scikit-learn, ONNX Runtime, PyTorch, Qiskit, Pandas, Matplotlib |
| **Testing** | pytest, Vitest, Puppeteer, Playwright, VectorCast-style (vertest) |
| **Other** | WebRTC, Socket.IO, Web Speech API, Three.js, Canvas 2D, Ren'Py |

---

## All Projects by Category

### AI & Multi-Agent Systems

| Project | Description | Languages | Key Features |
|---------|-------------|------------|--------------|
| **agent-library-wrapper** | Python library for memory-enabled AI agents via OpenRouter | Python | Short/long-term memory, structured outputs, sync/async, free-model-first |
| **agents-writers** | Multi-agent book-writing pipeline (9 specialized agents) | Node.js | Architect, writer, critic, editor agents; EPUB export; Italian translation; web control panel |
| **agents-writers-02** | Single-file creative writing agent | Python | Multi-step pipeline: analysis, writing, editing, translation, Markdown output |
| **agents-writers-03** | Book factory framework (A/B chapter variants) | Python | 14 genre templates, SQLite persistence, EPUB/PDF export, HTML dashboard, scoring |
| **agents-writers-faster** | Optimized speed-first book writer variant | Node.js | Streamlined pipeline, compact memory windows, opt-in deep review |
| **ai-courtroom-cli** | Terminal courtroom debate with 8 AI agents | Python | Pro/contra/expert/skeptic/futurist/judge roles, SQLite storage, Markdown reports |
| **atlas-editorial-house** | 37 AI personalities for editorial production | Python/Shell/YAML | 5 imprints, 14 launcher scenarios, Hermes framework, Telegram bridge, systemd |
| **ctrl-fabric** | AI-driven fashion company simulation | Python | 27 agents across 5 departments, Flask dashboard, GitHub-style issues/PRs, Docker |
| **graveyard-chorus** | Multi-generational town storytelling simulation | Python | 7 agents, cemetery anthologies, PWA archive, deterministic fallback |
| **hermes** | Multi-agent specialist workspace (11 agents) | Python/YAML | Hot-reloadable configs, parallel dispatch, TUI, persistent memory, 60+ literary pieces |
| **hermes-principina** | Telegram bot transforming messages into prophetic paragraphs | Python | Hermes agents, launchd service, OpenRouter free models, long-polling |
| **interview-coach** | AI-powered interview coaching via CLI | Python | Session management, report generation, memory-backed conversations |
| **italian-startup-simulator** | Italian startup lifecycle simulation | Python | 6 LLM agents, Italy-specific constraints, FastAPI dashboard, SQLite persistence |
| **life-operating-system** | Adaptive personal planning system | Python | 5 agents, energy/sleep tracking, adaptive plans, habit tracking, weekly planning |
| **lingua-evolver** | Artificial language evolution simulator | Python | Emergent vocabulary/grammar, phonology system, Rich Live display |
| **sims-ai-city** | Generational life simulator with AI residents | Python | Relationships, inheritance, family trees, LLM/heuristic backends, FastAPI inspector |
| **instable-country-generator** | Geopolitical simulation of fictional countries | Node.js | 5 competing agents, SVG map, faction dynamics, convergence outcomes, SQLite |
| **dynasty-sim** | Multi-generational dynasty simulator | Python | Genetic inheritance, relationship engine, memory system, HTML report export |
| **cat-translator** | ML-based cat meow translator | Python | Audio classification, scikit-learn, FastAPI web interface, Zenodo dataset |
| **whispering_archive** | AI-driven visual novel | Python/Ren'Py | Dynamic dialogue via local LLM, relationship meters, story branching |

### Games

| Project | Description | Languages | Key Features |
|---------|-------------|------------|--------------|
| **due-lumi** | Pixel art retro adventure RPG | JavaScript | Procedural sprites/music, 4 endings, turn-based combat, zero external assets |
| **echoes-of-the-last-dawn** | 3D JRPG browser game | JavaScript | Three.js low-poly, timed parry, 5 zones, 5 bosses, philosophical story |
| **candy-crush** | Match-3 puzzle game | HTML/CSS/JS | 20 levels, jelly mode, SVG sprites, combo system |
| **friends-tycoon** | Idle tycoon game with custom 3D engine | JavaScript | Custom Canvas 3D renderer, 8 characters, 18 activities, offline progress |
| **pokopia-clone** | Pokemon Pokopia fan game (Dittopia) | JavaScript | 16 species, day/night cycle, chiptune music, Pokedex, crafting |
| **coop-game** | Cooperative satirical board game | HTML/CSS/JS | 3-6 players, character talents, event cards, PWA |
| **expedition33_game** | Narrative text adventure (lighthouse keeper) | HTML/CSS/JS | Choice-based, Web Audio ambient, CSS beam animation, 3 endings |
| **card-games** | 12 multiplayer card games (Scopa, Briscola, etc.) | Node.js | LAN multiplayer, AI bots, Socket.IO, server-authoritative |
| **memory_clash** | Multiplayer memory-matching card game | Python | Pygame client, WebSocket server, Redis persistence |
| **shotmind** | Alcohol-themed Wordle/Mastermind game | JavaScript | Italian words, drinking rules, 4 word packs, PWA |
| **quotesmith** | Quote guessing game (733 quotes) | JavaScript | 8 categories, 3 difficulties, TTS, PWA, bilingual |
| **ultimo-sveglio** | Multiplayer nighttime vigil game | Node.js | Real-time WebSocket, heartbeat system, nightly album |

### Slot Machines

| Project | Description | Languages | Key Features |
|---------|-------------|------------|--------------|
| **slot-esqueleto-explosivo** | Dia de los Muertos slot clone | JavaScript | 5x3 cascading, Explosivo Wild, Mucho Multiplier, ~96% RTP |
| **slot-mexicican-skull** | 5x5 skull slot with bonus mechanics | JavaScript | Bonus meter, super bonus, procedural audio, particle effects |
| **slot-mexico** | Simple 5x5 Loteria slot | JavaScript | 6 symbols, lightweight, mobile-optimized |

### Web Applications

| Project | Description | Languages | Key Features |
|---------|-------------|------------|--------------|
| **reel-tv** | Premium SaaS video broadcasting platform | TypeScript | Next.js 16, Stripe, Clerk, pgvector, Redis, Playwright tests |
| **reel-boost** | TikTok-style feed with boost ranking | TypeScript | Next.js 15, Prisma, recommendation algorithm, JWT auth |
| **tarot-app** | Full-stack tarot reading web app | TypeScript | 78 cards, achievements, shop system, daily draws, Next.js 16 |
| **interactive-world-map** | World statistics atlas (120+ countries) | Python/JS | Flask API, jsVectorMap, charts, CSV export, Docker |
| **openrouter-free-model-comparator** | LLM model benchmarking PWA | JavaScript | Side-by-side comparison, charts, JSON/CSV export |
| **openrouter-free-model-comparator-single** | Single-file LLM comparator | JavaScript | 26 models, iPhone-optimized, zero dependencies |
| **wurstverse** | "Viral sausage culture" PWA metaverse | React/TSX | Feed, DNA quiz, recipes, character builder, 5 sections |
| **multi-screen-streamer** | Android screen streaming to TV | TypeScript | WebRTC P2P, multi-grid layouts, QR pairing, encryption |
| **termux-web-app** | Full-stack app template for Android/Termux | Python/React | FastAPI + React, ngrok tunnel, Docker, PWA |

### Mobile & Offline PWAs

| Project | Description | Languages | Key Features |
|---------|-------------|------------|--------------|
| **audio-editor-pwa** | Multi-track audio editor (Sony Vegas-style) | JavaScript | Web Audio API, SoundTouch, MP3 export, IndexedDB autosave |
| **ev-personale** | Personal dashboard (existential KPIs) | HTML/CSS/JS | 7 views, training plans, diet tracking, localStorage, PWA |
| **voice-fact-check-pwa** | Real-time speech fact-checker | JavaScript | Web Speech API, OpenRouter, multi-language, PWA |
| **shhh-reader** | Noise-sensitive reading app | JavaScript | Mic monitoring, PDF/ePub reader, silence stats, PWA |
| **tailssh-pwa** | SSH/SFTP/VNC client PWA for iPhone | JavaScript | WebSocket relay, xterm.js, noVNC, Tailscale integration |
| **pixel-stretch-app** | Pixel stretch art + AI background removal | TypeScript | React 19, ONNX, WebGPU, layers, PWA |

### Desktop Applications

| Project | Description | Languages | Key Features |
|---------|-------------|------------|--------------|
| **photoshop-clone** | Native image editor | C++17 | Qt6, layers, filters, selection tools, OpenGL, cross-platform |
| **rave** | Real-time artistic vision engine | Python | Neural style transfer, GPU-accelerated, voice/gesture control |
| **holographic-story-builder** | 3D holographic character storytelling | Python | Panda3D, offline TTS, lip sync, holographic shaders |
| **local-llm-run** | Local LLM GUI (MLX/llama-cpp) | Python | Dual inference engines, Tkinter, Apple Silicon optimized |
| **mlxcli** | MLX CLI for local LLMs | Python | Apple Silicon, ~40 tokens/sec, Gemma2 default |

### Embedded & IoT

| Project | Description | Languages | Key Features |
|---------|-------------|------------|--------------|
| **ai-dj-internet-radio** | ESP32 AI-powered internet radio | C++/Python | I2S audio, OLED display, AI DJ comments, TTS |
| **esp32-ai-radio-director** | AI radio station director with hardware | C++/Python | 7 radio modes, TFT display, mood LEDs, rotary encoder |
| **esp32-os** | Mini Unix OS for ESP32 | C++ | Shell with 20+ commands, FreeRTOS, LittleFS, WiFi management |
| **samrh-mplab-linux-env** | SAMRH707/71 firmware test environment | C/Bash | Host + target tests, MPLAB X, MDB debugger, CRC parser |

### Quantum Computing

| Project | Description | Languages | Key Features |
|---------|-------------|------------|--------------|
| **qiskit** | Quantum vs classical optimization study | Python | QAOA, ADMM decomposition, batch execution, PowerPoint generation |
| **quantum-circuit-simulator** | Visual quantum circuit builder | Python | Pygame UI, real-time state visualization, common gates |

### Simulation & Modeling

| Project | Description | Languages | Key Features |
|---------|-------------|------------|--------------|
| **eco_simulator** | Ecosystem simulation game | Python | SimPy, Pygame, predator-prey, climate events, RL agents |
| **ecosystem-evolution-simulator** | Real-time species evolution | Python | PyQt6, SimPy, NetworkX lineage trees, population charts |
| **lunar-mining-simulator** | Lunar mining & Mars colonization sim | Python | Monte Carlo, Tkinter GUI, ROI projections, self-replication |
| **trend-meme-factory** | Automated meme generation pipeline | Python | RSS research, safety filtering, Pillow generation, audit trail |

### Cybersecurity & Infrastructure

| Project | Description | Languages | Key Features |
|---------|-------------|------------|--------------|
| **edge-load-balancer-platform** | Edge load balancing platform | Python/Rust | Envoy control plane, Rust auth sidecar, AWS CloudFormation |

### Embedded Systems / Firmware

| Project | Description | Languages | Key Features |
|---------|-------------|------------|--------------|
| **polarfire-vp** | PolarFire SoC virtual platform | Python | RV64 CPU, GDB stub, ELF loader, multi-hart, YAML board config |
| **vertest** | VectorCAST-inspired C/C++ testing | Python | tree-sitter parsing, test harness generation, coverage analysis |

### Reading & Creative

| Project | Description | Languages | Key Features |
|---------|-------------|------------|--------------|
| **ml-patterns** | Binary pixel grid editor for ML patterns | Python | Zero dependencies, browser-based, drag-to-paint |
