import express from 'express';
import WorkEntry from '../models/WorkEntry.js';
import Loan from '../models/Loan.js';
import Repayment from '../models/Repayment.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

const applyLoanRepayment = async ({ userId, loanId, amount, date, note, method = 'Work Log', workEntryId }) => {
  try {
    const loan = await Loan.findOne({ _id: loanId, userId });
    if (!loan) return null;

    const remainingBalance = Math.max(0, loan.totalAmount - (loan.amountPaid || 0));
    const repaymentAmount = Math.min(Number(amount || 0), remainingBalance || Number(amount || 0));

    if (!repaymentAmount || repaymentAmount <= 0) return null;

    const repayment = new Repayment({
      loanId,
      amount: repaymentAmount,
      date: date || new Date(),
      method,
      status: 'Success',
      type: 'Repayment',
      note: note || 'Repayment created from work log',
      workEntryId,
    });

    await repayment.save();

    loan.amountPaid += repaymentAmount;
    if (loan.amountPaid >= loan.totalAmount) loan.status = 'Repaid';
    await loan.save();

    return repayment;
  } catch (error) {
    console.error('Failed to apply loan repayment from work log', error);
    return null;
  }
};

router.get('/', async (req, res) => {
  try {
    const entries = await WorkEntry.find({ userId: req.user._id }).sort({ date: -1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', async (req, res) => {
  const { date, client, amount, status, description, loanId, loanRepaymentAmount, loanRepaymentMethod, loanRepaymentNote } = req.body;
  try {
    let amountPaid = req.body.amountPaid || 0;
    if (status === 'Paid') amountPaid = amount;

    const newEntry = new WorkEntry({
      userId: req.user._id,
      date,
      client,
      amount,
      status,
      amountPaid,
      datePaid: status === 'Paid' ? (req.body.datePaid || new Date()) : req.body.datePaid,
      description,
    });
    await newEntry.save();

    if (loanId && loanRepaymentAmount) {
      await applyLoanRepayment({
        userId: req.user._id,
        loanId,
        amount: loanRepaymentAmount,
        date: date || new Date(),
        note: loanRepaymentNote || `Repayment created from work log for ${client}`,
        method: loanRepaymentMethod || 'Work Log',
        workEntryId: newEntry._id,
      });
    }

    res.status(201).json(newEntry);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const entry = await WorkEntry.findOne({ _id: req.params.id, userId: req.user._id });
    if (!entry) return res.status(404).json({ message: 'Entry not found' });

    const { loanId, loanRepaymentAmount, loanRepaymentMethod, loanRepaymentNote, ...updateData } = req.body;
    if (updateData.status === 'Paid' && (!updateData.amountPaid || updateData.amountPaid === 0)) {
      updateData.amountPaid = entry.amount;
    }
    if (updateData.status === 'Paid' && !updateData.datePaid) {
      updateData.datePaid = new Date();
    }

    const updatedEntry = await WorkEntry.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (loanId && loanRepaymentAmount) {
      await applyLoanRepayment({
        userId: req.user._id,
        loanId,
        amount: loanRepaymentAmount,
        date: updatedEntry.date || new Date(),
        note: loanRepaymentNote || `Repayment created from work log for ${updatedEntry.client}`,
        method: loanRepaymentMethod || 'Work Log',
        workEntryId: updatedEntry._id,
      });
    }

    res.json(updatedEntry);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const entry = await WorkEntry.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    res.json({ message: 'Entry deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
