# Open-Code Version 2

A revolutionary platform designed for students and developers. It's completely free, removing financial barriers to coding tools.

## Features
- JavaScript, Python, C++, and Web App environments.
- AI Support with Gemini 3.1 Pro and Groq.
- GitHub Sync for publishing projects.
- Admin Dashboard for monitoring.

## Deployment

### Render / Railway / Railway
These platforms are ideal for full-stack Express apps.
1. Connect your GitHub repository.
2. Set the build command: `npm run build`
3. Set the start command: `npm start`
4. Add environment variables:
   - `GEMINI_API_KEY`: Your Gemini API key.
   - `ADMIN_PASSWORD`: Master password for admin access.
   - `ADMIN_ENABLED`: Set to `true` to enable admin features.

### Vercel
Vercel is primarily for frontend, but can run Express as a serverless function.
1. You may need to move `server.ts` logic to `/api/index.ts`.
2. Configure `vercel.json` to route requests to the api function.
