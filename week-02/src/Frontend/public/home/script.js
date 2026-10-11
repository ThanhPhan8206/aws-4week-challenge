document.addEventListener("DOMContentLoaded", () => {
    const textElement = document.getElementById("typewriter-text");
    
    if (textElement) {
        const phrases = [
            "HỆ THỐNG CHẤM ĐIỂM IRT",
            "PHÒNG LUYỆN CHẤT LƯỢNG",
            "NGUỒN ĐỀ SÁT CẤU TRÚC",
            "KHO ĐỀ PHONG PHÚ"
        ];
        
        let currentPhraseIndex = 0;
        let currentCharIndex = 0;
        let isDeleting = false;
        
        // Typing speed
        const typingSpeed = 100;
        const deletingSpeed = 50;
        const pauseBetweenPhrases = 1500;
        
        function type() {
            const currentPhrase = phrases[currentPhraseIndex];
            
            if (isDeleting) {
                // Remove a character
                textElement.textContent = currentPhrase.substring(0, currentCharIndex - 1);
                currentCharIndex--;
            } else {
                // Add a character
                textElement.textContent = currentPhrase.substring(0, currentCharIndex + 1);
                currentCharIndex++;
            }
            
            let delay = isDeleting ? deletingSpeed : typingSpeed;
            
            // If word is completely typed out
            if (!isDeleting && currentCharIndex === currentPhrase.length) {
                delay = pauseBetweenPhrases;
                isDeleting = true;
            } else if (isDeleting && currentCharIndex === 0) {
                // If word is completely deleted
                isDeleting = false;
                currentPhraseIndex = (currentPhraseIndex + 1) % phrases.length;
                delay = 500; // brief pause before typing next word
            }
            
            setTimeout(type, delay);
        }
        
        // Start typing effect
        setTimeout(type, 1000);
    }

    // Fame description typing effect on scroll
    const fameDesc = document.querySelector(".fame-desc");
    if (fameDesc) {
        // Save original HTML and preserve height
        const originalHTML = fameDesc.innerHTML;
        
        // Wait a brief moment to ensure layout is calculated, then fix height
        setTimeout(() => {
            fameDesc.style.minHeight = fameDesc.offsetHeight + "px";
            fameDesc.innerHTML = "";
            
            let hasTyped = false;
            
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && !hasTyped) {
                        hasTyped = true;
                        let i = 0;
                        let isTag = false;
                        let text = '';
                        
                        function typeChar() {
                            if (i < originalHTML.length) {
                                if (originalHTML.charAt(i) === '<') isTag = true;
                                text += originalHTML.charAt(i);
                                if (originalHTML.charAt(i) === '>') isTag = false;
                                
                                if (isTag) {
                                    i++;
                                    typeChar();
                                } else {
                                    fameDesc.innerHTML = text;
                                    i++;
                                    setTimeout(typeChar, 25);
                                }
                            } else {
                                fameDesc.style.minHeight = "auto";
                            }
                        }
                        // Start typing slightly after it comes into view
                        setTimeout(typeChar, 300);
                    }
                });
            }, { threshold: 0.1 });
            
            observer.observe(fameDesc);
        }, 100);
    }
    
    // Retract hero triangles on scroll
    let lastScrollY = window.scrollY;
    const heroLeft = document.querySelector('.hero-bg-left');
    const heroRight = document.querySelector('.hero-bg-right');

    if (heroLeft && heroRight) {
        window.addEventListener('scroll', () => {
            const currentScrollY = window.scrollY;
            if (currentScrollY > lastScrollY && currentScrollY > 50) {
                // Scrolling down
                heroLeft.classList.add('retracted');
                heroRight.classList.add('retracted');
            } else if (currentScrollY < lastScrollY) {
                // Scrolling up
                heroLeft.classList.remove('retracted');
                heroRight.classList.remove('retracted');
            }
            lastScrollY = currentScrollY;
        });
    }

    // Helper: Show Custom Modal
    function showModal(title, message, onOkClick) {
        const modal = document.getElementById('custom-modal');
        if (!modal) {
            alert(message);
            if (onOkClick) onOkClick();
            return;
        }
        
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-message').textContent = message;
        modal.style.zIndex = '10005';
        modal.classList.add('active');
        
        const btn = document.getElementById('modal-btn');
        btn.onclick = () => {
            modal.classList.remove('active');
            if (onOkClick) onOkClick();
        };
    }

    let pendingEmail = '';
    let forgotEmail = '';

    // Logic Đăng ký
    const formRegister = document.getElementById('form-register');
    if (formRegister) {
        formRegister.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const hoTen = document.getElementById('reg-name').value;
            const email = document.getElementById('reg-email').value;
            const matKhau = document.getElementById('reg-pass').value;
            const reMatKhau = document.getElementById('reg-repass').value;
            
            if (matKhau !== reMatKhau) {
                showModal('Lỗi', 'Mật khẩu nhập lại không khớp!');
                return;
            }
            
            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ hoTen, email, matKhau })
                });
                const result = await response.json();
                
                if (result.success) {
                    pendingEmail = email;
                    document.getElementById('otp-modal').classList.add('active');
                } else {
                    showModal('Lỗi đăng ký', result.message || 'Có lỗi xảy ra khi đăng ký!');
                }
            } catch (error) {
                console.error(error);
                showModal('Lỗi', 'Lỗi kết nối tới server!');
            }
        });
    }

    // Logic Xác thực OTP
    const formVerifyOtp = document.getElementById('form-verify-otp');
    if (formVerifyOtp) {
        formVerifyOtp.addEventListener('submit', async (e) => {
            e.preventDefault();
            const otp = document.getElementById('otp-input').value;

            try {
                const response = await fetch('/api/verify-account', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: pendingEmail, otp })
                });
                const result = await response.json();
                
                if (result.success) {
                    document.getElementById('otp-modal').classList.remove('active');
                    showModal('Thành công', 'Xác thực tài khoản thành công! Bạn có thể đăng nhập.', () => {
                        window.location.href = 'auth.html?mode=login';
                    });
                } else {
                    showModal('Lỗi xác thực', result.message || 'Mã OTP không hợp lệ!');
                }
            } catch (error) {
                console.error(error);
                showModal('Lỗi', 'Lỗi kết nối tới server!');
            }
        });
    }

    // Logic Quên mật khẩu
    const forgotPwLink = document.querySelector('.forgot-pw');
    if (forgotPwLink) {
        forgotPwLink.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('forgot-step-1').style.display = 'block';
            document.getElementById('forgot-step-2').style.display = 'none';
            document.getElementById('forgot-modal').classList.add('active');
        });
    }

    const formForgotEmail = document.getElementById('form-forgot-email');
    if (formForgotEmail) {
        formForgotEmail.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('forgot-email-input').value;
            
            try {
                const response = await fetch('/api/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                const result = await response.json();
                
                if (result.success) {
                    forgotEmail = email;
                    document.getElementById('forgot-step-1').style.display = 'none';
                    document.getElementById('forgot-step-2').style.display = 'block';
                } else {
                    showModal('Lỗi', result.message || 'Email không tồn tại!');
                }
            } catch (error) {
                console.error(error);
                showModal('Lỗi', 'Lỗi kết nối tới server!');
            }
        });
    }

    const formForgotReset = document.getElementById('form-forgot-reset');
    if (formForgotReset) {
        formForgotReset.addEventListener('submit', async (e) => {
            e.preventDefault();
            const otp = document.getElementById('reset-otp').value;
            const newPassword = document.getElementById('reset-new-pass').value;
            
            try {
                const response = await fetch('/api/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: forgotEmail, otp, newPassword })
                });
                const result = await response.json();
                
                if (result.success) {
                    document.getElementById('forgot-modal').classList.remove('active');
                    showModal('Thành công', 'Mật khẩu đã được đặt lại! Bạn có thể đăng nhập.', () => {
                        window.location.href = 'auth.html?mode=login';
                    });
                } else {
                    showModal('Lỗi', result.message || 'Không thể đặt lại mật khẩu!');
                }
            } catch (error) {
                console.error(error);
                showModal('Lỗi', 'Lỗi kết nối tới server!');
            }
        });
    }

    // Đóng modal
    document.querySelectorAll('.close-modal-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.custom-modal').classList.remove('active');
        });
    });

    // Logic Đăng nhập
    const formLogin = document.getElementById('form-login');
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('login-email').value;
            const matKhau = document.getElementById('login-pass').value;
            
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, matKhau })
                });
                const result = await response.json();
                
                if (result.success) {
                    let message = '';
                    let redirectUrl = '';
                    
                    if (result.data && result.data.vaiTro === 'Admin') {
                        message = 'Chào Admin. Chúc bạn làm việc hiệu quả!';
                        redirectUrl = '/admin/admin-exam.html';
                    } else {
                        // Lưu thông tin học viên vào localStorage
                        localStorage.setItem('user_info', JSON.stringify({
                            hoTen: result.data.hoTen,
                            email: email,
                            vaiTro: result.data.vaiTro
                        }));
                        message = 'Chào mừng học viên. Chúc bạn học tập hiệu quả!';
                        redirectUrl = '/user/dashboard.html';
                    }
                    
                    showModal('Đăng nhập thành công', message, () => {
                        window.location.href = redirectUrl;
                    });
                } else {
                    showModal('Lỗi đăng nhập', result.message || 'Đăng nhập thất bại!');
                }
            } catch (error) {
                console.error(error);
                showModal('Lỗi', 'Lỗi kết nối tới server!');
            }
        });
    }
});
