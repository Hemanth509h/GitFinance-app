import mongoose from 'mongoose';

const repaymentSchema = new mongoose.Schema({
  loanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Loan',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  method: {
    type: String,
    default: 'Cash',
  },
  status: {
    type: String,
    enum: ['Pending', 'Success'],
    default: 'Success',
  },
  type: {
    type: String,
    enum: ['Repayment', 'Interest'],
    default: 'Repayment',
  },
  note: {
    type: String,
    default: '',
    trim: true,
    maxlength: 300,
  },
  workEntryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkEntry',
    default: null,
  },
}, { timestamps: true });

export default mongoose.model('Repayment', repaymentSchema);
