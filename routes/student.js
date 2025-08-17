const express = require('express');
const router = express.Router();


module.exports = ({pool, sessions, uuidv4, bcrypt, requireLogin, isLoggedIn, path}) => {
    // Login page endpoint
    router.get('/login', (req, res) => {
        if (isLoggedIn(req)) {
            return res.redirect('/dashboard');
        }
        res.sendFile(path.join(__dirname, '..', 'public', 'login.html'), {loggedIn: isLoggedIn(req)});
    });

// Register page endpoint
    router.get('/register', (req, res) => {
        if (isLoggedIn(req)) {
            return res.redirect('/dashboard');
        }
        res.sendFile(path.join(__dirname, '..', 'public', 'register.html'), {loggedIn: isLoggedIn(req)});
    });

// Dashboard page endpoint
    router.get('/dashboard', requireLogin, (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'), {loggedIn: true});
    });

// Login post request
    router.post('/login', (req, res) => {
        const {email, password} = req.body;

        pool.query('SELECT * FROM students WHERE email = ?', [email], async (error, results) => {
            if (error) {
                return res.status(500).json({message: 'Error logging in.'});
            }
            if (results.length > 0) {
                const user = results[0];
                const passwordMatch = bcrypt.compareSync(password, user.password);
                if (passwordMatch) {
                    const sessionId = uuidv4();
                    sessions[sessionId] = {user: {id: user.id, email: user.email, name: user.name}};
                    // Set the session cookie for web browser
                    res.cookie('sessionId', sessionId, {httpOnly: true, maxAge: 24 * 60 * 60 * 1000}); // 1 day expiration
                    // Send the sessionId in json format for mobile app.
                    return res.status(200).json({ message: 'Login successful.', redirect: '/dashboard', sessionId: sessionId, user: { id: user.id, email: user.email, name: user.name } });
                } else {
                    return res.status(401).json({message: 'Invalid username or password.'});
                }
            } else {
                return res.status(401).json({message: 'Invalid credentials.'});
            }
        });
    });

// // Register post request
    router.post('/register', (req, res) => {
        const {name, email, password, confirm_password} = req.body;
        const studentId = uuidv4();

        if (password !== confirm_password) {
            return res.status(400).json({message: 'Passwords do not match.'});
        }

        try {
            const hashedPassword = bcrypt.hashSync(password, 10);
            pool.query('INSERT INTO students (id, name, email, password) VALUES (?, ?, ?, ?)', [studentId, name, email, hashedPassword], (error) => {
                if (error) {
                    console.error('Error during registration:', error);
                    if (error.code === 'ER_DUP_ENTRY') {
                        return res.status(400).json({message: 'Email already exists.'});
                    }
                    return res.status(500).json({message: 'Error registering user.'});
                }
                return res.status(201).json({message: 'Registration successful.', redirect: '/login'});
            });
        } catch (error) {
            console.error('Error hashing password:', error);
            return res.status(500).json({message: 'Error registering user.'});
        }
    });

// Logout route
    router.get('/logout', (req, res) => {
        const sessionId = req.cookies && req.cookies.sessionId;
        if (sessionId && sessions[sessionId]) {
            delete sessions[sessionId];
            res.clearCookie('sessionId');
        }
        res.redirect('/');
    });

    // User data API endpoint to fetch enrolled courses and schedules.
    router.get('/api/user/data', requireLogin, (req, res) => {
        const studentId = req.user.id;
        const studentName = req.user.name;
        const query = `
        SELECT
            s.name,
            e.course_id,
            c.title AS course_title,
            sch.day,
            sch.time
        FROM students s
        LEFT JOIN enrollments e ON s.id = e.student_id
        LEFT JOIN courses c ON e.course_id = c.id
        LEFT JOIN schedules sch ON c.id = sch.course_id
        WHERE s.id = ?
    `;

        pool.query(query, [studentId], (error, results) => {
            if (error) {
                console.error('Error fetching user data:', error);
                return res.status(500).json({message: 'Failed to fetch user data'});
            }

            const enrolledCourses = [];
            const coursesMap = new Map();

            results.forEach(row => {
                if (row.course_id) {
                    if (!coursesMap.has(row.course_id)) {
                        coursesMap.set(row.course_id, {
                            courseTitle: row.course_title,
                            schedules: []
                        });
                        enrolledCourses.push(coursesMap.get(row.course_id));
                    }
                    if (row.day && row.time) {
                        coursesMap.get(row.course_id).schedules.push({day: row.day, time: row.time});
                    }
                }
            });

            res.json({name: results[0]?.name, enrolledCourses});
        });
        res.json({name: studentName});
    });

    // Dashboard API endpoint to fetch courses with schedules.
    router.get('/api/dashboard', requireLogin, (req, res) => {
        const studentId = req.user.id;
        const query = `
        SELECT
            c.id AS course_id,
            c.title,
            c.description,
            e.enrollment_date,
            GROUP_CONCAT(CONCAT(s.day, ' at ', s.time) SEPARATOR ', ') AS schedules
        FROM
            enrollments e
        JOIN
            courses c ON e.course_id = c.id
        LEFT JOIN
            schedules s ON c.id = s.course_id
        WHERE
            e.student_id = ?
        GROUP BY
            c.id, c.title, c.description, e.enrollment_date
    `;

        pool.query(query, [studentId], (error, results) => {
            if (error) {
                console.error('Error fetching dashboard data with schedules:', error);
                return res.status(500).json({message: 'Failed to fetch dashboard data'});
            }
            res.json(results.map(course => ({
                ...course,
                schedules: course.schedules ? course.schedules.split(', ') : []
            })));
        });
    });

    // Enroll API endpoint
    router.post('/api/enroll', requireLogin, (req, res) => {
        const {courseId} = req.body;
        const studentId = req.user.id;
        const enrollmentId = uuidv4();

        pool.query('INSERT INTO enrollments (id, student_id, course_id) VALUES (?, ?, ?)', [enrollmentId, studentId, courseId], (error) => {
            if (error) {
                console.error('Error enrolling in course:', error);
                if (error.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({message: 'You are already enrolled in this course.'});
                }
                return res.status(500).json({message: 'Failed to enroll in course.'});
            }
            res.json({message: 'Successfully enrolled in course.'});
        });
    });
    return router;
}