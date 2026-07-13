import express from 'express';
import { Contact } from '../models/contact.model';
import { sendAdminNotificationEmail } from '../services/emailService';

const router = express.Router();

// POST /api/contact/submit
router.post('/submit', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const newContact = await Contact.create({
      name,
      email,
      subject,
      message,
      type: 'CONTACT'
    });

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-w: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
        <h2 style="color: #4f46e5;">New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject || 'No Subject'}</p>
        <hr style="border: 1px solid #e2e8f0; margin: 15px 0;" />
        <p><strong>Message:</strong></p>
        <p style="white-space: pre-wrap; color: #374151;">${message}</p>
      </div>
    `;

    await sendAdminNotificationEmail('New Contact Form Submission - QuickTools.ai', emailHtml);

    res.status(201).json({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    console.error('Error submitting contact form:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/contact/feedback
router.post('/feedback', async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const newFeedback = await Contact.create({
      name: name || 'Anonymous',
      email: email || 'No Email',
      message,
      type: 'FEEDBACK'
    });

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-w: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
        <h2 style="color: #8b5cf6;">New Feedback Received</h2>
        <p><strong>Name:</strong> ${name || 'Anonymous'}</p>
        <p><strong>Email:</strong> ${email || 'Not provided'}</p>
        <hr style="border: 1px solid #e2e8f0; margin: 15px 0;" />
        <p><strong>Feedback Message:</strong></p>
        <p style="white-space: pre-wrap; color: #374151;">${message}</p>
      </div>
    `;

    await sendAdminNotificationEmail('New Feedback - QuickTools.ai', emailHtml);

    res.status(201).json({ success: true, message: 'Feedback submitted successfully' });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
