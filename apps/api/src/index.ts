import express, { Express, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check route
app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// Root route
app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "Roman Series API",
    version: "0.1.0",
    endpoints: {
      health: "/api/health",
    },
  });
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
