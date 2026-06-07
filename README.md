# CoD-innoproj

CoD-innoproj is a full-stack **Chronicles of Darkness character creator and manager**.
It helps players build characters, manage sheets, and use game-assist tools (dice rolling and rule libraries) in one place.

## What the app offers

- Account-style entry screen (login/register UI) with a development bypass option.
- Character dashboard with search/sort and quick access cards.
- Multi-step character creation wizard with point-budget validation.
- Character sheet editing for attributes, skills, merits, specialties, custom powers, health, XP/Beats, and splat-specific fields.
- Dice roller API and UI for Storytelling System style dice pools.
- Rule data libraries served by backend JSON resources (merits, skills, splat options, vampire disciplines).
- Chronicle notes/log organization with local persistence in the browser.

## Project structure

- `/backend` — Spring Boot 3 (Java 17) REST API
- `/frontend` — React 19 + TypeScript + Vite client
- `/stitch` — visual reference screens
- `WEB_APP_SPECIFICATION.md` — product/feature specification

## Prerequisites

- Java 17+
- Maven 3.9+
- Node.js 20+
- npm 10+

## Run the app (recommended)

Start backend and frontend in separate terminals.

### 1) Backend

```bash
cd backend
mvn spring-boot:run
```

Backend: `http://localhost:8080`

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: `http://localhost:5173`

---

## Alternative run option 1 (if `mvn spring-boot:run` is unavailable)

Package the backend and run the generated jar directly:

```bash
cd backend
mvn clean package
java -jar target/backend-0.0.1-SNAPSHOT.jar
```

Then run the frontend with:

```bash
cd frontend
npm install
npm run dev
```

---

## Alternative run option 2 (if Vite dev server is unavailable)

Build and serve the frontend in preview mode:

```bash
cd frontend
npm install
npm run build
npm run preview -- --host --port 4173
```

Open: `http://localhost:4173`

Use this with either backend start method above.

---

## Notes

- Backend data is currently in-memory (no database), so created characters are reset when backend restarts.
- Frontend API base is `http://localhost:8080/api`.
- Backend CORS is configured for frontend origin `http://localhost:5173`.

## Validate

```bash
cd backend && mvn test
cd ../frontend && npm run check && npm run build
```
