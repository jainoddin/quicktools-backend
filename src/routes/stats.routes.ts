import express from 'express';
import { User } from '../models/user.model';
import { ToolUsage } from '../models/toolUsage.model';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    const tasksCompleted = await ToolUsage.countDocuments();

    res.json({
      success: true,
      data: {
        users: userCount,
        tasks: tasksCompleted,
        tools: 111, // Currently there are 111 AI tools available
        countries: 150, // Approximation for a global SaaS
        uptime: 99.9, // Standard SLA
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
