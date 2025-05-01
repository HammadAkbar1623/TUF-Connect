import { asyncHandler } from "../Utils/asyncHandler.js";
import { ApiResponse } from "../Utils/apiResponse.js";
import { ApiError } from "../Utils/apiError.js";
import { User } from "../Models/User.model.js";
import nodemailer from "nodemailer";
import { OTP } from "../Models/OTP.model.js";
import { emailUser, emailPass } from "../../config.js";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { UploadOnCloudinary } from "../Utils/cloudinary.js";
import SibApiV3Sdk from "sib-api-v3-sdk";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    // Because we are only saving refresh token not password,
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token"
    );
  }
};

// Registering Schema
const registerSchema = z.object({
  Email: z
    .string()
    .email({ message: "Invalid email format" })
    .regex(/^\d{4}-[a-z]+-[a-z]+-\d{3}@tuf\.edu\.pk$/, {
      message:
        "Email must follow the format YYYY-program-field-rollnumber@tuf.edu.pk, e.g., 2023-bs-cs-049@tuf.edu.pk",
    }),
});

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
  await OTP.create({
    Email,
    otp: otpCode,
    expiresAt: Date.now() + 10 * 60 * 1000,
  }); // Expires in 10 mins

  const apikey = process.env.BREVO_API_KEY;
  SibApiV3Sdk.ApiClient.instance.authentications["api-key"].apiKey = apikey;
  const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

  if (!apikey) {
    throw new ApiError(500, "Brevo API key is missing.");
  }

  const msg = {
    from: `"TUF Connect" <${emailUser}>`,
    to: Email,
    subject: "Your TUF Connect OTP Code",
    html: `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #4A90E2;">TUF Connect</h2>
      <p>Asalamo Alikum,</p>
      <p>Thank you for signing up! Please use the OTP code below to verify your email address:</p>
      <p style="font-size: 24px; font-weight: bold; background-color: #f0f0f0; padding: 10px; display: inline-block; border-radius: 5px;">
        ${otpCode}
      </p>
      <p>This code is valid for the next 10 minutes.</p>
      <br>
      <p>Best regards,</p>
      <p>The TUF Connect Team</p>
      <hr style="margin-top: 30px;">
      <small style="color: #888;">Mujhe Attitude dekhao aur iss email ka reply na krna.</small>
    </div>
  `,
  };

  try {
    const response = await apiInstance.sendTransacEmail(msg);
    console.log("OTP email sent:", response);
  } 
  catch (error) {
    console.error("Brevo API Error Details:", error.response?.body || error.message);
    await User.deleteOne({ Email });
    await OTP.deleteOne({ Email });
    throw new ApiError(500, "Failed to send OTP. Please try again later.");
  }

  res
    .status(201)
    .json({ message: "User registered successfully. Please verify OTP." });
});

const VerifyOtp = asyncHandler(async (req, res) => {
  const { otp } = req.body;

  // Find the OTP record
  const otpRecord = await OTP.findOne({ otp }); // Finds the OTP without requiring the email

  if (!otpRecord) {
    throw new ApiError(400, "Invalid or expired OTP");
  }

  // Mark user as verified
  const user = await User.findOneAndUpdate(
    { Email: otpRecord.Email }, // Use Email from otpRecord
    { isVerified: true }, // Set user as verified
    { new: true } // Return the updated user document
  );

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Delete OTP after verification using otpRecord.Email
  await OTP.deleteOne({ Email: otpRecord.Email });

  // Generate tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  // Send tokens in the response
  res.status(200).json({
    message: "OTP verified successfully",
    accessToken,
    refreshToken,
  });
});

const CompleteProfile = asyncHandler(async (req, res) => {
  try {
    const userId = req.user?._id; // Get logged-in user ID
    const user = await User.findById(userId); // Fetch user from DB

    if (!user || !user.isVerified) {
      return res
        .status(400)
        .json({ message: "Please complete your registration before posting." });
    }

    const { Name, Bio, Hashtags } = req.body;
    const allowedHashtags = ["sports", "society", "fun", "study"];
    // Validate hashtags with case normalization
    if (!Array.isArray(Hashtags) || Hashtags.length > 4) {
      return res.status(400).json({
        message:
          "You can only add up to 4 hashtags: sports, society, fun, study",
      });
    }

    const invalidHashtags = Hashtags.filter(
      (tag) => !allowedHashtags.includes(tag.toLowerCase())
    );
    if (invalidHashtags.length > 0) {
      return res.status(400).json({
        message: `Invalid hashtags: ${invalidHashtags.join(
          ", "
        )}. Allowed hashtags are: sports, society, fun, study`,
      });
    }

    // Check for Profile Pic
    let profilePicUrl = user.ProfilePic; // Default to existing profile pic
    if (req.file) {
      // Changed from req.files to req.file for single file
      const ProfilePicLocalPath = req.file.path; // Single file, no array

      // Upload the Profile Pic on Cloudinary
      const profileUploadResult = await UploadOnCloudinary(ProfilePicLocalPath);

      if (!profileUploadResult || !profileUploadResult.url) {
        return res
          .status(500)
          .json({ message: "Failed to upload profile picture" });
      }

      profilePicUrl = profileUploadResult.secure_url;
    }

    // Update user profile
    user.Name = Name;
    user.Bio = Bio;
    user.Hashtags = Hashtags.map((tag) => tag.toLowerCase());
    user.ProfilePic = profilePicUrl;
    user.isProfileComplete = true; // Mark profile as complete

    await user.save();

    return res.status(200).json({
      message: "Profile completed successfully",
      updatedUser: user,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message:
        error.message || "Something went wrong while completing the profile",
    });
  }
});

const loginUser = asyncHandler(async (req, res) => {
  try {
    const { Email, Password } = req.body; // Be consistent with field names

    const user = await User.findOne({ Email });
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res
        .status(400)
        .json({ message: "Please complete your registration" });
    }

    // Check password
    const isPasswordValid = await user.isPasswordCorrect(Password);
    if (!isPasswordValid) {
      return res.status(404).json({ message: "Invalid User credentials" });
    }

    // Generate a token upon successful login
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(200).json({
      token,
      isProfileComplete: user.isProfileComplete,
      message: "Login successful",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Logging out user
const logOutUser = asyncHandler(async (req, res) => {
  // Find the user by ID and update their refresh token to undefined
  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { refreshToken: undefined } }, // Clear the refresh token from DB
    { new: true } // Return the updated document
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
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
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

  if (!newPassword.trim() || !confirmPassword.trim()) {
    throw new ApiError(
      400,
      "New password cannot be empty or contain only spaces"
    );
  }

  // Check if the new password matches the confirmation password
  if (newPassword !== confirmPassword) {
    throw new ApiError(400, "New passwords do not match");
  }

  // Update the password and invalidate the refresh token (security measure)
  user.Password = newPassword; // Update password (ensure it's hashed)
  user.refreshToken = undefined; // Invalidate existing refresh token
  await user.save({ validateBeforeSave: false });

  // Clear tokens from cookies (if tokens are stored as cookies)
  res
    .clearCookie("accessToken", { httpOnly: true, secure: true })
    .clearCookie("refreshToken", { httpOnly: true, secure: true });

  // Send response to user to log in again with the new password
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "Password changed successfully. Please log in again."
      )
    );
});

const getUserProfile = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch profile", error });
    console.log(error);
  }
});

const getPublicUserProfile = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select(
      "Name ProfilePic Bio Username Hashtags"
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch profile", error });
  }
});

const UpdateUserName = asyncHandler(async (req, res) => {
  try {
    const { Username } = req.body;
    if (!Username) {
      return res.status(400).json({ message: "Username is required" });
    }

    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.Username === Username) {
      return res.status(200).json({ message: "Username remains the same" });
    }

    const existingUser = await User.findOne({ Username });
    if (existingUser) {
      return res.status(409).json({ message: "Username already exists" });
    }

    user.Username = Username.trim().toLowerCase(); // Normalize the username
    await user.save();

    res.status(200).json({
      message: "Username updated successfully",
      updatedUser: {
        _id: user._id,
        Username: user.Username,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Something went wrong while updating the username",
      error: error.message,
    });
  }
});

const UpdateName = asyncHandler(async (req, res) => {
  try {
    const { Name } = req.body;
    if (!Name) {
      return res.status(400).json({ message: "Name is required" });
    }
    const userId = req.user._id; // Get the logged-in user's ID
    const user = await User.findByIdAndUpdate(
      userId,
      { Name },
      { new: true, runValidators: true }
    ); // Find the user by ID

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    user.Name = Name; // Update the user's name
    await user.save(); // Save the changes to the database

    res.status(200).json({
      message: "Name updated successfully",
      updatedUser: {
        _id: user._id,
        Name: user.Name,
        Username: user.Username,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Something went wrong while updating the name",
      error: error.message,
    });
  }
});

const UpdateBio = asyncHandler(async (req, res) => {
  try {
    const { Bio } = req.body;
    if (!Bio) {
      return res.status(400).json({ message: "Bio is required" });
    }
    const userId = req.user._id; // Get the logged-in user's ID
    const user = await User.findByIdAndUpdate(
      userId,
      { Bio },
      { new: true, runValidators: true }
    ); // Find the user by ID

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    user.Bio = Bio; // Update the user's bio
    await user.save(); // Save the changes to the database
    res.status(200).json({
      message: "Bio updated successfully",
      updatedUser: { _id: user._id, Bio: user.Bio, Username: user.Username },
    });
  } catch (error) {
    res.status(500).json({
      message: "Something went wrong while updating the bio",
      error: error.message,
    });
  }
});

const UpdateHashtags = asyncHandler(async (req, res) => {
  const { Hashtags } = req.body;
  if (!Hashtags || !Array.isArray(Hashtags) || Hashtags.length === 0) {
    return res.status(400).json({ message: "Hashtags are required" });
  }
  const allowedHashtags = ["sports", "society", "fun", "study"];
  const invalidHashtags = Hashtags.filter(
    (tag) => !allowedHashtags.includes(tag.toLowerCase())
  );
  if (invalidHashtags.length > 0) {
    return res.status(400).json({
      message: `Invalid hashtags: ${invalidHashtags.join(
        ", "
      )}. Allowed hashtags are: sports, society, fun, study`,
    });
  }
  const userId = req.user._id; // Get the logged-in user's ID

  // Find the user by ID
  const user = await User.findByIdAndUpdate(
    userId,
    { Hashtags },
    { new: true, runValidators: true }
  );

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  user.Hashtags = Hashtags.map((tag) => tag.toLowerCase()); // Update the user's hashtags
  await user.save(); // Save the changes to the user's hashtags
  res.status(200).json({ message: "Hashtags updated successfully" });
});

const UpdateProfilePic = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id; // Get the logged-in user's ID
    const user = await User.findById(userId); // Find the user by ID

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check for Profile Pic
    let profilePicUrl = user.ProfilePic; // Default to existing profile pic
    if (req.file) {
      // Changed from req.files to req.file for single file
      const ProfilePicLocalPath = req.file.path; // Single file, no array

      // Upload the Profile Pic on Cloudinary
      const profileUploadResult = await UploadOnCloudinary(ProfilePicLocalPath);

      if (!profileUploadResult || !profileUploadResult.url) {
        return res
          .status(500)
          .json({ message: "Failed to upload profile picture" });
      }

      profilePicUrl = profileUploadResult.secure_url;
    }

    // Update user profile
    user.ProfilePic = profilePicUrl;

    await user.save();

    return res.status(200).json({
      message: "Profile picture updated successfully",
      updatedUser: user,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message:
        error.message || "Something went wrong while updating the profile pic",
    });
  }
});

export {
  registerUser,
  VerifyOtp,
  CompleteProfile,
  loginUser,
  logOutUser,
  ChangeCurrentPassword,
  getUserProfile,
  getPublicUserProfile,
  UpdateUserName,
  UpdateName,
  UpdateBio,
  UpdateHashtags,
  UpdateProfilePic,
};
