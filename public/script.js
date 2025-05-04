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

        // Disable the submit button to prevent multiple submissions
        submitButton.disabled = true;
        submitButton.textContent = 'Sending...';

        // Basic client-side validation
        if (!nameInput.value.trim()) {
            alert('Please enter your name.');
            submitButton.disabled = false;
            submitButton.textContent = 'Send Message';
            return;
        }

        if (!emailInput.value.trim()) {
            alert('Please enter your email address.');
            submitButton.disabled = false;
            submitButton.textContent = 'Send Message';
            return;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value)) {
            alert('Please enter a valid email address.');
            submitButton.disabled = false;
            submitButton.textContent = 'Send Message';
            return;
        }

        if (!messageInput.value.trim()) {
            alert('Please enter your message.');
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
                alert(data); // Show success message from the server
                contactForm.reset(); // Clear the form
            })
            .catch(error => {
                console.error('Error sending message:', error);
                alert('Failed to send message. Please try again later.');
            })
            .finally(() => {
                // Re-enable the submit button regardless of success or failure
                submitButton.disabled = false;
                submitButton.textContent = 'Send Message';
            });
    });
}