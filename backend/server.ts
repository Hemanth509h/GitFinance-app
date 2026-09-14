import dotenv from "dotenv";
import express, { NextFunction, Request, Response } from "express";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

import { requireApiAuth } from "./middleware/auth.js";
import authRoutes from "./routes/auth.js";
import dashboardRoutes from "./routes/dashboard.js";
import expenseRoutes from "./routes/expenses.js";
import loanRoutes from "./routes/loans.js";
import workEntryRoutes from "./routes/workEntries.js";

dotenv.config();

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

async function connectDatabase(): Promise<void> {
  let uri: string | undefined = process.env.MONGODB_URI;

  if (!uri) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("MONGODB_URI must be set in production.");
    }

    console.log(
      "MONGODB_URI not set, starting in-memory MongoDB for development...",
    );

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

connectDatabase().catch((err: unknown) => {
  console.error("MongoDB connection error:", err);
  process.exit(1);
});

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

const PORT: number = Number(process.env.PORT ?? 3000);
const HOST: string = process.env.HOST ?? "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`Server running on ${HOST}:${PORT}`);
});

export default app;
