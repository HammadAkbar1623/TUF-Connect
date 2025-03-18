import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";

const UserSchema = new Schema(
  {
    Username: { type: String, required: true, unique: true },
    Name: { type: String },
    Email: { type: String, required: true, unique: true },
    Password: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    Bio: { type: String },
    ProfilePic: { type: String },
    Hashtags: { type: [String] },
    DeviceToken: { type: String }, // For FCM notifications (optional)
  },
  { timestamps: true }
);

UserSchema.pre("save", async function (next) {
  if (!this.isModified("Password")) {
    return next();
  }

  this.Password = await bcrypt.hash(this.Password, 10);
  next();
});

// Checking password
UserSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.Password);
};

export const User = mongoose.model("User", UserSchema);
