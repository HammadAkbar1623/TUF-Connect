import mongoose, { mongo, Schema } from 'mongoose'

const otpSchema = new Schema (
    {
        Email: String,
        OTP: String,
        createdAt: { type: Date, default: Date.now, expires: 300 }
    }
)

export const OTP = mongoose.model("OTP", otpSchema);
