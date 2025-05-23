const express = require('express');
const router = express.Router();

// Root endpoint
module.exports = ({pool, isLoggedIn, path, nodemailer}) => {
    router.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'public', 'index.html'), {loggedIn: isLoggedIn(req)});
    });

    router.get('/api/user/status', (req, res) => {
        res.json({loggedIn: isLoggedIn(req)});
    });

// --- Public Course API Endpoint (no admin login required) ---
// Courses API endpoint
    router.get('/api/courses', (req, res) => {
        const selectedCategories = req.query.categories ? req.query.categories.split(',') : [];
        let query = `
        SELECT
            c.id,
            c.title,
            c.description,
            c.logo,
            c.fees,
            c.duration,
            c.is_enabled, -- Include the is_enabled column
            GROUP_CONCAT(cat.name SEPARATOR ',') AS categories
        FROM
            courses c
        LEFT JOIN
            course_categories cc ON c.id = cc.course_id
        LEFT JOIN
            categories cat ON cc.category_id = cat.id
    `;
        const queryParams = [];

        if (selectedCategories.length > 0) {
            query += ` WHERE c.id IN (
            SELECT course_id
            FROM course_categories cc_filter
            JOIN categories cat_filter ON cc_filter.category_id = cat_filter.id
            WHERE cat_filter.name IN (?)
            GROUP BY course_id
            HAVING COUNT(DISTINCT cat_filter.name) = ?
        )`;
            queryParams.push(selectedCategories);
            queryParams.push(selectedCategories.length);
        }

        query += ` GROUP BY c.id, c.title, c.description, c.logo, c.fees, c.duration, c.is_enabled`; // Include is_enabled in GROUP BY

        pool.query(query, queryParams, (error, results) => {
            if (error) {
                console.error('Error fetching courses with categories and details:', error);
                return res.status(500).json({message: 'Failed to fetch courses'});
            }
            res.json(results.map(course => ({
                ...course,
                categories: course.categories ? course.categories.split(',') : []
            })));
        });
    });

// Course details API endpoint
    router.get('/api/course-details/:courseId', (req, res) => {
        const courseId = req.params.courseId;
        const query = `
        SELECT
            c.*,
            cd.*,
            c.is_enabled, -- Include the is_enabled column
            GROUP_CONCAT(cat.name SEPARATOR ',') AS categories
        FROM
            courses c
        LEFT JOIN
            course_details cd ON c.id = cd.course_id
        JOIN
            course_categories cc ON c.id = cc.course_id
        JOIN
            categories cat ON cc.category_id = cat.id
        WHERE
            c.id = ?
        GROUP BY
            c.id, c.title, c.description, c.logo, c.fees, c.duration, c.is_enabled,
            cd.instructor, cd.syllabus, cd.duration_weeks, cd.schedule_full,
            cd.prerequisites, cd.learning_outcomes, cd.assessment_methods;
    `;

        pool.query(query, [courseId], (error, results) => {
            if (error) {
                console.error('Error fetching course details:', error);
                return res.status(500).json({message: 'Failed to fetch course details'});
            }
            if (results.length === 0) {
                return res.status(404).json({message: 'Course not found'});
            }
            res.json({...results[0], categories: results[0].categories ? results[0].categories.split(',') : []});
        });
    });

// Courses page endpoint
    router.get('/courses', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'public', 'courses.html'), {loggedIn: isLoggedIn(req)});
    });

// Course details page endpoint
    router.get('/course-details/:courseId', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'public', 'course-details.html')); // Serve the correct file
    });

// Schedule page endpoint
    router.get('/schedule', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'public', 'schedule.html'), {loggedIn: isLoggedIn(req)});
    });

// Contact page endpoint
    router.get('/contact', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'public', 'contact.html'), {loggedIn: isLoggedIn(req)});
    });

// Send-email route for contact form
    router.post('/send-email', express.urlencoded({extended: false}), (req, res) => {
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
                return res.status(500).json({message: 'Error sending message.'});
            } else {
                return res.status(200).json({message: 'Email sent successfully!'});
            }
        });
    });
    return router;
}