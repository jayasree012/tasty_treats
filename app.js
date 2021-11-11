//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
var session = require("express-session");
const MongoDBStore = require('connect-mongodb-session')(session);
const ejs = require("ejs");
const mongoose = require("mongoose");
var slug = require('slug');
var cookieParser = require('cookie-parser');
var flash = require('express-flash-messages');
var nodemailer = require("nodemailer");

//to send mail using nodemailer
var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'bakerytastytreats5@gmail.com',
    pass: 'tastytreats@123'
  }
});

//to get date
var today = new Date();
var optionsdate = {
  weekday: "long",
  day: "numeric",
  month: "long"
};
var day = today.toLocaleString("en-US", optionsdate);

//slugify
const slugify = require('slugify');

// Config your options
const options = {
  replacement: '%20', // replace spaces with replacement character, defaults to `-`
  remove: undefined, // remove characters that match regex, defaults to `undefined`
  lower: false, // convert to lower case, defaults to `false`
  strict: true, // strip special characters except replacement, defaults to `false`
  locale: 'en', // language code of the locale to use
};


var fs = require('fs');
var path = require('path');
require('dotenv/config');

//set app
const app = express();
app.use(express.static("public"));

app.set('view engine', 'ejs');

app.use(flash());

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.set('trust proxy', 1)
app.use(cookieParser());
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false
  }
}));

//connect mongoose
mongoose.connect("mongodb://localhost:27017/bakerydb", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

//Schemas
//category
const categorySchema = {
  title: String,
};
//login
const userSchema = {
  email: String,
  password: String
};
//users feedback details
const PostSchema = {
  email: String,
  title: String,
  content: String,
  star: String
};
//Products
const ProductSchema = new mongoose.Schema({
  name: String,
  desc: String,
  slug: String,
  price: Number,
  img: {
    data: Buffer,
    contentType: String
  }
});
//cart
const CartSchema = new mongoose.Schema({
  name: String,
  category: String,
  quantity: Number,
  price: Number,
  amount: Number,
  username: String
});
//User order details
const DetailSchema = new mongoose.Schema({
  time: String,
  userID: String,
  address: String,
  phone: String,
  cart: Object
});
//customize order schema
const CustomizeSchema = new mongoose.Schema({
  time: String,
  userID: String,
  occasion: String,
  special: String,
  flavor: String,
  type: String,
  weight: Number,
  topping: String,
  about: String
});

//defining the mode for the schemas
const Category = mongoose.model("Category", categorySchema);
const Post = mongoose.model("Post", PostSchema);
const User = new mongoose.model("User", userSchema);
const Product = mongoose.model("Product", ProductSchema);
const Cart = mongoose.model("Cart", CartSchema);
const Detail = mongoose.model("Detail", DetailSchema);
const Customize = mongoose.model("Customize", CustomizeSchema);
var user;

//to upload image
var multer = require('multer');

var storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads')
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + '-' + Date.now())
  }
});

var upload = multer({
  storage: storage
});

//home route
app.get("/", function(req, res) {
  res.render("home");
});

//login route
app.get("/userlogin", function(req, res) {
  res.render("userlogin");
});

//registration route
app.get("/userregister", function(req, res) {

  res.render("userregister");
});

//to view feedback-user
app.get("/viewfeedback", function(req, res) {
  Post.find({}, function(err, resultposts) {
    res.render("viewfeedback", {
      Posts: resultposts
    });
  })
});

//to view feedback-admin
app.get("/adminviewfeedback", function(req, res) {
  Post.find({}, function(err, resultposts) {
    res.render("adminviewfeedback", {
      Posts: resultposts
    });
  })
});

//to get feedback from the user
app.get("/feedback", function(req, res) {
  res.render("feedback", {
    userID: user
  });
});

//logout route
app.get("/logout", function(req, res) {
  res.render("/");
});

//failure route
app.get("/failure", function(req, res) {
  res.render("failure");
});

//to view categories
app.get("/categories", function(req, res) {
  Category.find(function(err, categories) {
    if (err) {
      console.log(err);
    } else {
      res.render("categories", {
        categories: categories
      });
    }
  })
});

//to add a new category
app.get("/categories/add-Category", function(req, res) {
  res.render("addcategory");
});

//to add a new item
app.get("/additems", function(req, res) {
  Category.find(function(err, categories) {
    if (err) {
      console.log(err);
    } else {
      res.render("additems", {
        categories: categories
      });
    }
  })
});

//display category wise-admin
app.get('/categories/:Objectname', (req, res) => {
  const requestedname = req.params.Objectname;
  Category.findOne({
    title: requestedname
  }, function(err, category) {
    if (!err) {
      Product.find({
        name: requestedname
      }, function(err, items) {
        if (!err) {
          res.render("adminfilter", {
            products: items,
          });
        } else {
          console.log(err);
        }
      });
    } else {
      console.log(err);
    }
  });
});

//display categorywise-user
app.get('/usercategories/:Objectname', (req, res) => {
  const requestedname = req.params.Objectname;
  Category.findOne({
    title: requestedname
  }, function(err, category) {
    if (!err) {
      Product.find({
        name: requestedname
      }, function(err, items) {
        if (!err) {
          res.render("filter", {
            userID: user,
            products: items,
          });
        } else {
          console.log(err);
        }
      });
    } else {
      console.log(err);
    }
  });
});

//to view all products-admin
app.get('/admin_allproducts', (req, res) => {
  Product.find({}, (err, items) => {
    if (err) {
      console.log(err);
      res.status(500).send('An error occurred', err);
    } else {
      res.render('admin_allproducts', {
        products: items
      });
    }
  });
});


//register
app.post("/userregister", function(req, res) {
  const newUser = new User({
    email: req.body.username,
    password: req.body.password
  });
  newUser.save(function(err) {
    if (err) {
      console.log(err);
      res.render("failure");
    } else {
      res.redirect("/userlogin");
    }
  });
});

//login
app.post("/userlogin", function(req, res) {
  var username = req.body.username;
  const password = req.body.password;
  if (username === "bakerytastytreats5@gmail.com") {
    if (password === "20112001") {
      res.redirect("/admin_allproducts");
    } else {
      res.redirect("/failure");
    }
  } else {
    User.findOne({
      email: username
    }, function(err, foundUser) {
      if (err) {
        console.log(err);
      } else {
        if (foundUser) {
          if (foundUser.password === password) {
            session = req.session;
            session.userid = req.body.username;
            req.sessionId = session.userid;
            user = session.userid;
            console.log("User ID : " + req.sessionId);
            res.redirect("/allproducts");
          } else {
            res.redirect("/failure");
          }
        } else {
          res.redirect("/failure");
        }
      }
    });
  };
});

//to view categories-user
app.get("/usercategories", function(req, res) {
  Category.find(function(err, categories) {
    if (err) {
      console.log(err);
    } else {
      res.render("usercategories", {
        userID: user,
        categories: categories
      });
    }
  })
});

//to view all products -user
app.get('/allproducts', (req, res) => {
  Product.find({}, (err, items) => {
    if (err) {
      console.log(err);
      res.status(500).send('An error occurred', err);
    } else {
      res.render('allproducts', {
        products: items,
        cart: req.session.cart,
        userID: user
      });
    }
  });
});

//failure post
app.post("/failure", function(req, res) {
  res.redirect("/");
});

//feedback post
app.post("/feedback", function(req, res) {
  const post = new Post({
    title: req.body.postTitle,
    content: req.body.postBody,
    star: req.body.star
  });
  post.save();
  res.redirect("/viewfeedback");
});

//add a new item-admin
app.post('/additems', upload.single('image'), (req, res, next) => {
  const name = req.body.name;
  var obj = {
    name: req.body.name,
    desc: req.body.desc,
    slug: slug(req.body.desc, options),
    price: req.body.price,
    img: {
      data: fs.readFileSync(path.join(__dirname + '/uploads/' + req.file.filename)),
      contentType: 'image/png'
    }
  }
  Product.create(obj, (err, item) => {
    if (err) {
      console.log(err);
    } else {
      // item.save();
      res.redirect('/admin_allproducts');
    }
  });
});

//to add a new category-admin
app.post("/categories/add-Category", function(req, res) {
  var title = req.body.category;
  const categories = new Category({
    title: req.body.category
  });
  categories.save();
  res.redirect("/categories");
});

//to delete an item
app.get('/admin_allproducts/delete/:id', function(req, res) {
  var id = req.params.id;
  Product.findByIdAndRemove(id, function(err) {
    console.log(err);
  });
  res.redirect("/admin_allproducts");
});

//customize route
app.get('/customize', (req, res) => {
  res.render("customize", {
    userID: user
  });
});

//to view customized orders-user
app.get("/viewcustomize/:object", function(req, res) {
  var usermail = req.params.object;
  Customize.find({
    userID: usermail
  }, function(err, resultCustomize) {
    res.render("viewcustomize", {
      userID: user,
      Customize: resultCustomize,
    });
  })
});

//to view all customized orders-admin
app.get("/adminviewcustomize", function(req, res) {
  Customize.find({}, function(err, resultCustomize) {
    res.render("adminviewcustomize", {
      Customize: resultCustomize,
    });
  })
});

//submit customize orders
app.post("/customize", function(req, res) {
  const customize = new Customize({
    time: day,
    userID: user,
    occasion: req.body.occasion,
    special: req.body.special,
    flavor: req.body.flavor,
    type: req.body.type,
    weight: req.body.weight,
    topping: req.body.topping,
    about: req.body.postAbout
  });
  customize.save();
  res.redirect("back");
});


app.use('*', function(req, res, next) {
  res.locals.cart = req.session.cart;
  if (req.session.cart == "undefined") {
    req.session.cart = [];
  }
  next(); // pass control to the next handler
});

//add product to the cart-user
app.get('/add/:product', function(req, res) {
  var desc = req.params.product;
  var slug = slugify(req.params.product, options);
  var mycart;
  Product.findOne({
    slug: slug
  }, function(err, p) {
    if (err)
      console.log(err);

    if (typeof req.session.cart == "undefined") {
      req.session.cart = [];
      req.session.cart.push({
        name: p.desc,
        qty: 1,
        category: p.name,
        price: parseFloat(p.price).toFixed(2),
        amount: parseFloat(p.price).toFixed(2) * 1
      });
      var temp = parseFloat(p.price).toFixed(2) * 1;

      mycart = new Cart({
        name: p.desc,
        quantity: 1,
        category: p.name,
        price: parseFloat(p.price).toFixed(2),
        amount: temp,
        username: user
      });
      mycart.save();
    } else {
      var calamt;
      var cart = req.session.cart;
      var newItem = true;
      for (var i = 0; i < cart.length; i++) {
        if (cart[i].name == desc) {
          cart[i].qty++;
          cart[i].price = parseFloat(cart[i].price).toFixed(2);
          cart[i].amount = parseFloat(cart[i].price).toFixed(2) * cart[i].qty;
          calamt = parseFloat(cart[i].price).toFixed(2) * cart[i].qty;
          newItem = false;
          break;
        }
      }

      var myquery = {
        name: desc,
        username: user
      };
      var newvalues = {
        $set: {
          amount: calamt
        },
        $inc: {
          quantity: 1
        }
      };
      Cart.updateOne(myquery, newvalues, function(err, res) {
        if (err) throw err;
        console.log("1 document updated");

      });

      if (newItem) {
        cart.push({
          name: desc,
          qty: 1,
          category: p.name,
          price: parseFloat(p.price).toFixed(2),
          amount: parseFloat(p.price).toFixed(2) * 1
        });
        var temp = parseFloat(p.price).toFixed(2) * 1;
        mycart = new Cart({
          name: p.desc,
          quantity: 1,
          category: p.name,
          price: parseFloat(p.price).toFixed(2),
          username: user,
          amount: temp
        })
        mycart.save();
      }
    }
    res.redirect('back');
  });
});

//view cart
app.get("/cart/checkout", function(req, res) {
  Cart.find({
    username: user
  }, function(err, result) {
    if (err) throw err;
    res.render('checkout', {
      cart: result,
      userID: user
    })

  });
});

//updating the cart
app.get("/cart/update/:product", function(req, res) {
  var desc = req.params.product;
  var action = req.query.action;
  switch (action) {
    case "add":
      var myquery = {
        name: desc,
        username: user
      };
      var newvalues = {
        $inc: {
          quantity: 1
        }
      };
      Cart.updateOne(myquery, newvalues, function(err, res) {
        if (err) throw err;
        console.log("1 document updated");
      });
      break;
    case "remove":
      var myquery = {
        name: desc,
        username: user,
        quantity: {
          $gt: 0
        }
      };
      var newvalues = {
        $inc: {
          quantity: -1
        }
      };
      Cart.updateOne(myquery, newvalues, function(err, res) {
        if (err) throw err;
        console.log("1 document updated");
      });
      break;
    case "clear":
      var myquery = {
        name: desc,
        username: user
      };
      Cart.deleteOne(myquery, function(err, obj) {
        if (err) throw err;
        console.log("1 document deleted");
      });
      break;
  }

  res.redirect("/cart/checkout");
});

//buy now route
app.get('/cart/buynow', function(req, res) {
  Cart.find({
    username: user
  }, function(err, result) {
    if (err) throw err;
    res.render('buynow', {
      cart: result,
      userID: user
    });
  });
});

//collect address and mobile no. of customer
app.post('/cart/buynow', function(req, res) {
  var cartdetail = "";
  var total = 0;
  var address = req.body.address;
  var phone = req.body.phone;

  Cart.find({
    username: user
  }, function(err, result) {
    if (err) throw err;
    var detail = new Detail({
      time: day,
      userID: user,
      address: address,
      phone: phone,
      cart: result
    });

    result.forEach(function(items) {
      total += items.amount;
      cartdetail += "\n\nItem Name:" + items.name + "\nQty : " + items.quantity + "\nPrice of each item: " + items.price + "\nAmount : " + items.amount;
    });
    var mailOptions = {
      from: '19z322@psgtech.ac.in',
      to: user,
      subject: "Tasty Treats - Order Confirmation",
      text: " Order Confirmed ... Thanks for ordering :)\n\nOrder Details : \nMail id :" + user + "\nDate of order placed:" + day + "\nAddress:" + address + "\nMobile Number:" + phone + " " + "\n" + cartdetail + "\n\nTotal Amount:" + total
    };
    //send mail
    transporter.sendMail(mailOptions, function(error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log('Email sent: ' + info.response);
      }
    });
    detail.save();

  });

  var myquery = {
    username: user
  };

  Cart.deleteMany(myquery, function(err, obj) {
    if (err) throw err;
    console.log("cart deleted");
  });
  res.redirect("/feedback");

});

//clear cart
app.get("/cart/clear", function(req, res) {
  var myquery = {
    username: user
  };
  Cart.deleteMany(myquery, function(err, obj) {
    if (err) throw err;
    console.log("Cart cleared");
  });
  delete req.session.cart;
  res.redirect('/cart/checkout');
});


app.get("/clearcart", function(req, res) {
  var myquery = {
    username: user
  };
  Cart.deleteMany(myquery, function(err, obj) {
    if (err) throw err;
    console.log("Cart cleared");
  });
  delete req.session.cart;
  res.render("clearcart", {
    userID: user
  })
});

//view myorders-user
app.get("/myorders/:object", function(req, res, err) {
  var usermail = req.params.object;
  Detail.find({
    userID: usermail
  }, function(err, resultdetail) {
    if (resultdetail.length == 0) {
      res.render("noorders", {
        userID: user
      });
    } else {
      res.render("myorders", {
        userID: user,
        Detail: resultdetail,
      });
    }
  });
});

//to view all orders - admin
app.get("/adminvieworders", function(req, res) {
  Detail.find({}, function(err, resultdetail) {
    res.render("adminvieworders", {
      Detail: resultdetail,
    });
  });
});

//listen to port 300
app.listen(3000, function() {
  console.log("Server is running on port 3000");
});
