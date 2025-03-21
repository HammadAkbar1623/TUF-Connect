import { Router } from 'express'
import { registerUser } from '../Controllers/user.controller.js'
import { VerifyOtp } from '../Controllers/user.controller.js';
import { CompleteProfile } from '../Controllers/user.controller.js';
import { createPost } from '../Controllers/post.controller.js';
import { authenticateUser } from '../Middlewares/auth.middleware.js';
import { loginUser } from '../Controllers/user.controller.js';
import { logOutUser } from '../Controllers/user.controller.js';
import { ChangeCurrentPassword } from '../Controllers/user.controller.js';


const router = Router();
router.post("/register", registerUser);
router.post("/verifyOtp",  VerifyOtp);
router.post("/completeProfile", authenticateUser, CompleteProfile);
router.post("/createPost", authenticateUser, createPost);
router.post("/login", loginUser);
router.post("/logout", authenticateUser, logOutUser);
router.post("/changePassword", authenticateUser, ChangeCurrentPassword);

export default router;