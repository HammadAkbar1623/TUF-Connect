import jwt from "jsonwebtoken";
import { User } from "../Models/User.model.js";
import { ApiError } from "../Utils/apiError.js";
import { asyncHandler } from "../Utils/asyncHandler.js";
import dotenv from "dotenv";


dotenv.config();

export const authenticateUser = asyncHandler(async (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) throw new ApiError(401, "No authentication token provided.");

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select("-password");
        if (!req.user) throw new ApiError(404, "User not found.");
        next();
    } catch (error) {
        throw new ApiError(401, "Invalid authentication token.");
    }
});
