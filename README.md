# CoD-innoproj

Chronicles of Darkness Character Creator web implementation with:

- **Backend:** Java Spring Boot (`/backend`)
- **Frontend:** Svelte 5 (Runes mode + TypeScript) (`/frontend`)

## Run backend

```bash
cd /home/runner/work/CoD-innoproj/CoD-innoproj/backend
mvn spring-boot:run
```

Backend runs on `http://localhost:8080`.

## Run frontend

```bash
cd /home/runner/work/CoD-innoproj/CoD-innoproj/frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Validation

Backend tests:

```bash
cd /home/runner/work/CoD-innoproj/CoD-innoproj/backend
mvn test
```

Frontend checks/build:

```bash
cd /home/runner/work/CoD-innoproj/CoD-innoproj/frontend
npm run check
npm run build
```
