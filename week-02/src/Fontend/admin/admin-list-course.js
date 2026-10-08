document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.querySelector('#course-table tbody');

    function loadCourses() {
        fetch('/api/admin/courses')
            .then(res => res.json())
            .then(data => {
                if(data.success) {
                    renderTable(data.data);
                } else {
                    tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">${data.message}</td></tr>`;
                }
            })
            .catch(err => {
                console.error(err);
                tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Lỗi kết nối API! Vui lòng kiểm tra Server.</td></tr>`;
            });
    }

    function renderTable(courses) {
        if(courses.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--text-gray);">Chưa có khóa học nào trong hệ thống.</td></tr>`;
            return;
        }

        let html = '';
        courses.forEach((course, index) => {
            const dateObj = new Date(course.NgayTao);
            const dateStr = dateObj.toLocaleDateString('vi-VN') + ' ' + dateObj.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'});
            
            const statusHtml = course.TrangThai === 1 
                ? `<span class="status-badge status-active">Hoạt động</span>` 
                : `<span class="status-badge status-inactive">Đã khóa</span>`;

            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td class="font-semibold text-red">${course.TenKhoaHoc}</td>
                    <td><span style="background: #eef2ff; color: #4f46e5; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 500;">${course.HocPhan || 'Chưa phân loại'}</span></td>
                    <td>${dateStr}</td>
                    <td>${statusHtml}</td>
                    <td>
                        <div class="action-btns">
                            <button class="btn-icon btn-edit" data-id="${course.Id}" title="Sửa khóa học"><i class="fa-solid fa-pen-to-square"></i></button>
                            <button class="btn-icon text-red btn-delete" data-id="${course.Id}" title="Xóa khóa học"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        });
        tableBody.innerHTML = html;

        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                window.location.href = `admin-course.html?id=${id}`;
            });
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                Swal.fire({
                    title: 'Bạn có chắc chắn?',
                    text: 'Hành động này sẽ xóa vĩnh viễn khóa học này!',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6',
                    confirmButtonText: 'Có, Xóa!',
                    cancelButtonText: 'Hủy'
                }).then((result) => {
                    if (result.isConfirmed) {
                        deleteCourse(id);
                    }
                });
            });
        });
    }

    function deleteCourse(id) {
        fetch(`/api/admin/courses/${id}`, { method: 'DELETE' })
            .then(res => res.json())
            .then(data => {
                if(data.success) {
                    Swal.fire('Đã xóa!', 'Khóa học đã được xóa thành công.', 'success');
                    loadCourses(); // Tải lại bảng ngay lập tức
                } else {
                    Swal.fire('Lỗi', data.message, 'error');
                }
            })
            .catch(err => {
                console.error(err);
                Swal.fire('Lỗi', 'Lỗi kết nối khi xóa!', 'error');
            });
    }

    // Chạy khi load trang
    loadCourses();
});
