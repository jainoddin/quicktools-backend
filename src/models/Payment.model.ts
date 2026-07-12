import mongoose, { Schema, Document } from 'mongoose';

export interface IPayment extends Document {
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  amount: number;         // in paise (₹1 = 100 paise)
  currency: string;
  status: 'created' | 'paid' | 'failed';
  plan: string;
  userId?: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    razorpayOrderId:   { type: String, required: true, unique: true },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    amount:            { type: Number, required: true },   // paise lo store cheyyi
    currency:          { type: String, default: 'INR' },
    status:            { type: String, enum: ['created', 'paid', 'failed'], default: 'created' },
    plan:              { type: String, default: 'pro' },
    userId:            { type: String },
    email:             { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IPayment>('Payment', PaymentSchema);
