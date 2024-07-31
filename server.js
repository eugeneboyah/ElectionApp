const express = require('express');
const app = express();
const path = require('path');
const bodyparser = require("body-parser");
const sqlite3 = require('sqlite3').verbose();

app.use(express.static(path.join(__dirname, 'public')));
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
    res.render('dashboard.ejs');
});

// Route to render voters registration form
app.get("/voters", (req, res)=>{
  db.all("SELECT * FROM roles",function(err,row){
  res.render("voters.ejs",{row})

  })
});
app.post("/voters", (req, res) => {
  console.log(req.body); // Ensure req.body is populated correctly
  const { username, password, firstname, middlename, lastname, birthdate, photo } = req.body;
  db.run(
      "INSERT INTO users(firstname, middlename, lastname, dob, photo) VALUES(?,?,?,?,?)",
      [ firstname, middlename, lastname, birthdate, photo ],
      function(err) {
          if (err) {
              return console.error(err.message); // Corrected console.error

          }
           else{
            db.run(
              "INSERT INTO auth(username,password,user_id) VALUES (?,?,?)",
              [username,password, this.lastID] )

              res.redirect("/login")
          }


          console.log(`A row has been inserted with ID ${this.lastID}`);
          
      }
  );
});




app.listen(3002, () => {
    console.log(`Server is listening on port http://localhost:3002`);
});
