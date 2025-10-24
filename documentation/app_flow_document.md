# App Flow Document for the Torrent Streamer Backend and Web Admin Portal

## Onboarding and Sign-In/Sign-Up
A first-time user lands on the Flutter app’s welcome screen after installing it from the app store or clicking a shared link. The screen offers two clear options: sign in for returning users or sign up for new users. To create an account, the user taps "Sign Up," enters a valid email address, a secure password, and confirms the password. When the user submits the form, the app sends a POST request to the backend’s `/api/auth/sign-up` endpoint. If the server accepts the data, it returns a JSON Web Token and user information. The app stores the token securely and navigates the user to the main home page.

Returning users tap "Sign In," enter their email and password, and the app sends these credentials to the `/api/auth/sign-in` endpoint. On successful authentication, the backend responds with a fresh token. The app saves it and displays the home page. If the credentials are wrong, the backend returns an error message and the app shows a friendly prompt asking the user to retry.

On both sign-up and sign-in screens, there is a "Forgot Password" link. Tapping it takes the user to a reset page where they provide their email address. The app calls `/api/auth/forgot-password`, and the server sends a reset link via email. When the user opens that link, they see a reset form, choose a new password, submit, and then are redirected to the sign-in screen. Signing out from any screen is available via a logout button, which clears the stored token and returns the user to the sign-in page. 

Administrators access the web portal by navigating to its URL in a browser. They see a similar sign-in form powered by the same authentication endpoints. After providing valid credentials, the web portal receives the token, stores it in a secure HTTP-only cookie, and loads the admin dashboard.

## Main Dashboard or Home Page
After signing in on the Flutter app, the user arrives at the home screen. A search bar sits at the top, inviting the user to look for content. Below it, a scrollable list of the latest torrents appears with brief titles, sizes, and poster thumbnails. At the bottom, a navigation bar provides three tabs labeled Search, Favorites, and Profile. The Search tab shows the same view as the default. The Favorites tab displays torrents the user has saved. The Profile tab leads to personal settings.

In the web admin portal, the default page after login is the dashboard overview. A sidebar on the left lists sections named Users, Torrents, Ingest Jobs, and System Logs. At the top of the page, a header shows the administrator’s name with a dropdown for account settings and logout. The main area displays widgets such as total user count, recent ingestion activity, and system health indicators. Clicking an item in the sidebar loads the corresponding section on the right without a full page reload.

## Detailed Feature Flows and Page Transitions
When the mobile user enters text in the search bar and taps "Search," the app triggers a GET request to `/api/torrents/search?q={query}`. While waiting, a spinner appears. The backend validates the token, queries the database via Drizzle ORM, and returns matching results. The app displays them in a list. Tapping a torrent item navigates to a detail page where the user sees full metadata, a magnet link button, and a play button. Pressing the magnet link button copies the link to the clipboard. Pressing the play button initiates the P2P streaming library, which fetches data using the magnet link.

The user can switch to the Favorites tab, which issues a GET to `/api/users/me/favorites`. The app displays saved torrents. On a detail page, a "Save to Favorites" or "Remove from Favorites" button sends a POST or DELETE to `/api/users/me/favorites`, updating the list in real time.

In the Profile tab, the user sees a form prefilled with their email and profile name. They can update their name, tap "Save," and the app sends a PATCH to `/api/users/me`. A confirmation message appears on success. A separate section offers a password change form, which calls `/api/auth/change-password`. Successful updates prompt the user to sign in again with the new password.

For administrators, clicking Users in the sidebar loads the user list with pagination controls. The admin can search by email, click a user to view details, and then ban or unban them via action buttons. Under Torrents, the admin sees scraped entries. Each entry can be approved, edited, or deleted. The Ingest Jobs section shows a log of data pushes from the Cloudflare Worker. The admin can trigger a manual ingestion or review failures. All actions call secure API routes under `/api/admin/...` and update the UI dynamically.

## Settings and Account Management
Within the mobile app’s Profile tab, users manage their basic information and password as described above. A notification preferences section allows toggling email alerts for newly added content. There is also a button to delete the account, which calls DELETE on `/api/users/me` after a confirmation prompt. Once the account is removed, the user is logged out and returned to the sign-up screen.

In the web portal, administrators access their account settings from the header dropdown. They can update their display name and password, and assign roles to other admin users. There is a log-out link that clears the authentication cookie and returns the browser to the sign-in form. After any settings change, the portal automatically reloads the relevant pages to reflect updates.

## Error States and Alternate Paths
If a user tries to sign in with invalid credentials, the backend responds with a 401 status and an error message. The app displays an inline alert above the form. During password reset, if the email is not found, the backend returns a 404 and the app shows a message stating the email is not registered. In all API calls, if the token is expired or missing, the server returns 401. The app intercepts this and navigates the user to the sign-in page with a note that the session expired.

When network connectivity is lost, the app detects the offline state and displays a full-screen message prompting the user to retry once they are back online. On search pages, if no results match the query, a friendly "No results found" message appears with suggestions for adjusting the search terms. In the admin portal, unauthorized access to sections redirects the user to a 403 page with an explanation that they lack sufficient privileges.

If the Cloudflare Worker ingestion fails or the backend cannot reach the worker, the Ingest Jobs section shows the failed job entries in red, along with error details. The admin can retry individual jobs or wait for the next scheduled run.

## Conclusion and Overall App Journey
A typical user journey begins with installing the Flutter app, signing up with email and password, and landing on a home screen that shows the latest torrents. The user searches for content, views details, and starts streaming via the built-in P2P player. Along the way, they can save favorites and manage their profile. Administrators follow a parallel path in the web portal: they sign in, review users and torrent data, manage ingestion jobs, and handle errors as they appear. Throughout daily usage, both mobile users and administrators rely on secure, token-based authentication, type-safe API calls, and clear feedback for every action, ensuring a smooth end-to-end experience.