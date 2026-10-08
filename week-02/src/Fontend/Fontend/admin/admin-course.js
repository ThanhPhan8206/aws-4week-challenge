document.addEventListener('DOMContentLoaded', () => {

    const tplChapter = document.getElementById('tpl-chapter').content;
    const tplLesson = document.getElementById('tpl-lesson').content;
    const chaptersContainer = document.getElementById('chapters-container');

    document.getElementById('btn-add-chapter').addEventListener('click', () => {
        addChapter();
    });

    function addChapter(initialData = null) {
        const node = document.importNode(tplChapter, true);
        const card = node.querySelector('.chapter-card');
        
        const toggleBtn = card.querySelector('.toggle-chapter');
        toggleBtn.addEventListener('click', () => {
            card.classList.toggle('collapsed');
            toggleBtn.innerHTML = card.classList.contains('collapsed') 
                ? '<i class="fa-solid fa-chevron-up"></i>' 
                : '<i class="fa-solid fa-chevron-down"></i>';
        });

        card.querySelector('.delete-chapter').addEventListener('click', () => {
            Swal.fire({
                title: 'Xóa Chương học?',
                text: 'Toàn bộ bài học bên trong sẽ bị xóa theo!',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Có, Xóa!',
                cancelButtonText: 'Hủy'
            }).then((result) => {
                if (result.isConfirmed) {
                    card.remove();
                    updateChapterIndexes();
                }
            });
        });

        const addLessonBtn = card.querySelector('.btn-add-lesson');
        const lessonsContainer = card.querySelector('.lessons-container');

        addLessonBtn.addEventListener('click', () => {
            addLesson(lessonsContainer);
        });

        if (initialData) {
            card.querySelector('.chapter-title-input').value = initialData.title || '';
            if (initialData.lessons && initialData.lessons.length > 0) {
                initialData.lessons.forEach(l => addLesson(lessonsContainer, l));
            } else {
                addLesson(lessonsContainer);
            }
        } else {
            addLesson(lessonsContainer);
        }

        chaptersContainer.appendChild(node);
        updateChapterIndexes();
    }

    function updateChapterIndexes() {
        const chapters = chaptersContainer.querySelectorAll('.chapter-card');
        chapters.forEach((c, idx) => {
            c.querySelector('.chapter-name').textContent = `Chương ${idx + 1}`;
        });
    }

    function addLesson(container, initialData = null) {
        const node = document.importNode(tplLesson, true);
        const card = node.querySelector('.lesson-card');
        
        if (initialData) {
            card.querySelector('.lesson-name').value = initialData.name || '';
            card.querySelector('.lesson-link').value = initialData.videoUrl || '';
        }

        card.querySelector('.delete-lesson').addEventListener('click', () => {
            if(confirm('Xóa bài học này?')) {
                card.remove();
                updateLessonIndexes(container);
            }
        });

        container.appendChild(node);
        updateLessonIndexes(container);
    }

    function updateLessonIndexes(container) {
        const lessons = container.querySelectorAll('.lesson-card');
        lessons.forEach((l, idx) => {
            l.querySelector('.lesson-idx').textContent = `Bài ${idx + 1}`;
        });
    }

    // ==========================================
    // LOGIC EDIT / SỬA KHÓA HỌC
    // ==========================================
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('id');

    if (courseId) {
        document.querySelector('.page-title').textContent = 'Cập Nhật Khóa Học';
        const saveBtn = document.getElementById('btn-save-course');
        saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Cập Nhật Khóa Học';

        fetch(`/api/admin/courses/${courseId}`)
            .then(res => res.json())
            .then(result => {
                if(result.success && result.data) {
                    fillCourseData(result.data);
                } else {
                    alert('Lỗi: ' + (result.message || 'Không tìm thấy khóa học'));
                }
            })
            .catch(err => console.error('Lỗi khi fetch chi tiết khóa học:', err));
    } else {
        // Mặc định tạo 1 chương nếu là tạo mới
        addChapter();
    }

    function fillCourseData(data) {
        document.getElementById('course-name').value = data.TenKhoaHoc || '';
        document.getElementById('course-desc').value = data.MoTa || '';
        document.getElementById('course-part').value = data.HocPhan || '';

        try {
            const parsedData = JSON.parse(data.NoiDungJSON);
            chaptersContainer.innerHTML = '';
            if (parsedData.chapters) {
                parsedData.chapters.forEach(c => addChapter(c));
            }
        } catch(e) {
            console.error('Lỗi parse Nội dung JSON:', e);
        }
    }

    // Thu thập dữ liệu và gọi API POST/PUT
    document.getElementById('btn-save-course').addEventListener('click', collectCourseData);

    function collectCourseData() {
        const courseName = document.getElementById('course-name').value.trim();
        const courseDesc = document.getElementById('course-desc').value.trim();
        const coursePart = document.getElementById('course-part').value;

        if(!courseName || !coursePart) {
            Swal.fire('Lỗi', 'Vui lòng nhập Tên khóa học và Chọn Học phần!', 'error');
            return;
        }

        const data = {
            tenKhoaHoc: courseName,
            moTa: courseDesc,
            hocPhan: coursePart,
            chapters: []
        };

        const chapterCards = chaptersContainer.querySelectorAll('.chapter-card');
        chapterCards.forEach(cCard => {
            const chapterTitle = cCard.querySelector('.chapter-title-input').value.trim();
            const chapterData = {
                title: chapterTitle,
                lessons: []
            };

            const lessonCards = cCard.querySelectorAll('.lesson-card');
            lessonCards.forEach(lCard => {
                chapterData.lessons.push({
                    name: lCard.querySelector('.lesson-name').value.trim(),
                    videoUrl: lCard.querySelector('.lesson-link').value.trim()
                });
            });

            data.chapters.push(chapterData);
        });

        const method = courseId ? 'PUT' : 'POST';
        const url = courseId ? `/api/admin/courses/${courseId}` : '/api/admin/courses';

        // Gọi API
        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(res => res.json())
        .then(result => {
            if(result.success) {
                Swal.fire({
                    title: 'Thành công!',
                    text: courseId ? 'Cập nhật khóa học thành công' : 'Lưu khóa học vào Database thành công',
                    icon: 'success',
                    confirmButtonText: 'OK'
                }).then(() => {
                    window.location.href = 'admin-list-course.html';
                });
            } else {
                Swal.fire('Lỗi', result.message, 'error');
            }
        })
        .catch(err => {
            console.error('Lỗi kết nối API:', err);
            Swal.fire('Lỗi', 'Có lỗi xảy ra khi kết nối đến máy chủ.', 'error');
        });
    }
});
