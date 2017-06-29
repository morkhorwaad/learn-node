const passport = require('passport');
const mongoose = require('mongoose');
const User = mongoose.model('User');

passport.use(User.createStrategy());

// how to handle the user information
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());