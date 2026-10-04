document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.querySelector('#exam-table tbody');

    // 1. Fetch danh sách đề thi từ API
    function loadExams() {
        fetch('/api/admin/exams')
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

    // 2. Render dữ liệu ra Table
    function renderTable(exams) {
        if(exams.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--text-gray);">Chưa có đề thi nào trong hệ thống.</td></tr>`;
            return;
        }

        let html = '';
        exams.forEach((exam, index) => {
            const dateObj = new Date(exam.NgayTao);
            // Format ngày: dd/mm/yyyy hh:mm
            const dateStr = dateObj.toLocaleDateString('vi-VN') + ' ' + dateObj.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'});
            
            const statusHtml = exam.TrangThai === 1 
                ? `<span class="status-badge status-active">Hoạt động</span>` 
                : `<span class="status-badge status-inactive">Đã khóa</span>`;

            const detailTitle = `Toán: ${exam.soCauToan || 0} câu | Đọc hiểu: ${exam.soCauDoc || 0} câu | Khoa học: ${exam.soCauKhoa || 0} câu`;

            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td class="font-semibold text-red">${exam.MaDeThi}</td>
                    <td style="font-weight: 500;">${exam.TenDeThi}</td>
                    <td style="text-align:center;">
                        <div class="tooltip-container" onclick="Swal.fire({title: 'Chi tiết số lượng câu hỏi', text: '${detailTitle}', icon: 'info'})">
                            <i class="fa-solid fa-circle-info detail-icon"></i>
                            <span class="tooltip-text">${detailTitle}</span>
                        </div>
                    </td>
                    <td>${dateStr}</td>
                    <td>${statusHtml}</td>
                    <td>
                        <div class="action-btns">
                            <button class="btn-icon btn-edit" data-id="${exam.Id}" title="Sửa đề thi"><i class="fa-solid fa-pen-to-square"></i></button>
                            <button class="btn-icon text-red btn-delete" data-id="${exam.Id}" title="Xóa đề thi"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        });
        tableBody.innerHTML = html;

        // Gán sự kiện cho các nút Sửa, Xóa
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                window.location.href = `admin-exam.html?action=edit&id=${id}`;
            });
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                Swal.fire({
                    title: 'Bạn có chắc chắn?',
                    text: 'Hành động này sẽ xóa vĩnh viễn đề thi!',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6',
                    confirmButtonText: 'Có, Xóa!',
                    cancelButtonText: 'Hủy'
                }).then((result) => {
                    if (result.isConfirmed) {
                        deleteExam(id);
                    }
                });
            });
        });
    }

    // 3. Xóa đề thi
    function deleteExam(id) {
        fetch(`/api/admin/exams/${id}`, { method: 'DELETE' })
            .then(res => res.json())
            .then(data => {
                if(data.success) {
                    Swal.fire('Đã xóa!', 'Đề thi đã được xóa thành công.', 'success');
                    loadExams(); // Tải lại bảng ngay lập tức
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
    loadExams();
});
