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

        function getExamType(exam) {
            if (exam.NoiDungJSON) {
                try { return JSON.parse(exam.NoiDungJSON).examType || 'full'; } catch(e) {}
            }
            return 'full';
        }
        const TYPE_LABELS = { ToanHoc: 'TOÁN HỌC', DocHieu: 'ĐỌC HIỂU', KhoaHoc: 'KHOA HỌC', full: 'FULL 3 PHẦN' };

        document.querySelectorAll('.exam-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.exam-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderExams(btn.dataset.filter);
            });
        });

        function renderExams(filter) {
            const container = document.getElementById('exam-list-container');
            container.innerHTML = '';
            const exams = filter === 'all' ? allExams : allExams.filter(e => getExamType(e) === filter);
            
            if (exams.length === 0) {
                container.innerHTML = '<div style="grid-column: 1/-1; text-align: center;">Không có đề thi nào phù hợp.</div>';
                return;
            }

            exams.forEach(exam => {
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
                        <h4>TSA - ${TYPE_LABELS[getExamType(exam)] || 'FULL 3 PHẦN'}</h4>
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
        let questionTimes = {}; // Lưu thời gian làm từng câu (giây)

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
        fetch(`/api/admin/exams/${examId}`)
            .then(res => res.json())
            .then(result => {
                if (result.success) {
                    examData = result.data;
                    document.getElementById('take-exam-title').textContent = examData.TenDeThi;
                    try {
                        const parsed = JSON.parse(examData.NoiDungJSON);
                        questions = [];
                        if (parsed.sections) {
                            for (const secKey in parsed.sections) {
                                const sec = parsed.sections[secKey];
                                if (sec.passages) {
                                    sec.passages.forEach(passage => {
                                        if (passage.questions) {
                                            passage.questions.forEach(q => {
                                                q.passageContext = passage.context;
                                                q.passageImage = passage.image;
                                                questions.push(q);
                                            });
                                        }
                                    });
                                }
                            }
                        }
                        if (questions.length === 0) questions = parsed.questions || generateDummyQuestions(40);
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
            
            // Cập nhật text thời gian ngay khi đổi câu
            let s = questionTimes[currentIndex] || 0;
            const m = Math.floor(s / 60).toString().padStart(2, '0');
            const sec = (s % 60).toString().padStart(2, '0');
            const realTimeEl = document.getElementById('real-time');
            if (realTimeEl) realTimeEl.textContent = `${m}:${sec}`;
            
            const q = questions[index];
            const container = document.getElementById('question-container');
            
            // Layout câu hỏi cơ bản
            let html = `
                <div class="question-block">
            `;
            if (q.passageContext) {
                html += `<div class="passage-context" style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid var(--primary-red);"><strong>Ngữ liệu:</strong><br/>${q.passageContext.replace(/\n/g, '<br/>')}</div>`;
            }

            const isMarked = window.markedQuestions && window.markedQuestions.includes(index);
            html += `
                    <div class="q-title" style="display: flex; gap: 10px; align-items: flex-start; justify-content: space-between; margin-bottom: 15px;">
                        <div style="display: flex; gap: 10px;">
                            <div class="q-num" style="flex-shrink: 0;">${index + 1}</div>
                            <div class="q-content">${q.content ? q.content.replace(/\n/g, '<br/>') : ''}</div>
                        </div>
                        <button type="button" class="tk-flag ${isMarked ? 'active' : ''}" onclick="toggleMarkQuestion(${index})" title="Đánh dấu câu hỏi này" style="flex-shrink: 0; width: 32px; height: 32px; border: 1px solid #d1d5db; border-radius: 50%; background: ${isMarked ? '#ffb300' : '#fff'}; color: ${isMarked ? '#fff' : '#6b7280'}; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">
                            <i class="fa-solid fa-bookmark"></i>
                        </button>
                    </div>
            `;
            if (q.questionImage) {
                html += `<div style="margin-bottom: 15px;"><img src="${q.questionImage}" style="max-width: 100%; max-height: 300px; border-radius: 8px;" /></div>`;
            }
            
            if (q.type === 1 || q.type === 'multiple_choice') {
                html += `<div class="q-options">`;
                const labels = ['A', 'B', 'C', 'D'];
                const choices = q.answers && q.answers.choices ? q.answers.choices : (q.options || []);
                choices.forEach((opt, idx) => {
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
            } else if (q.type === 2) {
                html += `<div class="q-options">`;
                const labels = ['A', 'B', 'C', 'D'];
                const choices = q.answers && q.answers.choices ? q.answers.choices : [];
                const ansList = answers[index] || [];
                choices.forEach((opt, idx) => {
                    const isChecked = ansList.includes(labels[idx]) ? 'checked' : '';
                    const isSelectedClass = isChecked ? 'selected' : '';
                    html += `
                        <label class="opt-label ${isSelectedClass}" onclick="selectMultiAnswer(${index}, '${labels[idx]}', this, event)">
                            <input type="checkbox" name="q_${index}" value="${labels[idx]}" ${isChecked}>
                            <strong>${labels[idx]}.</strong> ${opt}
                        </label>
                    `;
                });
                html += `</div>`;
            } else if (q.type === 3 || q.type === 'true_false') {
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
                const props = (q.options && Array.isArray(q.options)) ? q.options.map(o => o.text) : ((q.answers && Array.isArray(q.answers)) ? q.answers.map(a => a.text) : (q.propositions || []));
                props.forEach((prop, idx) => {
                    const l = String.fromCharCode(97 + idx); // a, b, c...
                    const ans = answers[index] ? answers[index][idx] : null; // ['T','F','T']
                    html += `
                        <tr>
                            <td>${l})</td>
                            <td>${prop}</td>
                            <td><input type="radio" name="q_${index}_${idx}" value="T" ${ans === 'T' ? 'checked' : ''} onchange="selectTF(${index}, ${idx}, 'T')"></td>
                            <td><input type="radio" name="q_${index}_${idx}" value="F" ${ans === 'F' ? 'checked' : ''} onchange="selectTF(${index}, ${idx}, 'F')"></td>
                        </tr>
                    `;
                });
                html += `</tbody></table>`;
            } else if (q.type === 4) {
                const ans = answers[index] || '';
                html += `
                    <div class="q-short-answer" style="margin-top: 15px;">
                        <input type="text" placeholder="Nhập câu trả lời của bạn..." style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px;" value="${ans}" oninput="selectShortAnswer(${index}, this.value)">
                    </div>
                `;
            } else if (q.type === 5) {
                const template = (q.answers && q.answers.template) ? q.answers.template : '';
                const ans = answers[index] || {};
                
                let htmlStr = `<div class="q-dd-instruction" style="font-weight: 700; margin-bottom: 12px; font-size: 14px; color: #1f2937;">Kéo ô thích hợp và thả vào vị trí tương ứng</div>`;
                
                // Render Bank
                htmlStr += `<div class="tk-dd-bank" ondragover="allowDrop(event)" ondrop="drop(event, ${index}, 'bank')" style="display: flex; flex-wrap: wrap; gap: 8px; border: 1px solid #9ca3af; border-radius: 6px; padding: 12px; min-height: 50px; margin-bottom: 20px;">`;
                
                if (q.answers && q.answers.cards) {
                    q.answers.cards.forEach((card, cIdx) => {
                        let isUsed = false;
                        for (let k in ans) {
                            if (ans[k] === card.text) { isUsed = true; break; }
                        }
                        if (!isUsed) {
                            htmlStr += `<div class="tk-chip" draggable="true" ondragstart="drag(event)" ondragend="dragEnd(event)" data-text="${card.text.replace(/"/g, '&quot;')}" style="background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 4px; padding: 6px 16px; font-size: 14px; cursor: grab; user-select: none;">${card.text}</div>`;
                        }
                    });
                }
                htmlStr += `</div>`;
                
                // Nếu template không có cú pháp [1], [2],... thì tự động thêm [1] vào cuối
                let finalTemplate = template;
                if (!/\[\d+\]/.test(finalTemplate)) {
                    finalTemplate += ` [1]`;
                }

                let filledTemplate = finalTemplate.replace(/\[(\d+)\]/g, (match, p1) => {
                    const val = ans[p1] || '';
                    let content = '';
                    if (val) {
                        content = `<div class="tk-chip" draggable="true" ondragstart="drag(event)" ondragend="dragEnd(event)" data-text="${val.replace(/"/g, '&quot;')}" style="background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 4px; padding: 4px 12px; font-size: 14px; cursor: grab; user-select: none; display: inline-block;">${val}</div>`;
                    }
                    return `<span class="tk-blank" ondragover="allowDrop(event)" ondrop="drop(event, ${index}, '${p1}')" style="display: inline-flex; align-items: center; justify-content: center; min-width: 80px; height: 32px; border: 1px dashed #9ca3af; border-radius: 4px; vertical-align: middle; margin: 0 4px; padding: 0 4px; background: #fff;">${content}</span>`;
                });

                htmlStr += `
                    <div class="q-fill-blank" style="margin-top: 15px; font-size: 16px; line-height: 2;">
                        ${filledTemplate}
                    </div>
                `;
                html += htmlStr;
            } else if (q.type === 'drag_drop') {
                const draggables = q.draggables || [];
                const subQuestions = q.subQuestions || [];
                const ans = answers[index] || {};
                
                let htmlStr = `<div class="q-dd-instruction" style="font-weight: 700; margin-bottom: 12px; font-size: 14px; color: #1f2937;">Kéo ô thích hợp và thả vào vị trí tương ứng</div>`;
                
                // Khay chứa đáp án (Draggable Pool)
                htmlStr += `<div class="tk-dd-bank" ondragover="allowDrop(event)" ondrop="drop(event, ${index}, 'bank')">`;
                draggables.forEach((text, dIdx) => {
                    let isUsed = Object.values(ans).includes(text);
                    if (!isUsed) {
                        htmlStr += `<div class="draggable-item" draggable="true" ondragstart="drag(event)" ondragend="dragEnd(event)" data-text="${text.replace(/"/g, '&quot;')}">${text}</div>`;
                    }
                });
                htmlStr += `</div>`;
                
                // Drop Zones (Nội dung câu hỏi)
                htmlStr += `<div class="q-fill-blank" style="margin-top: 15px; font-size: 16px; line-height: 2;">`;
                
                subQuestions.forEach((sq, sqIdx) => {
                    let filledText = sq.text.replace(/\[\[DROP\]\]/g, () => {
                        const val = ans[`sq_${sqIdx}`] || '';
                        let content = '';
                        if (val) {
                            content = `<div class="draggable-item" draggable="true" ondragstart="drag(event)" ondragend="dragEnd(event)" data-text="${val.replace(/"/g, '&quot;')}">${val}</div>`;
                        }
                        return `<span class="drop-zone" ondragover="allowDrop(event)" ondrop="drop(event, ${index}, 'sq_${sqIdx}')">${content}</span>`;
                    });
                    htmlStr += `<div style="margin-bottom: 10px;">${filledText}</div>`;
                });
                
                htmlStr += `</div>`;
                html += htmlStr;
            }

            html += `</div>`;
            container.innerHTML = html;

            // Render MathJax
            if (window.MathJax) {
                MathJax.typesetPromise([container]).catch(err => console.log(err));
            }

            // Update Palette Colors
            updateProgress();

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

        window.selectMultiAnswer = function(qIndex, val, el, event) {
            if (event.target.tagName !== 'INPUT') {
                const checkbox = el.querySelector('input');
                checkbox.checked = !checkbox.checked;
            }
            const isChecked = el.querySelector('input').checked;
            
            if (!answers[qIndex]) answers[qIndex] = [];
            if (isChecked) {
                if (!answers[qIndex].includes(val)) answers[qIndex].push(val);
                el.classList.add('selected');
            } else {
                answers[qIndex] = answers[qIndex].filter(v => v !== val);
                el.classList.remove('selected');
            }
            
            if (answers[qIndex].length > 0) {
                document.querySelectorAll('.q-square')[qIndex].classList.add('done');
            } else {
                document.querySelectorAll('.q-square')[qIndex].classList.remove('done');
            }
            updateProgress();
        };

        window.selectShortAnswer = function(qIndex, val) {
            answers[qIndex] = val;
            if (val.trim() !== '') {
                document.querySelectorAll('.q-square')[qIndex].classList.add('done');
            } else {
                document.querySelectorAll('.q-square')[qIndex].classList.remove('done');
            }
            updateProgress();
        };

        window.selectFillBlank = function(qIndex, p1, val) {
            if (!answers[qIndex]) answers[qIndex] = {};
            answers[qIndex][p1] = val;
            
            let hasValue = false;
            for (let key in answers[qIndex]) {
                if (answers[qIndex][key].trim() !== '') hasValue = true;
            }
            
            if (hasValue) {
                document.querySelectorAll('.q-square')[qIndex].classList.add('done');
            } else {
                document.querySelectorAll('.q-square')[qIndex].classList.remove('done');
            }
            updateProgress();
        };

        window.selectTF = function(qIndex, pIndex, val) {
            if (!answers[qIndex]) answers[qIndex] = [];
            answers[qIndex][pIndex] = val;
            const q = questions[qIndex];
            const propsCount = (q.options && Array.isArray(q.options)) ? q.options.length : ((q.answers && Array.isArray(q.answers)) ? q.answers.length : (q.propositions ? q.propositions.length : 4));
            if (answers[qIndex].filter(x => x !== undefined && x !== null).length === propsCount) {
                document.querySelectorAll('.q-square')[qIndex].classList.add('done');
            } else {
                document.querySelectorAll('.q-square')[qIndex].classList.remove('done');
            }
            updateProgress();
        };

        window.draggedData = null;

        window.drag = function(ev) {
            const text = ev.currentTarget.getAttribute('data-text');
            window.draggedData = text;
            ev.dataTransfer.setData("text/plain", text);
            setTimeout(() => {
                if (ev.target && ev.target.style) {
                    ev.target.style.opacity = '0.01';
                }
            }, 0);
        };

        window.dragEnd = function(ev) {
            if (ev.target && ev.target.style) {
                ev.target.style.opacity = '1';
            }
        };

        window.allowDrop = function(ev) {
            ev.preventDefault();
        };

        window.markedQuestions = window.markedQuestions || [];
        window.toggleMarkQuestion = function(qIndex) {
            const idx = window.markedQuestions.indexOf(qIndex);
            if (idx === -1) {
                window.markedQuestions.push(qIndex);
            } else {
                window.markedQuestions.splice(idx, 1);
            }
            renderQuestion(qIndex);
            updateProgress(); // Cập nhật lại palette
        };

        window.drop = function(ev, qIndex, targetType) {
            ev.preventDefault();
            const data = window.draggedData;
            if (!data) return;
            
            if (!answers[qIndex]) answers[qIndex] = {};
            
            if (targetType === 'bank') {
                for (let k in answers[qIndex]) {
                    if (answers[qIndex][k] === data) {
                        delete answers[qIndex][k];
                    }
                }
            } else {
                for (let k in answers[qIndex]) {
                    if (answers[qIndex][k] === data) {
                        delete answers[qIndex][k];
                    }
                }
                answers[qIndex][targetType] = data;
            }
            
            renderQuestion(qIndex);
            
            let hasValue = Object.keys(answers[qIndex]).length > 0;
            if (hasValue) {
                document.querySelectorAll('.q-square')[qIndex].classList.add('done');
            } else {
                document.querySelectorAll('.q-square')[qIndex].classList.remove('done');
            }
            updateProgress();
            window.draggedData = null;
        };

        function updateProgress() {
            const doneCount = Object.keys(answers).length;
            const total = questions.length;
            document.getElementById('progress-count').textContent = `${doneCount}/${total} câu`;
            document.getElementById('progress-bar-fill').style.width = `${(doneCount/total)*100}%`;
            
            document.querySelectorAll('.q-square').forEach((sq, idx) => {
                // Check if answered
                let isAnswered = false;
                if (answers[idx] !== undefined) {
                    const q = questions[idx];
                    if (q.type === 3 || q.type === 'true_false') {
                        const optionsLength = (q.options && Array.isArray(q.options)) ? q.options.length : ((q.answers && Array.isArray(q.answers)) ? q.answers.length : (q.propositions ? q.propositions.length : 4));
                        if (Array.isArray(answers[idx])) {
                            isAnswered = answers[idx].filter(x => x !== undefined && x !== null).length === optionsLength;
                        } else if (typeof answers[idx] === 'object') {
                            isAnswered = Object.keys(answers[idx]).length === optionsLength;
                        }
                    } else if (Array.isArray(answers[idx])) {
                        isAnswered = answers[idx].filter(x => x !== undefined).length > 0;
                    } else if (typeof answers[idx] === 'object') {
                        isAnswered = Object.keys(answers[idx]).length > 0;
                    } else if (typeof answers[idx] === 'string') {
                        isAnswered = answers[idx].trim().length > 0;
                    } else {
                        isAnswered = true;
                    }
                }
                
                if (isAnswered) sq.classList.add('done');
                else sq.classList.remove('done');
                
                // Check if marked
                if (window.markedQuestions && window.markedQuestions.includes(idx)) sq.classList.add('flag');
                else sq.classList.remove('flag');
                
                // Check if current
                if (idx === currentIndex) sq.classList.add('current');
                else sq.classList.remove('current');
            });
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
            
            // Đếm thời gian làm câu hiện tại
            setInterval(() => {
                if (questionTimes[currentIndex] === undefined) questionTimes[currentIndex] = 0;
                questionTimes[currentIndex]++;
                let s = questionTimes[currentIndex];
                const m = Math.floor(s / 60).toString().padStart(2, '0');
                const sec = (s % 60).toString().padStart(2, '0');
                document.getElementById('real-time').textContent = `${m}:${sec}`;
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

        // Menu Nộp bài / Sidebar overlay
        const btnMenuSubmit = document.getElementById('btn-menu-submit');
        const btnCloseSidebar = document.getElementById('btn-close-sidebar');
        const overlay = document.getElementById('tk-global-overlay');

        function toggleSidebar() {
            overlay.classList.toggle('active');
            const sidebar = document.getElementById('tk-sidebar');
            if (sidebar) sidebar.classList.toggle('active');
            if (overlay.classList.contains('active')) {
                btnCloseSidebar.style.display = 'block';
            } else {
                btnCloseSidebar.style.display = 'none';
            }
        }

        if (btnMenuSubmit) btnMenuSubmit.addEventListener('click', toggleSidebar);
        if (btnCloseSidebar) btnCloseSidebar.addEventListener('click', toggleSidebar);
        if (overlay) overlay.addEventListener('click', toggleSidebar);

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
