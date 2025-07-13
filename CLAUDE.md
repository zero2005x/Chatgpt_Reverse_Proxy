# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js-based AI reverse proxy application that serves as an intermediary layer to forward chat requests from external websites to an AI module hosted at `https://dgb01p240102.japaneast.cloudapp.azure.com/`. The project is designed to expose AI functionality through a clean REST API.

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
│   └── app/
│       ├── api/chat/route.ts    # Main API endpoint for chat requests
│       ├── layout.tsx           # Root layout component
│       ├── page.tsx            # Default home page
│       └── globals.css         # Global styles
├── public/                     # Static assets
├── package.json               # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── next.config.ts            # Next.js configuration
├── eslint.config.mjs         # ESLint configuration
├── CLAUDE.md                 # Project documentation
└── .env.example              # Environment variables template
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

### Main Endpoint: `/api/chat`
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

- The application depends on an external AI service at `dgb01p240102.japaneast.cloudapp.azure.com`
- Uses dynamic API key retrieval with configurable fallback
- Implements automatic login with environment-based credentials
- The service is part of a "Wise" admin system with prompt portal functionality
- Requires session-based authentication with specific headers and cookies

## Development Notes

- Path alias `@/*` is configured to point to `./src/*`
- TypeScript strict mode is enabled
- Next.js plugins are configured for optimal development experience
- The app uses Geist fonts (sans and mono) for typography
- Default page contains standard Next.js boilerplate content

## Testing and Quality

Run these commands before committing:
```bash
npm run lint
npm run build
```

## Testing Examples

### Basic Text Chat
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What are the best restaurants in Taipei?","username":"your_username","password":"your_password","id":"13"}'
```

### File Upload Chat
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Analyze this file","username":"your_username","password":"your_password","id":"13","file":{"data":"data:text/plain;base64,SGVsbG8gV29ybGQ="}}'
```

### PowerShell Testing
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

- **Performance Optimization**: Consider implementing session caching to reduce login frequency
- **Error Recovery**: Add retry mechanisms for failed authentication attempts
- **Monitoring**: Implement logging and monitoring for production usage
- **Scalability**: Consider connection pooling for high-traffic scenarios (rate limiting already implemented)
- **Enhanced Security**: Consider implementing API key authentication, JWT tokens, or OAuth2
- **Caching**: Add response caching for frequently asked questions
- **Load Balancing**: Implement load balancing for multiple backend AI endpoints

## Environment Variables

Create a `.env.local` file based on `.env.example`:

```bash
# AI Chat Proxy Environment Variables
AI_BASE_URL=https://dgb01p240102.japaneast.cloudapp.azure.com
MAX_MESSAGE_LENGTH=10000
MAX_FILE_SIZE=5242880
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=10
SESSION_TIMEOUT=3600000
NODE_ENV=production
```