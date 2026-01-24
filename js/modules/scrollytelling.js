/**
 * Scrollytelling Controller Module
 * Manages scroll-based narrative progression
 */

export class ScrollytellingController {
    constructor(options) {
        this.options = {
            container: '.scrollytelling',
            steps: '.scroll-step',
            sticky: '.sticky-visual',
            offset: 0.5, // Trigger point (0.5 = middle of viewport)
            onStepEnter: () => { },
            onStepExit: () => { },
            onProgress: () => { },
            ...options
        };

        this.container = document.querySelector(this.options.container);
        this.steps = document.querySelectorAll(this.options.steps);
        this.sticky = document.querySelector(this.options.sticky);
        this.currentStep = -1;
        this.observers = [];

        if (this.container && this.steps.length > 0) {
            this.init();
        }
    }

    init() {
        this.setupIntersectionObserver();
        this.setupScrollListener();
        this.setupStepIndicators();
    }

    /**
     * Setup Intersection Observer for step detection
     */
    setupIntersectionObserver() {
        const rootMargin = this.calculateRootMargin();

        const observerOptions = {
            root: null,
            rootMargin: rootMargin,
            threshold: [0, 0.25, 0.5, 0.75, 1]
        };

        this.stepObserver = new IntersectionObserver(
            this.handleIntersection.bind(this),
            observerOptions
        );

        this.steps.forEach(step => {
            this.stepObserver.observe(step);
        });
    }

    /**
     * Calculate root margin based on offset
     */
    calculateRootMargin() {
        const viewportHeight = window.innerHeight;
        const triggerPoint = viewportHeight * this.options.offset;
        const topMargin = -triggerPoint;
        const bottomMargin = -(viewportHeight - triggerPoint - 2); // Create a 2px trigger zone

        return `${topMargin}px 0px ${bottomMargin}px 0px`;
    }

    /**
     * Handle intersection events
     */
    handleIntersection(entries) {
        entries.forEach(entry => {
            const step = entry.target;
            const stepIndex = Array.from(this.steps).indexOf(step);

            if (entry.isIntersecting) {
                // Determine scroll direction
                const direction = stepIndex > this.currentStep ? 'down' : 'up';

                // Only trigger if this is a new step
                if (stepIndex !== this.currentStep) {
                    // Exit previous step
                    if (this.currentStep >= 0 && this.currentStep < this.steps.length) {
                        this.options.onStepExit(this.steps[this.currentStep], direction);
                    }

                    // Enter new step
                    this.currentStep = stepIndex;
                    this.options.onStepEnter(step, direction);

                    // Update indicators
                    this.updateStepIndicators(stepIndex);
                }
            }
        });
    }

    /**
     * Setup scroll progress listener
     */
    setupScrollListener() {
        let ticking = false;

        const handleScroll = () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    this.updateProgress();
                    ticking = false;
                });
                ticking = true;
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
    }

    /**
     * Update overall scroll progress
     */
    updateProgress() {
        if (!this.container) return;

        const rect = this.container.getBoundingClientRect();
        const containerHeight = rect.height;
        const viewportHeight = window.innerHeight;

        // Calculate progress (0 to 1)
        const scrolled = -rect.top;
        const scrollable = containerHeight - viewportHeight;
        const progress = Math.max(0, Math.min(1, scrolled / scrollable));

        this.options.onProgress(progress);
    }

    /**
     * Setup step indicator dots
     */
    setupStepIndicators() {
        // Check if indicators container exists, create if not
        let indicatorsContainer = document.querySelector('.step-indicators');

        if (!indicatorsContainer && this.steps.length > 0) {
            indicatorsContainer = document.createElement('div');
            indicatorsContainer.className = 'step-indicators';
            document.body.appendChild(indicatorsContainer);

            this.steps.forEach((step, index) => {
                const indicator = document.createElement('button');
                indicator.className = 'step-indicator';
                indicator.setAttribute('aria-label', `Go to step ${index + 1}`);
                indicator.dataset.step = index;

                indicator.addEventListener('click', () => {
                    this.scrollToStep(index);
                });

                indicatorsContainer.appendChild(indicator);
            });
        }

        this.indicators = document.querySelectorAll('.step-indicator');
    }

    /**
     * Update step indicator states
     */
    updateStepIndicators(activeIndex) {
        this.indicators.forEach((indicator, index) => {
            indicator.classList.toggle('is-active', index === activeIndex);
            indicator.classList.toggle('is-passed', index < activeIndex);
        });
    }

    /**
     * Scroll to a specific step
     */
    scrollToStep(stepIndex) {
        if (stepIndex < 0 || stepIndex >= this.steps.length) return;

        const step = this.steps[stepIndex];
        const rect = step.getBoundingClientRect();
        const targetY = window.scrollY + rect.top - (window.innerHeight * this.options.offset);

        window.scrollTo({
            top: targetY,
            behavior: 'smooth'
        });
    }

    /**
     * Go to next step
     */
    nextStep() {
        if (this.currentStep < this.steps.length - 1) {
            this.scrollToStep(this.currentStep + 1);
        }
    }

    /**
     * Go to previous step
     */
    previousStep() {
        if (this.currentStep > 0) {
            this.scrollToStep(this.currentStep - 1);
        }
    }

    /**
     * Get current step info
     */
    getCurrentStep() {
        return {
            index: this.currentStep,
            element: this.steps[this.currentStep],
            total: this.steps.length
        };
    }

    /**
     * Cleanup observers
     */
    destroy() {
        if (this.stepObserver) {
            this.stepObserver.disconnect();
        }

        // Remove indicators if we created them
        const indicatorsContainer = document.querySelector('.step-indicators');
        if (indicatorsContainer) {
            indicatorsContainer.remove();
        }
    }

    /**
     * Resize handler - recalculate margins
     */
    handleResize() {
        // Disconnect and recreate observer with new margins
        if (this.stepObserver) {
            this.stepObserver.disconnect();
            this.setupIntersectionObserver();
        }
    }
}

// Add keyboard navigation
document.addEventListener('keydown', (e) => {
    const controller = window.scrollytellingController;
    if (!controller) return;

    if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        controller.nextStep();
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        controller.previousStep();
    }
});
