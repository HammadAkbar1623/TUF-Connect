import { ApiError } from "../Utils/apiError.js";
import { Post } from "../Models/Post.model.js";
import { User } from "../Models/User.model.js";
import { asyncHandler } from "../Utils/asyncHandler.js";

const createPost = asyncHandler(async (req, res) => {
    try {

        const userId = req.user?._id; // Get logged-in user ID
        const user = await User.findById(userId); // Fetch user from DB

        if (!user || !user.isVerified) { 
            return res.status(400).json({ message: 'Please complete your registration before posting.' });
        }

        const { Content, Hashtags } = req.body;
        const allowedHashtags = ["sports", "society", "fun", "study"]; // Allowed hashtags

        // Validation: Ensure content and hashtags are provided
        if (!Content || !Array.isArray(Hashtags) || Hashtags.length === 0) {
            throw new ApiError(400, "Post content and at least one hashtag are required.");
        }

        // Check if the post contains at least one valid hashtag
        const validHashtags = Hashtags.filter(tag => allowedHashtags.includes(tag.toLowerCase()));
        if (validHashtags.length === 0) {
            throw new ApiError(400, `Your post must contain at least one valid hashtag from: ${allowedHashtags.join(", ")}`);
        }

        // Create a new post associated with the user
        const newPost = await Post.create({
            content: Content, // Map `Content` to `content` field in the database
            hashtags: validHashtags.map(tag => tag.toLowerCase()), // Store hashtags in lowercase
            postedBy: userId,
        });
        


        const usersToNotify = await User.find({ hashtags: { $in: Hashtags } });

        // Save notifications in DB and send them in real time
    await Promise.all(
        usersToNotify.map(async (user) => {
            const notification = await Notification.create({
                userId: user._id,
                message: `New post related to your interests: ${Hashtags.join(", ")}`,
            });

            // Emit real-time notification to connected users
            io.to(user._id.toString()).emit("newNotification", notification);
        })
    );


        // Deleting post after one hour
        setTimeout(async () => {
            try {
                await Post.deleteOne({ _id: newPost._id });
                console.log(`Post with ID ${newPost._id} deleted after 1 hour`);
            } catch (error) {
                console.error(`Failed to delete post: ${error.message}`);
            }
        }, 3600000);
        
        

        return res.status(201).json({
            message: "Post created successfully and notification sent",
            post: newPost,
        });

        

    } catch (error) {
        console.error("Error while creating post:", error);
        return res.status(error.statusCode || 500).json({
            message: error.message || "Something went wrong while creating the post",
        });
    }
});

const showAllPosts = asyncHandler(async (req, res) => {
    try {
        
        const userId = req.user?._id; // Get logged-in user ID
        const user = await User.findById(userId); // Fetch user from DB

        if (!user || !user.isVerified) { 
            return res.status(400).json({ message: 'Please complete your registration before posting.' });
        }
        
        // To get the name of person who posted
        const posts = await Post.find().populate({ path: "postedBy", select: "Name ProfilePic" }); 

        
        res.status(200).json(posts);
    } 
    
    catch (error) {
        console.error(error); 
        res.status(500).json({ message: "Failed to fetch posts", error: error.message });
    }
});


// Controller to delete Post
const deletePost = asyncHandler(async (req, res) => {
    try {
        const postId = req.params.id; // Get the post ID from the request URL
        const userId = req.user?._id; // Get the authenticated user's ID

        // Find the post by ID
        const post = await Post.findById(postId);
        if (!post) {
            throw new ApiError(404, "Post not found.");
        }

        // Check if the logged-in user is the owner of the post
        if (post.postedBy.toString() !== userId.toString()) {
            throw new ApiError(403, "You are not authorized to delete this post.");
        }

        // Delete the post
        await Post.deleteOne({ _id: postId });

        return res.status(200).json({ message: "Post deleted successfully." });
    } catch (error) {
        console.error("Error while deleting post:", error);
        return res.status(error.statusCode || 500).json({
            message: error.message || "Something went wrong while deleting the post.",
        });
    }
});


export { createPost,
        showAllPosts,
        deletePost
 };
