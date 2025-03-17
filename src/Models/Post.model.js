import mongoose, { Schema } from "mongoose";
import User from "./User.model.js";

const postSchema = new Schema(
    {
        content: String,
        hashtags: [String],
        postedBy: { type: mongoose.Schema.Types.ObjectId, ref: User },
        createdAt: { type: Date, default: Date.now }
    }
)

const Post = mongoose.model("Post", postSchema);
export default Post;