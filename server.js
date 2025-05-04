const express = require('express');
const path = require('path');
const nodemailer = require("nodemailer");
const app = express();
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

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

// Send-email route for contact form
app.post('/send-email', express.urlencoded({ extended: false}), (req, res) => {
    const { name, email, message } = req.body;

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

    res.json({ message: 'Email sent successfully!' });
});

app.listen(port, () => {
    console.log(`Sever is running at http://localhost:${port}`);
});