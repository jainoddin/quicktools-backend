import { Request, Response } from 'express';
import { Subscriber } from '../models/Subscriber';
import { sendWelcomeEmail } from '../services/emailService';

export const subscribe = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      res.status(400).json({ success: false, error: 'Invalid email address' });
      return;
    }

    // Check if already subscribed
    const existing = await Subscriber.findOne({ email: email.toLowerCase() });
    
    if (existing) {
      if (existing.status === 'unsubscribed') {
        // Resubscribe them
        existing.status = 'active';
        existing.subscribedAt = new Date();
        await existing.save();
        
        // Optionally send welcome email again or a "welcome back" email
        await sendWelcomeEmail(existing.email);
        
        res.status(200).json({ success: true, message: 'Resubscribed successfully' });
        return;
      }
      
      // Already active
      console.log(`Email ${email} is already subscribed. Skipping welcome email.`);
      res.status(200).json({ success: true, message: 'Email is already subscribed' });
      return;
    }

    // Create new subscriber
    const newSubscriber = new Subscriber({ email });
    await newSubscriber.save();

    // Send welcome email
    await sendWelcomeEmail(newSubscriber.email);

    res.status(201).json({ success: true, message: 'Subscribed successfully' });
  } catch (error) {
    console.error('Subscription error:', error);
    res.status(500).json({ success: false, error: 'Failed to subscribe' });
  }
};
