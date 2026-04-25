# GPX Route Visualiser

Interactive React + TypeScript route analysis app for uploading GPX tracks, viewing them on Mapbox, replaying progress along the route, and inspecting live trail-running statistics with a synchronized elevation profile.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create an environment file:

   ```bash
   cp .env.example .env
   ```

3. Set your Mapbox token:

   ```bash
   VITE_MAPBOX_TOKEN=your_token_here
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

## Scripts

```bash
npm run lint
npm run build
npm run preview
```

`npm run lint` runs the TypeScript project check.

## Deploy To GitHub Pages

This project includes a GitHub Actions workflow at `.github/workflows/deploy.yml`.

1. Push the project to a GitHub repository.
2. In GitHub, open `Settings` -> `Pages`.
3. Set `Build and deployment` -> `Source` to `GitHub Actions`.
4. Add `VITE_MAPBOX_TOKEN` as a repository variable or secret:
   - `Settings` -> `Secrets and variables` -> `Actions`
   - Add it under `Variables` or `Secrets`
5. Push to the `main` branch, or run the workflow manually from the `Actions` tab.

For a project page, Vite automatically sets the base path from `GITHUB_REPOSITORY` during the GitHub Actions build.

## Sample GPX

A timestamped sample route is included at:

```text
public/samples/sample-route.gpx
```

Upload that file in the app to verify route drawing, playback, live stats, and the elevation profile synchronization.
