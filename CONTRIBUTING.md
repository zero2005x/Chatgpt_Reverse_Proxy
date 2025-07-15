# Contributing to AI Proxy

Thank you for your interest in contributing to AI Proxy! This document provides guidelines for contributing to the project.

## 🚀 Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/yourusername/ai-proxy.git
   cd ai-proxy
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Create a new branch** for your feature:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## 📋 Development Guidelines

### Code Style
- Follow the existing code style
- Use TypeScript for type safety
- Run ESLint before committing: `npm run lint`
- Format code consistently

### Commit Messages
Use conventional commit format:
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `style:` for formatting changes
- `refactor:` for code refactoring
- `test:` for adding tests
- `chore:` for maintenance tasks

Example:
```
feat: add support for new AI model
fix: resolve authentication issue
docs: update installation instructions
```

### Testing
- Ensure your code builds successfully: `npm run build`
- Test your changes thoroughly
- Add tests for new features when possible

## 🔧 Development Setup

### Environment Variables
Copy `.env.example` to `.env.local` and configure:
```bash
cp .env.example .env.local
```

### Development Server
```bash
npm run dev
```

### Build and Test
```bash
npm run build
npm run lint
```

## 📝 Pull Request Process

1. **Update documentation** if necessary
2. **Ensure all tests pass** and code builds successfully
3. **Write descriptive commit messages**
4. **Create a pull request** with:
   - Clear title and description
   - Reference any related issues
   - Screenshots if UI changes are involved

### Pull Request Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass
- [ ] Code builds successfully
- [ ] Manually tested

## Screenshots (if applicable)
Add screenshots here

## Related Issues
Closes #123
```

## 🐛 Bug Reports

When reporting bugs, please include:
- **Environment details** (OS, browser, Node.js version)
- **Steps to reproduce**
- **Expected vs actual behavior**
- **Error messages or logs**
- **Screenshots** if applicable

## 💡 Feature Requests

For new features, please:
- **Check existing issues** first
- **Describe the problem** your feature solves
- **Provide implementation details** if possible
- **Consider backwards compatibility**

## 🔒 Security

If you discover a security vulnerability:
- **DO NOT** open a public issue
- **Email** the maintainers directly
- **Wait for confirmation** before disclosing

## 📖 Documentation

Help improve documentation by:
- **Fixing typos** and grammar
- **Adding examples** and use cases
- **Updating outdated information**
- **Improving clarity**

## 🌟 Recognition

Contributors will be recognized in:
- **README.md** contributors section
- **GitHub releases** changelog
- **Special thanks** for significant contributions

## 📞 Questions?

- **GitHub Issues** for general questions
- **GitHub Discussions** for community discussion
- **README.md** for basic setup help

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to AI Proxy! 🎉