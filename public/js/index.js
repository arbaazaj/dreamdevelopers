const carousel = document.getElementById('testimonials-carousel');
const wrapper = carousel.querySelector('.testimonial-wrapper');
const slides = carousel.querySelectorAll('.testimonial-slide');
const prevBtn = carousel.querySelector('#prevBtn');
const nextBtn = carousel.querySelector('#nextBtn');
const indicatorsContainer = carousel.querySelector('.carousel-indicators');
const indicatorButtons = indicatorsContainer.querySelectorAll('.indicator-btn');

let currentIndex = 0;

function updateCarousel() {
    const slideWidth = slides[0].offsetWidth;
    wrapper.style.transform = `translateX(-${currentIndex * slideWidth}px)`;

    // Update active indicator
    indicatorButtons.forEach(btn => btn.classList.remove('active'));
    indicatorButtons[currentIndex].classList.add('active');
}

function goToSlide(index) {
    if (index >= slides.length) {
        currentIndex = 0;
    } else if (index < 0) {
        currentIndex = slides.length - 1;
    } else {
        currentIndex = index;
    }
    updateCarousel();
}

nextBtn.addEventListener('click', () => {
    goToSlide(currentIndex + 1);
});

prevBtn.addEventListener('click', () => {
    goToSlide(currentIndex - 1);
});

indicatorButtons.forEach((button, index) => {
    button.addEventListener('click', () => {
        goToSlide(index);
    });
});

// Optional: Basic auto-play functionality
let autoPlayInterval = setInterval(() => {
    goToSlide(currentIndex + 1);
}, 5000); // Change slide every 5 seconds

carousel.addEventListener('mouseenter', () => {
    clearInterval(autoPlayInterval); // Pause on hover
});

carousel.addEventListener('mouseleave', () => {
    autoPlayInterval = setInterval(() => {
        goToSlide(currentIndex + 1);
    }, 5000); // Resume on mouse leave
});

updateCarousel(); // Initialize carousel