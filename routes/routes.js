const router = require("express").Router();
const alert = require("alert");
const bodyParser = require('body-parser');
const session = require("express-session");
const keys = require("../config/keys");
const User = require("../models/user");

//Middlewares
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());
router.use(session({
    cookie: {maxAge: 2000000},
    secret: [keys.session.secret],
    saveUninitialized: false,
    resave: false
}));

//Check authentication
const authenticated = (req, res, next) => {
    if(!req.session.userid) {
        alert("Please login first");
        return res.redirect("/login");
    }
    else {
        next();
    }
}

//Retrieve data for given date
const get_posts = async(username, date) => {

    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    let data;
    try {
        data = await User.findOne({
            username:username
        });
    }
    catch(err) {
        console.log(err);
    }

    const posts = [];
    data.posts.forEach(post => {
        const post_date = post.date;

        if(post_date.getFullYear() === year &&
            post_date.getMonth() === month &&
            post_date.getDate() + 1 === day
        )
        posts.push(post);
    })

    return posts;
}

//Retrieve data in sorted order
const get_posts_sorted = async(username, condition) => {

    //1 = Ascending, -1 = Descending
    let posts;

    try{
        posts = await User.aggregate([
            {
                $match: {username: {$eq: username}}
            },
            {
                $project: 
                    {
                        result: 
                            {
                                $sortArray: {
                                    input: "$posts", 
                                    sortBy: {date: condition}
                                }
                            }
                    }
            }
        ]);
    }
    catch(err) {
        console.log(err);
    }
    return posts;
}

//Create
router.get("/create", authenticated, (req, res) => {
    res.render("create");
})

router.post("/create", authenticated, (req, res) => {
    const date = new Date(req.body.date);
    const event = req.body.event;

    //If missing fields
    if(!(date && event)) {
        alert("Please fill out both fields!");
        return res.redirect("/create");
    }

    //Create mongodb entry
    const username = req.session.userid;
    User.updateOne(
        {username: username},
        {$push: {
            posts: {
                date: date,
                event: event
            }
        }}
    )
    .then(result => {
        return res.redirect("/");
    })
    .catch(err => {
        console.log(err);
        return res.redirect("/create");
    });
})

//Home page (shows today's post)
router.get("/", authenticated, async (req, res) => {
    const username = req.session.userid;
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    const posts = await get_posts(username, date);

    res.render("home", {
        username:username,
        year:year,
        month:month,
        day:day,
        posts:posts
    });
})

//Upcoming posts
router.get("/upcoming", authenticated, async (req, res) => {
    const username = req.session.userid;
    const today = new Date();
    const data = await get_posts_sorted(username, 1);
    const posts = [];

    //Only use posts after today
    data[0].result.forEach(post => {
        if(post.date > today)
            posts.push(post);
    });
    
    return res.render("upcoming", {
        posts: posts
    })
})

//Past posts
router.get("/history", authenticated, async (req, res) => {
    const username = req.session.userid;
    const today = new Date();
    const data = await get_posts_sorted(username, -1);
    const posts = [];
    
    //Only use posts before today
    data[0].result.forEach(post => {
        if(post.date < today)
            posts.push(post);
    });
        
    return res.render("history", {
        posts: posts
    })
})

//Register
router.get("/register", (req, res) => {
    res.render("register");
})

router.post("/register", async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    const confirmation = req.body.confirmation;

    console.log(username);
    console.log(password);
    console.log(confirmation);

    //If missing any fields
    if(!(username && password && confirmation)) {
        alert("Missing one of the fields");
        return res.redirect("/register");
    }

    //if password != confirmation
    if(password != confirmation) {
        alert("Confirmation does not match password");
        return res.redirect("/register");
    }

    //Check if user already exists
    const user = await User.findOne({
        username: username
    });

    if(user) {
        alert("A user with this username already exists.");
        return res.redirect("/register");
    }

    //Enter user into database
    const new_user = new User({
        username: username,
        password: password
    }).save();

    return res.redirect("/login");
})

//login
router.get("/login", (req, res) => {
    res.render("login");
})

router.post("/login", async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    //If missing any fields
    if(!(username && password)) {
        alert("Missing one of the fields");
        return res.redirect("/login");
    }

    //Get user
    const user = await User.findOne({
        username: username,
        password: password
    });

    if(!user) {
        alert("Wrong username and/or password");
        return res.redirect("/login");
    }

    //Set session
    req.session.userid = username;
    return res.redirect("/");
})

//logout
router.get("/logout", authenticated, (req, res) => {
    req.session.destroy(err => {
        if(err) {
            console.log(err);
        }
        else
        {
            res.clearCookie(this.cookie, { path: '/' });
            res.redirect("/login");
        }
    });
})


module.exports = router;