import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import User from "../models/User.js";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be set in production.");
  }
  return "gigfinance_dev_secret_change_in_prod";
}

/** Public API routes that do not require a Bearer token. */
const PUBLIC_API_ROUTES = new Set([
  "GET /health",
  "POST /auth/register",
  "POST /auth/login",
  "POST /auth/logout",
  "POST /auth/forgot-password",
]);

export const generateToken = (userId: string | Types.ObjectId) =>
  jwt.sign({ id: userId.toString() }, getJwtSecret(), { expiresIn: "30d" });

export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authenticated." });
  }
  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, getJwtSecret()) as { id: string };
    req.user = await User.findById(decoded.id).select("-password");
    if (!req.user) return res.status(401).json({ message: "User not found." });
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token." });
  }
};

/** Require auth for every /api route except the public allowlist. */
export const requireApiAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const routeKey = `${req.method} ${req.path}`;
  if (PUBLIC_API_ROUTES.has(routeKey)) {
    return next();
  }
  return protect(req, res, next);
};
