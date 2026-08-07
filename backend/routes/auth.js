import express from 'express';
import User from '../models/User.js';
import { protect, generateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  }
  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email already registered.' });
    const user = await User.create({ email, password, name: name || '' });
    
    const token = generateToken(user._id);
    
    res.status(201).json({
      token,
      user: { _id: user._id, email: user.email, name: user.name, currency: user.currency, monthlyGoal: user.monthlyGoal, theme: user.theme },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid email or password.' });
    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ message: 'Invalid email or password.' });
    
    const token = generateToken(user._id);

    res.json({
      token,
      user: { _id: user._id, email: user.email, name: user.name, currency: user.currency, monthlyGoal: user.monthlyGoal, theme: user.theme },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully.' });
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }
  try {
    await User.findOne({ email });
    res.json({
      message: 'If an account exists for this email, you can now reset your password from the reset page.',
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/reset-password', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and new password are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  }
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'No account found for this email.' });
    }
    user.password = password;
    await user.save();
    res.json({ message: 'Your password has been reset successfully. Please sign in.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/me', protect, (req, res) => {
  const u = req.user;
  res.json({ _id: u._id, email: u.email, name: u.name, currency: u.currency, monthlyGoal: u.monthlyGoal, theme: u.theme });
});

router.patch('/profile', protect, async (req, res) => {
  const { name, currency, monthlyGoal, theme, password, currentPassword } = req.body;
  try {
    const user = await User.findById(req.user._id);
    if (name !== undefined) user.name = name;
    if (currency !== undefined) user.currency = currency;
    if (monthlyGoal !== undefined) user.monthlyGoal = monthlyGoal;
    if (theme !== undefined) user.theme = theme;
    if (password) {
      if (!currentPassword) return res.status(400).json({ message: 'Current password required.' });
      const match = await user.comparePassword(currentPassword);
      if (!match) return res.status(401).json({ message: 'Current password is incorrect.' });
      user.password = password;
    }
    await user.save();
    res.json({ _id: user._id, email: user.email, name: user.name, currency: user.currency, monthlyGoal: user.monthlyGoal, theme: user.theme });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
