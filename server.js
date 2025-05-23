require('dotenv').config();
const express = require('express');
const path = require('path');
const mysql = require('mysql');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const {v4: uuidv4} = require('uuid');
const nodemailer = require("nodemailer");

const app = express();
const port = process.env.PORT || 3000;

// Creating session
const sessions = {};

// --- Express Middleware ---
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.json());

// --- MySQL Connection Pool ---
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 10,
});

// Middleware to check if user is logged in
const requireLogin = (req, res, next) => {
    const sessionId = req.cookies && req.cookies.sessionId;
    if (sessionId && sessions && sessions[sessionId] && sessions[sessionId].user) {
        req.user = sessions[sessionId].user;
        next();
    } else {
        res.redirect('/login');
    }
};

// Middleware to check if user is admin and logged in.
const requireAdminLogin = (req, res, next) => {
    const sessionId = req.cookies && req.cookies.sessionId;
    const xSessionId = req.headers['x-session-id'];

    const currentSessionId = xSessionId || sessionId;

    if (currentSessionId && sessions && sessions[currentSessionId] && sessions[currentSessionId].adminId) {
        req.admin = sessions[currentSessionId].admin; // Store admin info
        next();
    } else {
        res.status(401).json({message: 'Admin authentication required.'}); // Or redirect to an admin login page
    }
};

// Function to check if user is logged in
const isLoggedIn = (req) => {
    const sessionId = req.cookies && req.cookies.sessionId;
    return !!(sessionId && sessions[sessionId]);
};

// Function to check if an admin is logged in
const isAdminLoggedIn = (req) => {
    const sessionId = req.cookies && req.cookies.sessionId;
    return !!(sessionId && sessions[sessionId] && sessions[sessionId].adminId);
};

// --- Import Route Files ---
// Each route file will now export a function that accepts these dependencies
const adminRoutes = require('./routes/admin')({ pool, sessions, uuidv4, bcrypt, requireAdminLogin });
const publicRoutes = require('./routes/public')({ pool, isLoggedIn, path, nodemailer });
const studentRoutes = require('./routes/student')({ pool, sessions, uuidv4, bcrypt, requireLogin, isLoggedIn, path });

// --- Use Route ---
app.use('/api', adminRoutes);
app.use('/', publicRoutes);
app.use('/', studentRoutes);

app.listen(port, () => {
    console.log(`Sever is running at http://localhost:${port}`);
});

// Export necessary modules/variables for route files.
module.exports = {
    app,
    pool,
    sessions,
    uuidv4,
    bcrypt,
    path, // Export path for res.sendFile
    port,
    nodemailer, // Export nodemailer for the public routes
    requireLogin,
    requireAdminLogin,
    isLoggedIn,
    isAdminLoggedIn
};