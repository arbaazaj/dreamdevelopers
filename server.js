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

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.json());

// MySQL connection
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

// Function to check if user is logged in
const isLoggedIn = (req) => {
    const sessionId = req.cookies && req.cookies.sessionId;
    return !!(sessionId && sessions[sessionId]);
};

// Root endpoint
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'), { loggedIn: isLoggedIn(req) });
});

app.get('/api/user/status', (req, res) => {
    res.json({ loggedIn: isLoggedIn(req) });
});

app.get('/api/user/data', requireLogin, (req, res) => {
    const userId = req.user.id;

    pool.query(
        `SELECT
            s.name,
            e.course_id,
            c.title AS course_title,
            c.category AS course_category,
            sch.day,
            sch.time
        FROM students s
        LEFT JOIN enrollments e ON s.id = e.student_id
        LEFT JOIN courses c ON e.course_id = c.id
        LEFT JOIN schedules sch ON c.id = sch.course_id
        WHERE s.id = ?`,
        [userId],
        (error, results) => {
            if (error) {
                console.error('Error fetching user data:', error);
                return res.status(500).json({ error: 'Error fetching user data.' });
            }

            if (results.length > 0) {
                const name = results[0].name;
                let enrolledCourses = [];
                const courseMap = new Map(); // Use a Map to store courses and their schedules

                results.forEach(row => {
                    if (row.course_id) { // Check if the user is enrolled in any course
                        if (!courseMap.has(row.course_id)) {
                            courseMap.set(row.course_id, {
                                courseId: row.course_id,
                                courseTitle: row.course_title,
                                courseCategory: row.course_category,
                                schedules: []
                            });
                        }
                        // Push schedules into the array.
                        courseMap.get(row.course_id).schedules.push({ day: row.day, time: row.time });
                    }
                });

                // Convert the map to the array
                enrolledCourses = Array.from(courseMap.values());
                res.json({ name: name, enrolledCourses: enrolledCourses });
            } else {
                res.json({ name: 'Student', enrolledCourses: [] }); // Or handle this as you see fit
            }
        }
    );
});

// Courses API endpoint
app.get('/api/courses', (req, res) => {
    pool.query('SELECT id, title, description, category, logo FROM courses', (error, results) => { // Include logo
        if (error) {
            console.error('Error fetching courses:', error);
            return res.status(500).json({ message: 'Failed to fetch courses' });
        }
        res.json(results);
    });
});

// Enroll in course route
app.post('/api/enroll', requireLogin, (req, res) => {
    const { courseId } = req.body;
    const studentId = req.user.id;
    const enrollmentId = uuidv4();

    pool.query('INSERT INTO enrollments (id, student_id, course_id) VALUES (?, ?, ?)', [enrollmentId, studentId, courseId], (error) => {
        if (error) {
            console.error('Error enrolling in course:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ message: 'You are already enrolled in this course.' });
            }
            return res.status(500).json({ message: 'Failed to enroll in course.' });
        }
        res.json({ message: 'Successfully enrolled in course.' });
    });
});

app.get('/api/dashboard', requireLogin, (req, res) => {
    const studentId = req.user.id;
    const query = `
        SELECT
            c.title,
            c.description,
            e.enrollment_date
        FROM
            enrollments e
        JOIN
            courses c ON e.course_id = c.id
        WHERE
            e.student_id = ?
    `;

    pool.query(query, [studentId], (error, results) => {
        if (error) {
            console.error('Error fetching dashboard data:', error);
            return res.status(500).json({ message: 'Failed to fetch dashboard data' });
        }
        res.json(results);
    });
});


// Courses page endpoint
app.get('/courses', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'courses.html'), { loggedIn: isLoggedIn(req) });
});

// Schedule page endpoint
app.get('/schedule', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'schedule.html'), { loggedIn: isLoggedIn(req) });
});

// Contact page endpoint
app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'contact.html'), { loggedIn: isLoggedIn(req) });
});

// Login page endpoint
app.get('/login', (req, res) => {
    if (isLoggedIn(req)) {
        return res.redirect('/dashboard');
    }
    res.sendFile(path.join(__dirname, 'public', 'login.html'), { loggedIn: isLoggedIn(req) });
});

// Register page endpoint
app.get('/register', (req, res) => {
    if (isLoggedIn(req)) {
        return res.redirect('/dashboard');
    }
    res.sendFile(path.join(__dirname, 'public', 'register.html'), { loggedIn: isLoggedIn(req) });
});

// Dashboard page endpoint
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'), { loggedIn: true });
});

// Login post request
app.post('/login', (req, res) => {
    const {email, password} = req.body;

    pool.query('SELECT * FROM students WHERE email = ?', [email], async (error, results) => {
        if (error) {
            return res.status(500).json({ message: 'Error logging in.' });
        }
        if (results.length > 0) {
            const user = results[0];
            const passwordMatch = bcrypt.compareSync(password, user.password);
            if (passwordMatch) {
                const sessionId = uuidv4();
                sessions[sessionId] = {user: {id: user.id, email: user.email}};
                res.cookie('sessionId', sessionId, {httpOnly: true});
                return res.status(200).json({ message: 'Login successful.', redirect: '/dashboard' });
            } else {
                return res.status(401).json({ message: 'Invalid username or password.' });
            }
        } else {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }
    });
});

// // Register post request
app.post('/register', (req, res) => {
    const {name, email, password, confirm_password} = req.body;
    const studentId = uuidv4();

    if (password !== confirm_password) {
        return res.status(400).json({ message: 'Passwords do not match.' });
    }

    try {
        const hashedPassword = bcrypt.hashSync(password, 10);
        pool.query('INSERT INTO students (id, name, email, password) VALUES (?, ?, ?, ?)', [studentId, name, email, hashedPassword], (error) => {
            if (error) {
                console.error('Error during registration:', error);
                if (error.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ message: 'Email already exists.' });
                }
                return res.status(500).json({ message: 'Error registering user.' });
            }
            return res.status(201).json({ message: 'Registration successful.', redirect: '/login' });
        });
    } catch (error) {
        console.error('Error hashing password:', error);
        return res.status(500).json({ message: 'Error registering user.' });
    }
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
            return res.status(500).json({ message: 'Error sending message.' });
        } else {
            return res.status(200).json({ message: 'Email sent successfully!' });
        }
    });
});

app.listen(port, () => {
    console.log(`Sever is running at http://localhost:${port}`);
});