import express from 'express';
import Loan from '../models/Loan.js';
import Repayment from '../models/Repayment.js';
import WorkEntry from '../models/WorkEntry.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

// Get all loans
router.get('/', async (req, res) => {
  try {
    const loans = await Loan.find({ userId: req.user._id }).sort({ startDate: -1 });
    res.json(loans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new loan
router.post('/', async (req, res) => {
  const { lenderName, totalAmount, monthlyInterest, startDate, status } = req.body;
  try {
    const amount = parseFloat(totalAmount);
    const newLoan = new Loan({
      userId: req.user._id,
      lenderName,
      totalAmount: amount,
      principalAmount: amount,
      monthlyInterest: monthlyInterest ? parseFloat(monthlyInterest) : 0,
      startDate,
      status,
    });
    await newLoan.save();
    res.status(201).json(newLoan);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get repayments for a specific loan
router.get('/:id/repayments', async (req, res) => {
  try {
    const loan = await Loan.findOne({ _id: req.params.id, userId: req.user._id });
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    const repayments = await Repayment.find({ loanId: req.params.id }).sort({ date: -1 }).populate('workEntryId', 'client date amount description');
    res.json(repayments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add a repayment or interest charge to a loan
router.post('/:id/repayments', async (req, res) => {
  const { amount, date, method, status, type, note, workEntryId } = req.body;
  const entryType = type || 'Repayment';
  try {
    const loan = await Loan.findOne({ _id: req.params.id, userId: req.user._id });
    if (!loan) return res.status(404).json({ message: 'Loan not found' });

    if (workEntryId) {
      const workEntry = await WorkEntry.findOne({ _id: workEntryId, userId: req.user._id });
      if (!workEntry) return res.status(404).json({ message: 'Work log not found' });
    }

    const newRepayment = new Repayment({ loanId: req.params.id, amount, date, method, status, type: entryType, note, workEntryId });
    await newRepayment.save();

    if (entryType === 'Interest') {
      // Lock in principalAmount before raising totalAmount (safety net for older records)
      if (!loan.principalAmount) loan.principalAmount = loan.totalAmount;
      loan.totalAmount += Number(amount);
    } else if (status === 'Success' || !status) {
      // Repayment reduces balance
      loan.amountPaid += Number(amount);
      if (loan.amountPaid >= loan.totalAmount) loan.status = 'Repaid';
    }
    await loan.save();

    res.status(201).json(newRepayment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update a repayment or interest entry
router.patch('/:id/repayments/:repaymentId', async (req, res) => {
  try {
    const loan = await Loan.findOne({ _id: req.params.id, userId: req.user._id });
    if (!loan) return res.status(404).json({ message: 'Loan not found' });

    const repayment = await Repayment.findOne({ _id: req.params.repaymentId, loanId: req.params.id });
    if (!repayment) return res.status(404).json({ message: 'Repayment not found' });

    const oldAmount = Number(repayment.amount);
    const oldType = repayment.type || 'Repayment';

    // Reverse old effect on loan
    if (oldType === 'Interest') {
      loan.totalAmount -= oldAmount;
    } else if (repayment.status === 'Success' || !repayment.status) {
      loan.amountPaid -= oldAmount;
    }

    const { amount, date, method, status, note, workEntryId } = req.body;
    if (amount !== undefined) repayment.amount = amount;
    if (date !== undefined) repayment.date = date;
    if (method !== undefined) repayment.method = method;
    if (status !== undefined) repayment.status = status;
    if (note !== undefined) repayment.note = note;
    if (workEntryId !== undefined) {
      if (workEntryId) {
        const workEntry = await WorkEntry.findOne({ _id: workEntryId, userId: req.user._id });
        if (!workEntry) return res.status(404).json({ message: 'Work log not found' });
      }
      repayment.workEntryId = workEntryId || null;
    }

    await repayment.save();

    // Apply new effect
    if (oldType === 'Interest') {
      loan.totalAmount += Number(repayment.amount);
    } else if (repayment.status === 'Success' || !repayment.status) {
      loan.amountPaid += Number(repayment.amount);
    }

    loan.status = loan.amountPaid >= loan.totalAmount ? 'Repaid' : 'Active';
    await loan.save();

    res.json(repayment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a repayment or interest entry
router.delete('/:id/repayments/:repaymentId', async (req, res) => {
  try {
    const loan = await Loan.findOne({ _id: req.params.id, userId: req.user._id });
    if (!loan) return res.status(404).json({ message: 'Loan not found' });

    const repayment = await Repayment.findOne({ _id: req.params.repaymentId, loanId: req.params.id });
    if (!repayment) return res.status(404).json({ message: 'Repayment not found' });

    const entryType = repayment.type || 'Repayment';
    if (entryType === 'Interest') {
      loan.totalAmount -= Number(repayment.amount);
    } else if (repayment.status === 'Success' || !repayment.status) {
      loan.amountPaid -= Number(repayment.amount);
      if (loan.amountPaid < loan.totalAmount) loan.status = 'Active';
    }
    await loan.save();

    await Repayment.findByIdAndDelete(req.params.repaymentId);
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update a loan
router.patch('/:id', async (req, res) => {
  try {
    const loan = await Loan.findOne({ _id: req.params.id, userId: req.user._id });
    if (!loan) return res.status(404).json({ message: 'Loan not found' });

    const { lenderName, totalAmount, monthlyInterest, startDate, status } = req.body;

    if (lenderName !== undefined) loan.lenderName = lenderName;
    if (monthlyInterest !== undefined) loan.monthlyInterest = parseFloat(monthlyInterest) || 0;
    if (startDate !== undefined) loan.startDate = startDate;
    if (status !== undefined) loan.status = status;

    if (totalAmount !== undefined) {
      const newPrincipal = parseFloat(totalAmount);
      const interestAccrued = (loan.principalAmount > 0)
        ? loan.totalAmount - loan.principalAmount
        : 0;
      loan.principalAmount = newPrincipal;
      loan.totalAmount = newPrincipal + interestAccrued;
    }

    await loan.save();
    res.json(loan);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a loan
router.delete('/:id', async (req, res) => {
  try {
    const loan = await Loan.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!loan) return res.status(404).json({ message: 'Loan not found' });
    res.json({ message: 'Loan deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
