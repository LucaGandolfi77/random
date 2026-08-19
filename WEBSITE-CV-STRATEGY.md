# Website Showcase & CV Strategy

> How to present these projects on your personal website and CV for maximum impact.

---

## PART 1: What to Add to Your Website

### Recommended Website Sections

#### 1. Hero Section
- Title: **Luca Gandolfi — AI Engineer & Full-Stack Developer**
- Subtitle: *"Building AI agents, games, IoT devices, and web platforms"*
- Showcase 3 hero projects as animated thumbnails

#### 2. Project Portfolio (Filterable Grid)

Organize projects into **6 showcase categories** with filter tabs:

---

##### Category A: "AI & Multi-Agent Systems" (Strongest section)

| Website Card | Live Demo | Source |
|---|---|---|
| **Atlas Editorial House** | Local demo video | GitHub | 
| **Agents-Writers 03** | Book factory demo | GitHub |
| **Graveyard Chorus** | PWA archive explorer | GitHub |
| **Dynasty Sim** | HTML report demo | GitHub |
| **Life Operating System** | Screenshot/walkthrough | GitHub |
| **Italian Startup Simulator** | Screenshot/walkthrough | GitHub |

**How to present each:**
- 1-sentence description
- Tech stack badges (Python, FastAPI, OpenRouter, SQLite, etc.)
- Embedded screenshot or 15-second looping GIF
- "View Source" + "Live Demo" buttons
- 3 bullet points of key technical highlights

**Example card:**
```
Atlas Editorial House
37 AI personalities orchestrating book production, journalism, and editorial workflows
[Python] [Shell] [YAML] [Hermes] [OpenRouter] [Telegram]

- Multi-agent system with 5 editorial imprints and 14 launcher scenarios
- Autonomous book production via single command with adversarial review trials
- Telegram bot bridge + web dashboard for real-time control

[Live Demo] [GitHub]
```

---

##### Category B: "Games & Interactive" (High engagement)

| Website Card | Why It Stands Out |
|---|---|
| **Due Lumi** | Zero external assets — all sprites/music procedurally generated |
| **Echoes of the Last Dawn** | 3D JRPG with Three.js, parry system, philosophical narrative |
| **Friends Tycoon** | Custom 3D Canvas engine, idle mechanics, offline progress |
| **Dittopia (pokopia-clone)** | Pokemon fan game with chiptune music, day/night cycle |
| **Card Games** | 12 multiplayer games with AI bots and anti-cheat |

**How to present:** Embed playable versions directly on your website using iframes or Canvas.

---

##### Category C: "Web Applications & SaaS" (Commercial viability)

| Website Card | Why It Stands Out |
|---|---|
| **Reel TV** | Full SaaS: Stripe, Clerk, pgvector, Redis, Playwright tests |
| **Tarot App** | 78 cards, achievements, shop, JWT auth, Next.js 16 |
| **Interactive World Map** | 120+ countries, REST API, Docker deployment |
| **Reel Boost** | Custom recommendation algorithm with 6 weighted signals |

**How to present:** Screenshot galleries + architecture diagrams. For Reel TV, show the full tech stack.

---

##### Category D: "PWAs & Offline-First" (Practical utility)

| Website Card | Why It Stands Out |
|---|---|
| **Audio Editor PWA** | Sony Vegas-style, multi-track, MP3 export, zero server |
| **TailSSH PWA** | SSH/SFTP/VNC from iPhone, zero native apps |
| **Voice Fact Check PWA** | Real-time speech monitoring, privacy-first |
| **SHHH Reader** | Noise-sensitive reading, gamified silence |
| **Quotesmith** | 733 bilingual quotes, TTS, zero network after load |

**How to present:** Install links (QR codes), 30-second demo videos showing mobile usage.

---

##### Category E: "Embedded & IoT" (Technical depth)

| Website Card | Why It Stands Out |
|---|---|
| **ESP32 AI Radio Director** | Full-stack IoT: firmware + cloud AI + hardware |
| **ESP32 OS** | Unix-like OS on a microcontroller |
| **AI DJ Internet Radio** | I2S audio, OLED, AI-generated DJ commentary |

**How to present:** Wiring diagrams, hardware photos, firmware code snippets.

---

##### Category F: "Desktop & Scientific" (Research/academic)

| Website Card | Why It Stands Out |
|---|---|
| **Photoshop Clone** | C++17/Qt6, OpenGL, cross-platform |
| **RAVE** | Real-time neural style transfer, GPU-accelerated |
| **Qiskit Study** | Quantum vs classical optimization (PhD thesis work) |
| **PolarFire VP** | RISC-V virtual platform with GDB debugging |
| **VeriTest** | C/C++ unit testing automation (VectorCAST-inspired) |

---

### Website Implementation Recommendations

#### Tech Stack for Your Website
```
Framework:  Next.js 16 + React 19 + TypeScript
Styling:    Tailwind CSS v4
Deploy:     Vercel (free tier)
Database:   None needed (static portfolio)
CMS:        MDX for project pages (keep project data in markdown)
```

#### Specific Implementation Steps

1. **Create project data files** — One `.mdx` file per project with frontmatter:
   ```yaml
   ---
   title: "Atlas Editorial House"
   category: "ai-agents"
   tags: ["Python", "OpenRouter", "Hermes", "Multi-Agent"]
   description: "37 AI personalities for editorial production"
   featured: true
   demoUrl: ""
   githubUrl: "https://github.com/LucaGandolfi77/random/tree/main/atlas-editorial-house"
   screenshots: ["/images/atlas-1.png"]
   ---
   ```

2. **Build a filterable grid** — Use URL params for category filtering (SEO-friendly):
   ```
   /projects?category=ai-agents
   /projects?category=games
   ```

3. **Embed live demos** — For client-side games (due-lumi, candy-crush, etc.):
   - Host static builds on Vercel alongside your site
   - Embed via `<iframe>` with lazy loading
   - Add a "fullscreen" button

4. **Add project deep-dive pages** — Each project gets its own `/projects/[slug]` page with:
   - Architecture diagram
   - Code snippets (3-5 key snippets)
   - Screenshot carousel
   - Tech stack explanation
   - Lessons learned / design decisions

5. **Blog posts for complex projects** — Write 3-4 technical blog posts:
   - "How I Built a Unix-like OS on ESP32" (esp32-os)
   - "Building a Multi-Agent Book Factory with OpenRouter Free Models" (agents-writers-03)
   - "Creating a 3D JRPG in the Browser with Zero Dependencies" (echoes-of-the-last-dawn)
   - "The Architecture Behind 37 AI Editorial Agents" (atlas-editorial-house)

---

## PART 2: What to Add to Your CV

### CV Header
```
Luca Gandolfi
AI Engineer | Full-Stack Developer | Embedded Systems Engineer
Fidenza (PR), Italy | github.com/LucaGandolfi77
```

### Skills Section (Organized by expertise)

```
PROGRAMMING LANGUAGES
  Expert:      Python, JavaScript/TypeScript, C/C++
  Proficient:  Rust, HTML/CSS, Bash, YAML, Ren'Py
  Familiar:    Qiskit, LaTeX

AI & MACHINE LEARNING
  LLM Integration:  OpenRouter API, OpenAI SDK, local LLM deployment (MLX, llama-cpp)
  Frameworks:       Custom multi-agent architectures, Pydantic structured outputs
  ML/RL:            scikit-learn, Stable-Baselines3, ONNX Runtime, PyTorch
  NLP:              Web Speech API, speech recognition, text-to-speech

WEB DEVELOPMENT
  Frontend:   React 18/19, Next.js 15/16, Tailwind CSS v4, Three.js, Canvas 2D
  Backend:    FastAPI, Flask, Express.js, Node.js
  Database:   SQLite, PostgreSQL, Redis, Prisma ORM
  Mobile/PWA: Service Workers, Web Audio API, WebRTC, Socket.IO

EMBEDDED & SYSTEMS
  Platforms:  ESP32-S3, PolarFire SoC (RISC-V), SAMRH707/71 (rad-hard)
  Frameworks: PlatformIO, Arduino, FreeRTOS, Qt6/OpenGL
  Tools:      MPLAB X, XC32, GDB, Renode, VectorCast-style testing

DEVOPS & TOOLING
  Containers: Docker, Docker Compose
  Cloud:      AWS (CloudFormation, Packer, Ansible), Vercel, Render
  CI/CD:      GitHub Actions
  Testing:    pytest, Vitest, Playwright, Puppeteer
```

### Projects Section (Grouped for CV)

Pick **8-10 strongest projects** organized as:

---

#### AI & Multi-Agent Systems

**1. Atlas Editorial House** — Multi-Agent Editorial Production System
- Designed a 37-agent editorial system with 5 imprints, 14 launcher scenarios, and autonomous book production
- Built Hermes-native agent orchestration with hot-reloadable YAML configs and parallel dispatch
- Implemented Telegram bot bridge for real-time remote control and systemd service management
- *Python, Shell, YAML, Hermes, OpenRouter, Telegram Bot API*

**2. Agents-Writers-03** — AI Book Factory Framework
- Created a single-file framework that automates end-to-end book production using LLM free models
- Engineered A/B chapter variant generation with automated scoring and selection
- Built 14 genre templates with EPUB/PDF export and SQLite-backed job persistence
- *Python, httpx, aiosqlite, Pydantic, OpenRouter API*

**3. Dynasty Sim** — LLM-Powered Dynasty Simulator
- Developed a multi-generational family simulator with biological trait inheritance (dominant/recessive genes, mutations)
- Implemented relationship engine with meeting, bonding, feuds, and drift mechanics
- Built checkpoint save system with interactive HTML report export
- *Python, Typer, Pydantic, OpenRouter*

---

#### Web Applications & SaaS

**4. Reel TV** — Premium Video Broadcasting SaaS Platform
- Built a full-stack SaaS platform combining YouTube, TikTok, and TV channel concepts
- Integrated Stripe payments, Clerk authentication, pgvector similarity search, and Redis caching
- Implemented OpenAI-powered content moderation and embeddings with comprehensive Playwright E2E tests
- *Next.js 16, React 19, Tailwind CSS v4, Prisma 7, PostgreSQL, Redis, Stripe, Clerk*

**5. Interactive World Map** — Global Data Platform (120+ Countries)
- Designed a full-stack data platform with interactive vector maps, country comparison, and chart visualizations
- Built a Flask REST API supporting search, filtering, ranking, and CSV export
- Deployed with Docker Compose for containerized production
- *Python, Flask, jsVectorMap, Chart.js, Docker*

---

#### Games & Interactive

**6. Echoes of the Last Dawn** — 3D Browser JRPG
- Developed a complete browser-based JRPG with 3D low-poly graphics using Three.js (all characters from primitives)
- Engineered a timing-based parry combat system with precision ring mechanics
- Vendored Three.js locally for true offline play; procedural particle effects and responsive mobile controls
- *JavaScript, Three.js, Canvas 2D, Web Audio API*

**7. Due Lumi** — Retro Pixel Art Adventure RPG
- Built a complete adventure RPG where all sprites, tiles, and music are procedurally generated in JavaScript (zero external assets)
- Implemented turn-based combat with action commands and a "vicinance" sibling mechanic
- Created a comprehensive smoke test framework running headless in Node.js with stubbed DOM/Canvas/Audio
- *JavaScript, Canvas 2D, Web Audio API*

---

#### Embedded & IoT

**8. ESP32 AI Radio Director** — AI-Powered Internet Radio Station
- Designed a full-stack IoT system spanning ESP32-S3 firmware, FastAPI cloud AI backend, and hardware simulator
- Implemented 7 radio modes with AI-generated DJ commentary using OpenRouter LLMs
- Integrated real hardware: TFT display, rotary encoder, WS2812B mood LEDs, I2S audio output
- *C++ (PlatformIO), Python (FastAPI), OpenAI/OpenRouter, I2S, OLED/TFT*

**9. ESP32 OS** — Mini Unix Operating System for Microcontrollers
- Implemented a Unix-like OS on ESP32 with interactive shell, 20+ commands, FreeRTOS task management, and LittleFS virtual filesystem
- Built WiFi management module (scan, connect, status) and boot script execution
- *C++, Arduino, FreeRTOS, LittleFS, PlatformIO*

---

#### Systems & Tools

**10. VeriTest** — C/C++ Unit Testing Automation Platform
- Built a VectorCAST-inspired testing platform with tree-sitter-based C/C++ AST parsing
- Automated test harness generation, stub/mock creation, and code coverage analysis
- Designed requirements traceability and regression test management with Rich CLI
- *Python, tree-sitter, SQLAlchemy, Jinja2, Click, Rich*

---

### CV Power Phrases (Use These)

For your **summary/profile** at the top of the CV:

> "AI engineer with experience building multi-agent systems (up to 37 agents) using OpenRouter free models, LLM-powered simulations, and production-grade web applications. Strong embedded systems background (ESP32, RISC-V, Rad-Hard SoC) with a track record of delivering DO-178C documentation for aerospace (Thales Alenia Space, Leonardo). Full-stack capabilities spanning React/Next.js frontends to FastAPI backends, with expertise in PWA development, real-time systems, and offline-first architecture."

### What Makes Your Profile Unique (Emphasize This)

1. **Multi-agent AI systems** — Not just using ChatGPT, but designing agent orchestration, memory systems, and editorial workflows
2. **Full-stack IoT** — ESP32 firmware + cloud AI + hardware integration (rare combination)
3. **Aerospace + AI** — DO-178C/ECSS experience + cutting-edge AI projects
4. **Offline-first design philosophy** — Many projects work without internet (PWA, vendored dependencies, deterministic fallbacks)
5. **Production engineering** — Not toy projects: Docker deployment, CI/CD, E2E tests, monitoring (Sentry), proper auth
6. **Italian localization** — Many projects have Italian UI, showing adaptability for the Italian market
7. **Zero-dependency mastery** — Multiple projects with zero external dependencies, showing deep understanding of fundamentals

---

## PART 3: Priority Actions

### This Week
1. [ ] Screenshot/GIF the top 10 projects
2. [ ] Deploy 3-4 client-side games to Vercel (due-lumi, candy-crush, quotesmith, expedition33)
3. [ ] Update GitHub README with project thumbnails and descriptions

### This Month
4. [ ] Build personal website with Next.js 16 (following the structure above)
5. [ ] Write 2 blog posts (ESP32 OS, Multi-Agent Book Factory)
6. [ ] Create demo videos for 5 complex projects (screen recordings)

### For Your Next Job Application
7. [ ] Update CV using the template above
8. [ ] Prepare 3 talking points per project for interview responses
9. [ ] Create a 1-page "Technical Portfolio" PDF with project grid + QR codes to live demos
