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