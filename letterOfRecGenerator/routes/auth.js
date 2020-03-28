const express = require('express');
const router  = express.Router();

const jwt = require('jsonwebtoken');
const passport = require('passport');


// Get Register page
router.get('/register', (req, res) => res.render('register'));

// Get Login page
router.get('/login', (req, res) => res.render('login'));


/* POST login. */
router.post('/login', function (req, res, next) {

    passport.authenticate('local', {
      session: false,
      successRedirect: '/recommender-dashboard',
      failureRedirect: '/auth/login',
      failureFlash: true
    }, (err, user, info) => {
        console.log(err);
        if (err || !user) {
            return res.status(400).json({
                message: info ? info.message : 'Login failed',
                user   : user
            });
        }

        req.login(user, {session: false}, (err) => {
            if (err) {
                res.send(err);
            }

            const token = jwt.sign(user, 'your_jwt_secret');

            return res.json({user, token});
        });
    })
    (req, res);

});

// Logout handle
router.get('/logout', (req, res) => {
  req.logout();
  req.flash('success_msg', 'You are logged out');
  res.redirect('/users/login');
});

module.exports = router;
