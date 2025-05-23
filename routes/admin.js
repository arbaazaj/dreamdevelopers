const express = require('express');
const router = express.Router();

// --- Admin Login Route ---

module.exports = ({pool, sessions, uuidv4, bcrypt, requireAdminLogin}) => {
    router.post('/admin/login', (req, res) => {
        const {email, password} = req.body;

        pool.query('SELECT * FROM admins WHERE email = ?', [email], async (error, results) => {
            if (error) {
                console.error('Error during admin login:', error);
                return res.status(500).json({message: 'Error logging in.'});
            }
            if (results.length > 0) {
                const admin = results[0];
                const passwordMatch = bcrypt.compareSync(password, admin.password);
                if (passwordMatch) {
                    const sessionId = uuidv4();
                    sessions[sessionId] = {adminId: admin.id, admin: {id: admin.id, email: admin.email}};
                    res.cookie('sessionId', sessionId, {httpOnly: true});
                    return res.status(200).json({message: 'Admin login successful.', redirect: '/admin/dashboard',
                        sessionId: sessionId,
                        admin: { id: admin.id, email: admin.email}
                    });
                } else {
                    return res.status(401).json({message: 'Invalid admin username or password.'});
                }
            } else {
                return res.status(401).json({message: 'Invalid admin credentials.'});
            }
        });
    });

    // --- Admin Dashboard (Example) ---
    router.get('/admin/dashboard', requireAdminLogin, (req, res) => {
        res.json({message: 'Welcome to the admin dashboard!', admin: req.admin});
        // In a real app, you might serve an HTML page here
    });

// --- Course API Endpoints for Admin (using requireAdminLogin) ---

// POST /api/courses: Add a new course
    router.post('/api/courses', requireAdminLogin, (req, res) => {
        const {title, description, logo, fees, duration, isEnabled, categories} = req.body;
        const categoriesArray = Array.isArray(categories) ? categories : (categories ? categories.split(',') : []);
        const is_enabled_db = isEnabled ? 1 : 0;

        pool.query('INSERT INTO courses (title, description, logo, fees, duration, is_enabled) VALUES (?, ?, ?, ?, ?, ?)',
            [title, description, logo, fees, duration, is_enabled_db], (error, courseResult) => {
                if (error) {
                    console.error('Error adding course:', error);
                    return res.status(500).json({message: 'Failed to add course.'});
                }
                const courseId = courseResult.insertId;
                if (categoriesArray.length > 0) {
                    const categoryValues = categoriesArray.map(catName => [courseId, catName]);
                    // Assuming you have a 'categories' table with 'id' and 'name'
                    // and a 'course_categories' table with 'course_id' and 'category_id'
                    pool.query(`
                    INSERT INTO course_categories (course_id, category_id)
                    SELECT ?, id FROM categories WHERE name IN (?)
                `, [courseId, categoriesArray], (catError) => {
                        if (catError) {
                            console.error('Error adding course categories:', catError);
                            // Consider rolling back the course insertion if category insertion fails
                            return res.status(500).json({message: 'Failed to add course categories.'});
                        }
                        pool.query('SELECT * FROM courses WHERE id = ?', [courseId], (selectError, selectResult) => {
                            if (selectError) {
                                return res.status(500).json({message: 'Failed to retrieve added course.'});
                            }
                            res.status(201).json(selectResult[0]);
                        });
                    });
                } else {
                    pool.query('SELECT * FROM courses WHERE id = ?', [courseId], (selectError, selectResult) => {
                        if (selectError) {
                            return res.status(500).json({message: 'Failed to retrieve added course.'});
                        }
                        res.status(201).json(selectResult[0]);
                    });
                }
            });
    });

// PUT /api/courses/:id: Update a course by ID
    router.put('/api/courses/:id', requireAdminLogin, (req, res) => {
        const courseId = req.params.id;
        const {title, description, logo, fees, duration, isEnabled, categories} = req.body;
        const categoriesArray = Array.isArray(categories) ? categories : (categories ? categories.split(',') : []);
        const is_enabled_db = isEnabled ? 1 : 0;

        pool.query('UPDATE courses SET title = ?, description = ?, logo = ?, fees = ?, duration = ?, is_enabled = ? WHERE id = ?',
            [title, description, logo, fees, duration, is_enabled_db, courseId], (error) => {
                if (error) {
                    console.error('Error updating course:', error);
                    return res.status(500).json({message: 'Failed to update course.'});
                }
                // Update categories (you might need to delete existing and add new)
                pool.query('DELETE FROM course_categories WHERE course_id = ?', [courseId], (deleteCatError) => {
                    if (deleteCatError) {
                        console.error('Error deleting existing course categories:', deleteCatError);
                        return res.status(500).json({message: 'Failed to update course categories.'});
                    }
                    if (categoriesArray.length > 0) {
                        pool.query(`
                        INSERT INTO course_categories (course_id, category_id)
                        SELECT ?, id FROM categories WHERE name IN (?)
                    `, [courseId, categoriesArray], (insertCatError) => {
                            if (insertCatError) {
                                console.error('Error adding new course categories:', insertCatError);
                                return res.status(500).json({message: 'Failed to update course categories.'});
                            }
                            pool.query('SELECT * FROM courses WHERE id = ?', [courseId], (selectError, selectResult) => {
                                if (selectError) {
                                    return res.status(500).json({message: 'Failed to retrieve updated course.'});
                                }
                                res.json(selectResult[0]);
                            });
                        });
                    } else {
                        pool.query('SELECT * FROM courses WHERE id = ?', [courseId], (selectError, selectResult) => {
                            if (selectError) {
                                return res.status(500).json({message: 'Failed to retrieve updated course.'});
                            }
                            res.json(selectResult[0]);
                        });
                    }
                });
            });
    });

// DELETE /api/courses/:id: Delete a course by ID
    router.delete('/api/courses/:id', requireAdminLogin, (req, res) => {
        const courseId = req.params.id;
        // Consider deleting from related tables (enrollments, course_details, course_categories)
        pool.query('DELETE FROM enrollments WHERE course_id = ?', [courseId], (err1) => {
            if (err1) console.error('Error deleting enrollments:', err1);
            pool.query('DELETE FROM course_details WHERE course_id = ?', [courseId], (err2) => {
                if (err2) console.error('Error deleting course details:', err2);
                pool.query('DELETE FROM course_categories WHERE course_id = ?', [courseId], (err3) => {
                    if (err3) console.error('Error deleting course categories:', err3);
                    pool.query('DELETE FROM courses WHERE id = ?', [courseId], (error, result) => {
                        if (error) {
                            console.error('Error deleting course:', error);
                            return res.status(500).json({message: 'Failed to delete course.'});
                        }
                        if (result.affectedRows === 0) {
                            return res.status(404).json({message: 'Course not found.'});
                        }
                        res.json({message: 'Course deleted successfully.'});
                    });
                });
            });
        });
    });
    // --- Student API Endpoints for Admin ---

// GET /api/students: Get all students
    router.get('/api/students', requireAdminLogin, (req, res) => {
        pool.query('SELECT id, name, email, phone, registration_date FROM students', (error, results) => {
            if (error) {
                console.error('Error fetching students:', error);
                return res.status(500).json({message: 'Failed to fetch students.'});
            }
            res.json(results);
        });
    });

// POST /api/students: Add a new student
    router.post('/api/students', requireAdminLogin, (req, res) => {
        const {name, email, phone} = req.body;
        const studentId = uuidv4();
        pool.query('INSERT INTO students (id, name, email, phone, registration_date) VALUES (?, ?, ?, ?, NOW())',
            [studentId, name, email, phone], (error) => {
                if (error) {
                    console.error('Error adding student:', error);
                    if (error.code === 'ER_DUP_ENTRY') {
                        return res.status(400).json({message: 'Email already exists.'});
                    }
                    return res.status(500).json({message: 'Failed to add student.'});
                }
                pool.query('SELECT id, name, email, phone, registration_date FROM students WHERE id = ?', [studentId], (selectError, selectResult) => {
                    if (selectError) {
                        return res.status(500).json({message: 'Failed to retrieve added student.'});
                    }
                    res.status(201).json(selectResult[0]);
                });
            });
    });

// PUT /api/students/:id: Update a student by ID
    router.put('/api/students/:id', requireAdminLogin, (req, res) => {
        const studentId = req.params.id;
        const {name, email, phone} = req.body;
        pool.query('UPDATE students SET name = ?, email = ?, phone = ? WHERE id = ?',
            [name, email, phone, studentId], (error, result) => {
                if (error) {
                    console.error('Error updating student:', error);
                    if (error.code === 'ER_DUP_ENTRY') {
                        return res.status(400).json({message: 'Email already exists.'});
                    }
                    return res.status(500).json({message: 'Failed to update student.'});
                }
                if (result.affectedRows === 0) {
                    return res.status(404).json({message: 'Student not found.'});
                }
                pool.query('SELECT id, name, email, phone, registration_date FROM students WHERE id = ?', [studentId], (selectError, selectResult) => {
                    if (selectError) {
                        return res.status(500).json({message: 'Failed to retrieve updated student.'});
                    }
                    res.json(selectResult[0]);
                });
            });
    });

// DELETE /api/students/:id: Delete a student by ID
    router.delete('/api/students/:id', requireAdminLogin, (req, res) => {
        const studentId = req.params.id;
        // Consider deleting related enrollments
        pool.query('DELETE FROM enrollments WHERE student_id = ?', [studentId], (err) => {
            if (err) console.error('Error deleting enrollments for student:', err);
            pool.query('DELETE FROM students WHERE id = ?', [studentId], (error, result) => {
                if (error) {
                    console.error('Error deleting student:', error);
                    return res.status(500).json({message: 'Failed to delete student.'});
                }
                if (result.affectedRows === 0) {
                    return res.status(404).json({message: 'Student not found.'});
                }
                res.json({message: 'Student deleted successfully.'});
            });
        });
    });
    // ---------End of Admin API Endpoints -----------
    return router;
}