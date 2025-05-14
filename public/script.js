console.log("Frontend script loaded!");

// Enrollment Button (still basic)
const enrollButton = document.querySelector('#hero .enroll-button');
if (enrollButton) {
    enrollButton.addEventListener('click', () => {
        alert("Enrollment functionality coming soon!");
    });
}

// Theme Toggle Functionality
const themeToggle = document.getElementById('theme-toggle');
const body = document.body;
const sunIcon = themeToggle.querySelector('.fa-sun');
const moonIcon = document.createElement('i');
moonIcon.classList.add('fas', 'fa-moon');

const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    body.classList.add('dark-theme');
    themeToggle.innerHTML = '';
    themeToggle.appendChild(moonIcon);
}

themeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-theme');
    if (body.classList.contains('dark-theme')) {
        localStorage.setItem('theme', 'dark');
        themeToggle.innerHTML = '';
        themeToggle.appendChild(moonIcon);
    } else {
        localStorage.setItem('theme', 'light');
        themeToggle.innerHTML = '';
        themeToggle.appendChild(sunIcon);
    }
});

// Mobile Navigation Toggle
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    hamburger.classList.toggle('active');
});

// Contact Form Submission (AJAX to backend)
const contactForm = document.querySelector('.contact-form form');
if (contactForm) {
    contactForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevent default form submission

        const nameInput = document.getElementById('name');
        const emailInput = document.getElementById('email');
        const messageInput = document.getElementById('message');
        const submitButton = contactForm.querySelector('.submit-button');
        const responseMessageDiv = contactForm.querySelector('.form-response-message');

        // Clear any previous response message
        responseMessageDiv.textContent = '';
        responseMessageDiv.classList.remove('success', 'error');

        // Disable the submit button to prevent multiple submissions
        submitButton.disabled = true;
        submitButton.textContent = 'Sending...';

        // Basic client-side validation
        if (!nameInput.value.trim()) {
            responseMessageDiv.textContent = 'Please enter your name.';
            responseMessageDiv.classList.add('error');
            submitButton.disabled = false;
            submitButton.textContent = 'Send Message';
            return;
        }

        if (!emailInput.value.trim()) {
            responseMessageDiv.textContent = 'Please enter your email address.';
            responseMessageDiv.classList.add('error');
            submitButton.disabled = false;
            submitButton.textContent = 'Send Message';
            return;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value)) {
            responseMessageDiv.textContent = 'Please enter a valid email address.';
            responseMessageDiv.classList.add('error');
            submitButton.disabled = false;
            submitButton.textContent = 'Send Message';
            return;
        }

        if (!messageInput.value.trim()) {
            responseMessageDiv.textContent = 'Please enter your message.';
            responseMessageDiv.classList.add('error');
            submitButton.disabled = false;
            submitButton.textContent = 'Send Message';
            return;
        }

        fetch('/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `name=${encodeURIComponent(nameInput.value)}&email=${encodeURIComponent(emailInput.value)}&message=${encodeURIComponent(messageInput.value)}`,
        })
            .then(response => {
                if (!response.ok) {
                    // Handle HTTP errors (e.g., 500 Internal Server Error)
                    return response.text().then(errorMessage => {
                        throw new Error(`Server error: ${response.status} - ${errorMessage}`);
                    });
                }
                return response.text();
            })
            .then(data => {
                // Show success message from the server
                if (data && data.message) {
                    responseMessageDiv.textContent = data.message; // Display success message
                    responseMessageDiv.classList.add('success');
                    contactForm.reset(); // Clear the form
                } else {
                    responseMessageDiv.textContent = 'Message sent successfully!'; // Fallback message
                    responseMessageDiv.classList.add('success');
                    contactForm.reset(); // Clear the form
                    console.warn('Unexpected server response:', data);
                }
            })
            .catch(error => {
                console.error('Error sending message:', error);
                responseMessageDiv.textContent = 'Failed to send message. Please try again later.';
                responseMessageDiv.classList.add('error');
            })
            .finally(() => {
                // Re-enable the submit button regardless of success or failure
                submitButton.disabled = false;
                submitButton.textContent = 'Send Message';
            });
    });
}

// Function to handle login form submission
const loginForm = document.querySelector('#login .auth-form form');
if (loginForm) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('form-response-message');
    loginForm.insertBefore(messageDiv, loginForm.querySelector('.submit-button').nextSibling);

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const submitButton = loginForm.querySelector('.submit-button');

        messageDiv.textContent = '';
        messageDiv.classList.remove('success', 'error');
        submitButton.disabled = true;
        submitButton.textContent = 'Logging In...';

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `email=${encodeURIComponent(emailInput.value)}&password=${encodeURIComponent(passwordInput.value)}`,
            });

            const data = await response.json();
            console.log('Login response:', data); // Log the response for debugging

            if (response.ok) {
                messageDiv.textContent = data.message;
                messageDiv.classList.add('success');
                if (data.redirect) {
                    window.location.href = data.redirect; // Redirect on successful login
                }
            } else {
                messageDiv.textContent = data.message;
                messageDiv.classList.add('error');
            }
        } catch (error) {
            console.log('Login error:', error); // Log the error for debugging
            messageDiv.textContent = 'Login failed. Please try again later.';
            messageDiv.classList.add('error');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Login';
        }
    });
}

// Function to handle registration form submission
const registrationForm = document.querySelector('#register .auth-form form');
if (registrationForm) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('form-response-message');
    registrationForm.insertBefore(messageDiv, registrationForm.querySelector('.submit-button').nextSibling);

    registrationForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const nameInput = document.getElementById('name');
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const confirmPasswordInput = document.getElementById('confirm_password');
        const submitButton = registrationForm.querySelector('.submit-button');

        messageDiv.textContent = '';
        messageDiv.classList.remove('success', 'error');
        submitButton.disabled = true;
        submitButton.textContent = 'Registering...';

        if (passwordInput.value !== confirmPasswordInput.value) {
            messageDiv.textContent = 'Passwords do not match.';
            messageDiv.classList.add('error');
            submitButton.disabled = false;
            submitButton.textContent = 'Register';
            return;
        }

        try {
            const response = await fetch('/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `name=${encodeURIComponent(nameInput.value)}&email=${encodeURIComponent(emailInput.value)}&password=${encodeURIComponent(passwordInput.value)}&confirm_password=${encodeURIComponent(confirmPasswordInput.value)}`,
            });

            const data = await response.json();

            if (response.ok) {
                messageDiv.textContent = data.message;
                messageDiv.classList.add('success');
                if (data.redirect) {
                    setTimeout(() => {
                        window.location.href = data.redirect; // Redirect after a short delay
                    }, 1500);
                }
            } else {
                messageDiv.textContent = data.message;
                messageDiv.classList.add('error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            messageDiv.textContent = 'Registration failed. Please try again later.';
            messageDiv.classList.add('error');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Register';
        }
    });
}