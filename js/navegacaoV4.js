let currentStepIndex = 0;

function showTutorialStep(index) {
    const steps = document.querySelectorAll('.tutorial-step');
    const buttons = document.querySelectorAll('.button-stylist button');
    const prevBtn = buttons[0];
    const nextBtn = buttons[2];

    steps.forEach(step => step.classList.remove('active'));

    if (index >= 0 && index < steps.length) {
        steps[index].classList.add('active');
        currentStepIndex = index;
    }

    if (prevBtn && nextBtn) {
        prevBtn.classList.toggle('disabled', index === 0);
        nextBtn.classList.toggle('disabled', index === steps.length - 1);
    }
}

function nextStep() {
    const steps = document.querySelectorAll('.tutorial-step');
    if (currentStepIndex < steps.length - 1) {
        showTutorialStep(currentStepIndex + 1);
    }
}

function previousStep() {
    if (currentStepIndex > 0) {
        showTutorialStep(currentStepIndex - 1);
    }
}

function navigateTo(viewId) {
    const views = document.querySelectorAll('.view');
    views.forEach(v => v.style.display = 'none');

    const targetView = document.getElementById(viewId);
    if (targetView) targetView.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', () => {
    showTutorialStep(currentStepIndex);
});