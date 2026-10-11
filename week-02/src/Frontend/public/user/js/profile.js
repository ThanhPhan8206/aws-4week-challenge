document.addEventListener('DOMContentLoaded', () => {
    // 1. Tab Switching Logic
    const navItems = document.querySelectorAll('.profile-nav-item');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const breadcrumbCurrent = document.getElementById('breadcrumb-current');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all nav items
            navItems.forEach(nav => nav.classList.remove('active'));
            // Add active class to clicked item
            item.classList.add('active');

            // Hide all tab panes
            tabPanes.forEach(pane => pane.classList.remove('active'));
            
            // Show target tab pane
            const targetId = item.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');

            // Update Breadcrumb Text
            breadcrumbCurrent.textContent = item.querySelector('span').textContent;
        });
    });

    // 2. Populate User Data
    const savedUser = localStorage.getItem('user_info');
    if(savedUser) {
        try {
            const user = JSON.parse(savedUser);
            const name = user.hoTen || 'Người dùng';
            const email = user.email || 'user@gmail.com';
            const role = user.vaiTro || 'HỌC SINH';
            const firstLetter = name.charAt(0).toUpperCase();

            // Set Avatars
            document.getElementById('sidebar-avatar').textContent = firstLetter;
            document.getElementById('content-avatar').textContent = firstLetter;

            // Set Names
            document.getElementById('sidebar-name').textContent = name;
            document.getElementById('content-name').textContent = name;
            document.getElementById('detail-name').textContent = name;

            // Set Emails
            document.getElementById('sidebar-email').textContent = email;
            document.getElementById('content-email').textContent = email;
            document.getElementById('detail-email').textContent = email;

            // Set Role
            document.getElementById('detail-role').textContent = role.toUpperCase();
            
        } catch(e) {
            console.error(e);
            window.location.href = '/home/auth.html?mode=login';
        }
    } else {
        window.location.href = '/home/auth.html?mode=login';
    }

    // 3. Change Password Event
    const changePasswordBtn = document.getElementById('change-password-btn');
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Đăng xuất và chuyển sang trang quên mật khẩu
            localStorage.removeItem('user_info');
            window.location.href = '/home/auth.html?mode=login&action=forgot-password';
        });
    }

    // 4. Generate Heatmap
    const heatmapContainer = document.getElementById('profile-heatmap');
    if (heatmapContainer) {
        const monthsDiv = document.createElement('div');
        monthsDiv.className = 'heatmap-months';
        for(let i=1; i<=12; i++) {
            const span = document.createElement('span');
            span.textContent = `Th.${i}`;
            monthsDiv.appendChild(span);
        }
        heatmapContainer.appendChild(monthsDiv);

        const gridDiv = document.createElement('div');
        gridDiv.className = 'heatmap-grid';
        
        for(let i=0; i<364; i++) {
            const cell = document.createElement('div');
            cell.className = 'heatmap-cell';
            gridDiv.appendChild(cell);
        }
        
        heatmapContainer.appendChild(gridDiv);
    }
});
