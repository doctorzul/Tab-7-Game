document.addEventListener("DOMContentLoaded", () => {
    const sticksContainer = document.getElementById("sticks");
    const throwBtn = document.getElementById("throwBtn");
    const skipTurnButton = document.getElementById("resetBtn"); // still using old id in HTML
    const clearCountEl = document.getElementById("clearCount");
    const valueEl = document.getElementById("value");
    const repeatInfoEl = document.getElementById("repeatInfo");

    const config = {
        totalSticks: 4,
        mapping: {
            0: 6,
            1: 1,
            2: 2,
            3: 3,
            4: 4
        },
        repeatOn: [4, 6]
    };

    window.currentRoll = null;
    window.currentDiceRoll = null;
    // expose sticksMoved so other modules can reset dice state when turn changes
    window.sticksMoved = true;

    // --- Throw dice/sticks ---
    function throwSticks() {
        if (!window.sticksMoved && repeatInfoEl.textContent === "Não") return;

        window.sticksMoved = false;

        let sticks = sticksContainer.querySelectorAll(".stick");

        if (sticks.length === 0) {
            for (let i = 0; i < config.totalSticks; i++) {
                const stick = document.createElement("div");
                stick.classList.add("stick");
                sticksContainer.appendChild(stick);
            }
            sticks = sticksContainer.querySelectorAll(".stick");
        }

        let clearCount = 0;

        sticks.forEach(stick => {
            const isClear = Math.random() < 0.5;
            stick.className = "stick " + (isClear ? "light" : "dark");

            stick.classList.add("throw");
            setTimeout(() => stick.classList.remove("throw"), 300);

            stick.style.visibility = "visible";
            if (isClear) clearCount++;
        });

        const mappedValue = config.mapping[clearCount];
        clearCountEl.textContent = clearCount;
        valueEl.textContent = mappedValue;

        const canRepeat = config.repeatOn.includes(mappedValue);
        repeatInfoEl.textContent = canRepeat ? "Sim" : "Não";

        throwBtn.textContent = canRepeat ? "Lançar Novamente" : "Lançar Dado";
        throwBtn.disabled = !canRepeat && !window.sticksMoved;
        throwBtn.classList.toggle("disabled", throwBtn.disabled);

        // Update dice values globally
        window.currentRoll = mappedValue;
        window.currentDiceRoll = mappedValue;
    }

    // --- Reset/skip turn ---
    function skipTurn() {
        // Reset the dice like a fresh start
        const sticks = sticksContainer.querySelectorAll(".stick");
        sticks.forEach(stick => {
            stick.classList.remove("light", "dark");
            stick.style.visibility = "hidden";
        });

        clearCountEl.textContent = "";
        valueEl.textContent = "";
        repeatInfoEl.textContent = "";

        window.currentRoll = null;
        window.currentDiceRoll = null;
        window.sticksMoved = true;

        throwBtn.textContent = "Lançar Dado";
        throwBtn.disabled = false;
        throwBtn.classList.remove("disabled");

        // Advance turn
        currentTurn = enemyColor(currentTurn);
        startTurn(); // from previous turn-handling logic

        // If next turn is AI, execute immediately
        const aiColor = firstPlayer === 'player1' ? COLORS.BLUE : COLORS.RED;
        if (currentTurn === aiColor) setTimeout(executeAITurn, 500);
    }

    throwBtn.addEventListener("click", throwSticks);
    skipTurnButton.addEventListener("click", skipTurn);

    // --- Reset dice automatically at the start of a turn ---
    // Helper for other modules (like tabuleiroV7) to reset dice state/UI when a new turn begins
    window.resetDiceForNewTurn = function() {
        const sticks = sticksContainer.querySelectorAll('.stick');
        sticks.forEach(stick => {
            stick.classList.remove('light', 'dark');
            stick.style.visibility = 'hidden';
        });

        clearCountEl.textContent = '';
        valueEl.textContent = '';
        repeatInfoEl.textContent = '';

        window.currentRoll = null;
        window.currentDiceRoll = null;
        window.sticksMoved = true;

        throwBtn.textContent = 'Lançar Dado';
        throwBtn.disabled = false;
        throwBtn.classList.remove('disabled');
    };

    // ensure initial dice state is reset if a global startTurn exists
    if (typeof startTurn === 'function') startTurn(); // ensures initial turn is reset
});
