import express from "express";

import { generateToken } from "../middleware/auth.js";
import User from "../models/User.js";
import { errorMessage } from "../utils/errors.js";

const router = express.Router();

const userPayload = (user: InstanceType<typeof User>) => ({
  _id: user._id,
  email: user.email,
  name: user.name,
  currency: user.currency,
  monthlyGoal: user.monthlyGoal,
  theme: user.theme,
});

router.post("/register", async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password)
    return res
      .status(400)
      .json({ message: "Email and password are required." });
  if (password.length < 6)
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters." });
  try {
    if (await User.findOne({ email }))
      return res.status(409).json({ message: "Email already registered." });
    const user = await User.create({ email, password, name: name || "" });
    res
      .status(201)
      .json({ token: generateToken(user._id), user: userPayload(user) });
  } catch (error) {
    res.status(500).json({ message: errorMessage(error) });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res
      .status(400)
      .json({ message: "Email and password are required." });
  try {
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ message: "Invalid email or password." });
    res.json({ token: generateToken(user._id), user: userPayload(user) });
  } catch (error) {
    res.status(500).json({ message: errorMessage(error) });
  }
});

router.post("/logout", (_req, res) =>
  res.json({ message: "Logged out successfully." }),
);

router.post("/forgot-password", async (req, res) => {
  if (!req.body.email)
    return res.status(400).json({ message: "Email is required." });
  try {
    // Always return the same message to avoid email enumeration.
    await User.findOne({ email: req.body.email });
    res.json({
      message:
        "If an account exists for this email, password reset instructions will be sent.",
    });
  } catch (error) {
    res.status(500).json({ message: errorMessage(error) });
  }
});

router.get("/me", (req, res) => res.json(userPayload(req.user!)));

router.patch("/profile", async (req, res) => {
  const { name, currency, monthlyGoal, theme, password, currentPassword } =
    req.body;
  try {
    const user = await User.findById(req.user!._id);
    if (!user) return res.status(404).json({ message: "User not found." });
    if (name !== undefined) user.name = name;
    if (currency !== undefined) user.currency = currency;
    if (monthlyGoal !== undefined) user.monthlyGoal = monthlyGoal;
    if (theme !== undefined) user.theme = theme;
    if (password) {
      if (!currentPassword)
        return res.status(400).json({ message: "Current password required." });
      if (!(await user.comparePassword(currentPassword)))
        return res
          .status(401)
          .json({ message: "Current password is incorrect." });
      user.password = password;
    }
    await user.save();
    res.json(userPayload(user));
  } catch (error) {
    res.status(500).json({ message: errorMessage(error) });
  }
});

export default router;
