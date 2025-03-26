import { ApiError } from "../Utils/apiError.js";
import { Post } from "../Models/Post.model.js";
import { User } from "../Models/User.model.js";
import { asyncHandler } from "../Utils/asyncHandler.js";

const createPost = asyncHandler(async (req, res) => {
    try {
        const { Content, Hashtags } = req.body;
        const userId = req.user?._id; // Assuming `req.user` is set after user authentication middleware
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

export { createPost };
