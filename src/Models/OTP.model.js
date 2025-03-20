import mongoose from 'mongoose';

const OTPSchema = new mongoose.Schema({
    Email: {
        type: String,
        required: true
    },
    otp: {
        type: String,
        required: true
    },
    createdAt: { 
        type: Date, 
        default: Date.now, 
        expires: 300 // OTP expires after 5 minutes
    }
});

export const OTP = mongoose.model('OTP', OTPSchema);
