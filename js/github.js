function warning() {
    alert("O modo online e todas as funcionalidades relacionadas foram desativadas nesta versão do jogo.");
}

//pop-up com instruções
document.addEventListener('DOMContentLoaded', () => {
    const openClassif = document.getElementById('open-inst');
    const closeClassif = document.getElementById('close-inst');
    const Overlay = document.getElementById('inst-overlay'); //(overlay é o que faz escurecer a volta)

    openClassif.addEventListener('click', () => { //aparece
        Overlay.style.display = 'flex';
    });

    closeClassif.addEventListener('click', () => { //desaparece
        Overlay.style.display = 'none';
    });

    Overlay.addEventListener('click', (e) => { //se clicarmos fora da caixa desaparece
        if (e.target === Overlay) {
            Overlay.style.display = 'none';
        }
    });
})