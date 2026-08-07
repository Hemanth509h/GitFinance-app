import express from "express";

import { protect } from "../middleware/auth.js";
import Expense from "../models/Expense.js";
import Loan from "../models/Loan.js";
import Repayment from "../models/Repayment.js";
import WorkEntry from "../models/WorkEntry.js";
import { errorMessage } from "../utils/errors.js";

const router = express.Router();
router.use(protect);

const getMonthRange = (date = new Date()) => ({
  start: new Date(date.getFullYear(), date.getMonth(), 1),
  end: new Date(date.getFullYear(), date.getMonth() + 1, 1),
});
const getMonthKey = (date: Date | string) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const getMonthLabel = (key: string) => {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });
};

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

router.get("/monthly-history", async (req, res) => {
  try {
    const userId = req.user!._id,
      loanIds = (await Loan.find({ userId }).select("_id")).map(
        (loan) => loan._id,
      );
    const [entries, repayments, expenses] = await Promise.all([
      WorkEntry.find({ userId }).sort({ date: -1 }),
      Repayment.find({ loanId: { $in: loanIds } }).sort({ date: -1 }),
      Expense.find({ userId }).sort({ date: -1 }),
    ]);
    const months: Record<string, any> = {};
    const month = (date: Date) => {
      const key = getMonthKey(date);
      return (months[key] ??= {
        month: key,
        label: getMonthLabel(key),
        expectedEarnings: 0,
        earned: 0,
        pending: 0,
        workCount: 0,
        repaymentTotal: 0,
        repaymentCount: 0,
        expenseTotal: 0,
        expenseCount: 0,
      });
    };
    entries.forEach((entry) => {
      const bucket = month(entry.date),
        amount = Number(entry.amount || 0),
        paid = entry.status === "Paid" ? amount : Number(entry.amountPaid || 0);
      bucket.expectedEarnings += amount;
      bucket.earned += paid;
      bucket.pending += Math.max(0, amount - paid);
      bucket.workCount++;
    });
    repayments.forEach((item) => {
      if (item.status && item.status !== "Success") return;
      const bucket = month(item.date);
      bucket.repaymentTotal += Number(item.amount || 0);
      bucket.repaymentCount++;
    });
    expenses.forEach((item) => {
      const bucket = month(item.date);
      bucket.expenseTotal += Number(item.amount || 0);
      bucket.expenseCount++;
    });
    res.json(
      Object.values(months).sort((a: any, b: any) =>
        b.month.localeCompare(a.month),
      ),
    );
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

router.get("/clients", async (req, res) => {
  try {
    const entries = await WorkEntry.find({ userId: req.user!._id }),
      clients: Record<string, any> = {};
    entries.forEach((entry) => {
      const bucket = (clients[entry.client] ??= {
        name: entry.client,
        totalEarned: 0,
        pendingAmount: 0,
        workCount: 0,
        lastWorkDate: entry.date,
      });
      const earned =
        entry.status === "Paid" ? entry.amount : entry.amountPaid || 0;
      bucket.totalEarned += earned;
      bucket.pendingAmount += entry.amount - earned;
      bucket.workCount++;
      if (entry.date > bucket.lastWorkDate) bucket.lastWorkDate = entry.date;
    });
    res.json(
      Object.values(clients).sort(
        (a: any, b: any) => b.totalEarned - a.totalEarned,
      ),
    );
  } catch (error) {
    res.status(500).json({ message: errorMessage(error) });
  }
});
export default router;
