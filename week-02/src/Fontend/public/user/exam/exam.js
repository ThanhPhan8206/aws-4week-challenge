document.addEventListener('DOMContentLoaded', () => {
    // 1. Phân loại trang
    const isExamList = document.getElementById('exam-list-container');
    const isExamTake = document.getElementById('take-exam-title');

    // Lấy thông tin User
    const savedUser = localStorage.getItem('user_info');
    let user = { hoTen: 'Học viên' };
    if (savedUser) {
        try { user = JSON.parse(savedUser); } catch(e) {}
    } else {
        window.location.href = '/home/auth.html?mode=login';
    }

    const nameEls = document.querySelectorAll('.user-name, #sidebar-user-name');
    nameEls.forEach(el => el.textContent = user.hoTen);

    // ==========================================
    // TRANG DANH SÁCH ĐỀ THI
    // ==========================================
    if (isExamList) {
        let allExams = [];

        function fetchExams() {
            fetch('/api/exams')
                .then(res => res.json())
                .then(result => {
                    if (result.success) {
                        allExams = result.data;
                        renderExams('all');
                    }
                })
                .catch(err => {
                    console.error('Lỗi lấy danh sách đề thi:', err);
                    // Dữ liệu mẫu nếu API chưa xong
                    allExams = [
                        { Id: 1, TenDeThi: 'BMC 06_TƯ DUY KHOA HỌC', type: 'khoa', time: 60, questions: 40 },
                        { Id: 2, TenDeThi: 'BMC 06_TƯ DUY ĐỌC HIỂU', type: 'doc', time: 30, questions: 20 },
                        { Id: 3, TenDeThi: 'BMC 06_TƯ DUY TOÁN HỌC', type: 'toan', time: 60, questions: 40 }
                    ];
                    renderExams('all');
                });
        }

        function renderExams(filter) {
            const container = document.getElementById('exam-list-container');
            container.innerHTML = '';
            
            if (allExams.length === 0) {
                container.innerHTML = '<div style="grid-column: 1/-1; text-align: center;">Không có đề thi nào phù hợp.</div>';
                return;
            }

            allExams.forEach(exam => {
                const card = document.createElement('div');
                card.className = 'exam-card-alt';
                
                // Trích xuất số lượng câu hỏi từ JSON
                let qCount = 40; // Mặc định
                if (exam.NoiDungJSON) {
                    try {
                        const parsed = JSON.parse(exam.NoiDungJSON);
                        if (parsed.questions && parsed.questions.length > 0) {
                            qCount = parsed.questions.length;
                        }
                    } catch(e) {}
                }

                // Định dạng ngày tạo
                const dateObj = new Date(exam.NgayTao);
                const dateStr = !isNaN(dateObj) ? dateObj.toLocaleDateString('vi-VN') : 'Đang cập nhật';

                card.innerHTML = `
                    <div class="exam-card-alt-cover">
                        <i class="fa-solid fa-book-open"></i>
                        <h4>ĐÁNH GIÁ TƯ DUY - TSA</h4>
                    </div>
                    <div class="exam-card-alt-body">
                        <h3>${exam.TenDeThi}</h3>
                        <div class="exam-card-alt-info" style="margin-top: 10px; display:flex; flex-direction: column; gap: 6px;">
                            <div class="info-row"><span class="info-label" style="width: 80px; display: inline-block; color: #666; font-size: 13px;">Mã đề:</span> <strong style="font-size: 13px; color: #222;">${exam.MaDeThi || 'Đang cập nhật'}</strong></div>
                            <div class="info-row"><span class="info-label" style="width: 80px; display: inline-block; color: #666; font-size: 13px;">Ngày tạo:</span> <strong style="font-size: 13px; color: #222;">${dateStr}</strong></div>
                        </div>
                    </div>
                    <div class="exam-card-alt-footer" style="padding-top: 10px;">
                        <div class="footer-info">
                            <span><i class="fa-regular fa-user"></i> DOLEARN</span>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn-history-pill" data-id="${exam.Id}" style="background: white; border: 1.5px solid #222; color: #222; padding: 6px 12px; border-radius: 20px; font-weight: 600; font-size: 13px; cursor: pointer; transition: transform 0.2s ease; box-shadow: 2px 2px 0px #222;" title="Xem lịch sử làm bài"><i class="fa-solid fa-clock-rotate-left"></i></button>
                            <button class="btn-start-pill" data-id="${exam.Id}" style="background: #d32f2f; border: 1.5px solid #222; box-shadow: 2px 2px 0px #222; color: white; padding: 6px 20px; border-radius: 20px; font-weight: 600; font-size: 13px; cursor: pointer; transition: transform 0.2s ease;">Bắt đầu</button>
                        </div>
                    </div>
                `;
                container.appendChild(card);
            });

            // Gắn sự kiện nút Bắt đầu
            document.querySelectorAll('.btn-start-pill').forEach(btn => {
                btn.addEventListener('click', function() {
                    const id = this.getAttribute('data-id');
                    localStorage.setItem('currentExamId', id);
                    window.location.href = '/user/exam/exam-confirm.html';
                });
            });
        }

        // Khởi động lấy API
        fetchExams();
    }

    // ==========================================
    // TRANG LÀM BÀI THI
    // ==========================================
    if (isExamTake) {
        const examId = localStorage.getItem('currentExamId');
        if (!examId) {
            window.location.href = '/user/exam/exam-list.html';
            return;
        }

        let examData = null;
        let questions = [];
        let currentIndex = 0;
        let answers = {}; // Lưu đáp án thí sinh { 0: 'A', 1: 'B', ... }
        let timerInterval = null;

        // Xử lý Fullscreen Modal
        const fsModal = document.getElementById('fullscreen-modal');
        const btnFs = document.getElementById('btn-enter-fullscreen');
        
        btnFs.addEventListener('click', () => {
            document.documentElement.requestFullscreen().then(() => {
                fsModal.style.display = 'none';
                startExamTimer(60); // 60 phút mặc định
            }).catch(err => {
                Swal.fire('Lỗi', 'Trình duyệt không hỗ trợ toàn màn hình.', 'error');
            });
        });

        // Bắt sự kiện thoát Fullscreen -> Tự động nộp bài (chuẩn an toàn phòng thi)
        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement && fsModal.style.display === 'none') {
                submitExam('Bạn đã vi phạm quy chế (Thoát toàn màn hình). Hệ thống đã tự động nộp bài.');
            }
        });

        // Fetch chi tiết đề thi
        fetch(`/api/exams/${examId}`)
            .then(res => res.json())
            .then(result => {
                if (result.success) {
                    examData = result.data;
                    document.getElementById('take-exam-title').textContent = examData.TenDeThi;
                    try {
                        const parsed = JSON.parse(examData.NoiDungJSON);
                        questions = parsed.questions || generateDummyQuestions(40);
                    } catch(e) {
                        questions = generateDummyQuestions(40);
                    }
                    initPalette();
                    renderQuestion(0);
                } else {
                    Swal.fire('Lỗi', 'Không lấy được đề thi', 'error');
                }
            })
            .catch(err => {
                // Mock data
                document.getElementById('take-exam-title').textContent = 'BMC 06_TƯ DUY TOÁN HỌC';
                questions = generateDummyQuestions(40);
                initPalette();
                renderQuestion(0);
            });

        function initPalette() {
            const grid = document.getElementById('palette-grid');
            grid.innerHTML = '';
            for (let i = 0; i < questions.length; i++) {
                const square = document.createElement('div');
                square.className = 'q-square';
                square.textContent = i + 1;
                square.onclick = () => renderQuestion(i);
                grid.appendChild(square);
            }
            updateProgress();
        }

        function renderQuestion(index) {
            if (index < 0 || index >= questions.length) return;
            currentIndex = index;
            
            const q = questions[index];
            const container = document.getElementById('question-container');
            
            // Layout câu hỏi cơ bản
            let html = `
                <div class="question-block">
                    <div class="q-title">
                        <div class="q-num">${index + 1}</div>
                        <div class="q-content">${q.content}</div>
                    </div>
            `;
            
            if (q.type === 'multiple_choice') {
                html += `<div class="q-options">`;
                const labels = ['A', 'B', 'C', 'D'];
                q.options.forEach((opt, idx) => {
                    const isChecked = answers[index] === labels[idx] ? 'checked' : '';
                    const isSelectedClass = isChecked ? 'selected' : '';
                    html += `
                        <label class="opt-label ${isSelectedClass}" onclick="selectAnswer(${index}, '${labels[idx]}', this)">
                            <input type="radio" name="q_${index}" value="${labels[idx]}" ${isChecked}>
                            <strong>${labels[idx]}.</strong> ${opt}
                        </label>
                    `;
                });
                html += `</div>`;
            } else if (q.type === 'true_false') {
                html += `
                    <table class="tf-table">
                        <thead>
                            <tr>
                                <th>Mệnh đề</th>
                                <th>Nội dung</th>
                                <th>Đúng</th>
                                <th>Sai</th>
                            </tr>
                        </thead>
                        <tbody>
                `;
                q.propositions.forEach((prop, idx) => {
                    const ans = answers[index] ? answers[index][idx] : null; // ['T','F','T']
                    html += `
                        <tr>
                            <td>${['a)', 'b)', 'c)', 'd)'][idx]}</td>
                            <td>${prop}</td>
                            <td><input type="radio" name="q_${index}_${idx}" value="T" ${ans === 'T' ? 'checked' : ''} onchange="selectTF(${index}, ${idx}, 'T')"></td>
                            <td><input type="radio" name="q_${index}_${idx}" value="F" ${ans === 'F' ? 'checked' : ''} onchange="selectTF(${index}, ${idx}, 'F')"></td>
                        </tr>
                    `;
                });
                html += `</tbody></table>`;
            }

            html += `</div>`;
            container.innerHTML = html;

            // Render MathJax
            if (window.MathJax) {
                MathJax.typesetPromise([container]).catch(err => console.log(err));
            }

            // Update Palette Colors
            const squares = document.querySelectorAll('.q-square');
            squares.forEach((sq, i) => {
                sq.className = 'q-square';
                if (answers[i]) sq.classList.add('done');
                if (i === currentIndex) sq.classList.add('current');
            });

            // Update Nav Buttons
            document.getElementById('btn-prev').style.visibility = currentIndex === 0 ? 'hidden' : 'visible';
            document.getElementById('btn-next').innerHTML = currentIndex === questions.length - 1 ? 'Hoàn thành' : 'Câu tiếp <i class="fa-solid fa-chevron-right"></i>';
        }

        // Expose function for inline onclick
        window.selectAnswer = function(qIndex, val, el) {
            answers[qIndex] = val;
            document.querySelectorAll('.opt-label').forEach(lbl => lbl.classList.remove('selected'));
            el.classList.add('selected');
            el.querySelector('input').checked = true;
            updateProgress();
            
            // Cập nhật palette background cho câu hiện tại thành đỏ
            document.querySelectorAll('.q-square')[qIndex].classList.add('done');
        };

        window.selectTF = function(qIndex, pIndex, val) {
            if (!answers[qIndex]) answers[qIndex] = [];
            answers[qIndex][pIndex] = val;
            // Kiem tra da dien du 3-4 y chua, neu du roi thi danh dau done
            const q = questions[qIndex];
            if (answers[qIndex].filter(x => x !== undefined).length === q.propositions.length) {
                document.querySelectorAll('.q-square')[qIndex].classList.add('done');
                updateProgress();
            }
        };

        function updateProgress() {
            const doneCount = Object.keys(answers).length; // Lưu ý: Với True/False cần logic chuẩn hơn, đây là logic giản lược
            const total = questions.length;
            document.getElementById('progress-count').textContent = `${doneCount}/${total} câu`;
            document.getElementById('progress-bar-fill').style.width = `${(doneCount/total)*100}%`;
        }

        // Navigation
        document.getElementById('btn-prev').addEventListener('click', () => {
            if (currentIndex > 0) renderQuestion(currentIndex - 1);
        });
        document.getElementById('btn-next').addEventListener('click', () => {
            if (currentIndex < questions.length - 1) {
                renderQuestion(currentIndex + 1);
            } else {
                Swal.fire({
                    title: 'Nộp bài?',
                    text: "Bạn đã làm đến câu cuối cùng. Bạn có chắc chắn muốn nộp bài không?",
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: 'Nộp bài',
                    cancelButtonText: 'Kiểm tra lại'
                }).then((result) => {
                    if (result.isConfirmed) submitExam('Bạn đã nộp bài thành công!');
                });
            }
        });

        // Timer Logic
        function startExamTimer(minutes) {
            let seconds = minutes * 60;
            const timerEl1 = document.getElementById('time-remaining');
            const timerEl2 = document.getElementById('sidebar-timer');
            
            // Hiển thị giờ thật
            setInterval(() => {
                const now = new Date();
                document.getElementById('real-time').textContent = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            }, 1000);

            timerInterval = setInterval(() => {
                seconds--;
                if (seconds <= 0) {
                    clearInterval(timerInterval);
                    submitExam('Hết giờ làm bài! Hệ thống đã tự động thu bài.');
                    return;
                }
                
                const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
                const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
                const s = (seconds % 60).toString().padStart(2, '0');
                const str = h === '00' ? `${m}:${s}` : `${h}:${m}:${s}`;
                
                timerEl1.textContent = str;
                timerEl2.textContent = str;
                
                if (seconds <= 300) { // 5 phút cuối
                    timerEl1.style.color = 'var(--primary-red)';
                    timerEl2.style.color = 'var(--primary-red)';
                }
            }, 1000);
        }

        // Submit
        document.getElementById('btn-submit').addEventListener('click', () => {
            Swal.fire({
                title: 'Nộp bài?',
                text: "Sau khi nộp bài sẽ không thể sửa lại. Bạn có chắc chắn?",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#b91c1c',
                confirmButtonText: 'Nộp bài',
                cancelButtonText: 'Làm tiếp'
            }).then((result) => {
                if (result.isConfirmed) submitExam('Bạn đã nộp bài thành công!');
            });
        });

        window.submitExam = function(msg) {
            clearInterval(timerInterval);
            if (document.fullscreenElement) document.exitFullscreen();
            
            Swal.fire({
                title: 'Hoàn thành!',
                text: msg,
                icon: 'success',
                allowOutsideClick: false,
                confirmButtonText: 'Xem điểm'
            }).then(() => {
                window.location.href = '/user/dashboard.html';
            });
        }

        // Mock data generator
        function generateDummyQuestions(count) {
            const arr = [];
            for (let i = 0; i < count; i++) {
                if (i % 3 === 0) {
                    arr.push({
                        type: 'true_false',
                        content: `Cho phương trình ẩn $x$: $\\sin^n(x) - \\cos^n(x) = 1 \\ (n \\in \\mathbb{N}^*)$. Xét tính đúng sai các mệnh đề sau:`,
                        propositions: [
                            `Với $n=1$ phương trình tương đương $\\cos(x - \\frac{\\pi}{4}) = \\frac{1}{\\sqrt{2}}$`,
                            `Phương trình luôn có nghiệm với mọi $n \\in \\mathbb{N}^*$`,
                            `Phương trình có đúng 2 nghiệm phân biệt trên $[0; 2\\pi]$ khi $n$ chẵn.`
                        ]
                    });
                } else {
                    arr.push({
                        type: 'multiple_choice',
                        content: `Giải phương trình $\\int_{0}^{1} x^2 dx + ${i}$ có kết quả là bao nhiêu?`,
                        options: [`Đáp án A cho câu ${i+1}`, `Đáp án B cho câu ${i+1}`, `Đáp án C cho câu ${i+1}`, `Đáp án D cho câu ${i+1}`]
                    });
                }
            }
            return arr;
        }
    }
});
