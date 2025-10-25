# Project Requirements Document (PRD)

## 1. Project Overview
This project delivers a production-ready backend service and optional web admin panel to power a Flutter-based torrent streaming application. Instead of building server and database layers from scratch, you’ll start with a Next.js 15 (App Router) template that already has user authentication, a PostgreSQL database (via Drizzle ORM), a set of REST API routes, and a React/Tailwind CSS admin interface out of the box.

The core problem this solves is accelerating development of a scalable, secure backend for your mobile streaming client. The key objectives are:
- Provide stateless, token-based authentication so Flutter clients can sign up and sign in.
- Expose a clear, type-safe HTTP API for searching, listing, and retrieving torrent metadata.
- Offer an admin dashboard for human operators to manage users and content.
- Ensure seamless deployment and consistent environments via Docker and Vercel.

Success will be measured by the ability of the Flutter app to integrate with all APIs without modifications, as well as by stable performance under expected load and straightforward administrator workflows.

## 2. In-Scope vs. Out-of-Scope

### In-Scope (Version 1)
- Token-based user authentication endpoints (`/api/auth/sign-up`, `/api/auth/sign-in`) returning JSON Web Tokens (JWT).
- Drizzle ORM schemas for `users`, `torrents`, and related tables (`files`, `categories`).
- Core REST API routes under `app/api/`:
  • `/api/torrents/search` (GET)  
  • `/api/torrents/latest` (GET)  
  • `/api/torrents/[id]` (GET)  
  • `/api/users/me` (GET/PUT)
- A secure ingest endpoint (`/api/ingest`) for Cloudflare Workers to push scraped torrent data.
- Admin dashboard built with React, Tailwind CSS, and shadcn/ui to manage users and torrent records.
- Development and production workflows via Docker for local parity, Vercel for serverless deployment.
- Input validation with Zod in every API route.

### Out-of-Scope (Later Phases)
- Native peer-to-peer streaming logic (handled entirely by the Flutter client).
- Real-time WebSocket or signaling server for peer discovery.
- In-app video player or front-end Flutter UI components.
- Advanced analytics, recommendation engine, or machine-learning features.
- Multi-region deployments or data residency compliance beyond a single PostgreSQL instance.

## 3. User Flow

A new mobile user opens the Flutter torrent streaming app and lands on the welcome screen, where they choose to sign up or sign in. If signing up, they enter an email and password, which the Flutter client sends to the backend’s `/api/auth/sign-up` endpoint. Upon success, the backend returns a JWT token and user profile data. The Flutter app stores the token locally and automatically navigates to the home screen.

On the home screen, the user sees a search bar and a list of latest torrents fetched via `/api/torrents/latest`. When they type a query and hit search, the client sends a GET request to `/api/torrents/search?q=…` with the JWT in its `Authorization` header. The backend validates the token, queries the PostgreSQL database via Drizzle ORM, and returns a JSON array of torrent metadata. The user taps an item, the client fetches details from `/api/torrents/[id]`, and then passes the magnet link to the built-in P2P streamer in Flutter.

Separately, an administrator opens the web dashboard, enters credentials at `/login`, and receives a JWT cookie. They view a table of users and content, use filters to find problematic entries, and can edit or delete records. The dashboard also shows basic system health metrics.

## 4. Core Features

- **Authentication Module**  
  • Sign-up and sign-in endpoints issuing JWTs  
  • Token validation middleware for protected routes
- **User Profile Management**  
  • `GET /api/users/me` to fetch profile  
  • `PUT /api/users/me` to update preferences
- **Torrent Metadata API**  
  • `GET /api/torrents/search?q=` for search  
  • `GET /api/torrents/latest` for newest entries  
  • `GET /api/torrents/[id]` for details
- **Data Ingestion Endpoint**  
  • `POST /api/ingest` secured by API key for Cloudflare Worker to push scraped data
- **Database Layer**  
  • Drizzle ORM schemas for users, torrents, files, categories  
  • Migration scripts via Drizzle Kit
- **Admin Dashboard**  
  • React + Tailwind CSS + shadcn/ui interface  
  • User and content management tables  
  • Basic monitoring widgets
- **Validation & Error Handling**  
  • Zod schemas for all request bodies and query params  
  • Consistent JSON error format
- **DevOps & Deployment**  
  • Docker Compose for local Node.js and PostgreSQL setup  
  • Vercel configuration for serverless functions

## 5. Tech Stack & Tools

- **Backend Framework:** Next.js 15 with App Router (API routes)  
- **Language:** TypeScript for end-to-end type safety  
- **Authentication Library:** better-auth (extended for JWT)  
- **Database:** PostgreSQL  
- **ORM:** Drizzle ORM + Drizzle Kit for migrations  
- **Validation:** Zod for input schemas  
- **Web Dashboard:** React, Tailwind CSS, shadcn/ui  
- **Containerization:** Docker & Docker Compose  
- **Deployment:** Vercel (serverless functions)  
- **External Integrations:** Cloudflare Worker for scraping, secured API key

## 6. Non-Functional Requirements

- **Performance:** 95th percentile API response time under 200 ms for typical queries.  
- **Scalability:** Auto-scaling on Vercel to handle spikes in traffic from mobile and web clients.  
- **Security:** HTTPS-only endpoints, JWT tokens with 1-hour expiry, secure storage of secrets in environment variables, input validation to prevent injection attacks.  
- **Reliability:** Zero-downtime deployments, automated health checks.  
- **Usability:** Clear, consistent JSON API design; inline documentation in OpenAPI or similar; meaningful HTTP status codes and error messages.  
- **Compliance:** GDPR-ready with user data deletion endpoint and clear privacy policy (to be drafted separately).

## 7. Constraints & Assumptions

- **Token-Based Auth Required:** We assume Flutter clients will handle JWT storage and refresh flows.  
- **Cloudflare Worker Availability:** We assume the scraper runs independently and can reliably reach the `/api/ingest` endpoint.  
- **Single Database Instance:** No multi-region failover in V1.  
- **Network Connectivity:** Users need stable internet for API calls; offline mode is not supported initially.  
- **Vercel Limits:** Serverless functions must stay under execution timeout (10s default) and memory limits (1GB).

## 8. Known Issues & Potential Pitfalls

- **API Rate Limits:** Vercel free tier has execution and invocation limits. Mitigation: upgrade plan or add caching layer (e.g., Redis) later.  
- **Database Migrations:** Drizzle Kit migrations must be coordinated across environments; avoid schema drift by running migrations in CI/CD.  
- **Token Expiry & Refresh:** Without a refresh-token flow, users may be logged out every hour. Plan a refresh endpoint in the next phase.  
- **CORS & Headers:** Must configure CORS on Next.js to allow requests from your Flutter app domain.  
- **Large Payloads:** Searching or listing very large torrent sets can hit payload size limits. Paginate results and support `limit`/`offset` parameters.  
- **Security of Ingest Endpoint:** Protect with a strong API key and rate limit to avoid unauthorized data injection.

---

This PRD serves as the single source of truth for building, testing, and extending the backend service that will power your Flutter torrent streaming application. Every detail here should eliminate guesswork and enable follow-up technical documents to flow from a clear, shared understanding of the system’s goals and boundaries.