# CoD-innoproj

Spring Boot + Svelte 5 (Runes) web app scaffold for the Chronicles of Darkness character creator.

## Structure

- `/backend` — Java Spring Boot REST API (character CRUD, dice roller, data libraries)
- `/frontend` — Svelte 5 + TypeScript client (login, dashboard, wizard, character sheet, settings)
- `/stitch` — visual reference HTML screens
- `WEB_APP_SPECIFICATION.md` — functional specification

## Run backend

```bash
cd backend
mvn spring-boot:run
```

Backend URL: `http://localhost:8080`

## Run frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend URL: `http://localhost:5173`

## Validation

```bash
cd backend && mvn test
cd ../frontend && npm run check && npm run build
```
