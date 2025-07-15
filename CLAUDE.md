# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a comprehensive Next.js-based AI chat platform that provides dual-mode functionality: it serves as both a reverse proxy for an internal AI Portal service and a multi-service AI platform supporting 27+ external AI providers. The project features a complete chat interface, session management, API key management, and comprehensive security features.

## Tech Stack

- **Framework**: Next.js 15.3.5 with App Router
- **Runtime**: React 19.0.0 
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **Linting**: ESLint with Next.js configuration
- **Development**: Turbopack for fast development builds

## Project Structure

```
Chatgpt_Reverse_Proxy/
├── src/
│   ├── app/
│   │   ├── api/                 # API endpoints
│   │   │   ├── chat/route.ts    # Original Portal service
│   │   │   ├── ai-chat/route.ts # External AI services
│   │   │   ├── check-login/route.ts # Portal authentication
│   │   │   └── check-access/route.ts # Portal access verification
│   │   ├── chat/                # Multi-service chat interface
│   │   │   └── page.tsx
│   │   ├── settings/            # API key management
│   │   │   └── page.tsx
│   │   ├── docs/                # Data format documentation
│   │   │   └── page.tsx
│   │   ├── layout.tsx           # Root layout component
│   │   ├── page.tsx            # Homepage with Portal authentication
│   │   ├── globals.css         # Global styles
│   │   └── favicon.ico         # Favicon
│   ├── components/              # React components
│   │   ├── ServiceSelector.tsx  # Service/model selection with status indicators
│   │   ├── ChatSidebar.tsx      # Session management
│   │   ├── ChatMessage.tsx      # Message display
│   │   ├── ChatInput.tsx        # Advanced input with file upload
│   │   ├── ApiKeyModal.tsx      # API key setup
│   │   ├── ApiKeyForm.tsx       # API key form with tooltips
│   │   ├── ApiKeyList.tsx       # API key list
│   │   ├── ApiKeyListItem.tsx   # API key list item
│   │   ├── ApiKeyImportExport.tsx # Import/export functionality
│   │   ├── InfoPanel.tsx        # Service information
│   │   ├── InlineChatBox.tsx    # Inline chat component
│   │   ├── NavigationHeader.tsx # Unified navigation header
│   │   ├── LoadingSpinner.tsx   # Loading states and spinner
│   │   ├── Notification.tsx     # Toast notification system
│   │   ├── ServiceStatusIndicator.tsx # Visual service status
│   │   └── Tooltip.tsx          # Interactive help tooltips
│   ├── hooks/                   # Custom React hooks
│   │   ├── useApiKeys.ts        # API key management
│   │   ├── useChatHistory.ts    # Chat session management
│   │   └── useApiKeyImportExport.ts # Batch operations
│   └── types/                   # TypeScript type definitions
│       └── message.ts
├── public/                      # Static assets
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── package.json                 # Dependencies and scripts
├── package-lock.json           # Dependency lock file
├── tsconfig.json               # TypeScript configuration
├── next.config.ts              # Next.js configuration
├── eslint.config.mjs           # ESLint configuration
├── postcss.config.mjs          # PostCSS configuration
├── vercel.json                 # Vercel deployment configuration
├── CLAUDE.md                   # Project documentation
├── README.md                   # Project README
├── DEPLOYMENT.md               # Deployment guide
├── .env.example                # Environment variables template
└── .gitignore                  # Git ignore file
```

## Common Development Commands

```bash
# Install dependencies
npm install

# Start development server with Turbopack
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## API Architecture

### Dual-Mode API System

#### Original Portal Service: `/api/chat`
- **Method**: POST
- **Content-Type**: application/json
- **Request Body**: 
  - Basic: `{ "message": string, "username": string, "password": string, "id"?: string }`
  - With file: `{ "message": string, "username": string, "password": string, "id"?: string, "file": { "data": string } }`
- **Response**: `{ "reply": string }` or `{ "error": string }`
- **Rate Limiting**: Maximum 10 requests per minute per IP address
- **Security**: Input validation, XSS protection, and file type validation

The API forwards requests to:
- **Target URL**: `https://dgb01p240102.japaneast.cloudapp.azure.com/wise/wiseadm/s/promptportal/portal/completion`
- **Method**: POST with `application/x-www-form-urlencoded` payload
- **Payload**: `USERUPLOADFILE` (base64 file data), `USERPROMPT` (user message)

#### External AI Services: `/api/ai-chat`
- **Method**: POST
- **Content-Type**: application/json
- **Request Body**: `{ "message": string, "service": string, "model"?: string, "temperature"?: number, "maxTokens"?: number }`
- **Response**: `{ "reply": string }` or `{ "error": string }`
- **Supported Services**: 27+ AI providers including OpenAI, Google, Anthropic, Mistral, Cohere, Groq, xAI, Azure, etc.
- **Model Selection**: Dynamic model selection based on service provider

#### Authentication & Verification APIs
- **`/api/check-login`**: Portal authentication status verification
- **`/api/check-access`**: Portal access permission verification

### Key Implementation Details

- **Dynamic Authentication**: Implements fresh login for each request with automatic session management
- **Multi-endpoint Strategy**: Attempts multiple AI endpoints to ensure high connection success rate
- **File Upload Support**: Handles base64-encoded file uploads (text/plain, text/csv, application/pdf only)
- **Form-encoded Payload**: Uses URLSearchParams with `USERUPLOADFILE` and `USERPROMPT` parameters
- **Default AI module ID**: '13' if not specified
- **Comprehensive Error Handling**: Includes HTTP errors, JSON parsing failures, and authentication issues
- **Intelligent Response Parsing**: Extracts AI responses from multiple possible response formats
- **Security Features**: 
  - Rate limiting (10 requests/minute per IP)
  - Input validation and sanitization
  - XSS and injection attack protection
  - File type and size restrictions (max 5MB)
  - Sensitive information logging prevention

## External Dependencies

### Portal Service Dependencies
- The application depends on an external AI service at `dgb01p240102.japaneast.cloudapp.azure.com`
- Uses dynamic API key retrieval with configurable fallback
- Implements automatic login with environment-based credentials
- The service is part of a "Wise" admin system with prompt portal functionality
- Requires session-based authentication with specific headers and cookies

### External AI Service Dependencies
- **OpenAI**: GPT-4o, GPT-4o-mini, GPT-4-turbo, GPT-3.5-turbo
- **Google**: Gemini-1.5-pro, Gemini-1.5-flash, Gemini-1.0-pro
- **Anthropic**: Claude-3.5-sonnet, Claude-3-opus, Claude-3-sonnet, Claude-3-haiku
- **Mistral**: Mistral-large-latest, Open-mixtral-8x22b, Codestral-latest
- **Cohere**: Command-r-plus, Command-r, Command-light
- **Groq**: Llama3-70b-8192, Llama3-8b-8192, Mixtral-8x7b-32768, Gemma-7b-it
- **xAI**: Grok-4, Grok-3 variants with regional endpoints
- **Azure OpenAI**: GPT-4, GPT-4-turbo, GPT-35-turbo variants
- **Hugging Face**: DialoGPT-medium, BlenderBot-400M-distill
- **Additional Services**: Together AI, Fireworks AI, Perplexity, AWS Bedrock, etc.

## Development Notes

- Path alias `@/*` is configured to point to `./src/*`
- TypeScript strict mode is enabled
- Next.js plugins are configured for optimal development experience
- The app uses Geist fonts (sans and mono) for typography
- Complete chat application with session management and data persistence
- Client-side data storage using localStorage for chat history and API keys
- Real-time service status monitoring and authentication verification
- Comprehensive error handling and user feedback systems

## Testing and Quality

Run these commands before committing:
```bash
npm run lint
npm run build
```

## Testing Examples

### Portal Service Testing

#### Basic Text Chat
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What are the best restaurants in Taipei?","username":"your_username","password":"your_password","id":"13"}'
```

#### File Upload Chat
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Analyze this file","username":"your_username","password":"your_password","id":"13","file":{"data":"data:text/plain;base64,SGVsbG8gV29ybGQ="}}'
```

#### PowerShell Testing
```powershell
$body = @{
    message = "Please analyze the uploaded file"
    username = "your_username"
    password = "your_password"
    id = "13"
    file = @{
        data = "data:text/plain;base64,SGVsbG8gV29ybGQ="
    }
} | ConvertTo-Json -Depth 3

Invoke-RestMethod -Uri http://localhost:3000/api/chat -Method POST -ContentType "application/json" -Body $body
```

### External AI Services Testing

#### OpenAI GPT-4o
```bash
curl -X POST http://localhost:3000/api/ai-chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello, how are you?","service":"openai","model":"gpt-4o","temperature":0.7,"maxTokens":1000}'
```

#### Google Gemini
```bash
curl -X POST http://localhost:3000/api/ai-chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Explain quantum computing","service":"google","model":"gemini-1.5-pro"}'
```

#### Anthropic Claude
```bash
curl -X POST http://localhost:3000/api/ai-chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Write a poem about AI","service":"anthropic","model":"claude-3.5-sonnet-20240620"}'
```

### Authentication Testing

#### Check Login Status
```bash
curl -X POST http://localhost:3000/api/check-login \
  -H "Content-Type: application/json" \
  -d '{"username":"your_username","password":"your_password","baseUrl":"https://dgb01p240102.japaneast.cloudapp.azure.com"}'
```

#### Check Access Permission
```bash
curl -X POST http://localhost:3000/api/check-access \
  -H "Content-Type: application/json" \
  -d '{"username":"your_username","password":"your_password","baseUrl":"https://dgb01p240102.japaneast.cloudapp.azure.com"}'
```

### Testing Rate Limiting
```bash
# This will trigger rate limiting after 10 requests within 1 minute
for i in {1..12}; do
  curl -X POST http://localhost:3000/api/chat \
    -H "Content-Type: application/json" \
    -d '{"message":"Rate limit test '$i'","username":"your_username","password":"your_password"}'
done
```

## Security Considerations

### Implemented Security Features

- **Rate Limiting**: 10 requests per minute per IP address to prevent abuse
- **Input Validation**: Comprehensive validation for usernames (3-50 chars), passwords (6-100 chars), and messages (max 10,000 chars)
- **XSS Protection**: Malicious content detection and filtering for script tags, JavaScript URLs, and event handlers
- **File Upload Security**: 
  - Type restrictions (text/plain, text/csv, application/pdf only)
  - Size limits (maximum 5MB)
  - Base64 format validation
- **Information Security**: Sensitive data logging prevention to avoid credential leakage
- **Security Headers**: XSS protection, content type options, frame options, and HSTS headers
- **Error Handling**: Secure error responses without internal information disclosure

### Authentication & Session Management

- **Dynamic Authentication**: Fresh login for each request with automatic session management
- **API Key Security**: Dynamic API key retrieval provides better security than static keys
- **Session Isolation**: No persistent session storage to minimize security risks

### Environment Security

- **Credentials Management**: Use environment variables for sensitive configurations
- **HTTPS Enforcement**: Strict Transport Security headers for production deployments

## Future Considerations

### Performance Optimization
- **Session Caching**: Implement session caching to reduce login frequency
- **Response Caching**: Add response caching for frequently asked questions
- **Connection Pooling**: Consider connection pooling for high-traffic scenarios

### Enhanced Features
- **Multi-Language Support**: Add internationalization for different languages
- **Advanced Chat Features**: Implement message reactions, reply threads, and file sharing
- **AI Model Comparison**: Side-by-side comparison of different AI models
- **Custom Model Fine-tuning**: Integration with custom model endpoints
- **Voice Chat**: Add speech-to-text and text-to-speech capabilities

### Security Enhancements
- **OAuth Integration**: Add OAuth2 authentication for external services
- **Advanced Threat Detection**: Implement AI-based content filtering
- **Audit Logging**: Comprehensive audit trails for all user actions
- **Role-Based Access Control**: Fine-grained permission management

### Scalability & Monitoring
- **Load Balancing**: Implement load balancing for multiple backend AI endpoints
- **Real-time Monitoring**: Add comprehensive monitoring and alerting
- **Database Integration**: Move from localStorage to proper database backend
- **API Analytics**: Detailed usage analytics and reporting

### User Experience
- **Mobile App**: Native mobile application development
- **Browser Extension**: Chrome/Firefox extension for quick access
- **Keyboard Shortcuts**: Advanced keyboard navigation and shortcuts
- **Accessibility**: Enhanced accessibility features for users with disabilities

## Environment Variables

Create a `.env.local` file based on `.env.example`:

```bash
# AI Chat Platform Environment Variables

# Portal Service Configuration
AI_BASE_URL=https://dgb01p240102.japaneast.cloudapp.azure.com
TENANT_UUID=your-tenant-uuid
LOGIN_PATH=/your/login/path

# Security Settings
ENCRYPTION_KEY=your-32-character-encryption-key
MAX_MESSAGE_LENGTH=10000
MAX_FILE_SIZE=5242880
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=10
SESSION_TIMEOUT=3600000

# External AI Services (Optional - can be set via UI)
OPENAI_API_KEY=your-openai-key
GOOGLE_API_KEY=your-google-key
ANTHROPIC_API_KEY=your-anthropic-key
MISTRAL_API_KEY=your-mistral-key
COHERE_API_KEY=your-cohere-key
GROQ_API_KEY=your-groq-key
XAI_API_KEY=your-xai-key

# Application Settings
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-app-domain.com
```