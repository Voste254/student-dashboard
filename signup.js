const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Connect to MySQL
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "okutah6",
    database: "library"
});

db.connect(err => {
    if (err) {
        console.error("Database connection failed: " + err.message);
        return;
    }
    console.log("Connected to MySQL database");
});

// SIGNUP ROUTE
app.post("/signup", (req, res) => {
    const { full_name, email, contact, user_password } = req.body;

    if (!full_name || !email || !contact || !user_password) {
        return res.status(400).send("All fields are required");
    }

    // First, check if the email already exists
    const checkEmailSql = "SELECT * FROM accounts WHERE email = ?";
    db.query(checkEmailSql, [email], (err, result) => {
        if (err) {
            return res.status(500).send("Database error: " + err.message);
        }

        if (result.length > 0) {
            // If the email already exists, return an error
            return res.status(400).send("Email already exists");
        }

        // If the email is unique, proceed with the insertion
        const insertUserSql = "INSERT INTO accounts (full_name, email, contact, user_password) VALUES (?, ?, ?, ?)";
        db.query(insertUserSql, [full_name, email, contact, user_password], (err, result) => {
            if (err) {
                return res.status(500).send("Database error: " + err.message);
            }
            res.send("User registered successfully!");
        });
    });
});

// LOGIN ROUTE
app.post("/login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).send("All fields are required");
    }

    const sql = "SELECT * FROM accounts WHERE email = ? AND user_password = ?";
    db.query(sql, [email, password], (err, result) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).send("Internal Server Error");
        }
        if (result.length > 0) {
            res.send({ message: "Login successful", success: true });
        } else {
            res.status(401).send({ message: "Invalid email or password", success: false });
        }
    });
});
// Route to fetch user profile data
app.get("/profile/:email", (req, res) => {
    const email = req.params.email;

    const sql = "SELECT full_name, email, contact FROM accounts WHERE email = ?";
    db.query(sql, [email], (err, result) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).send("Internal Server Error");
        }
        if (result.length > 0) {
            res.json(result[0]); 
        } else {
            res.status(404).send("User not found");
        }
    });
});

// Route to fetch books by category
app.get("/books/:category", (req, res) => {
    const category = req.params.category;
    const sql = "SELECT title FROM books WHERE category = ?";
    
    db.query(sql, [category], (err, result) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).send("Internal Server Error");
        }
        res.json(result);
    });
});
//ROUTE TO ADD BOOKS TO CART
app.post("/cart/add", (req, res) => {
    const { user_id, book_id, quantity } = req.body;

    const sql = "INSERT INTO books_cart (user_id, book_id, quantity) VALUES (?, ?, ?)";
    db.query(sql, [user_id, book_id, quantity || 1], (err, result) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).send("Error adding to cart");
        }
        res.send("Book added to cart");
    });
});
//ROUTE TO FETCH BOOKS FROM THE CART
app.get("/cart/:user_id", (req, res) => {
    const user_id = req.params.user_id;

    const sql = `
        SELECT bc.cart_id, b.title, b.book_id, bc.quantity 
        FROM books_cart bc
        JOIN books b ON bc.book_id = b.book_id
        WHERE bc.user_id = ?
    `;

    db.query(sql, [user_id], (err, result) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).send("Error fetching cart");
        }
        res.json(result);
    });
});
//ROUTE TO FETCH ITEMS AND CLEAR CART
app.post("/cart/book", (req, res) => {
    const { user_id } = req.body;

    const insertBookingsSql = `
        INSERT INTO bookings (user_id, book_id, booking_date)
        SELECT user_id, book_id, NOW() FROM books_cart WHERE user_id = ?
    `;

    const clearCartSql = "DELETE FROM books_cart WHERE user_id = ?";

    db.query(insertBookingsSql, [user_id], (err, result) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).send("Error booking books");
        }

        db.query(clearCartSql, [user_id], (err, result) => {
            if (err) {
                console.error("Database error:", err);
                return res.status(500).send("Error clearing cart");
            }

            res.send("Booking successful! Cart cleared.");
        });
    });
});





// Start the server 
app.listen(3000, () => {
    console.log("Server running on port 3000");
});