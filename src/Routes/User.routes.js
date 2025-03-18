import { Router } from 'express'
import { registerUser } from '../Controllers/user.controller.js'

const router = Router();
router.post("/register", registerUser);

export default router;