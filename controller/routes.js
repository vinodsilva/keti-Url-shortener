const express = require('express');
const router = express.Router();
const user = require('../model/user');
const urls = require('../model/url');
const bcryptjs = require('bcryptjs');
const passport = require('passport');
require('./passportLocal')(passport);
require('./googleAuth')(passport);
const userRoutes = require('./accountRoutes');

function checkAuth(req, res, next) {
    if (req.isAuthenticated()) {
        res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, post-check=0, pre-check=0');
        next();
    } else {
        req.flash('error_messages', "Please Login to continue !");
        res.redirect('/login');
    }
}

function checkSlug(_req,_res,_next){

}

router.get('/login', (req, res) => {
    res.render("login", { csrfToken: req.csrfToken() });
});

router.get('/signup', (req, res) => {
    res.render("signup", { csrfToken: req.csrfToken() });
});

router.post('/signup', (req, res) => {
    // get all the values 
    const { email, password, confirmpassword } = req.body;
    // check if the are empty 
    if (!email || !password || !confirmpassword) {
        res.render("signup", { err: "All Fields Required !", csrfToken: req.csrfToken() });
    } else if (password != confirmpassword) {
        res.render("signup", { err: "Password Don't Match !", csrfToken: req.csrfToken() });
    } else {

        // validate email and username and password 
        // skipping validation
        // check if a user exists
        user.findOne({ email: email }, function (err, data) {
            if (err) throw err;
            if (data) {
                res.render("signup", { err: "User Exists, Try Logging In !", csrfToken: req.csrfToken() });
            } else {
                // generate a salt
                bcryptjs.genSalt(12, (err, salt) => {
                    if (err) throw err;
                    // hash the password
                    bcryptjs.hash(password, salt, (err, hash) => {
                        if (err) throw err;
                        // save user in db
                        user({
                            email: email,
                            password: hash,
                            googleId: null,
                            provider: 'email',
                        }).save((err, _data) => {
                            if (err) throw err;
                            // login the user
                            // use req.login
                            // redirect , if you don't want to login
                            res.redirect('/login');
                        });
                    })
                });
            }
        });
    }
});

router.post('/login', (req, res, next) => {
    passport.authenticate('local', {
        failureRedirect: '/login',
        successRedirect: '/dashboard',
        failureFlash: true,
    })(req, res, next);
});

router.get('/logout', (req, res) => {
    req.logout();
    req.session.destroy(function (_err) {
        res.redirect('/');
    });
});

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email',] }));

router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), (_req, res) => {
    res.redirect('/dashboard');
});

router.get('/dashboard', checkAuth, (req, res) => {


    urls.find({ owned : req.user.email }, (err, data) => {
        if(err) throw err;
        
        res.render('dashboard', { verified: req.user.isVerified, logged: true, csrfToken: req.csrfToken(), urls : data });
        
    });

});


router.post('/create', checkAuth, (req, res) => {
    const { original, short ,password} = req.body;

    if (!original || !short || !password) {

        res.render('dashboard', { verified: req.user.isVerified, logged: true, csrfToken: req.csrfToken(), err: "Empty Fields !" });
    } else {
        urls.findOne({ slug: short }, (err, data) => {
            if (err) throw err;
            if (data) {
                res.render('dashboard', { verified: req.user.isVerified, logged: true, csrfToken: req.csrfToken(), err: "Try Different Short Url, This exists !" });

            } else {
                urls({
                    originalUrl: original,
                    slug: short,
                    owned: req.user.email,
                    password: password
                }).save((_err) => {
                    res.redirect('/dashboard');
                });
            }
        })
    }

});


router.use(userRoutes);


function checkSlug(req, res, next) {
        var data =urls.findOne({ slug: req.params.slug });
        res.locals.data=data;
        next();
}


router.get('/:slug?',async (req, res) => {

 function checkSlug(req, res, next) {
        var data =urls.findOne({ slug: req.params.slug });
        res.locals.data=data;
        next();
}
    if (req.params.slug != undefined) {
        var data = await urls.findOne({ slug: req.params.slug });
        res.locals.data=data;
        console.log(res.locals.data);
        
        if (data) {
            res.render("veiwUrl", {csrfToken: req.csrfToken() });
     }else{
        if (req.isAuthenticated()) {
            res.render("index", { logged: true });
        } else {
            res.render("index", { logged: false });
        } 
     }

    } else {
        if (req.isAuthenticated()) {
            res.render("index", { logged: true });
        } else {
            res.render("index", { logged: false });
        }
    }
})
router.post('/:slug?',checkSlug, async (req, res) => {
    const { password} = req.body;
   // const{data}=res.locals.data;
    console.log(res.locals.data);

 if (!password ) {
    res.render("veiwUrl", { err: "Password is Required !" });
} 
 else {
         if (data) {
            data.visits = data.visits + 1;
           var ref = req.query.ref;
            if (ref) {
                switch (ref) {
                    case 'fb':
                        data.visitsFB = data.visitsFB + 1;
                        break;
                    case 'ig':
                        data.visitsIG = data.visitsIG + 1;
                        break;
                    case 'yt':
                        data.visitsYT = data.visitsYT + 1;
                        break;
                }
            }

            await data.save();

            res.redirect(data.originalUrl);
        } else {
            if (req.isAuthenticated()) {
                res.render("index", { logged: true, err: true });
            } else {
                res.render("index", { logged: false, err: true });
            }

        }


    } 

});






// router.get('/:slug?',async (req, res) => {
//     var slug =req.params.slug;
//     console.log(slug);
//     if (req.params.slug != undefined) {
//         var data = await urls.findOne({ slug: req.params.slug });
//         if (data) {
//             res.render("veiwUrl", { data:data, reset: true ,csrfToken: req.csrfToken() });
//      }else{
//         if (req.isAuthenticated()) {
//             res.render("index", { logged: true });
//         } else {
//             res.render("index", { logged: false });
//         } 
//      }

//     } else {
//         if (req.isAuthenticated()) {
//             res.render("index", { logged: true });
//         } else {
//             res.render("index", { logged: false });
//         }
//     }
   

// });

// router.post('/:slug?', async (req, res) => {
//     const { password,data } = req.body;
//     console.log(password);
//     console.log(data);
// if (!password ) {
//     res.render("veiwUrl", { err: "Password is Required !" });
// } 
//  else {
//     if (req.params.slug != undefined) {
//        // var data = await urls.findOne({ slug: req.params.slug });
//         if (data) {
//             data.visits = data.visits + 1;

//             var ref = req.query.ref;
//             if (ref) {
//                 switch (ref) {
//                     case 'fb':
//                         data.visitsFB = data.visitsFB + 1;
//                         break;
//                     case 'ig':
//                         data.visitsIG = data.visitsIG + 1;
//                         break;
//                     case 'yt':
//                         data.visitsYT = data.visitsYT + 1;
//                         break;
//                 }
//             }

//             await data.save();

//             res.redirect(data.originalUrl);
//         } else {
//             if (req.isAuthenticated()) {
//                 res.render("index", { logged: true, err: true });
//             } else {
//                 res.render("index", { logged: false, err: true });
//             }

//         }


//     } else {
//         if (req.isAuthenticated()) {
//             res.render("index", { logged: true });
//         } else {
//             res.render("index", { logged: false });
//         }
//     }
//         }

// });

   
    


module.exports = router;