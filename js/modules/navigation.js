/**
 * Navigation Module
 * Header behavior, mobile menu, smooth scrolling
 */

export function setupNavigation() {
    const header = document.querySelector('.site-header');
    const navToggle = document.querySelector('.nav-toggle');
    const mainNav = document.querySelector('.main-nav');
    const navLinks = document.querySelectorAll('.nav-list a');
    
    let lastScrollY = 0;
    let isScrollingDown = false;
    
    // Header scroll behavior
    function handleScroll() {
        const currentScrollY = window.scrollY;
        
        // Add scrolled class for styling
        if (currentScrollY > 50) {
            header.classList.add('is-scrolled');
        } else {
            header.classList.remove('is-scrolled');
        }
        
        // Hide/show header on scroll
        if (currentScrollY > lastScrollY && currentScrollY > 100) {
            // Scrolling down
            if (!isScrollingDown) {
                isScrollingDown = true;
                header.classList.add('is-hidden');
            }
        } else {
            // Scrolling up
            if (isScrollingDown) {
                isScrollingDown = false;
                header.classList.remove('is-hidden');
            }
        }
        
        lastScrollY = currentScrollY;
    }
    
    // Mobile menu toggle
    function toggleMobileMenu() {
        const isOpen = mainNav.classList.toggle('is-open');
        navToggle.classList.toggle('is-active');
        navToggle.setAttribute('aria-expanded', isOpen);
        
        // Prevent body scroll when menu is open
        document.body.style.overflow = isOpen ? 'hidden' : '';
    }
    
    // Close mobile menu
    function closeMobileMenu() {
        mainNav.classList.remove('is-open');
        navToggle.classList.remove('is-active');
        navToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
    }
    
    // Smooth scroll to section
    function smoothScrollTo(target) {
        const element = document.querySelector(target);
        if (!element) return;
        
        const headerHeight = header.offsetHeight;
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.scrollY - headerHeight;
        
        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }
    
    // Event listeners
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    if (navToggle) {
        navToggle.addEventListener('click', toggleMobileMenu);
    }
    
    // Handle nav link clicks
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            
            // Check if it's an internal link
            if (href.startsWith('#')) {
                e.preventDefault();
                closeMobileMenu();
                smoothScrollTo(href);
                
                // Update URL without triggering scroll
                history.pushState(null, '', href);
            }
        });
    });
    
    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && mainNav.classList.contains('is-open')) {
            closeMobileMenu();
        }
    });
    
    // Close menu on click outside
    document.addEventListener('click', (e) => {
        if (mainNav.classList.contains('is-open') &&
            !mainNav.contains(e.target) &&
            !navToggle.contains(e.target)) {
            closeMobileMenu();
        }
    });
    
    // Handle initial hash in URL
    if (window.location.hash) {
        setTimeout(() => {
            smoothScrollTo(window.location.hash);
        }, 100);
    }
    
    // Highlight current section in nav
    function updateActiveNavLink() {
        const sections = document.querySelectorAll('section[id]');
        const scrollPosition = window.scrollY + header.offsetHeight + 100;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');
            
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                navLinks.forEach(link => {
                    link.classList.remove('is-active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('is-active');
                    }
                });
            }
        });
    }
    
    window.addEventListener('scroll', updateActiveNavLink, { passive: true });
}

/**
 * Setup scroll progress bar
 */
export function setupScrollProgress() {
    // Create progress bar if it doesn't exist
    let progressBar = document.querySelector('.scroll-progress-bar');
    if (!progressBar) {
        const progressContainer = document.createElement('div');
        progressContainer.className = 'scroll-progress';
        progressBar = document.createElement('div');
        progressBar.className = 'scroll-progress-bar';
        progressContainer.appendChild(progressBar);
        document.body.appendChild(progressContainer);
    }
    
    function updateProgress() {
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPosition = window.scrollY;
        const progress = (scrollPosition / scrollHeight) * 100;
        
        progressBar.style.width = `${progress}%`;
    }
    
    window.addEventListener('scroll', updateProgress, { passive: true });
}
