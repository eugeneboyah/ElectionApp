const express = require('express');
const app = express();
const path = require('path');
const bodyparser = require("body-parser");
const multer = require("multer");
const sqlite3 = require('sqlite3').verbose();

// setup multer
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


app.use(express.static(path.join(__dirname, 'public')));
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads/')));
app.use(bodyparser.urlencoded({ extended: true}));

app.set("views", path.join(__dirname, "views"));
app.set('view engine', 'ejs');

//sqlite
const db = new sqlite3.Database('./election.db')

db.serialize(() => {
  // db.run (`CREATE TABLE IF NOT EXISTS roles (id INT AUTO_INCREMENT PRIMARY KEY, 
  //   role TEXT)`)

  // db.run(`CREATE TABLE IF NOT EXISTS auth (id INT AUTO_INCREMENT PRIMARY KEY,
  //   user_name VARCHAR(50) NOT NULL,
  //   password TEXT,
  //   user_id INT AUTO_INCREMENT PRIMARY KEY)`)

  //   db.run(`CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY,
  //     first_name VARCHAR(20) NOT NULL,
  //     middle_name VARCHAR(10) NULL,
  //     last_name VARCHAR(10) NOT NULL,
  //     dob TEXT,
  //     role_id INT,
  //     photo BLOB)`)

  //     db.run(`CREATE TABLE IF NOT EXISTS parties (id INT AUTO_INCREMENT PRIMARY KEY,
  //       party TEXT NOT NULL,
  //       logo BLOB)`)
        
  //       db.run(`CREATE TABLE IF NOT EXISTS positions (id INT AUTO_INCREMENT PRIMARY KEY,
  //         positions NOT NULL)`)

  //         db.run(`CREATE TABLE IF NOT EXISTS condidates (
  //           first_name VARCHAR(20) PRIMARY KEY NOT NULL,
  //           middle_name VARCHAR(10) NULL,
  //           last_name VARCHAR(10) NOT NULL,
  //           position_id INT AUTO_INCREMENT,
  //           party_id INT AUTO_INCREMENT,
  //           photo BLOB)`)

  //           db.run(`CREATE TABLE IF NOT EXISTS votes (id INT AUTO_INCREMENT PRIMARY KEY,
  //             condidates_id INT AUTO_INCREMENT,
  //             vote TEXT NOT NULL)`)


  //             db.run(`CREATE TABLE IF NOT EXISTS voters (
  //               id INTEGER PRIMARY KEY AUTOINCREMENT,
  //               username TEXT NOT NULL,
  //               password TEXT NOT NULL,
  //               firstname TEXT NOT NULL,
  //               middlename TEXT NOT NULL,
  //               lastname TEXT NOT NULL,
  //               dob TEXT NOT NULL,
  //               photo TEXT
  //             )`);

    let users = [];
})


app.get('/login', (req, res) => {
    res.render('login.ejs');
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM auth WHERE username = ? AND password = ?', [username, password], (err, row) => {
    if (err) {
      return console.error(err.message);
    }
    if (row) {
      res.redirect('/dashboard');
    } else {
      res.send("Invalid username or password");
    }
  })
    
});


app.get('/dashboard', (req, res) => {
  db.all( `SELECT COUNT(*) FROM users WHERE role_id = 3`,(err, row)=>{
    if (err) {
      throw err;
    }
    const voters_count =row[0]["COUNT(*)"];
    console.log(voters_count);
    res.render('dashboard.ejs', {voters_count});
  })
});


app.get("/voter", (req, res) => {
  db.all(`SELECT * FROM users WHERE role_id = 3`, (err, rows) => {
    if (err) {
      throw err;
    }
    const totalvoter = rows;
    const voters_count = totalvoter.length; // Calculate the count of voters

    res.render("voter", {
      totalvoter: totalvoter,
      voters_count: voters_count, // Pass the voter count
    });
  });
});

app.get("/contestants", (req, res) => {
  db.all(`SELECT candidates.id AS candidate_id, 
                 candidates.firstname, 
                 candidates.middlename, 
                 candidates.lastname, 
                 candidates.photo, 
                 positions.position AS position_id, 
                 parties.party
          FROM candidates
          JOIN positions ON candidates.position_id = positions.id
          JOIN parties ON candidates.party_id = parties.id`, 
          (err, rows) => {
            if (err) {
              console.error("Error fetching contestants:", err.message);
              return res.status(500).send("Error fetching contestants.");
            }
            console.log("Fetched contestants:", rows); // Add this line
            const contestants = rows;
            res.render("contestants", { contestants: contestants });
          });
        });

// Route to render registration form
app.get("/register", (req, res) => {

  let roles, parties, positions;

  db.all("SELECT * FROM roles", (err, rows) => {
    if (err) {
      return res.status(500).send("Error fetching roles.");
    }
    roles = rows;

    db.all("SELECT * FROM parties", (err, rows) => {
      if (err) {
        return res.status(500).send("Error fetching parties.");
      }
      parties = rows;

      db.all("SELECT * FROM positions", (err, rows) => {
        if (err) {
          return res.status(500).send("Error fetching positions.");
        }
        positions = rows;

        res.render("register.ejs", { roles: roles, parties: parties, positions: positions });
        console.log(roles, parties, positions);
      });
    });
  });
});

app.post("/register", upload.single("photo"), (req, res) => {
  console.log(req.file);
  console.log(req.body);

  const { username, password, firstname, middlename, lastname, birthdate, roles, positions, parties } = req.body;
  const photo = req.file.buffer;

  if (parseInt(roles) === 2) {  // If the role is for a candidate
    // Insert into candidates table
    const candidateStmt = db.prepare(
      "INSERT INTO candidates(firstname, middlename, lastname, photo, party_id, position_id) VALUES(?,?,?,?,?,?)"
    );
    candidateStmt.run(firstname, middlename, lastname, photo, parties, positions, function (err) {
      if (err) {
        return console.error("Error inserting candidate:", err.message);
      }
      console.log('Candidate registration successful');
      res.redirect("/login");
    });
    candidateStmt.finalize();
  } else if (parseInt(roles) === 1) {  // If the role is for a regular user
    // Insert into users table
    const userStmt = db.prepare(
      "INSERT INTO users(firstname, middlename, lastname, dob, photo, role_id) VALUES(?,?,?,?,?,?)"
    );
    userStmt.run(firstname, middlename, lastname, birthdate, photo, roles, function (err) {
      if (err) {
        console.error("Error inserting user:", err.message);
        return res.status(500).send("Error registering user.");
      }
      
      const userId = this.lastID; // Get the last inserted ID
      console.log(`User ID: ${userId}`);

      // Insert into auth table
      const authStmt = db.prepare(
        "INSERT INTO auth(username, password, user_id) VALUES (?,?,?)"
      );
      authStmt.run(username, password, userId, function (err) {
        if (err) {
          console.error("Error inserting auth:", err.message);
          return res.status(500).send("Error saving authentication details.");
        }
        console.log('User registration successful');
        res.redirect("/login");
      });
      authStmt.finalize();
    });
    userStmt.finalize();
  } else {
    // Handle invalid roles
    res.status(400).send("Invalid role specified.");
  }
});
app.listen(3002, () => {
  console.log(`Server is listening on http://localhost:3002`);
});
