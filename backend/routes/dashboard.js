import express from 'express';
import WorkEntry from '../models/WorkEntry.js';
import Loan from '../models/Loan.js';
import Repayment from '../models/Repayment.js';
import Expense from '../models/Expense.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

const getMonthRange = (date = new Date()) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
};

const getMonthKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const getMonthLabel = (monthKey) => {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });
};

router.get('/summary', async (req, res) => {
  try {
    const uid = req.user._id;
    const { start: startOfMonth, end: startOfNextMonth } = getMonthRange();

    const currentMonthEntries = await WorkEntry.find({
      userId: uid,
      date: { $gte: startOfMonth, $lt: startOfNextMonth },
    });

    let totalEarnedThisMonth = 0;
    currentMonthEntries.forEach(entry => {
      if (entry.status === 'Paid') {
        totalEarnedThisMonth += entry.amount;
      } else {
        totalEarnedThisMonth += (entry.amountPaid || 0);
      }
    });

    const pendingEntries = await WorkEntry.find({
      userId: uid,
      status: { $in: ['Unpaid', 'Partially Paid'] },
      date: { $gte: startOfMonth, $lt: startOfNextMonth }
    });
    
    let pendingPayments = 0;
    let pendingCount = pendingEntries.length;
    pendingEntries.forEach(entry => {
      pendingPayments += (entry.amount - entry.amountPaid);
    });

    const activeLoans = await Loan.find({ userId: uid, status: 'Active' });
    let totalLoanBalance = 0;
    let totalLoanGoal = 0;
    let totalLoanPaid = 0;
    
    activeLoans.forEach(loan => {
      totalLoanBalance += (loan.totalAmount - loan.amountPaid);
      totalLoanGoal += loan.totalAmount;
      totalLoanPaid += loan.amountPaid;
    });

    const userLoanIds = (await Loan.find({ userId: uid }).select('_id')).map(l => l._id);

    const recentRepaymentsThisMonth = await Repayment.find({
      loanId: { $in: userLoanIds },
      date: { $gte: startOfMonth, $lt: startOfNextMonth }
    });
    
    let totalRepaidThisMonth = 0;
    recentRepaymentsThisMonth.forEach(r => {
      if ((!r.status || r.status === 'Success') && r.type !== 'Interest') {
        totalRepaidThisMonth += r.amount;
      }
    });

    const currentMonthExpenses = await Expense.find({
      userId: uid,
      date: { $gte: startOfMonth, $lt: startOfNextMonth },
    });
    const totalExpensesThisMonth = currentMonthExpenses.reduce((sum, expense) => {
      return sum + Number(expense.amount || 0);
    }, 0);

    const recentWork = await WorkEntry.find({ userId: uid }).sort({ createdAt: -1 }).limit(5);
    const recentRepayments = await Repayment.find({ loanId: { $in: userLoanIds } }).sort({ createdAt: -1 }).limit(5).populate('loanId');
    const recentExpenses = await Expense.find({ userId: uid }).sort({ createdAt: -1 }).limit(5);
    
    // Merge and sort
    const allActivity = [
      ...recentWork.map(w => ({ type: 'work', data: w, date: w.createdAt })),
      ...recentRepayments.map(r => ({ type: 'repayment', data: r, date: r.createdAt })),
      ...recentExpenses.map(e => ({ type: 'expense', data: e, date: e.createdAt }))
    ].sort((a, b) => b.date - a.date).slice(0, 5);

    res.json({
      totalEarnedThisMonth,
      totalExpensesThisMonth,
      netIncomeThisMonth: totalEarnedThisMonth - totalExpensesThisMonth,
      pendingPayments,
      pendingCount,
      totalLoanBalance,
      totalLoanGoal,
      totalLoanPaid,
      totalRepaidThisMonth,
      recentActivity: allActivity
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/monthly-history', async (req, res) => {
  try {
    const uid = req.user._id;
    const userLoanIds = (await Loan.find({ userId: uid }).select('_id')).map(l => l._id);
    const [entries, repayments, expenses] = await Promise.all([
      WorkEntry.find({ userId: uid }).sort({ date: -1 }),
      Repayment.find({ loanId: { $in: userLoanIds } }).sort({ date: -1 }).populate('loanId'),
      Expense.find({ userId: uid }).sort({ date: -1 }),
    ]);

    const months = {};
    const ensureMonth = (date) => {
      const key = getMonthKey(date);
      if (!months[key]) {
        months[key] = {
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
        };
      }
      return months[key];
    };

    entries.forEach((entry) => {
      const bucket = ensureMonth(entry.date);
      const amount = Number(entry.amount || 0);
      const paid = entry.status === 'Paid' ? amount : Number(entry.amountPaid || 0);
      bucket.expectedEarnings += amount;
      bucket.earned += paid;
      bucket.pending += Math.max(0, amount - paid);
      bucket.workCount += 1;
    });

    repayments.forEach((repayment) => {
      if (repayment.status && repayment.status !== 'Success') return;
      const bucket = ensureMonth(repayment.date);
      bucket.repaymentTotal += Number(repayment.amount || 0);
      bucket.repaymentCount += 1;
    });

    expenses.forEach((expense) => {
      const bucket = ensureMonth(expense.date);
      bucket.expenseTotal += Number(expense.amount || 0);
      bucket.expenseCount += 1;
    });

    res.json(
      Object.values(months).sort((a, b) => b.month.localeCompare(a.month))
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/analytics', async (req, res) => {
  try {
    const uid = req.user._id;
    const userLoanIds = (await Loan.find({ userId: uid }).select('_id')).map(l => l._id);
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        name: d.toLocaleString('default', { month: 'short' }),
        start: new Date(d.getFullYear(), d.getMonth(), 1),
        end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
      });
    }

    const analyticsData = await Promise.all(months.map(async (m) => {
      const entries = await WorkEntry.find({
        userId: uid,
        status: { $in: ['Paid', 'Partially Paid'] },
        $or: [
          { datePaid: { $gte: m.start, $lte: m.end } },
          { datePaid: { $exists: false }, date: { $gte: m.start, $lte: m.end } },
        ],
      });

      let earnings = 0;
      entries.forEach(entry => {
        earnings += (entry.amountPaid || 0);
      });

      const repayments = await Repayment.find({
        loanId: { $in: userLoanIds },
        date: { $gte: m.start, $lte: m.end }
      });
      const repaymentTotal = repayments.reduce((sum, r) => {
        if (!r.status || r.status === 'Success') {
          return sum + r.amount;
        }
        return sum;
      }, 0);

      const expenses = await Expense.find({
        userId: uid,
        date: { $gte: m.start, $lte: m.end }
      });
      const expenseTotal = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

      return {
        month: m.name,
        earnings,
        repayments: repaymentTotal,
        expenses: expenseTotal
      };
    }));

    res.json(analyticsData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/clients', async (req, res) => {
  try {
    const entries = await WorkEntry.find({ userId: req.user._id });
    const clientData = entries.reduce((acc, entry) => {
      const client = entry.client;
      if (!acc[client]) {
        acc[client] = {
          name: client,
          totalEarned: 0,
          pendingAmount: 0,
          workCount: 0,
          lastWorkDate: entry.date
        };
      }
      const earned = entry.status === 'Paid' ? entry.amount : (entry.amountPaid || 0);
      const pending = entry.amount - earned;
      acc[client].totalEarned += earned;
      acc[client].pendingAmount += pending;
      acc[client].workCount += 1;
      if (new Date(entry.date) > new Date(acc[client].lastWorkDate)) {
        acc[client].lastWorkDate = entry.date;
      }
      return acc;
    }, {});
    const result = Object.values(clientData).sort((a, b) => b.totalEarned - a.totalEarned);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
