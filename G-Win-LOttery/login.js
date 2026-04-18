document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const errorMsg = document.getElementById('errorMsg');
    const loginBtn = document.getElementById('loginBtn');

    // Handle form submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        // Visual feedback
        loginBtn.disabled = true;
        loginBtn.textContent = 'Verifying...';
        errorMsg.textContent = '';

        try {
            const data = await window.GWinAPI.login(username, password);

            if (data && (data.status === true || data.status === "true")) {
                // Success: Store user info
                sessionStorage.setItem('user_id', data.user_id);
                sessionStorage.setItem('username', data.username || username);
                sessionStorage.setItem('balance', data.balance || '0');
                sessionStorage.setItem('role', data.role || 'user');

                // Add a small delay for a premium feel
                setTimeout(() => {
                    loginBtn.textContent = 'Access Granted!';
                    loginBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                    
                    setTimeout(() => {
                        window.location.href = 'game/index.html';
                    }, 500);
                }, 800);
            } else {
                // Error from API
                errorMsg.textContent = data ? (data.message || 'Invalid credentials.') : 'Invalid credentials.';
                resetBtn();
            }
        } catch (error) {
            console.error('Login Error:', error);
            
            // Fallback for development/offline
            if (username === 'anil' && password === '123456') {
                sessionStorage.setItem('username', 'anil');
                sessionStorage.setItem('user_id', '276');
                sessionStorage.setItem('balance', '789649');
                sessionStorage.setItem('role', 'user');

                errorMsg.style.color = '#ffd828';
                errorMsg.textContent = 'Development Mode: Simulating success...';
                
                setTimeout(() => {
                    window.location.href = 'game/index.html';
                }, 1500);
            } else {
                errorMsg.textContent = 'Server connection failed. Please try again later.';
                resetBtn();
            }
        }
    });

    function resetBtn() {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Access Terminal';
    }

    // Input animations or sounds could be added here for more "wow" factor
});
