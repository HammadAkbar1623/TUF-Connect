import { asyncHandler } from '../Utils/asyncHandler.js'
import { ApiResponse } from '../Utils/apiResponse.js'
import { ApiError } from '../Utils/apiError.js'
import { User } from '../Models/User.model.js'
import nodemailer from 'nodemailer'
import { OTP } from '../Models/OTP.model.js'
import { emailUser, emailPass } from '../../config.js'


// Function to Register User

const registerUser = asyncHandler( async(req, res) => {

    try {
    
    // Email Transporter
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: emailUser,
            pass: emailPass
        }
    })

    // Step 1: Get user details from frontend
    const { Username, Email, Password } = req.body
    console.log("Email: ", Email);
    console.log("Password: ", Password);
    console.log("Username: ", Username);

    // Step 2: Validation
    if (!Email.endsWith('@tuf.edu.pk')) {  // Check for official email address
        throw new ApiError(400, 'Please provide university official email')
        
    }

    if([ Email, Username, Password ].some( (field) => field?.trim() === "")){  // Ask user to fill all inputs
        throw new ApiError(400, "All fields are required")
    }

    // If the User already registered
    const existedUser = await User.findOne({ $or: [ { Username }, { Email } ]})
    if (existedUser) {
        throw new ApiError(409, 'Username or Email already exists');
    }

    // Step 3: Create User object - Create entry in DB
    const RegisteredUsers = await User.create({
        Username: Username.toLowerCase(), Email, Password
    })

    // Generating OTP
    const otpCode = Math.floor(10000 + Math.random() * 90000).toString();
    await OTP.create({ Email, otp: otpCode });

    // Send OTP
    await transporter.sendMail({
        from: `"TUF Connect" <${emailUser}>`,
        to: Email,
        subject: 'Verify OTP',
        text: `Thank you for registering on TUF connect `,
        html: `<p>Your OTP is <strong>${otpCode}</strong></p>`,
        replyTo: "niazihammad@gmail.com",
    })

    

    // Step 4: Check if the user was created
    if (!RegisteredUsers) {
        return res.status(500).json({ message: "Something went wrong while registering user"})
    }

    return res.status(201).json( { message: 'User registered successfully '})
    } 
    
    catch (error) {
        console.log("Registering error: ", error);
        return res.status(error.statusCode || 500).json({ message: error.message || "Something went wrong while registering user" })
        
    }

})


const VerifyOtp = asyncHandler(async (req, res) => {
    const { Email, otp } = req.body;

    // Find the OTP record
    const otpRecord = await OTP.findOne({ Email, otp });

    if (!otpRecord) {
        throw new ApiError(400, 'Invalid or expired OTP');
    }

    // Mark user as verified
    const user = await User.findOneAndUpdate(
        { Email },
        { isVerified: true },
        { new: true }
    );

    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    // Optionally delete OTP after verification
    await OTP.deleteOne({ Email });

    res.status(200).json({ message: 'OTP verified successfully' });
});


const CompleteProfile = asyncHandler(async (req, res) => {
    try {
        const { Name, Bio, Hashtags } = req.body;
        const allowedHashtags = ["sports", "society", "fun", "study"];

        // Validate hashtags
        if (!Array.isArray(Hashtags) || Hashtags.length > 4) {
            return res.status(400).json({
                message: "You can only add up to 4 hashtags: sports, society, fun, study",
            });
        }

        const invalidHashtags = Hashtags.filter(tag => !allowedHashtags.includes(tag));
        if (invalidHashtags.length > 0) {
            return res.status(400).json({
                message: `Invalid hashtags: ${invalidHashtags.join(", ")}. Allowed hashtags are: sports, society, fun, study`,
            });
        }

        // Find the most recently registered user
        const user = await User.findOne().sort({ createdAt: -1 });

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





export {
    registerUser,
    VerifyOtp,
    CompleteProfile
}