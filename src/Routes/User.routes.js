import { Router } from 'express'
import { registerUser } from '../Controllers/user.controller.js'
import { VerifyOtp } from '../Controllers/user.controller.js';
import { CompleteProfile } from '../Controllers/user.controller.js';

const router = Router();
router.post("/register", registerUser);
router.post("/verifyOtp", VerifyOtp);
router.post("/completeProfile", CompleteProfile);

export default router;