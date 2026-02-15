<div align="center">
  <img width="1200" height="475" alt="Verilog-A Sculptor Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# Verilog-A Sculptor

**AI-assisted Verilog-A model generation for ADC, DAC, TDC, and DTC design workflows.**

[Quick Start](#quick-start) • [Features](#features) • [How It Works](#how-it-works) • [Tech Stack](#tech-stack)
</div>

## Overview

Verilog-A Sculptor is a React + Vite application that helps mixed-signal engineers generate and refine Verilog-A behavioral models from structured model settings and custom design intent.

The app combines:
- **Model recipe controls** (resolution, encoding, ranges, converter type)
- **Global modeling constraints** (power style, transition style, reset/enable logic, naming)
- **LLM-guided synthesis** using Gemini for code generation + concise rationale

## Features

- **Block-based modeling flow** for:
  - ADC (Analog-to-Digital Converter)
  - DAC (Digital-to-Analog Converter)
  - TDC (Time-to-Digital Converter)
  - DTC (Digital-to-Time Converter)
- **Global environment controls** for:
  - module naming style (lowercase/uppercase)
  - hidden-state handling
  - transition strategy (macro vs parameter)
  - supply style (ports vs parameters)
  - reset and master-enable behavior (async/sync, active-high/low)
- **Prompt refinement panel** for injecting project-specific requirements
- **Generated Verilog-A output** with copy-to-clipboard and explanation panel

## Quick Start

### Prerequisites

- Node.js 18+
- npm
- A Gemini API key

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment

Create `.env.local` in the project root:

```bash
GEMINI_API_KEY=your_gemini_api_key
```

(`API_KEY` is also supported for backward compatibility.)

### 3) Start development server

```bash
npm run dev
```

### 4) Production build

```bash
npm run build
```

### 5) Preview production build

```bash
npm run preview
```

## How It Works

1. Select a core converter block (ADC/DAC/TDC/DTC).
2. Tune model parameters (bits, limits, encoding, converter engine).
3. Set global Verilog-A infrastructure behavior.
4. Add any custom prompt guidance.
5. Click **Sculpt Verilog-A Model** to generate code + model insight.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **UI Icons:** lucide-react
- **LLM Integration:** `@google/genai` (Gemini chat session API)

## Repository Structure

```text
.
├── App.tsx                    # Main UI + state + generation workflow
├── types.ts                   # Block schema and model options
├── services/
│   └── geminiService.ts       # Gemini session + prompt orchestration
├── index.tsx                  # App bootstrap
└── vite.config.ts             # Vite config
```

## Notes

- This repository currently includes build scripts (`dev`, `build`, `preview`) and no dedicated automated test suite.
- Ensure your Gemini API key is available locally before generating models.
