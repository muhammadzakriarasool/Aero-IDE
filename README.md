<div align="center">
  <h1>🚀 Aero IDE</h1>
  <p><strong>The Next-Generation, AI-Powered Browser Development Environment</strong></p>
  
  [![Live Demo](https://img.shields.io/badge/Live_Demo-Available_Soon-success?style=for-the-badge&logo=vercel)](https://aero-ide-709381797703.us-central1.run.app) 
  [![Demo Video](https://img.shields.io/badge/Demo_Video-Watch_Now-blue?style=for-the-badge&logo=youtube)](#)
</div>

<br />

## 🌩️ The Problem & The Solution

Building modern web applications currently requires a highly fragmented workflow: developers must juggle IDEs, local terminal environments, AI chat windows, and browser previews. When AI tools generate code, integrating that code back into a local environment often involves tedious copy-pasting, managing dependency hell, and battling environment configuration issues.

**Aero IDE** solves this by unifying the entire development cycle into a single browser tab. By combining the generative power of **Google's Gemini AI** with the virtualization capabilities of **StackBlitz's WebContainer API**, Aero IDE allows users to prompt an AI for a feature, and instantly watch it scaffold, install dependencies, and boot a live React/Vite server—all running entirely within the browser's sandbox without relying on remote servers.

---

## ✨ Key Features (The "Wow" Factor)

- 🧠 **Instant App Generation via AI**
  - **The Logic:** We strictly prompt Gemini-2.5-Flash to generate raw, parsable JSON mapped perfectly to a WebContainer `FileSystemTree`.
  - **Simply put:** You type an idea, and the AI instantly generates a complete, interconnected folder structure of code ready to run, not just a plain text snippet.
- ⚡ **Zero-Latency In-Browser Execution**
  - **The Logic:** Utilizing `@webcontainer/api`, we boot a fully isolated Node.js environment directly in the browser tab using WebAssembly.
  - **Simply put:** There is no waiting in server queues or paying for backend compute. The app boots, compiles, and runs instantly using your machine's own browser resources.

- 🛡️ **Bulletproof Dependency Management & Synchronization**
  - **The Logic:** We built a custom watcher (`checkAndRunInstall`) that intercepts `package.json` changes, programmatically spawns `npm install`, and locks the Zustand state to prevent race conditions or tearing.
  - **Simply put:** If the AI hallucinates a new package or you manually edit dependencies, the IDE smartly pauses everything, natively installs the required modules, and safely reloads the preview without crashing.

- 🛠️ **Pro-Grade Integrated Developer Tools**
  - **The Logic:** We dynamically import Microsoft's **Monaco Editor** (disabling false-positive semantic checks) and pipe WebContainer process streams directly into an **Xterm.js** terminal via Web Streams.
  - **Simply put:** You get the exact same powerful code editing experience as VS Code, complete with a beautifully colorized terminal showing real-time `npm` install progress.

---

## 💻 Tech Stack

Aero IDE is built on a modern, bleeding-edge enterprise stack:

- **Core Framework:** Next.js 16 (App Router)
- **UI & Animations:** React 19, Tailwind CSS v4, Shadcn UI, GSAP
- **State Management:** Zustand v5 (with hydration-safe atomic updates)
- **Virtualization:** StackBlitz WebContainer API
- **AI Integration:** Google Gemini API (`@google/genai`)
- **Editor & Terminal:** Monaco Editor, Xterm.js

---

## ⚙️ How it Works (Architecture Overview)

At its core, Aero IDE acts as a seamless bridge between an AI output and a virtual filesystem:

1. **Prompt & Generate:** The user submits a prompt. The Next.js API route securely pings Gemini, demanding a strict JSON payload representing a Vite + React project.
2. **Mount & Boot:** The IDE receives the payload, mounts it to the `WebContainer` instance, and automatically spawns a background `npm install`.
3. **Compile & Preview:** Once dependencies are installed, a Vite Dev Server (`npm run dev`) is spun up. The generated preview URL is piped directly into a secure iframe within the IDE.
4. **Edit & Auto-Save:** As the user types in the Monaco Editor, a debounced auto-save surgical updates the specific file in the WebContainer via Delta Updates, providing instant Hot Module Replacement (HMR).

---

## 🚀 Local Setup Instructions

Want to run Aero IDE on your own machine? Follow these simple steps:

### 1. Clone the repository

```bash
git clone https://github.com/muhammadzakriarasool/aero-ide.git
cd "aero-ide"
```

### 2. Install dependencies

```bash
npm install
```

### 3. Setup Environment Variables

Create a `.env.local` file in the root directory and add your Google Gemini API key:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Run the Development Server

Because WebContainers require cross-origin isolation, you must run it with the appropriate security headers (handled natively by our Next.js configuration).

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to start building!

---

## 🗺️ Future Roadmap (What's Next)

Aero IDE is just getting started. Following our Phase 1 MVP, our roadmap is aggressively focused on scaling autonomy, dropping API costs to zero, and enabling multiplayer collaboration.

### 🤖 Phase 2: Multi-Agent Swarm & Zero-Cost Routing

- 🧠 **Multi-Agent Swarm | Actor-Critic Topology**
  Instead of one AI doing it all, a "Heavy Lifter" codes while a "Reviewer" tests it.
- 🕵️ **Zero-Cost APIs | Session-Riding Chrome Extension**
  Bypass expensive API bills by routing prompts securely through local, authenticated web sessions.
- 🛑 **Infinite Loop Protection | Error-Driven Circuit Breakers**
  If the code fails repeatedly, the AI pauses automatically and asks you for help to save tokens.

### 👁️ Phase 3: External Context & Complete Observability

- 🎨 **Figma-to-Code | Native MCP Integration**
  The AI pulls design tokens directly from a Figma URL and builds pixel-perfect React components.
- 🗺️ **Visual Architecture Maps | Real-Time Node Graphs**
  No more "black box" code generation. Watch your dependencies and file flows map out visually in real-time.
- 📊 **Agentic Telemetry | Transparent Chain-of-Thought**
  Stream the AI swarm's internal reasoning and debate logic directly to your dashboard.

### 🚀 Phase 4: Moonshots & Enterprise CI/CD

- 🤝 **Multiplayer Collaborative Coding | Yjs & WebRTC**
  Google Docs-style, real-time collaborative coding across different browsers—with zero backend server costs.
- 🐍 **Polyglot Environments | WASIp3 Sandbox**
  Run Python, Rust, and Go microservices natively inside the browser alongside your React app.
- 💻 **Autonomous CI/CD | Local Host OS Bridge**
  A secure local daemon lets the browser-based IDE autonomously trigger GitHub commits and Vercel deployments.

## 🏆 Hackathon Context

This project was proudly built for **Phase 1 of the AI Seekho 2026 Hackathon**.

It demonstrates cutting-edge frontend architecture, sophisticated state management, and practical, production-ready AI integration designed to redefine the modern developer workflow.
