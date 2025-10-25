# Tech Stack Document

This document explains the technology choices behind the `torrent-streamer-flutter` backend service and web admin panel in clear, everyday language. It shows how each tool fits together to power your Flutter-based torrent streaming app.

## 1. Frontend Technologies

Although the main focus is the backend API, this project includes an optional web interface (admin panel or browser-based client) built with modern frontend tools:

- **Next.js 15 (App Router)**
  - Provides the foundation for both server-rendered pages and API routes.
  - Lets us mix React components with backend logic in the same project.
- **React**
  - A popular JavaScript library for building user interfaces.
  - Powers the interactive parts of the admin dashboard.
- **Tailwind CSS**
  - A utility-first styling framework that speeds up design.
  - Makes it easy to create a consistent look without writing custom CSS from scratch.
- **shadcn/ui**
  - A collection of pre-built React components styled with Tailwind.
  - Helps us assemble common UI elements (buttons, forms, dialogs) quickly.

These tools combine to give administrators or browser-based users a clean, responsive interface for managing users, content, and system settings.

## 2. Backend Technologies

The heart of this project is a production-ready server that exposes REST APIs for your Flutter client. Key choices include:

- **TypeScript**
  - A superset of JavaScript that adds types.
  - Catches many errors during development and creates a clear contract between server and client.
- **Next.js API Routes**
  - Lets us define HTTP endpoints under `app/api/` for tasks like login, searching torrents, and fetching details.
  - Automatically handles routing and integrates with serverless deployments.
- **better-auth**
  - A library we use as the basis for user sign-up/sign-in flows.
  - Extended to issue JSON Web Tokens (JWT), which your Flutter app will store and send with each request.
- **JSON Web Tokens (JWT)**
  - A stateless, compact way to authenticate API requests.
  - Ensures that only authorized users can access protected endpoints.
- **PostgreSQL**
  - A reliable, open-source relational database.
  - Stores user profiles, torrent metadata, watch history, and preferences.
- **Drizzle ORM**
  - A TypeScript-friendly tool for defining database schemas and running queries.
  - Ensures type-safe interactions with PostgreSQL.
- **Zod**
  - A schema validation library.
  - Validates incoming API data to prevent bad or malicious requests.

Together, these components form a robust, type-safe backend that your Flutter app can rely on for user management and data retrieval.

## 3. Infrastructure and Deployment

To keep development smooth and deployments reliable, we’ve chosen infrastructure and tooling that promote consistency and scalability:

- **Docker**
  - Defines the development environment (Node.js, PostgreSQL) in code.
  - Guarantees that "it works on my machine" issues are minimized.
- **Vercel**
  - A platform for deploying Next.js applications with zero configuration.
  - Automatically scales serverless functions in response to traffic.
  - Offers built-in environment variable management.
- **Git & GitHub**
  - Version control system (Git) and a hosted repository (GitHub).
  - Manages code history, pull requests, and collaboration.
- **CI/CD**
  - Vercel’s deployment pipeline tests and publishes changes on push.
  - (Optional) GitHub Actions can run additional checks (linting, tests) before deploying.

These choices ensure that your backend can grow with your user base and that new code can safely make its way into production.

## 4. Third-Party Integrations

We integrate with external services to handle specialized tasks and offload work from our core server:

- **Cloudflare Workers**
  - Runs your torrent-scraping logic at the edge.
  - Sends scraped metadata to a secured API endpoint (`/api/ingest`) in our Next.js app.
- **Vercel Cron Jobs** (or **Inngest**)
  - Schedules periodic tasks, such as triggering scrapes or cleaning up old data.
- **Environment Variables (.env)**
  - Securely stores secrets (database URL, JWT secret, API keys).
  - Keeps sensitive information out of the codebase.

These integrations let us scale scraping, scheduling, and secret management without complicating the core application.

## 5. Security and Performance Considerations

We’ve built in measures to keep data safe and the app responsive:

- **Authentication & Authorization**
  - JWT-based tokens ensure each request comes from a verified user.
  - Middleware checks tokens on every protected route.
- **Input Validation**
  - Zod schemas validate all incoming requests to prevent malformed data and attacks.
- **Secure Configuration**
  - Environment variables and Docker secrets keep credentials out of source code.
  - HTTPS is enforced by default on Vercel.
- **Type Safety**
  - TypeScript and Drizzle ORM catch mismatches between code and database early.
- **Performance Optimizations**
  - Serverless functions auto-scale on Vercel, so spikes in traffic are handled gracefully.
  - Database indexes (to be added on key columns) speed up search queries.

These practices protect user data, prevent common vulnerabilities, and keep response times low.

## 6. Conclusion and Overall Tech Stack Summary

By combining a Next.js 15 backend with TypeScript, Drizzle ORM, and PostgreSQL, we have a solid, type-safe foundation for your torrent streaming service. Frontend technologies like React, Tailwind CSS, and shadcn/ui power an optional admin dashboard. Docker and Vercel streamline development and deployment, while Cloudflare Workers and scheduled jobs handle scraping and background tasks.

This tech stack aligns perfectly with your goals:

- **Scalable API-first design** for your Flutter client.
- **Robust user authentication** with JWT.
- **Type-safe data layer** from Drizzle and TypeScript.
- **Easy deployments and scaling** via Vercel and Docker.
- **Modular integrations** for scraping, scheduling, and environment management.

By building on this opinionated starter template, you accelerate development and focus on the unique streaming experience in your Flutter app.