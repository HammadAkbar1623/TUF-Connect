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
import upload from '../Middlewares/multer.middleware.js';
import { getPublicUserProfile } from '../Controllers/user.controller.js';
// import { savePushToken } from '../Controllers/notification.controller.js';
// import { getNotifications } from '../Controllers/notification.controller.js';
// import { markNotificationAsRead } from '../Controllers/notification.controller.js';
import { UpdateUserName } from '../Controllers/user.controller.js';
import { UpdateName } from '../Controllers/user.controller.js';
import { UpdateBio } from '../Controllers/user.controller.js';
import { UpdateHashtags } from '../Controllers/user.controller.js';
import { UpdateProfilePic } from '../Controllers/user.controller.js';

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
router.get('/profile', authenticateUser, getUserProfile);   // Seeing your own profile
router.get('/:userId', getPublicUserProfile);  // Seeing the profile of user who posted
router.delete("/logout", authenticateUser, logOutUser);
router.post("/changePassword", authenticateUser, ChangeCurrentPassword);
router.patch('/updateUserName', authenticateUser, UpdateUserName);
router.patch('/updateName', authenticateUser, UpdateName);
router.patch('/updateBio', authenticateUser, UpdateBio);
router.patch('/updateHashtags', authenticateUser, UpdateHashtags);
router.patch('/updateProfilePic', authenticateUser, upload.single("profilePic"), UpdateProfilePic);




//router.post('/save-push-token', authenticateUser, savePushToken);


// router.get('/notifications', authenticateUser, (req, res) => {
//     console.log("User ID:", req.user._id); // Add logging
//     getNotifications(req, res);
// });


//router.patch('/notifications/:id/read', authenticateUser, markNotificationAsRead);

export default router;