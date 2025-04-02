import { Router } from 'express'
import { registerUser } from '../Controllers/user.controller.js'
import { VerifyOtp } from '../Controllers/user.controller.js';
import { CompleteProfile } from '../Controllers/user.controller.js';
import { createPost } from '../Controllers/post.controller.js';
import { authenticateUser } from '../Middlewares/auth.middleware.js';
import { loginUser } from '../Controllers/user.controller.js';
import { logOutUser } from '../Controllers/user.controller.js';
import { ChangeCurrentPassword } from '../Controllers/user.controller.js';
import { showAllPosts } from '../Controllers/post.controller.js';
import { getUserProfile } from '../Controllers/user.controller.js';
import { deletePost } from '../Controllers/post.controller.js';
import {upload} from '../middlewares/multer.middleware.js'

const router = Router();
router.post("/register", registerUser);
router.post("/verifyOtp",  VerifyOtp);

router.route("/completeProfile").post(
    authenticateUser,
    upload.single("ProfilePic"), CompleteProfile);

router.post("/createPost", authenticateUser, createPost);
router.get("/showPosts", authenticateUser, showAllPosts);
router.delete("/deletePost/:id", authenticateUser, deletePost);
router.post("/login", loginUser);
router.get('/profile', authenticateUser, getUserProfile);
router.delete("/logout", authenticateUser, logOutUser);
router.post("/changePassword", authenticateUser, ChangeCurrentPassword);

export default router;