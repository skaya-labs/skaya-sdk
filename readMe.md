# Skaya SDK 🚀

Skaya is an advanced CLI toolkit that supercharges your full-stack web3 project setup with production-ready templates and interactive scaffolding with Artificial intelligence

## Usage with npx 📦

```bash
npx skaya -V

npx skaya init

npx skaya create
```

## Installation 📦

```bash
npm install -g skaya
```

## API Key Configuration 🔑

To use AI-generated code features, you need to set up your Skaya API key using one of these methods:
 - NOTE: use chatgpt apikey right now
1. Environment variable (recommended):
```bash
export SKAYA_API_KEY=your_key_here
```

2. Local .npmrc file:
```bash
echo 'skaya_api_key=your_key_here' >> .npmrc
```

> 🚀 **Frontend generation is fully complete and production-ready**  
> 🔧 **Backend module generation is under active development**

---
## ✨ Features

### 🏗️ Project Scaffolding

#### ✅ Frontend Templates Categories

- `skaya-react-ts` – React + TypeScript *(Ready to Use)*
- `skaya-vite-ts` – Vite + TypeScript *(Coming Soon)*
- `skaya-nextjs` – Next.js Framework *(Coming Soon)*
- `skaya-ecommerce` – E-commerce Starter Template *(Coming Soon)*
- Custom GitHub repository support *(Ready to Use)*

#### 🔧 Backend Templates

- Express.js + TypeScript boilerplate *(Coming Soon)*
- Integrated Prisma ORM setup *(Coming Soon)*
- Built-in authentication scaffolding *(Coming Soon)*

---

### 🧩 AI-Powered Code Generation

#### ✅ Frontend Component Generator

- Smart, context-aware auto generated component generation via AI
- **Multiple Language** TypeScript and JavaScript compatibility (tsx,jsx)
- Choose from multiple styling options: `CSS`, `SCSS`, `styled-components`
- Configure props, state, and component behavior dynamically
- Automatically generate:
  - ✅ **Stories** for each component (Storybook-ready)
  - ✅ **Tests** with sample unit test templates (Jest or Vitest)

#### 🔧 Backend Module Generator *(In Progress)*

- Auto-generate RESTful routes with full CRUD operations
- Scaffold controllers with business logic templates
- Create reusable middleware (e.g., auth, validation)
- Automated routing integration with custom logic support
- **Logging system** (using `Winston` or `Pino`) for request tracking and error logging
- **Swagger/OpenAPI documentation** for all routes
- **Validation layer** using `Zod` or `Yup`
- **Error handler middleware** for clean error responses

---

## 📍 Roadmap

- [x] Frontend scaffolding and AI component generator
- [x] Story and test file generation for components
- [x] CLI command to manage project lifecycle
- [ ] Backend project scaffolding and auth modules
- [ ] Logger integration (Winston or Pino)
- [ ] Swagger/OpenAPI auto-docs for backend routes
- [ ] Dashboard for visual project editing *(Future Plan)*

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
git clone https://github.com/skaya-labs/skaya-sdk.git
cd skaya-sdk
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