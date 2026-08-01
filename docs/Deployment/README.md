# 🚀 RidePulse Enterprise Deployment Guide

This directory contains containerization configs, environment setup scripts, systemd service units, and production deployment checklists.

## Local Development Setup

1. Navigate to backend directory:
   ```bash
   cd ridepulse_backend
   ```
2. Copy environment template:
   ```bash
   cp .env.example .env
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start development server:
   ```bash
   npm run dev
   ```

## Production Build & Run

```bash
npm run build
npm start
```
