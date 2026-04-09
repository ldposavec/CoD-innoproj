# CoD-innoproj

Spring Boot + Svelte 5 (Runes) web app scaffold for the Chronicles of Darkness character creator.

## Structure

- `/backend` — Java Spring Boot REST API (character CRUD, dice roller, data libraries)
- `/frontend` — Svelte 5 + TypeScript client (login, dashboard, wizard, character sheet, settings)
- `/stitch` — visual reference HTML screens
- `WEB_APP_SPECIFICATION.md` — functional specification

## Run backend

```bash
cd /home/runner/work/CoD-innoproj/CoD-innoproj/backend
mvn spring-boot:run
```

Backend URL: `http://localhost:8080`

## Run frontend

```bash
cd /home/runner/work/CoD-innoproj/CoD-innoproj/frontend
npm install
npm run dev
```

Frontend URL: `http://localhost:5173`

## Validation

```bash
cd /home/runner/work/CoD-innoproj/CoD-innoproj/backend && mvn test
cd /home/runner/work/CoD-innoproj/CoD-innoproj/frontend && npm run check && npm run build
```
