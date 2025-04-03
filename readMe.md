# Skaya SDK 🚀

Skaya is an advanced CLI toolkit that supercharges your full-stack web3 project setup with production-ready templates and interactive scaffolding with Artificial intelligence

## Installation 📦

```bash
npm install -g skaya
```

## Features ✨

### 🏗️ Project Scaffolding
- **Frontend Templates**:
  - `skaya-react-ts` - React + TypeScript
  - `skaya-vite-ts` - Vite + TypeScript
  - `skaya-nextjs` - Next.js framework
  - `skaya-ecommerce` - E-commerce starter
  - Custom GitHub repositories

- **Backend Templates**:
  - Express + TypeScript
  - Prisma ORM integrated
  - Ready-to-use auth scaffolding

### 🧩 AI-Powered Generation
- **Frontend Components**:
  - Smart component generation with AI
  - Multiple styling options (CSS, SCSS, styled-components)
  - TypeScript/JavaScript support
  - Props/State management configuration

- **Backend Modules**:
  - Routes with CRUD operations
  - Controllers with business logic
  - Middlewares with authentication

## Usage 🛠

Initialize a project:

```bash
skaya init frontend
# Enter frontend project folder name: frontend-app
# ? Select template category: (Use arrow keys)
# ❯ Skaya Official
#  Skaya Starter Kit Frontend
#  Community
```

skaya init backend
```bash
#  Enter backend project folder name: (backend-app)
# Select backend template category: (Use arrow keys)
# ❯ Skaya Official
#  Skaya Starter Kit Backend
#  Community
```

### Create components:

```bash
# Interactive mode
skaya create

# Explicit component creation
skaya create page --project frontend
skaya create middleware --project backend
```
### Options

| Option | Description |
|--------|-------------|
| -p, --project <type> | Project type (frontend or backend) |
| -f, --filename <name> | Filename for the component |
| -a, --ai | Use AI to generate the component |
| -d, --description <text> | Description of the component for AI generation |

# Frontend
```
skaya create component --project frontend
skaya create page --project frontend
```

# Backend
```
skaya create middleware --project backend
skaya create route --project backend
skaya create controller --project backend
```

## Project Structure 🌳

Typical frontend structure:

```
my-frontend/
├── src/
│   ├── components/
│   ├── pages/
│   ├── App.tsx
│   └── index.tsx
├── public/
│   └── index.html
└── package.json
```

Typical backend structure:

```
my-backend/
├── src/
│   ├── prisma/schema.prisma
├── src/
│   ├── controllers/
│   ├── routes/
│   ├── middlewares/
│   └── app.ts
├── package.json
└── tsconfig.json
```

## Development 👨‍💻

- For development contributions:
```
git clone https://github.com/skaya-ui/skaya-cli.git
cd skaya-cli
npm install
npm run build
npm link
```

- Run tests:
```
npm test
```

## Uninstall
```
npm uninstall -g skaya
# For dev version
npm unlink -g skaya && npm uninstall -g
```