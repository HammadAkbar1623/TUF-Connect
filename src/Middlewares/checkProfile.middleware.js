import User from '../Models/User.model.js';

const checkProfileComplete = async (req, res, next) => {
    const user = await User.findById(req.user.id);
    if (!user.isProfileComplete) {
      return res.status(403).json({ error: 'Complete your profile first' });
    }
    next();
};

export default checkProfileComplete;