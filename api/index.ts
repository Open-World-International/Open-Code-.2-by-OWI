import express from "express";
import apiRouter from "../src/api";

const app = express();
app.use(express.json());

// Vercel will route /api/* to this file.
app.use("/", apiRouter);

export default app;
