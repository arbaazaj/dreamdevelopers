const express = require('express');
const path = require('path');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const {v4: uuidv4} = require('uuid');

const nodemailer = require("nodemailer");
const app = express();
const port = process.env.PORT || 3000;

// Creating session
const sessions = {};

// MySQL connection
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 10,
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());

// Middleware to check if user is logged in
const requireLogin = (req, res, next) => {
    const sessionId = req.cookies && req.cookies.sessionId;
    if (sessionId || sessions[sessionId]) {
        req.user = sessions[sessionId].user;
        next();
    } else {
        res.redirect('/login');
    }
};

// Root endpoint
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Courses page endpoint
app.get('/courses', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'courses.html'));
});

// Schedule page endpoint
app.get('/schedule', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'schedule.html'));
});

// Contact page endpoint
app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});

// Login page endpoint
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Register page endpoint
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// Dashboard page endpoint
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Login post request
app.post('/login', (req, res) => {
    const {email, password} = req.body;

    pool.query('SELECT * FROM students WHERE email = ?', [email], async (error, results) => {
        if (error) {
            console.error('Error during login:', error);
            return res.send('Error logging in.');
        }
        if (results.length > 0) {
            const user = results[0];
            const passwordMatch = await bcrypt.compare(password, user.password);
            if (passwordMatch) {
                const sessionId = uuidv4();
                sessions[sessionId] = {user: {id: user.id, email: user.email}};
                res.cookies('sessionId', sessionId, {httpOnly: true});
                return res.redirect('/dashboard');
            } else {
                return res.send('Invalid username or password.');
            }
        } else {
            return res.send('Invalid credentials');
        }
    });

    if (email === 'admin@dd.dev' && password === 'password') {
        res.redirect('/dashboard');
    } else {
        res.send('Invalid username or password.');
    }
});

// Register post request
app.post('/register', (req, res) => {
    const {name, email, password, confirm_password} = req.body;
    const studentId = uuidv4();

    if (password !== confirm_password) {
        return res.status(400).send('Passwords do not match.');
    }

    try {
        const hashedPassword = bcrypt.hashSync(password, 10);
        pool.query('INSERT INTO students (id, name, email, password) VALUES (?, ?, ?, ?)', [studentId, name, email, hashedPassword], (error) => {
            if (error) {
                console.error('Error during registration:', error);
                if (error.code === 'ER_DUP_ENTRY') {
                    return res.status(400).send('Email already exists.');
                }
                return res.status(500).send('Error registering user.');
            }
            res.redirect('/login');
        });
    } catch (error) {
        console.error('Error hashing password:', error);
        res.send('Error registering user.');
    }

    res.send('Registration successful!');
    res.redirect('/dashboard');
});

// Logout route
app.get('/logout', (req, res) => {
    const sessionId = req.cookies && req.cookies.sessionId;
    if (sessionId && sessions[sessionId]) {
        delete sessions[sessionId];
        res.clearCookie('sessionId');
    }
    res.redirect('/');
});

// Send-email route for contact form
app.post('/send-email', express.urlencoded({extended: false}), (req, res) => {
    const {name, email, message} = req.body;

    // Configure nodemailer with your email service details
    const transporter = nodemailer.createTransport({
        host: 'mail.dreamdevelopers.dev',
        port: 465, // Or the appropriate port
        secure: true, // Use true if your port is 465
        auth: {
            user: process.env.EMAILID, // Your email address
            pass: process.env.EMAILPASSWORD // Your email password or app-specific password
        }
    });

    const mailOptions = {
        from: email,
        to: 'info@dreamdevelopers.dev',
        subject: `New Contact Form Submission from ${name}`,
        text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
            res.send('Error sending message.');
        } else {
            console.log('Email sent: ' + info.response);
            res.send('Message sent successfully!');
        }
    });

    res.json({message: 'Email sent successfully!'});
});

app.listen(port, () => {
    console.log(`Sever is running at http://localhost:${port}`);
});