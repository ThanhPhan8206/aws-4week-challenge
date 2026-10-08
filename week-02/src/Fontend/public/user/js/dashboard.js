document.addEventListener('DOMContentLoaded', () => {
    // Generate Heatmap
    const heatmapContainer = document.getElementById('heatmap');
    if (heatmapContainer) {
        // Create Months Header
        const monthsDiv = document.createElement('div');
        monthsDiv.className = 'heatmap-months';
        for(let i=1; i<=12; i++) {
            const span = document.createElement('span');
            span.textContent = `Th.${i}`;
            monthsDiv.appendChild(span);
        }
        heatmapContainer.appendChild(monthsDiv);

        // Create Grid
        const gridDiv = document.createElement('div');
        gridDiv.className = 'heatmap-grid';
        
        // 52 weeks * 7 days roughly = 364 cells
        for(let i=0; i<364; i++) {
            const cell = document.createElement('div');
            cell.className = 'heatmap-cell';
            gridDiv.appendChild(cell);
        }
        
        heatmapContainer.appendChild(gridDiv);
    }

    // Toggle Sidebar
    const toggleBtn = document.getElementById('toggle-sidebar');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    
    let sidebarOpen = true;
    
    if (toggleBtn && sidebar && mainContent) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            mainContent.classList.toggle('expanded');
        });
    }

    // Sidebar Navigation Logic
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    const pageViews = document.querySelectorAll('.page-view');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            // Nếu có link thực thì cứ để trình duyệt chuyển hướng
            const href = item.getAttribute('href');
            if(href && href !== '#') {
                return;
            }

            e.preventDefault();
            
            // Remove active from all nav items
            navItems.forEach(nav => nav.classList.remove('active'));
            // Add active to clicked item
            item.classList.add('active');

            // Hide all views
            pageViews.forEach(view => {
                view.style.display = 'none';
                view.classList.remove('active');
            });
            
            // Show target view
            const targetId = item.getAttribute('data-target');
            if (targetId) {
                const targetView = document.getElementById(targetId);
                if (targetView) {
                    targetView.style.display = 'block';
                    targetView.classList.add('active');
                }
            }
        });
    });

    // User Profile Dropdown
    const userProfileBtn = document.getElementById('user-profile-btn');
    const userDropdown = document.getElementById('user-dropdown');
    
    if(userProfileBtn && userDropdown) {
        userProfileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('active');
        });
        
        // Đóng dropdown khi click ra ngoài
        document.addEventListener('click', () => {
            userDropdown.classList.remove('active');
        });
    }

    // Đăng xuất
    const logoutBtn = document.getElementById('logout-btn');
    if(logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('user_info');
            window.location.href = '/home/auth.html?mode=login';
        });
    }

    // Populate user info from localStorage if available
    // Assuming auth logic saves user info somewhere
    const savedUser = localStorage.getItem('user_info');
    if(savedUser) {
        try {
            const user = JSON.parse(savedUser);
            document.getElementById('header-user-name').textContent = user.hoTen || 'Người dùng';
            document.getElementById('card-user-name').textContent = user.hoTen || 'Người dùng';
            document.getElementById('card-user-email').textContent = user.email || 'user@gmail.com';
            
            if(user.vaiTro) {
                document.getElementById('card-user-role').textContent = user.vaiTro.toUpperCase();
            }
        } catch(e) {}
    } else {
        // Redirect to login if no user session found
        window.location.href = '/home/auth.html?mode=login';
    }


});
