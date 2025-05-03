import mongoose, { Schema } from "mongoose";

const postSchema = new Schema(
    {
      content: String,
      hashtags: [String],
      postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Users who liked
      likes: { type: Number, default: 0 }, 
      createdAt: { type: Date, default: Date.now }
    }
  );

export const Post = mongoose.model("Post", postSchema);
