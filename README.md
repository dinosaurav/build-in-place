# 🏗️ Build-in-Place

**Build-in-Place** is an AI-powered 3D level designer and game editor. It leverages LLMs to allow users to build and manipulate 3D scenes using natural language, featuring a robust event system and real-time reconciliation between game state and the Babylon.js engine.

## ✨ Key Features

-   **🤖 AI-First Editing**: Use natural language to add, update, or remove 3D objects via CopilotKit integration.
-   **⚡ Real-time Reconciliation**: Efficiently syncs the game's JSON-based state with the Babylon.js 3D scene.
-   **🔄 EventBus & Subscriptions**: A flexible event system that handles interactions like clicks, collisions, and state changes.
-   **🎭 Play/Edit Lifecycle**: Toggle between interactive play mode and AI-driven edit mode.
-   **📦 Asset Generation**: Generate custom 3D models from text descriptions.
-   **🚀 Multi-Scene Support**: Navigate between different levels and persist state across transitions.

## 🛠️ Tech Stack

-   **Frontend**: React (v19)
-   **3D Engine**: Babylon.js
-   **AI Integration**: CopilotKit
-   **State Management**: Zustand & JSON Patch
-   **Build Tooling**: Vite & TypeScript
-   **Testing**: Vitest & React Testing Library

## 🚀 Getting Started

### Prerequisites

-   Node.js (LTS recommended)
-   pnpm or npm

### Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd build-in-place
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    Create a `.env` file in the root directory (refer to `.env.example`):
    ```env
    VITE_COPILOTKIT_PUBLIC_API_KEY=your_api_key_here
    # Optional: VITE_COPILOTKIT_RUNTIME_URL=your_runtime_url
    ```

4.  **Run in Development Mode:**
    ```bash
    npm run dev
    ```

## 📂 Project Structure

-   `src/core`: Engine internals (EventBus, Reconciler, State management).
-   `src/editor`: React UI components, AI hooks, and the main editor application.
-   `src/schema`: TypeScript interfaces and validation for the game document.

## 🎮 How to Use

1.  **Open the Editor**: Navigate to `http://localhost:5173`.
2.  **Open AI Sidebar**: Press `⌘K` (Mac) or `Ctrl+K` (Windows).
3.  **Prompt the AI**: Try asking: *"Add a blue box at 2, 2, 0 and make it clickable."*
4.  **Play Mode**: Click the **Play** button to test interactions.

---

Built with ❤️ for rapid 3D prototyping.
