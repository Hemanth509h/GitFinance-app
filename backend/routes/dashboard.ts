import express from "express";

import Expense from "../models/Expense.js";
import Loan from "../models/Loan.js";
import Repayment from "../models/Repayment.js";
import WorkEntry from "../models/WorkEntry.js";
import { errorMessage } from "../utils/errors.js";

const router = express.Router();

const getMonthRange = (date = new Date()) => ({
  start: new Date(date.getFullYear(), date.getMonth(), 1),
  end: new Date(date.getFullYear(), date.getMonth() + 1, 1),
});

router.get("/summary", async (req, res) => {
  try {
    const userId = req.user!._id,
      { start, end } = getMonthRange();
    const [
      entries,
      pending,
      loans,
      allLoans,
      repayments,
      expenses,
      recentWork,
      recentRepayments,
      recentExpenses,
    ] = await Promise.all([
      WorkEntry.find({ userId, date: { $gte: start, $lt: end } }),
      WorkEntry.find({
        userId,
        status: { $in: ["Unpaid", "Partially Paid"] },
        date: { $gte: start, $lt: end },
      }),
      Loan.find({ userId, status: "Active" }),
      Loan.find({ userId }).select("_id"),
      Repayment.find({ date: { $gte: start, $lt: end } }),
      Expense.find({ userId, date: { $gte: start, $lt: end } }),
      WorkEntry.find({ userId }).sort({ createdAt: -1 }).limit(5),
      Repayment.find().sort({ createdAt: -1 }).limit(5).populate("loanId"),
      Expense.find({ userId }).sort({ createdAt: -1 }).limit(5),
    ]);
    const loanIds = new Set(allLoans.map((loan) => loan._id.toString()));
    const earned = entries.reduce(
      (total, entry) =>
        total +
        (entry.status === "Paid" ? entry.amount : entry.amountPaid || 0),
      0,
    );
    const pendingPayments = pending.reduce(
      (total, entry) => total + entry.amount - entry.amountPaid,
      0,
    );
    const totalLoanBalance = loans.reduce(
      (total, loan) => total + loan.totalAmount - loan.amountPaid,
      0,
    );
    const totalLoanGoal = loans.reduce(
      (total, loan) => total + loan.totalAmount,
      0,
    );
    const totalLoanPaid = loans.reduce(
      (total, loan) => total + loan.amountPaid,
      0,
    );
    const totalRepaidThisMonth = repayments
      .filter(
        (item) =>
          loanIds.has(item.loanId.toString()) &&
          (!item.status || item.status === "Success") &&
          item.type !== "Interest",
      )
      .reduce((total, item) => total + item.amount, 0);
    const totalExpensesThisMonth = expenses.reduce(
      (total, expense) => total + Number(expense.amount || 0),
      0,
    );
    const activity = [
      ...recentWork.map((item) => ({
        type: "work",
        data: item,
        date: item.createdAt,
      })),
      ...recentRepayments
        .filter((item) =>
          loanIds.has(item.loanId._id?.toString() ?? item.loanId.toString()),
        )
        .map((item) => ({
          type: "repayment",
          data: item,
          date: item.createdAt,
        })),
      ...recentExpenses.map((item) => ({
        type: "expense",
        data: item,
        date: item.createdAt,
      })),
    ]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5);
    res.json({
      totalEarnedThisMonth: earned,
      totalExpensesThisMonth,
      netIncomeThisMonth: earned - totalExpensesThisMonth,
      pendingPayments,
      pendingCount: pending.length,
      totalLoanBalance,
      totalLoanGoal,
      totalLoanPaid,
      totalRepaidThisMonth,
      recentActivity: activity,
    });
  } catch (error) {
    res.status(500).json({ message: errorMessage(error) });
  }
});

router.get("/analytics", async (req, res) => {
  try {
    const userId = req.user!._id,
      loanIds = (await Loan.find({ userId }).select("_id")).map(
        (loan) => loan._id,
      ),
      now = new Date();
    const results = await Promise.all(
      Array.from({ length: 6 }, async (_, index) => {
        const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1),
          start = new Date(date.getFullYear(), date.getMonth(), 1),
          end = new Date(
            date.getFullYear(),
            date.getMonth() + 1,
            0,
            23,
            59,
            59,
            999,
          );
        const [entries, repayments, expenses] = await Promise.all([
          WorkEntry.find({
            userId,
            status: { $in: ["Paid", "Partially Paid"] },
            $or: [
              { datePaid: { $gte: start, $lte: end } },
              {
                datePaid: { $exists: false },
                date: { $gte: start, $lte: end },
              },
            ],
          }),
          Repayment.find({
            loanId: { $in: loanIds },
            date: { $gte: start, $lte: end },
          }),
          Expense.find({ userId, date: { $gte: start, $lte: end } }),
        ]);
        return {
          month: date.toLocaleString("default", { month: "short" }),
          earnings: entries.reduce(
            (sum, item) => sum + (item.amountPaid || 0),
            0,
          ),
          repayments: repayments.reduce(
            (sum, item) =>
              !item.status || item.status === "Success"
                ? sum + item.amount
                : sum,
            0,
          ),
          expenses: expenses.reduce(
            (sum, item) => sum + Number(item.amount || 0),
            0,
          ),
        };
      }),
    );
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: errorMessage(error) });
  }
});

export default router;
