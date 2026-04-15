# Roman Series - Post-UTME Exam Prep Platform

A modern, production-ready monorepo for an exam preparation platform targeting Nigerian Post-UTME candidates.

## 📋 Project Overview

Roman Series is a comprehensive exam preparation platform built with a modern tech stack. The platform includes:

- **Web Application**: Next.js-based frontend for students
- **API Server**: Express-based backend for handling exam data and user management
- **Shared Types**: TypeScript interfaces shared across the monorepo

## 🏗️ Project Structure

```
roman-series/
├── apps/
│   ├── web/          # Next.js 14 frontend application
│   └── api/          # Express.js backend API
├── packages/
│   └── types/        # Shared TypeScript types and interfaces
├── turbo.json        # Turborepo configuration
├── package.json      # Root workspace configuration
└── .gitignore
```

## 🛠️ Tech Stack

### Frontend (`apps/web`)
- **Next.js 14** - React framework with App Router
- **TypeScript** - Static type checking with strict mode
- **Tailwind CSS 3** - Utility-first CSS framework
- **Custom Color Palette** - Subject-specific branding colors

### Backend (`apps/api`)
- **Express.js** - Lightweight Node.js web framework
- **TypeScript** - Full type safety for APIs
- **Nodemon** - Development auto-reload
- **ts-node** - Run TypeScript directly in Node.js

### Shared (`packages/types`)
- **TypeScript** - Shared type definitions
- **Barrel exports** - Centralized type exports

### Monorepo Management
- **Turborepo** - High-performance monorepo build system
- **npm workspaces** - Native Node.js workspace support

## 🎨 Custom Color Palette

The application includes subject-specific colors:

| Color | Hex | Subject |
|-------|-----|---------|
| Navy | `#0D1B2A` | Primary Background |
| Forest | `#1A7A4A` | Brand Accent / Biology |
| Ember | `#C4522A` | Warning/Error / Literature |
| Deep Blue | `#1E3A5F` | Secondary Dark / Government |
| Chemistry | `#8B2252` | Chemistry Subject |
| CRS | `#D97B20` | Christian Religious Studies |
| IRS | `#B0287A` | Islamic Religious Studies |
| English | `#2166B2` | English Subject |
| Physics | `#7B4F1A` | Physics Subject |

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd roman-series
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

### Running Locally

#### Development Mode

Start all applications in development mode using Turborepo:

```bash
npm run dev
```

This will simultaneously start:
- **Web**: http://localhost:3000
- **API**: http://localhost:4000

#### Individual Applications

Start a specific application:

```bash
# Start only the web app
npm run dev -- --filter=web

# Start only the API
npm run dev -- --filter=api
```

### Building

Build all applications:

```bash
npm run build
```

Build a specific application:

```bash
npm run build -- --filter=web
```

### Linting

Lint all applications:

```bash
npm run lint
```

### Type Checking

Run TypeScript type checking across the monorepo:

```bash
npm run type-check
```

## 📦 Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Database
DATABASE_URL=your_database_url

# Authentication
JWT_SECRET=your_jwt_secret

# Paystack Configuration
PAYSTACK_SECRET_KEY=your_paystack_secret
PAYSTACK_PUBLIC_KEY=your_paystack_public_key

# Next.js Public Variables
NEXT_PUBLIC_SUPABASE_URL=your_public_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_public_anon_key
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=your_public_paystack_key
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## 🔧 Common Tasks

### Adding a New Package

1. Create a new directory in `packages/`:
```bash
mkdir packages/your-package
```

2. Create a `package.json` and `tsconfig.json`

3. Add the package to workspace `dependencies` in root `package.json`

4. Run `npm install` to link the package

### Adding Shared Types

1. Define types in `packages/types/src/`

2. Export from `packages/types/src/index.ts`

3. Import in other applications:
```typescript
import type { YourType } from "types";
```

### Adding Dependencies to an App

```bash
npm install <package-name> -w apps/web
# or
npm install <package-name> -w apps/api
```

## 📚 Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [Express Documentation](https://expressjs.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Turborepo Documentation](https://turbo.build/repo/docs)

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## 📝 License

This project is proprietary and confidential.

## 🎓 Notes

- TypeScript strict mode is enabled across all packages
- All applications use ES modules
- The monorepo uses Turborepo caching for faster builds
- Environment variables should never be committed to version control
