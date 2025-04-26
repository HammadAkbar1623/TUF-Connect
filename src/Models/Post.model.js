import mongoose, { Schema } from "mongoose";

const postSchema = new Schema(
    {
        content: String,
        hashtags: [String],
        postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        createdAt: { type: Date, default: Date.now }
    }
)

export const Post = mongoose.model("Post", postSchema);
