const express = require('express');
const path = require('path');
const nodemailer = require("nodemailer");
const app = express();
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({extended: false}));

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
    // Here you would typically check the username and password against a database
    if (email === 'admin@dd.dev' && password === 'password') {
        res.redirect('/dashboard');
    } else {
        res.send('Invalid username or password.');
    }
});

// Register post request
app.post('/register', (req, res) => {
    const {username, password} = req.body;
    // Here you would typically save the new user to a database
    res.send('Registration successful!');
    res.redirect('/dashboard');
});

// Logout route
app.get('/logout', (req, res) => {
    // Here you would typically destroy the session or token
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