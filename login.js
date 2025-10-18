document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const pinInput = document.getElementById('pin');
    const errorMessage = document.getElementById('errorMessage');

    // PIN dummy untuk simulasi. Nantinya ini akan divalidasi oleh backend.
    const DUMMY_PIN = '1234';

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Mencegah form dari reloading halaman

        const enteredPin = pinInput.value;

        if (enteredPin === DUMMY_PIN) {
            // Jika PIN benar, arahkan ke halaman utama
            console.log('PIN benar. Mengarahkan ke index.html...');
            window.location.href = 'index.html';
        } else {
            // Jika PIN salah, tampilkan pesan error
            console.log('PIN salah.');
            errorMessage.classList.remove('hidden');
            pinInput.value = ''; // Kosongkan input
            pinInput.focus(); // Fokuskan kembali ke input
        }
    });
});