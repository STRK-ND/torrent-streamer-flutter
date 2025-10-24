# Security Guidelines for `torrent-streamer-flutter` Backend Service

This document outlines security best practices and requirements for the Next.js–based backend powering the Flutter torrent streaming application. It applies security-by-design principles to every layer—from authentication to infrastructure—to ensure a robust, resilient, and trustworthy service.

---

## 1. Secure Architecture Overview

- **Defense in Depth**: Integrate multiple layers of security controls (network, application, data, runtime).  
- **Least Privilege**: Grant minimal permissions to database users, API keys, Cloudflare Workers, and server processes.  
- **Secure Defaults**: Default to secure configurations (HTTPS only, strict CORS, locked-down database roles).  
- **Fail Securely**: Ensure that errors never expose sensitive details or leave resources in an insecure state.

---

## 2. Authentication & Access Control

1. **Token-Based Authentication**  
   - Issue **JWTs** signed with a strong algorithm (e.g., RS256 or HS512) and verify `exp`, `iat`, and `aud`.  
   - Use **short-lived access tokens** (e.g., 15 min) + **rotating refresh tokens** stored securely (e.g., HttpOnly, Secure cookie or encrypted store).  
   - Store refresh tokens in a database table to support revocation.  
2. **Password Storage & Policies**  
   - Hash passwords with **Argon2id** or **bcrypt** with a unique salt per user.  
   - Enforce strong password rules (≥12 characters, mixed case, symbols) and rate-limit sign-in attempts.  
3. **Session Management**  
   - If using cookies, set `HttpOnly`, `Secure`, and `SameSite=Strict`/`Lax`.  
   - Implement idle and absolute timeouts and require re-auth on sensitive operations.  
4. **Role-Based Access Control (RBAC)**  
   - Define roles (e.g., **admin**, **moderator**, **user**) and assign scoped permissions per API route.  
   - Enforce authorization checks in Next.js middleware on every protected route.  
5. **Multi-Factor Authentication (MFA)** (Optional)  
   - Provide TOTP or SMS-​based second factors for privileged accounts (e.g., admin portal).

---

## 3. Input Validation & Output Encoding

- **Server-Side Validation**: Use a schema validation library (e.g., **Zod**) for all incoming JSON payloads and query parameters.  
- **Prevent Injection**: Drizzle ORM uses parameterized queries by default; avoid raw SQL.  
- **Sanitize Outputs**: Escape any user-supplied strings rendered in the Web Dashboard to prevent XSS.  
- **Validate Redirects**: Employ an allow-list for any HTTP redirection targets.

---

## 4. Data Protection & Privacy

1. **Encryption in Transit & At Rest**  
   - Enforce TLS 1.2+ on all endpoints (Vercel config).  
   - Enable Transparent Data Encryption (TDE) or disk-level encryption for PostgreSQL.  
2. **Secrets Management**  
   - Store secrets (JWT private keys, DB URLs, API keys) in a secrets manager or Vercel environment variables—never in source control.  
   - Rotate secrets regularly and on personnel changes.  
3. **PII Handling**  
   - Mask or redact PII in logs and API responses.  
   - Collect only necessary user data in compliance with GDPR/CCPA.

---

## 5. API & Service Security

- **HTTPS Enforcement**: Redirect all HTTP traffic to HTTPS via Vercel configuration.  
- **CORS Configuration**: Restrict origins to your Flutter app domain and admin panel; disallow wildcard origins.  
- **Rate Limiting & Throttling**: Apply per-IP and per-user rate limits on sensitive endpoints (e.g., `/api/auth`, `/api/torrents/search`).  
- **API Versioning**: Prefix routes (e.g., `/api/v1/...`) to manage evolving contracts.  
- **Least Data Exposure**: Only return the fields required by the client; avoid exposing internal IDs or metadata.

---

## 6. Web Application Security Hygiene (Admin Panel)

- **CSRF Protection**: Use synchronizer tokens or same-site cookies for state-changing requests.  
- **Security Headers** (via `next.config.js`):  
  - `Content-Security-Policy` (restrict scripts, styles, frames)  
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`  
  - `X-Content-Type-Options: nosniff`  
  - `X-Frame-Options: DENY`  
  - `Referrer-Policy: no-referrer`  
- **Subresource Integrity (SRI)**: Apply integrity attributes on any CDN-hosted assets.

---

## 7. Infrastructure & Configuration Management

- **Docker Hardening**:  
  - Use minimal base images (e.g., `node:18-alpine`).  
  - Scan images with tools like Trivy or Clair.  
- **Database Security**:  
  - Create a dedicated DB user with only INSERT/SELECT/UPDATE permissions on required tables.  
  - Disable superuser or admin roles for application connections.  
- **Serverless Settings**:  
  - Disable Next.js debug or verbose logs in production.  
  - Close unused ports and disable default credentials.

---

## 8. Dependency Management

- **Lockfiles**: Commit `package-lock.json` to guarantee deterministic installs.  
- **Vulnerability Scanning**: Integrate SCA tools (e.g., GitHub Dependabot, Snyk) to detect CVEs.  
- **Minimal Footprint**: Remove unused packages; prefer well-maintained libraries.

---

## 9. DevOps & CI/CD Security

- **Secrets in CI**: Use encrypted variables or vault integrations for build pipelines.  
- **Static Analysis**: Run ESLint with security-focused rules and a SAST scanner on pull requests.  
- **Automated Testing**: Include unit, integration, and security tests (e.g., endpoint fuzzing, OWASP ZAP scans).  
- **Least Privilege for Deploy Keys**: Limit CI service accounts to only the permissions needed for build/deploy.

---

## 10. Monitoring, Logging & Incident Response

- **Structured Logging**: Log JSON-structured events with severity levels; redact tokens/PII.  
- **Centralized Log Management**: Ship logs to a secure SIEM or log service with retention policies.  
- **Metrics & Alerts**: Monitor error rates, latency, rate-limit triggers, and suspicious auth failures.  
- **Incident Response Plan**: Define playbooks for data breaches, key compromise, and DDoS events.

---

By following these guidelines, the `torrent-streamer-flutter` backend service will adhere to security best practices, protect user data, and maintain service integrity as it evolves and scales.