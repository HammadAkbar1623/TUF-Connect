import { asyncHandler } from '../Utils/asyncHandler.js'
import { ApiResponse } from '../Utils/apiResponse.js'
import { ApiError } from '../Utils/apiError.js'
import { User } from '../Models/User.model.js'


// Function to Register User

const registerUser = asyncHandler( async(req, res) => {

    try {

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

    // Step 4: Check if the user was created
    if (!RegisteredUsers) {
        return res.status(500).json({ message: "Something went wrong while registering user"})
    }

    return res.status(201).json( { message: 'User registered successfully ', RegisteredUsers})
    } 
    
    catch (error) {
        console.log("Registering error: ", error);
        return res.status(error.statusCode || 500).json({ message: error.message || "Something went wrong while registering user" })
        
    }

})

export {
    registerUser
}