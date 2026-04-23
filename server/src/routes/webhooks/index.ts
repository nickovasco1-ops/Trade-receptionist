import { Router, Request, Response } from 'express';
import { supabase } from '../../services/supabase';
import retellRouter from './retell';
import stripeRouter from './stripe';

const router = Router();

// Retell webhook — signature verification and all event handling is in retell.ts
router.use('/retell', retellRouter);

// Stripe webhook — checkout.session.completed → auto-provision client
router.use('/stripe', stripeRouter);

// Twilio delivery receipts (SMS / WhatsApp status callbacks)
router.post('/twilio', async (req: Request, res: Response) => {
  const { MessageSid, MessageStatus } = req.body as {
    MessageSid: string;
    MessageStatus: string;
  };

  // Twilio expects 204 or 200 with empty TwiML body
  res.sendStatus(204);

  if (!MessageSid || !MessageStatus) return;

  Promise.resolve(
    supabase
      .from('messages' as never)
      .update({ status: MessageStatus })
      .eq('twilio_sid', MessageSid)
  ).catch((err: unknown) => console.error('[twilio] status update failed', err));
});

export default router;
