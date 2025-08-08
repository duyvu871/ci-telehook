<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# GitHub CI/CD Telegram Notification Bot - Copilot Instructions

This project is a Node.js application built with Express, TypeScript, Prisma, PostgreSQL, and Telegraf for receiving GitHub webhooks and sending notifications via Telegram.

## Project Context

- **Purpose**: Receive GitHub CI/CD webhook notifications and forward them to Telegram users
- **Tech Stack**: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL, Telegraf (Telegram Bot), Docker
- **Authentication**: JWT-based authentication system
- **Database**: PostgreSQL with Prisma ORM for data management

## Code Style & Conventions

- Use TypeScript with strict type checking
- Follow async/await pattern for asynchronous operations
- Use proper error handling with try-catch blocks
- Implement proper HTTP status codes and error responses
- Use Prisma for all database operations
- Follow RESTful API conventions
- Use proper TypeScript interfaces for type safety

## Key Features to Consider

1. **Telegram Bot Integration**: Uses Telegraf library for Telegram bot functionality
2. **Webhook Security**: Validates webhook secrets for GitHub integration
3. **User Management**: Authentication system with password changes
4. **Project Management**: Users can manage multiple GitHub repositories
5. **Notification Settings**: Granular control over notification types
6. **Docker Support**: Full containerization with development and production configs

## Important Files

- `src/index.ts`: Main application entry point
- `src/services/telegramService.ts`: Telegram bot logic and message formatting
- `src/services/authService.ts`: Authentication and user management
- `prisma/schema.prisma`: Database schema definitions
- `src/types/index.ts`: TypeScript interface definitions

## Development Guidelines

- Always use Prisma client for database operations
- Validate input data before processing
- Log errors appropriately for debugging
- Use environment variables for configuration
- Follow the established middleware pattern for authentication
- Ensure proper cleanup and graceful shutdown handling

## API Design Patterns

- Use controller classes with proper dependency injection
- Implement middleware for authentication and validation
- Return consistent JSON response formats
- Use appropriate HTTP status codes
- Include proper error messages for client debugging

When writing code for this project, ensure compatibility with the existing architecture and maintain consistency with the established patterns.
