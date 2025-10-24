# Frontend Guideline Document

This document outlines how the web-based frontend (admin panel and optional browser client) of the **torrent-streamer-flutter** backend service is built and organized. It explains the architecture, design principles, technologies, and best practices used to ensure the application is easy to maintain, performant, and user-friendly.

---

## 1. Frontend Architecture

### 1.1 Overview
- **Framework:** Next.js 15 with the App Router. This provides both server-side rendering (SSR) and client-side hydration, letting us choose the best rendering strategy for each page or component.
- **Language:** TypeScript for type safety across components, API calls, and shared utility functions.
- **UI Library:** React for building interactive components.
- **Component Library:** shadcn/ui (pre-built, accessible components styled with Tailwind CSS).
- **Styling:** Tailwind CSS (utility-first approach) configured via `tailwind.config.js`.

### 1.2 Scalability & Maintainability
- **Modular Components:** Small, focused components live in a dedicated `components/` folder, making reuse and refactoring straightforward.
- **Server & Client Separation:** Next.js App Router distinguishes server components (fast, secure) from client components (interactive), reducing bundle size and improving performance.
- **TypeScript Everywhere:** Shared types between API routes and React components prevent mismatches and catch errors early in development.
- **Folder-Based Routing:** File-based routing under `app/` keeps navigation structure intuitive.

### 1.3 Performance
- **Automatic Code Splitting:** Next.js only ships the JavaScript needed per page.
- **Image Optimization:** Built-in `<Image>` component delivers optimized images by default.
- **Edge & Serverless Functions:** API routes run close to users (e.g., on Vercel Edge), cutting down network latency.

---

## 2. Design Principles

1. **Usability:** Interfaces are simple and predictable. Primary actions (search, filter, sign in) are easy to find and perform.
2. **Accessibility:** All components follow WAI-ARIA guidelines. shadcn/ui ensures keyboard navigation, semantic HTML, and proper labels.
3. **Responsiveness:** Mobile-first design using Tailwind’s responsive utilities, ensuring layouts adapt gracefully from phones to large desktops.
4. **Consistency:** Shared spacing, typography, and color tokens across the app avoid visual surprises.

**Application in UI Designs**
- Consistent button sizes and hover states.
- Form fields with clear labels, helper text, and error messages.
- Responsive navigation: a collapsible sidebar on desktop that becomes a bottom navigation bar on mobile.

---

## 3. Styling and Theming

### 3.1 Styling Approach
- **Tailwind CSS:** Utility classes in JSX avoid large CSS files and make it easy to see styles alongside markup.
- **No CSS Methodology Needed:** The utility-first nature of Tailwind removes the need for BEM or SMACSS.
- **Global Styles:** A small `globals.css` file for CSS resets and theme variables.

### 3.2 Theming
- **Dark & Light Mode:** Configured in `tailwind.config.js` with the `darkMode: 'class'` strategy. A React context toggles a `class="dark"` on `<html>`.
- **CSS Variables:** Used for semantic colors (--color-bg, --color-text) that Tailwind utilities reference.

### 3.3 Visual Style
- **Style:** Modern flat design with subtle shadows, smooth rounded corners, and clear typography.
- **Color Palette:**
  - Primary: `#3B82F6` (blue-500)
  - Primary Dark: `#2563EB` (blue-600)
  - Accent: `#10B981` (green-500)
  - Neutral Gray: `#6B7280` (gray-500)
  - Background Light: `#F9FAFB`
  - Background Dark: `#111827`
  - Error: `#EF4444` (red-500)
  - Success: `#22C55E` (green-400)

### 3.4 Typography
- **Font Family:** ‘Inter’, system-ui, sans-serif
- **Font Weights:** 400 (Regular), 500 (Medium), 700 (Bold)
- **Line Heights:** Comfortable reading (`1.5` for body, `1.25` for headings)

---

## 4. Component Structure

### 4.1 Organization
- **`components/atoms/`**: Smallest building blocks (Buttons, Inputs, Icons).
- **`components/molecules/`**: Composed atoms (FormField, SearchBar).
- **`components/organisms/`**: Larger sections (Header, Sidebar, TorrentList).
- **`components/templates/`**: Page-level layouts (DashboardLayout, AuthLayout).

### 4.2 Reusability
- Each component has a well-defined API via props and TypeScript interfaces.
- Styling and behavior live together in `.tsx` files, promoting easy refactoring.

### 4.3 Benefits of Component-Based Architecture
- **Isolation:** Fixing or updating one component doesn’t accidentally break others.
- **Testability:** You can write focused unit tests against small components.
- **Consistency:** Shared design tokens and props ensure uniform look and feel.

---

## 5. State Management

### 5.1 Server State (API Data)
- **React Query (TanStack Query):** Handles data fetching, caching, background updates, and retries. Keeps UI in sync with server state without manual loading flags.

### 5.2 Client State (Local UI State)
- **Context API:** Manages global state like user session, theme mode, and sidebar visibility.
- **Component State:** Local `useState` or `useReducer` for transient UI states (e.g., modal open/close).

### 5.3 Why This Approach
- Minimizes boilerplate compared to Redux for this scale of project.
- React Query keeps data fresh and reduces the need for custom caching logic.

---

## 6. Routing and Navigation

### 6.1 App Router (Next.js 15)
- **File-Based Routing:** Each folder under `app/` maps to a route (`app/dashboard/page.tsx` → `/dashboard`).
- **Nested Layouts:** Define `layout.tsx` files for shared UI (headers, footers, sidebars).
- **Route Groups:** Organize related features (e.g., `app/(auth)/sign-in`, `app/api/`).

### 6.2 Link & Nav Components
- **Next.js `<Link>`** for client-side transitions.
- **Custom NavLink** component highlights the active link based on router state.

### 6.3 Navigation Flow
- **Public Routes:** `/sign-in`, `/sign-up`
- **Protected Routes:** Wrapped in an `AuthLayout` that checks for a valid JWT token (via React Query) and redirects if not authenticated.

---

## 7. Performance Optimization

1. **Lazy Loading Components:** Use `next/dynamic` to load heavy components (charts, video players) only when needed.
2. **Image & Asset Optimization:** Next.js `<Image>` and built-in support for WebP.
3. **Code Splitting:** Automatic per-route splitting; additional splits via dynamic imports.
4. **Caching Strategies:** React Query’s stale-while-revalidate and HTTP cache headers on API responses.
5. **Minification & Compression:** Handled automatically by the Next.js build pipeline.
6. **Monitoring:** Integrate tools like Vercel Analytics or external APM (e.g., Datadog) to catch slow renders.

These measures reduce initial load times and keep interactions snappy.

---

## 8. Testing and Quality Assurance

### 8.1 Unit & Integration Tests
- **Jest & React Testing Library:** Test components in isolation and in rendering contexts.
- **Vitest (optional):** A faster alternative to Jest in Vite-based setups.
- **Test Coverage:** Aim for 80% coverage on critical UI and business logic.

### 8.2 End-to-End Tests
- **Playwright or Cypress:** Simulate user flows (sign-in, search torrents, view details) in a real browser.
- **CI Integration:** Run E2E and unit tests on every pull request to prevent regressions.

### 8.3 Linting & Formatting
- **ESLint with TypeScript rules:** Enforce code style and catch errors before runtime.
- **Prettier:** Automatic code formatting on save or commit.

---

## 9. Conclusion and Overall Frontend Summary

This frontend setup—built with Next.js 15, React, TypeScript, Tailwind CSS, and shadcn/ui—offers a modern, modular, and high-performance admin panel or web client for the torrent streaming backend. The combination of:

- A component-based architecture for maintainability
- A clear design system for consistency
- React Query for data fetching
- Next.js App Router for flexible routing
- Comprehensive testing for reliability

ensures that both developers and end users enjoy a smooth experience. Whether you’re extending the web dashboard or integrating with your Flutter mobile client, these guidelines provide a solid foundation for scalable and maintainable frontend development.

Happy coding!