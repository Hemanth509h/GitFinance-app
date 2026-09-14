import express from "express";

import Expense from "../models/Expense.js";
import { errorMessage } from "../utils/errors.js";

const router = express.Router();
router.get("/", async (req, res) => {
  try {
    res.json(
      await Expense.find({ userId: req.user!._id }).sort({
        date: -1,
        createdAt: -1,
      }),
    );
  } catch (error) {
    res.status(500).json({ message: errorMessage(error) });
  }
});
router.post("/", async (req, res) => {
  const { date, category, amount, merchant, paymentMethod, description } =
    req.body;
  try {
    const expense = await Expense.create({
      userId: req.user!._id,
      date,
      category,
      amount,
      merchant,
      paymentMethod,
      description,
    });
    res.status(201).json(expense);
  } catch (error) {
    res.status(400).json({ message: errorMessage(error) });
  }
});
router.patch("/:id", async (req, res) => {
  try {
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!._id },
      req.body,
      { new: true, runValidators: true },
    );
    if (!expense) return res.status(404).json({ message: "Expense not found" });
    res.json(expense);
  } catch (error) {
    res.status(400).json({ message: errorMessage(error) });
  }
});
router.delete("/:id", async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({
      _id: req.params.id,
      userId: req.user!._id,
    });
    if (!expense) return res.status(404).json({ message: "Expense not found" });
    res.json({ message: "Expense deleted" });
  } catch (error) {
    res.status(500).json({ message: errorMessage(error) });
  }
});
export default router;
