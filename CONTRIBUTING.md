# Contributing to Mafia Game

Thank you for your interest in contributing to the Mafia Game project! This document provides guidelines for contributing.

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+
- Python 3.10+
- Ollama (for local LLM)
- Git

### Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/mafia-game.git
   cd mafia-game
   ```

3. Set up the web client:
   ```bash
   npm install
   npm run dev
   ```

4. Set up the AI backend:
   ```bash
   cd game_backend
   python -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt
   cp .env.example .env
   python main.py
   ```

## 📋 How to Contribute

### Reporting Bugs
- Use GitHub Issues
- Include steps to reproduce
- Include error messages and logs
- Specify your OS and environment

### Suggesting Features
- Open an Issue with the `enhancement` label
- Describe the feature and its use case
- Discuss implementation approach

### Code Contributions
1. Create a feature branch from `main`
2. Write clean, documented code
3. Follow existing code style
4. Test your changes
5. Submit a Pull Request

## 📝 Code Style

### Python (Backend)
- Follow PEP 8
- Use type hints
- Document functions with docstrings
- Keep functions focused and small

### TypeScript (Frontend)
- Use strict TypeScript
- Follow React best practices
- Use functional components and hooks
- Keep components focused and reusable

### C# (Unity)
- Follow C# naming conventions
- Use XML documentation comments
- Keep MonoBehaviours focused

## 🔒 Security

- Never commit `.env` files
- Never commit API keys or tokens
- Report security vulnerabilities privately

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.
