if(process.env.NODE_ENV !="prodution"){
  require('dotenv').config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const { assert } = require("console");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const Listing = require("./models/listing.js");
const Review = require("./models/review.js");
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");
const { reviewSchema } = require("./Schema.js");
const session = require("express-session");
const MongoStore=require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const user = require("./models/user.js");
const multer  = require('multer');
const {storage}=require("./cloudeConfig.js")
const upload = multer({ storage });
const {
  isLoggedIn,
  saveRedirectUrl,
  isOwner,
  validateReview,
  isreviewAuthor,
} = require("./middleware.js");

const dburl=process.env.ATLASDB_URL;

main()
  .then(() => {
    console.log("Connected To DB");
  })
  .catch((err) => console.log(err));

async function main() {
  await mongoose.connect(dburl);
}
// mongodb://127.0.0.1:27017/wanderlust
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "/public")));



const store=MongoStore.create({
  mongoUrl: dburl,
  crypto:{
    secret: process.env.SECRET ,
  },
  touchAfter: 24*3600,
});

store.on("error",() =>{
  console.log("Error in Mongo session store",err);
});

const sessionOptions = {
  store,
  secret:process.env.SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  },
};



app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(user.authenticate()));

passport.serializeUser(user.serializeUser());
passport.deserializeUser(user.deserializeUser());

app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;
  next();
});

//Logot
app.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    req.flash("success", "You are logged out now!");
    res.redirect("/listings");
  });
});

//Signup Route

app.get("/signup", (req, res) => {
  res.render("users/signup.ejs");
});

app.post("/signup", async (req, res, next) => {
  try {
    let { username, email, password } = req.body;
    const newUser = new user({ email, username });
    const registerUser = await user.register(newUser, password);
    req.login(registerUser, (err) => {
      if (err) {
        return next(err);
      }
      req.flash("success", "Welcome to Wanderlust!");
      res.redirect("/listings");
    });
  } catch (e) {
    req.flash("error", e.message);
    res.redirect("/signup");
  }
});

// Login Route

app.get("/login", (req, res) => {
  res.render("users/login.ejs");
});

app.post(
  "/login",
  saveRedirectUrl,
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  async (req, res) => {
    req.flash("success", "Welcome back to wanderlust! ");

    let redirectUrl = res.locals.redirectUrl || "/listings";
    res.redirect(redirectUrl);
  }
);


//Index Route
app.get("/listings", async (req, res) => {
  const allListings = await Listing.find({});
  res.render("./listings/index.ejs", { allListings });
});

// New Route
app.get("/listings/new", isLoggedIn,(req, res) => {
  res.render("./listings/new.ejs");
});

//Show Route

app.get("/listings/:id", async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id)
    .populate({path :"reviews",populate :{
      path: "author",
    }})
    .populate("owner");
  if (!listing) {
    req.flash("error", "Listing you requested for doesnot exist!");
    res.redirect("/listings");
  }
  res.render("./listings/show.ejs", { listing });
});

//Creating Route
app.post("/listings", isLoggedIn 
  ,async (req, res, next) => {
  const newListing = new Listing(req.body.listing);
  newListing.owner = req.user._id;
  await newListing.save();
  req.flash("success", "New listing Created!");
  res.redirect("/listings");
});

//Edit Route
app.get("/listings/:id/edit", isLoggedIn, isOwner, async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Listing you requested for doesnot exist!");
    res.redirect("/listings");
  }
  res.render("./listings/edit.ejs", { listing });
});

//Update Route
app.put("/listings/:id", isLoggedIn, isOwner, async (req, res) => {
  let { id } = req.params;

  await Listing.findByIdAndUpdate(id, { ...req.body.listing });
  req.flash("success", "Listing Updated!");
  res.redirect(`/listings/${id}`);
});

//Delete Route
app.delete("/listings/:id", isLoggedIn, isOwner, async (req, res) => {
  let { id } = req.params;
  let deletedListing = await Listing.findByIdAndDelete(id);
  req.flash("success", "Listing Deleted!");
  res.redirect(`/listings`);
});

//Reviews
app.post(
  "/listings/:id/reviews",
  validateReview,
  isLoggedIn,
  async (req, res, next) => {
    let listing = await Listing.findById(req.params.id);
    let newReview = new Review(req.body.review);
    newReview.author = req.user._id;
    listing.reviews.push(newReview);

    await newReview.save();
    await listing.save();
    req.flash("success", "New Review Created!");
    console.log("New Review Saved");
    res.redirect(`/listings/${listing._id}`);
  }
);

//DELETE REVIEW ROUTE

app.delete("/listings/:id/reviews/:reviewId",isLoggedIn,isreviewAuthor, async (req, res, next) => {
  let { id, reviewId } = req.params;

  await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
  await Review.findByIdAndDelete(reviewId);

  req.flash("success", "Review Deleted!");
  res.redirect(`/listings/${id}`);
});

//Error route
app.use("*", (res, req, next) => {
  next(new ExpressError(404, "Page Not found!"));
});

app.use((err, req, res, next) => {
  let { stausCode = 500, message = "Some Went wrong" } = err;
  res.status(stausCode).send(message);
});

// Listening Route
app.listen(8080, () => {
  console.log("Listening port is 8080");
});
