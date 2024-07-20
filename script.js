
import express from "express"; 
import morgan from "morgan";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import { dirname } from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { render } from "ejs";
import env from "dotenv";
import axios from "axios";




const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express(); 
env.config();
const port = 3000;
const saltRounds = 10;

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();


//Javascript js


app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan("tiny")); 

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie:{
    maxAge: 1000 * 60 * 60 * 24,
  }
})
);

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(
  async function verify(username, password, done) {
    try {
      console.log("Passport.use authenticating user: ", username, password)
      const result = await db.query("SELECT * FROM users WHERE uname = $1", [username]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedHashedPassword = user.password;
        
        bcrypt.compare(password, storedHashedPassword, (err, valid) => {
          if (err) {
            return done(err);
          }
          if (valid) {
            console.log("Password is valid");
            return done(null, user);
          } else {
            console.log("Password is invalid");
            return done(null, false, { message: "Incorrect username or password." });
          }
        });
      } else {
        console.log("User not found");
        return done(null, false, { message: "User not found." });
      }
    } catch (err) {
      return done(err);
    }
  }
));

passport.serializeUser((user, cb) => {
  cb(null, user.id);
});
passport.deserializeUser(async (id, cb) => {
  try {
    const result = await db.query("SELECT * FROM users WHERE id = $1", [id]);
    if (result.rows.length > 0) {
      cb(null, result.rows[0]); // Fetch and return the full user object
    } else {
      cb(new Error("User not found"));
    }
  } catch (err) {
    cb(err);
  }
});

app.get("/", (req, res) => {
  res.render("index.ejs");
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.get("/loveislandui", (req, res) => {
  res.render("loveislandui.ejs");
});

app.get("/quiz", async (req, res) => {
  try{
    const request = await axios.get('https://api.truthordarebot.xyz/api/wyr?rating=PG13')
    const response = request.data;
    res.render("quiz.ejs", {data: response});
    console.log(response);

  }catch(error){
    console.log("failed to call truthordare api: ", error.message);
    res.render("login.ejs");
  }
});
app.get("/paranoiaquiz", async (req, res) => {
  try{

    // Fetch players from the database
    const playersResult = await db.query("SELECT * FROM users");
    const players = playersResult.rows;

    // Shuffle the players array and pick 4 random players
    const shuffledPlayers = players.sort(() => 0.5 - Math.random());
    const selectedPlayers = shuffledPlayers.slice(0, 4);


    const request = await axios.get('https://api.truthordarebot.xyz/api/paranoia?rating=PG13')
    const response = request.data;
    
    res.render("paranoiaquiz.ejs", {data: response, players: selectedPlayers});
    console.log(response);
    console.log(selectedPlayers);

  }catch(error){
    console.log("failed to call truthordare paranoia api: ", error.message);
    res.render("login.ejs");
  }
});


app.get("/news", async (req, res) => {
  try{
    console.log("App has reached the news page.")
    const request = await axios.get(`https://newsapi.org/v2/everything?q=bitcoin&apiKey=${process.env.API_KEY}`);
    const response = request.data;
    res.render("news.ejs", {data: response });
    console.log( response)
  } catch(error){
    console.error("Failed to make request:", error.message);
    res.render("index.ejs", {
      error: error.message,
    });
  }
 
});

app.get("/userprofile", (req, res) => {
  console.log("Checking if user is authenticated:", req.isAuthenticated());
  if (req.isAuthenticated()) {
    res.render("userprofile.ejs");
  } else {
    res.redirect("/login");
  }
});
app.get("/games", (req, res) => {
  console.log("Checking if user is authenticated:", req.isAuthenticated());
  if (req.isAuthenticated()) {
    res.render("games.ejs");
  } else {
    res.redirect("/login");
  }
});

// app.get("/news", (req, res) => {
//   console.log("Checking if user is authenticated:", req.isAuthenticated());
//   if (req.isAuthenticated()) {
//     res.render("news.ejs");
//   } else {
//     res.redirect("/login");
//   }
// });

app.post("/submit", async (req, res) => {
  const { email, username, password } = req.body;

  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1 OR uname = $2", [email, username]);

    if (checkResult.rows.length > 0) {
      return res.status(400).send("Email or username already exists.");
    } else {
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.log("Error hashing password.");
          return res.status(500).send("Error hashing password.");
        }
        else{
          await db.query("INSERT INTO users (email, uname, password) VALUES ($1, $2, $3) RETURNING *", [email, username, hash]);
          
          const user = checkResult.rows[0];
          req.login(user,(err) => {
            console.log(err)
            res.redirect("/userprofile")
          })
        }
      
      });
    }
  } catch (err) {
    console.log(err);
    res.status(500).send("Error accessing the database.");
  }
});

app.post("/check", passport.authenticate("local", {
  successRedirect: "/games",
  failureRedirect: "/login",
})
);

// app.post("/check", (req, res, next) => {
//   console.log("Authenticating user:", req.body.username, req.body.password);
//   passport.authenticate('local', (err, user, info) => {
//     if (err) {
//       console.log("Authentication error:", err);
//       return next(err);
//     }
//     if (!user) {
//       console.log("Authentication failed:", info.message);
//       return res.redirect("/login");
//     }
//     req.logIn(user, (err) => {
//       if (err) {
//         console.log("Login error:", err);
//         return next(err);
//       }
//       console.log("User authenticated:", user);
//       return res.redirect("/userprofile");
//     });
//   })(req, res, next);
// });

app.get("/account", (req, res) => {
  res.render("account.ejs");
});





// quizz api


app.listen(port, () => {
  console.log(`Server running on port ${port}.`);
});
