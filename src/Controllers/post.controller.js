import { ApiError } from "../Utils/apiError.js";
import { Post } from "../Models/Post.model.js";
import { User } from "../Models/User.model.js";
import { asyncHandler } from "../Utils/asyncHandler.js";
import Expo from "expo-server-sdk";

const expo = new Expo.Expo();

const createPost = asyncHandler(async (req, res) => {
  try {
    const userId = req.user?._id;
    const user = await User.findById(userId);

    if (!user || !user.isVerified) {
      return res
        .status(400)
        .json({ message: "Please complete your registration before posting." });
    }

    const { content, hashtags } = req.body;
    const allowedHashtags = ["sports", "society", "fun", "study", "seminar", "volunteer", "gossip", "connect"];

    // Validation
    if (!content || !Array.isArray(hashtags) || hashtags.length === 0) {
      throw new ApiError(
        400,
        "Post content and at least one hashtag are required."
      );
    }

    // Hashtag processing
    const validHashtags = hashtags
      .map((tag) => tag.toLowerCase())
      .filter((tag) => allowedHashtags.includes(tag));

    if (validHashtags.length === 0) {
      throw new ApiError(
        400,
        `Your post must contain at least one valid hashtag from: ${allowedHashtags.join(
          ", "
        )}`
      );
    }

    // Create post
    const newPost = await Post.create({
      content: content,
      hashtags: validHashtags,
      postedBy: userId,
    });

    res.status(201).json({
      message: "Post created successfully",
      post: newPost,
    });
  } catch (error) {
    console.error("Post creation error:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Post creation failed",
    });
  }
});

// More reliable post deletion scheduler
// const scheduleDeletion = (postId) => {
//     const deletionJob = agenda.create('delete-post', { postId });
//     deletionJob.schedule('in 1 hour');
//     deletionJob.save();
// };

const showAllPosts = asyncHandler(async (req, res) => {
    try {
      const userId = req.user?._id;
      const user = await User.findById(userId);
  
      if (!user || !user.isVerified) {
        return res.status(400).json({
          message: "Please complete your registration before viewing posts.",
        });
      }
  
      // Fetch posts visible to the user based on hashtags
      const posts = await Post.find({
        $or: [
          // Posts matching the user's selected hashtags
          { hashtags: { $in: user.Hashtags } },
          // Ensure the author can always see their own posts (optional)
          { postedBy: userId }
        ]
      }).populate({ path: "postedBy", select: "Name ProfilePic" });
    
      res.status(200).json(posts);
    } catch (error) {
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

const LikePost = asyncHandler(async (req, res) => {
  try {
    const postId = req.params._id;
    const userId = req.user?._id;

    const post = await Post.findById(postId);
    if (!post) {
      throw new ApiError(404, "Post not found.");
    }

    const alreadyLiked = post.likes.includes(userId);

    if (alreadyLiked) {
      // Unlike
      post.likes.pull(userId);
      await post.save();
      return res.status(200).json({ message: "Post unliked." });
    } else {
      // Like
      post.likes.push(userId);
      await post.save();
      return res.status(200).json({ message: "Post liked successfully." });
    }
  } catch (error) {
    console.error("Error while liking post:", error);
    return res.status(error.statusCode || 500).json({
      message: error.message || "Something went wrong while liking the post.",
    });
  }
});


export { createPost, showAllPosts, deletePost, LikePost };
