const passport = require('passport');

exports.login = passport.authenticate('local', {
    failureRedirect: '/login', 
    failureFlash: 'Failed login',
    successRedirect: '/',
    successFlash: 'You are now logged in!'
});

exports.logout = (req, res) => {
    req.logout();
    req.flash('success', 'You are now logged out!');
    res.redirect('/');
};

exports.isLoggedIn = (req, res, next) => {
    // check if authenticated
    if(req.isAuthenticated()) {
        next();
        return;
    }
    req.flash('error', 'Oh noes, you have to be logged in...');
    res.redirect('/login');
}