document.addEventListener('DOMContentLoaded', () => {
    // A URL base deve ser a raiz do seu site
    const API_BASE_URL = `${window.location.protocol}//${window.location.host}`;

    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');

    // Se já existe um token, vai direto para o catálogo
    if (localStorage.getItem('authToken')) {
        window.location.href = '/';
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMessage.classList.add('d-none'); // Esconde a mensagem de erro

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${API_BASE_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erro desconhecido');
            }

            // Se o login foi bem-sucedido, guarda o token e redireciona
            localStorage.setItem('authToken', data.token);
            window.location.href = '/'; // Redireciona para a página principal

        } catch (error) {
            errorMessage.textContent = error.message;
            errorMessage.classList.remove('d-none');
        }
    });
});