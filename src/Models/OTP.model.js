import mongoose, { mongo, Schema } from 'mongoose'

const otpSchema = new Schema (
    {
        Email: String,
        OTP: String,
        createdAt: { type: Date, default: Date.now, expires: 300 }
    }
)

const OTP = mongoose.model("OTP", otpSchema);
export default OTP;