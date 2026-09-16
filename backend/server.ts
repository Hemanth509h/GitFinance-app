import http from "node:http";

import dotenv from "dotenv";
import express, { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";

import { requireApiAuth } from "./middleware/auth.js";
import authRoutes from "./routes/auth.js";
import dashboardRoutes from "./routes/dashboard.js";
import expenseRoutes from "./routes/expenses.js";
import loanRoutes from "./routes/loans.js";
import workEntryRoutes from "./routes/workEntries.js";

dotenv.config({ quiet: true });

const app = express();

app.set("trust proxy", 1);

app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;

  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With",
  );

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }

  next();
});

app.use(express.json());

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on("finish", () => {
    console.log(
      `[${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl} → ${res.statusCode} (${Date.now() - start}ms)`,
    );
  });

  next();
});

// Public health checks (Render port / health probes) — no auth, no DB.
app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

async function connectDatabase(): Promise<void> {
  let uri: string | undefined = process.env.MONGODB_URI;

  if (!uri) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("MONGODB_URI must be set in production.");
    }

    console.log(
      "MONGODB_URI not set, starting in-memory MongoDB for development...",
    );

    const { MongoMemoryServer } = await import("mongodb-memory-server");
    const mongod = await MongoMemoryServer.create({
      binary: {
        version: "7.0.5",
      },
    });

    uri = mongod.getUri();

    console.log("In-memory MongoDB started at", uri);
  }

  await mongoose.connect(uri);

  console.log("Connected to MongoDB");
}

// ================================
// API Routes (auth required unless public allowlist)
// ================================

app.use("/api", requireApiAuth);

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/work-logs", workEntryRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/loans", loanRoutes);
app.use("/api/dashboard", dashboardRoutes);

// ================================
// Start Server
// ================================

const PORT: number = Number(process.env.PORT) || 10000;

async function start(): Promise<void> {
  if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET must be set in production.");
  }

  const server = http.createServer(app);

  // Bind immediately so Render's port scanner detects an open port
  // even if MongoDB is still connecting.
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(PORT, "0.0.0.0", () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address();
  console.log(
    `Server listening on 0.0.0.0:${typeof address === "object" && address ? address.port : PORT}`,
  );

  await connectDatabase();
}

start().catch((err: unknown) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

export default app;
