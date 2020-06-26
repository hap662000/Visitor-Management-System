var express = require("express");
var app = express();
var methodOverride = require("method-override");
var bodyParser = require("body-parser");
var expressSanitizer = require("express-sanitizer");
var mongoose = require("mongoose");
var nodemailer = require('nodemailer');
var flash       = require("connect-flash");
var delay = require('delay');
var sleep = require("sleep");
var bcrypt = require('bcrypt');
const saltRounds = 10;

// for authentication
var passport              = require("passport")
var User                  = require("./models/user")
var LocalStrategy         = require("passport-local")
var passportLocalMongoose = require("passport-local-mongoose")
// App Config
app.use(flash());
app.use(methodOverride("_method"));
mongoose.connect("mongodb://localhost:27017/VMS",{useNewUrlParser:true});
app.use(expressSanitizer());
app.use(express.static("public"));
app.set("view engine","ejs");
app.use(bodyParser.urlencoded({extended:true}));

// for authentication
app.use(require("express-session")({
    secret: "My name is Harsh",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req,res,next){
	res.locals.currentUser = req.user;
	next();
})

// creating connection
var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'jamesbond.662000@gmail.com',
    pass: 'yyyyyyyyyyy'
  }
});

// Generate a Random OTP
function makeid(length) {
   var result           = '';
   var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
   var charactersLength = characters.length;
   for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return result;
}
var otpsend = makeid(5);

//Mongoose / model/config
var vmsSchema =mongoose.Schema({
	date:Date,
	name:String,
	phone:String,
	email:String,
	building:String,
	status:String,
	security_guard:String,
	gateno:String,
	username:String
});

var feedback =mongoose.Schema({
	date:Date,
	name:String,
	building:String,
	campus:String,
	staff:String,
	students:String,
	email:String,
	infrastructure:String,
	experience:String,
	comments:String,
	username:String
});

//declaration..
var feedform = mongoose.model("feedform",feedback)
var form = mongoose.model("form",vmsSchema);


// All Routes

//Home page
app.get("/",function(req,res){
	res.redirect("/home");
});

app.get("/home",function(req,res){
	res.render("home",{currentUser:req.user});// home.ejs
})

app.get("/aboutus",function(req,res){
	res.render("aboutus");
})
//Form 
app.get("/home/register",function(req,res){
	res.render("new");
});





// Auth Routes for auth only

//show sign up form
app.get("/register", function(req, res){
   res.render("register"); 
});
//handling user sign up
app.post("/register", function(req, res){
	var password = req.body.password;
	bcrypt.hash(password, saltRounds, function(err, hash) {
    // Store hash in your password DB.
    User.register(new User({username: req.body.username}), password, function(err, user){
        if(err){
            console.log(err);
            return res.render('register');
        }
        passport.authenticate("local")(req, res, function(){
           res.redirect("/login");
        });
    });
});	
});



// For logged in USer
app.get("/user",isLoggedIn,function(req,res){
	var currentUser = req.user;// 
	console.log(currentUser);
	res.render("user",{currentUser:currentUser})
})

// LOGIN ROUTES
//render login form
app.get("/login", function(req, res){
   res.render("login"); 
});
//login logic
//middleware
app.post("/login", passport.authenticate("local", {
    successRedirect: "/user",//directed to User Page
    failureRedirect: "/login"// If fails redirect back to login page
}) ,function(req, res){
	console.log("Hello");
});

// For login users


// Logut Functionality
app.get("/logout", function(req, res){
    req.logout();
    res.redirect("/");
});

function isLoggedIn(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
    res.redirect("/login");
}




// creating object
var details={
	name:String,
	date:Date,
	phone:String,
	email:String,
	building:String
}

app.post("/verification",isLoggedIn,function(req,res){
	 var date =req.body.date;// use req here because we are tking a request
	 var name = req.body.name;
	 var phone = req.body.phone;
	 var email = req.body.email;
	 var building = req.body.building;
	 var status = "waiting";
 	 var gateno = "Not Assigned Yet"
	 var security_guard = "Not Assigned Yet"
	 var currentUser = req.user;	
	
	 var url = "https://wdb-mhrms.run-ap-south1.goorm.io/verifyuser/"+currentUser.username;
	
	// passing information to the created Object	
	// Generating mail for verification
	var mailOptionsforstaff = {
  		from: 'jamesbond.662000@gmail.com',
  		to: 'hap.662000@gmail.com',
  		subject: 'Visitor Has Requested for the Pass',
  		text: "Click This link To verify User  "+url 
	};
	transporter.sendMail(mailOptionsforstaff, function(error, info){
					if (error) {
					console.log(error);
					} else {
					console.log('Email sent to Admin: ' + info.response);
					}				
					})
	
	var newForm = {date:date,name:name,email:email,phone:phone,building:building,status:status,gateno:gateno,security_guard:security_guard,username:currentUser.username};
	// campgrounds.push(newCampgrounds);
	form.create(newForm,function(err,newlyCreated){
		if(err){
			console.log("There is some error")
		}
		else{
		console.log("Succesffully Submited the FOrm")
		res.render("request");	
		}
	
})
})

app.post("/verifyuser/:id",function(req,res){
		var username = req.params.id;
		var boolean = req.body.value;
		var gateno = req.body.gateno;
		var security_guard = req.body.security_guard;
		console.log(boolean)
		// Taken from the verifpage
		if(boolean=="true"){
			var status = "Confirmed";
			console.log("status confirmed")
					// To send an EMail to user 
		form.find({"username":username},function(err,foundData){
			if(err){
				console.log(err);
			}
			else{
				var useremail = foundData[0].email;
				var url = "https://wdb-mhrms.run-ap-south1.goorm.io/gatepass/"+username;
				var urlfeedback = "https://wdb-mhrms.run-ap-south1.goorm.io/feedback/"+username;
				 var mailOptions = {
  					from: 'jamesbond.662000@gmail.com',
  					to: useremail,
  					subject: 'Mail from Node Js',
  					text: "Your Request is Been Approved Click this link TO get the gate pass  "+url
				};
				 var mailOptionsforfeeddback = {
  					from: 'jamesbond.662000@gmail.com',
  					to: useremail,
  					subject: 'Mail from Node Js',
  					text: "Please know us our Campus by filling in our feedback form. Thank you!...click this 						link.......  "+urlfeedback
				};
				
				// THis will send an email
					transporter.sendMail(mailOptions, function(error, info){
					if (error) {
					console.log(error);
					} else {
					console.log('Email sent: ' + info.response);
					}				
					});
				
					//await delay(30000);
					sleep.sleep(3);
					// Wait for 2 seconds
				
				
					transporter.sendMail(mailOptionsforfeeddback, function(error, info){
					if (error) {
					console.log(error);
					} else {
					console.log('Email sent: ' + info.response);
					}				
					})
				
				 res.send("Thank You For Your Submission. Now you can close the tab")
			}
		})
			
		}
		else{
			status = "Rejected";
			console.log("Rejected")
			
					// To send an EMail
		form.find({"username":username},function(err,foundData){
			if(err){
				console.log(err);
			}
			else{
				var useremail = foundData[0].email;
				var url = "https://wdb-mhrms.run-ap-south1.goorm.io/gatepass/"+username;
				 var mailOptions = {
  					from: 'jamesbond.662000@gmail.com',
  					to: useremail,
  					subject: 'Mail from Node Js',
  					text: "Your Request Has been Rejected.Try Again.For further details contact Personx contact 111111111"
				};
				// THis will send an email
					transporter.sendMail(mailOptions, function(error, info){
					if (error) {
					console.log(error);
					} else {
					console.log('Email sent: ' + info.response);
					}				
					})
				res.send("Thank You For Your Submission. Now you can close the tab")
			}
		})
			// To remove the User If he is rejected
				form.remove({"username":username},function(err,deleteData){
				if(err){
					console.log("error in deleting")
				}
				else{
					console.log("data Deleted..")
				}
			})
			
		}
	
		// This will update Record as per the Admin Verification
		form.findOneAndUpdate({"username":username},{status:status,gateno:gateno,security_guard:security_guard},function(err,updated){
			if(err){
				console.log(err);
			}
			else{
				console.log(updated)
			}
		})
	
	

	
		
	})

app.get("/verifyuser/:id",function(req,res){
	form.find({"username":req.params.id},function(err,foundData){
		if(err){
			console.log(err)
		}
		else{
			console.log(foundData);
			res.render("verifyuser",{foundData:foundData[0],id:req.params.id})
		}
	})
})

app.get("/gatepass/:id",function(req,res){
	form.find({"username":req.params.id},function(err,foundData){
		if(err){
			console.log(err);
		}
		else{
			console.log(foundData);
			res.render("gatepass",{foundData:foundData[0]})
		}
	})
})

//Feedback newForm
app.get("/feedback/:id",function(req,res){
	res.render("feedback",{id:req.params.id});
})

app.post("/feedback/:id",function(req,res){
	var username = req.params.id;
	var email = req.body.email;
	var name = req.body.name;
	var building = req.body.building;
	var date = req.body.date;
	var campus = req.body.campus;
	var staff = req.body.staff;
	var students = req.body.students;
	var experience = req.body.experience;
	var comments = req.body.comments;
	var infrastructure = req.body.infrastructure;
	
	var newfeedForm = {username:username,email:email,name:name,building:building,data:date,campus:campus,staff:staff,students:students,experience:experience,comments:comments,infrastructure:infrastructure}
		feedform.create(newfeedForm,function(err,newlyCreated){
		if(err){
			console.log("There is some error")
		}
		else{
			console.log(building);
		console.log("Succesffully Submited the FeedBack Form")
		res.send("Thank You For Your FeedBack");
			
			form.remove({"username":username},function(err,deleteData){
				if(err){
					console.log("error in deleting")
				}
				else{
					console.log("data Deleted..")
				}
			})
		}
	
})
})


// Routes for Admin Page

app.get("/adminpage",function(req, res){
   res.render("adminpage")
});

app.post("/adminpage",function(req,res){
	var uname = req.body.username;
	var pass = req.body.password;
	
	if(uname == "admin" && pass == "admin@123"){
		res.redirect("/details")
	}
	else{
		console.log("Wrong Username")
		res.redirect("/adminpage")
	}
})

app.get("/details",function(req,res){
	form.find({},function(err,data){
		if(err){
			console.log("Something went wrong");
			console.log(err);
		}
		else{
		    res.render("show.ejs",{data:data});
		}
	})

});

app.delete("/details/:id",function(req,res){
	form.findByIdAndRemove(req.params.id,function(err,deletedata){
		if(err){
			res.redirect("/details");
		}
		else{
			req.flash("DEtails are Wrong.")
			res.redirect("/details");
		}
	})
})


app.get("/feedbackdetails",function(req,res){
	feedform.find({},function(err,foundData){
		if(err){
			console.log("Something went wrong");
			console.log(err);
		}
		else{
		    res.render("feeddetails",{data:foundData});
		}
	})
})


// REquest Page
app.get("/requestpage",function(req,res){
	res.render("request")
})

app.listen(3000,function(){
	console.log("VMS server has started");
})
