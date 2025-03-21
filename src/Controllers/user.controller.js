import { asyncHandler } from '../Utils/asyncHandler.js'
import { ApiResponse } from '../Utils/apiResponse.js'
import { ApiError } from '../Utils/apiError.js'
import { User } from '../Models/User.model.js'
import nodemailer from 'nodemailer'
import { OTP } from '../Models/OTP.model.js'
import { emailUser, emailPass } from '../../config.js'
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";

const generateAccessAndRefreshTokens = async(userId) => {
    try{
            const user = await User.findById(userId)
            const accessToken = user.generateAccessToken()
            const refreshToken = user.generateRefreshToken()

            user.refreshToken = refreshToken;
            // Because we are only saving refresh token not password,
            await user.save({validateBeforeSave: false}); 

            return {accessToken, refreshToken};
    }
    catch(error){
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}

// Registering Schema
const registerSchema = z.object({
    Email: z.string().email({ message: "Invalid email format" }).regex(/^\d{4}-[a-z]+-[a-z]+-\d{3}@tuf\.edu\.pk$/, {
        message: "Email must follow the format YYYY-program-field-rollnumber@tuf.edu.pk, e.g., 2023-bs-cs-049@tuf.edu.pk",
      }),
})


// Function to Register User

const registerUser = asyncHandler(async (req, res) => {
    const { Username, Password } = req.body;
    const { Email } = registerSchema.parse(req.body);

    if (!Email || !Username || !Password) {
        throw new ApiError(400, "All fields are required.");
    }

    if (!Email.endsWith("@tuf.edu.pk")) {
        throw new ApiError(400, "Please provide a university official email.");
    }

    const existedUser = await User.findOne({ $or: [{ Username }, { Email }] });
    if (existedUser) {
        throw new ApiError(409, "Username or Email already exists.");
    }

    const user = await User.create({
        Username: Username.toLowerCase().trim(),
        Email,
        Password,
    });

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    await OTP.create({ Email, otp: otpCode, expiresAt: Date.now() + 10 * 60 * 1000 }); // Expires in 10 mins

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: emailUser, pass: emailPass },
    });

    await transporter.sendMail({
        from: `"TUF Connect" <${emailUser}>`,
        to: Email,
        subject: "Verify OTP",
        html: `<p>Your OTP is <strong>${otpCode}</strong></p>`,
    });

    res.status(201).json({ message: "User registered successfully. Please verify OTP." });
});



const VerifyOtp = asyncHandler(async (req, res) => {
    const { otp } = req.body;

    // Find the OTP record
    const otpRecord = await OTP.findOne({ otp }); // Finds the OTP without requiring the email

    if (!otpRecord) {
        throw new ApiError(400, 'Invalid or expired OTP');
    }

    // Mark user as verified
    const user = await User.findOneAndUpdate(
        { Email: otpRecord.Email }, // Use Email from otpRecord
        { isVerified: true },       // Set user as verified
        { new: true }               // Return the updated user document
    );

    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    // Delete OTP after verification using otpRecord.Email
    await OTP.deleteOne({ Email: otpRecord.Email });

    // Generate tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    // Send tokens in the response
    res.status(200).json({
        message: 'OTP verified successfully',
        accessToken,
        refreshToken
    });
});





const CompleteProfile = asyncHandler(async (req, res) => {
    try {
        const { Name, Bio, Hashtags } = req.body;
        const allowedHashtags = ["sports", "society", "fun", "study"];

        // Validate hashtags with case normalization
        if (!Array.isArray(Hashtags) || Hashtags.length > 4) {
            return res.status(400).json({
                message: "You can only add up to 4 hashtags: sports, society, fun, study",
            });
        }

        const invalidHashtags = Hashtags.filter(tag => !allowedHashtags.includes(tag.toLowerCase()));
        if (invalidHashtags.length > 0) {
            return res.status(400).json({
                message: `Invalid hashtags: ${invalidHashtags.join(", ")}. Allowed hashtags are: sports, society, fun, study`,
            });
        }

        // Find the authenticated user
        const userId = req.user?._id; 
        const user = await User.findById(userId);

        if (!user) {
            throw new ApiError(404, "User not found");
        }
        if (!user.isVerified) {
            throw new ApiError(403, "User is not verified. Please verify your email first.");
        }

        // Update user profile
        user.Name = Name;
        user.Bio = Bio;
        user.Hashtags = Hashtags.map(tag => tag.toLowerCase());

        await user.save();

        return res.status(200).json({
            message: "Profile completed successfully",
            updatedUser: user,
        });

    } catch (error) {
        console.error("Profile completing error:", error);
        return res.status(error.statusCode || 500).json({
            message: error.message || "Something went wrong while completing the profile",
        });
    }
});


const loginUser = asyncHandler( async(req, res) => {
    try {
        const { Email, Password } = req.body; // Be consistent with field names
        const user = await User.findOne({ Email });
        if (!user) return res.status(401).json({ message: 'User not found' });

        // Check password
        const isPasswordValid = await user.isPasswordCorrect(Password)
        if(!isPasswordValid){
        throw new ApiError(404, "Invalid user credentials")
    }


        // Generate a token upon successful login
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
            expiresIn: '1h', // Token expiration time
        });

        res.status(200).json({ token, message: 'Login successful' });
    } 
    
    catch (error) {
        console.error("Login Error:", error); // Log the error to see what's happening
        res.status(500).json({ message: 'Server error', error: error.message || error });
    }
    
})

// Logging out user
const logOutUser = asyncHandler(async (req, res) => {
    // Find the user by ID and update their refresh token to undefined
    const updatedUser = await User.findByIdAndUpdate(
        req.user._id, 
        { $set: { refreshToken: undefined } },  // Clear the refresh token from DB
        { new: true }  // Return the updated document
    );

    if (!updatedUser) {
        return res.status(404).json(new ApiResponse(404, {}, "User not found"));
    }

    // Set options for cookie clearing
    const options = {
        httpOnly: true,
        secure: true,
        sameSite: "strict",  
    };

    // Clear cookies and send response
    return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options).json(new ApiResponse(200, {}, "User logged out successfully"));
});

const ChangeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword, confirmPassword } = req.body;

    // Find the user by their ID from `req.user`
    const user = await User.findById(req.user?._id);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Check if the old password is correct
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordCorrect) {
        throw new ApiError(400, "Old password is incorrect");
    }

    // Check if the new password matches the confirmation password
    if (newPassword !== confirmPassword) {
        throw new ApiError(400, "New passwords do not match");
    }

    // Update the password and invalidate the refresh token (security measure)
    user.Password = newPassword;  // Update password (ensure it's hashed)
    user.refreshToken = undefined;  // Invalidate existing refresh token
    await user.save({ validateBeforeSave: false });

    // Clear tokens from cookies (if tokens are stored as cookies)
    res.clearCookie("accessToken", { httpOnly: true, secure: true })
       .clearCookie("refreshToken", { httpOnly: true, secure: true });

    // Send response to user to log in again with the new password
    res.status(200).json(new ApiResponse(200, {}, "Password changed successfully. Please log in again."));
});



export {
    registerUser,
    VerifyOtp,
    CompleteProfile,
    loginUser,
    logOutUser,
    ChangeCurrentPassword
}