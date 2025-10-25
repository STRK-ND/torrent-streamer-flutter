flowchart TD
    A[Start] --> B[Flutter App]
    B --> C[Login Screen]
    C --> D[Auth API Endpoint]
    D --> E[Issue JWT Token]
    E --> B
    B --> F[Search Screen]
    F --> G[Search API Endpoint]
    G --> H[PostgreSQL Database]
    H --> G
    G --> I[Return Search Results]
    I --> B
    J[Cloudflare Worker] --> K[Ingest API Endpoint]
    K --> H
    L[Admin Dashboard] --> M[Admin API Endpoint]
    M --> H