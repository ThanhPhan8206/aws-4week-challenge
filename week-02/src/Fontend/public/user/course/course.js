document.addEventListener('DOMContentLoaded', () => {
    let allCourses = [];

    // Lấy thông tin user từ localStorage để hiển thị
    const savedUser = localStorage.getItem('user_info');
    if (savedUser) {
        try {
            const user = JSON.parse(savedUser);
            const nameEl = document.querySelector('.user-name');
            if(nameEl) nameEl.textContent = user.hoTen || 'Người dùng';
        } catch(e) {}
    } else {
        window.location.href = '/home/auth.html?mode=login';
    }

    function fetchCourses() {
        fetch('/api/courses')
            .then(res => res.json())
            .then(result => {
                if(result.success) {
                    allCourses = result.data;
                    const activeTab = document.querySelector('.filter-btn.active');
                    if (activeTab) {
                        renderCourses(activeTab.getAttribute('data-filter'));
                    }
                }
            })
            .catch(err => {
                console.error('Lỗi khi fetch courses:', err);
            });
    }

    function renderCourses(hocPhan) {
        const container = document.getElementById('course-list-container');
        if(!container) return;
        container.innerHTML = '';

        const filteredCourses = allCourses.filter(c => c.HocPhan === hocPhan);

        if(filteredCourses.length === 0) {
            container.innerHTML = `<div style="padding:20px; text-align:center; color:#666;">Chưa có khóa học nào cho phần ${hocPhan}.</div>`;
            return;
        }

        filteredCourses.forEach(course => {
            let parsedJson = {};
            try { parsedJson = JSON.parse(course.NoiDungJSON); } catch(e) {}

            const courseDiv = document.createElement('div');
            courseDiv.className = 'course-item';
            
            let chaptersHtml = '';
            if (parsedJson.chapters && parsedJson.chapters.length > 0) {
                parsedJson.chapters.forEach((chapter, cIdx) => {
                    let lessonsHtml = '';
                    if (chapter.lessons && chapter.lessons.length > 0) {
                        chapter.lessons.forEach((lesson, lIdx) => {
                            const lessonData = encodeURIComponent(JSON.stringify({
                                title: lesson.name,
                                courseName: course.TenKhoaHoc,
                                desc: course.MoTa,
                                url: lesson.videoUrl
                            }));
                            lessonsHtml += `
                                <div class="lesson-item" data-info="${lessonData}">
                                    <i class="fa-regular fa-circle-play"></i>
                                    <span>${lIdx + 1}. ${lesson.name}</span>
                                </div>
                            `;
                        });
                    }

                    // Mở chương đầu tiên theo mặc định
                    const isCollapsed = cIdx === 0 ? '' : 'collapsed';

                    chaptersHtml += `
                        <div class="chapter-item ${isCollapsed}">
                            <div class="chapter-header">
                                <span>Chương ${cIdx + 1}: ${chapter.title}</span>
                                <i class="fa-solid fa-chevron-down"></i>
                            </div>
                            <div class="chapter-body">
                                ${lessonsHtml}
                            </div>
                        </div>
                    `;
                });
            } else {
                chaptersHtml = `<div style="padding:12px 20px; font-size:13px; color:#999;">Khóa học chưa có bài giảng nào.</div>`;
            }

            courseDiv.innerHTML = `
                <div class="course-header">${course.TenKhoaHoc}</div>
                ${chaptersHtml}
            `;
            container.appendChild(courseDiv);
        });

        attachAccordionEvents();
        attachLessonEvents();
    }

    function attachAccordionEvents() {
        const headers = document.querySelectorAll('.chapter-header');
        headers.forEach(header => {
            if(!header.hasAttribute('data-event-attached')) {
                header.setAttribute('data-event-attached', 'true');
                header.addEventListener('click', function() {
                    const item = this.parentElement;
                    item.classList.toggle('collapsed');
                });
            }
        });
    }

    function attachLessonEvents() {
        const lessons = document.querySelectorAll('.lesson-item');
        lessons.forEach(lesson => {
            if(!lesson.hasAttribute('data-event-attached')) {
                lesson.setAttribute('data-event-attached', 'true');
                lesson.addEventListener('click', function() {
                    // Xóa class active của bài học trước đó
                    document.querySelectorAll('.lesson-item.active').forEach(l => l.classList.remove('active'));
                    this.classList.add('active'); // Thêm class active cho bài vừa click

                    const dataStr = this.getAttribute('data-info');
                    const data = JSON.parse(decodeURIComponent(dataStr));

                    const placeholder = document.getElementById('video-placeholder');
                    if(placeholder) placeholder.style.display = 'none';
                    
                    const iframe = document.getElementById('video-player');
                    if(iframe) {
                        let embedUrl = data.url;
                        // Xử lý link youtube thường thành link embed
                        if (embedUrl.includes('youtube.com/watch?v=')) {
                            const videoId = embedUrl.split('v=')[1].split('&')[0];
                            embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
                        } else if (embedUrl.includes('youtu.be/')) {
                            const videoId = embedUrl.split('youtu.be/')[1].split('?')[0];
                            embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
                        }
                        iframe.src = embedUrl;
                    }

                    const titleEl = document.getElementById('current-lesson-title');
                    const descEl = document.getElementById('current-course-desc');
                    if(titleEl) titleEl.textContent = data.title;
                    if(descEl) descEl.textContent = `${data.courseName} - ${data.desc}`;
                });
            }
        });
    }

    // Xử lý Filter Tabs
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const hocPhan = this.getAttribute('data-filter');
            renderCourses(hocPhan);
            
            // Ẩn player nếu đổi filter
            const placeholder = document.getElementById('video-placeholder');
            const iframe = document.getElementById('video-player');
            if(placeholder) placeholder.style.display = 'flex';
            if(iframe) iframe.src = '';
            
            const titleEl = document.getElementById('current-lesson-title');
            const descEl = document.getElementById('current-course-desc');
            if(titleEl) titleEl.textContent = 'Chưa chọn bài học';
            if(descEl) descEl.textContent = 'Vui lòng chọn khóa học và bài học từ menu bên phải.';
        });
    });

    // Khởi chạy
    fetchCourses();
});
