import express from "express";
import apiRouter from "../src/api";

const app = express();
app.use(express.json());

// Vercel will route /api/* to this file.
app.use((req, res, next) => {
    console.log(`[API] ${req.method} ${req.url}`);
    next();
});
app.use("/api", apiRouter);

export default app;
