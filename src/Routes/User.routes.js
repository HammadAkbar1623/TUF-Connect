import { Router } from 'express'
import { registerUser } from '../Controllers/user.controller.js'
import { VerifyOtp } from '../Controllers/user.controller.js';
import { CompleteProfile } from '../Controllers/user.controller.js';
import { createPost } from '../Controllers/post.controller.js';
import { authenticateUser } from '../Middlewares/auth.middleware.js';
import { loginUser } from '../Controllers/user.controller.js';

const router = Router();
router.post("/register", registerUser);
router.post("/verifyOtp", VerifyOtp);
router.post("/completeProfile", authenticateUser, CompleteProfile);
router.post("/createPost", authenticateUser, createPost);
router.post("/login", loginUser);

export default router;