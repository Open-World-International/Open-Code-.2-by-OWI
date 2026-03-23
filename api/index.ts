import express from "express";
import apiRouter from "../src/api";

const app = express();
app.use(express.json());

// Vercel will route /api/* to this file.
// Since we want /api/create-donation-session, and Vercel routes /api/ to this file,
// we should mount the router at the root of this app.
app.use("/", apiRouter);

export default app;
