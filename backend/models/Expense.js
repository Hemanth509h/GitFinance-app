import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  category: {
    type: String,
    required: true,
    trim: true,
    maxlength: 80,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  merchant: {
    type: String,
    default: '',
    trim: true,
    maxlength: 120,
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Other'],
    default: 'Cash',
  },
  description: {
    type: String,
    default: '',
    trim: true,
    maxlength: 500,
  },
}, { timestamps: true });

export default mongoose.model('Expense', expenseSchema);
