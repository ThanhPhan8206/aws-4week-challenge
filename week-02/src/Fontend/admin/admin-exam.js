document.addEventListener('DOMContentLoaded', () => {

    let mathJaxTimeout;
    function updateMathJax() {
        clearTimeout(mathJaxTimeout);
        mathJaxTimeout = setTimeout(() => {
            if (window.MathJax) {
                MathJax.typesetPromise().catch((err) => console.log('MathJax error:', err));
            }
        }, 500);
    }

    // Lắng nghe sự kiện gõ phím trên form để render lại công thức
    document.addEventListener('input', (e) => {
        if (e.target.tagName.toLowerCase() === 'textarea' || e.target.tagName.toLowerCase() === 'input') {
            updateMathJax();
        }
    });

    const MAX_QUESTIONS = {
        ToanHoc: 40,
        DocHieu: 20,
        KhoaHoc: 40
    };

    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            const targetId = `tab-${btn.getAttribute('data-tab')}`;
            document.getElementById(targetId).classList.add('active');
        });
    });

    const tplPassage = document.getElementById('tpl-passage').content;
    const tplQuestion = document.getElementById('tpl-question').content;

    document.querySelectorAll('.btn-add-passage').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const sectionId = e.currentTarget.closest('.tab-content').getAttribute('data-section');
            const container = document.getElementById(`tab-${sectionId}`).querySelector('.passages-container');
            addPassage(container, sectionId);
        });
    });

    function addPassage(container, sectionId, initialData = null) {
        const passageNode = document.importNode(tplPassage, true);
        const passageCard = passageNode.querySelector('.passage-card');
        
        const toggleBtn = passageCard.querySelector('.toggle-passage');
        toggleBtn.addEventListener('click', () => {
            passageCard.classList.toggle('collapsed');
            toggleBtn.innerHTML = passageCard.classList.contains('collapsed') 
                ? '<i class="fa-solid fa-chevron-up"></i>' 
                : '<i class="fa-solid fa-chevron-down"></i>';
        });

        passageCard.querySelector('.delete-passage').addEventListener('click', () => {
            if(confirm('Bạn có chắc chắn muốn xóa CỤM CÂU HỎI này (bao gồm cả ngữ liệu và các câu con)?')) {
                passageCard.remove();
                updatePassageIndexes(container);
                updateSectionCount(sectionId);
            }
        });

        const addQBtn = passageCard.querySelector('.btn-add-question');
        const qContainer = passageCard.querySelector('.questions-container');
        
        addQBtn.addEventListener('click', () => {
            const currentCount = getSectionQuestionCount(sectionId);
            if (currentCount >= MAX_QUESTIONS[sectionId]) {
                alert(`Không thể thêm câu hỏi! Phần thi này chỉ cho phép tối đa ${MAX_QUESTIONS[sectionId]} câu.`);
                return;
            }
            addQuestion(qContainer, sectionId);
        });

        // Điền dữ liệu nếu đang Edit
        if (initialData) {
            passageCard.querySelector('.passage-context').value = initialData.context || '';
            initialData.questions.forEach(qData => {
                addQuestion(qContainer, sectionId, qData);
            });
        } else {
            addQuestion(qContainer, sectionId);
        }

        container.appendChild(passageNode);
        updatePassageIndexes(container);
    }

    function getSectionQuestionCount(sectionId) {
        const tabContent = document.getElementById(`tab-${sectionId}`);
        return tabContent.querySelectorAll('.question-card').length;
    }

    function updateSectionCount(sectionId) {
        const count = getSectionQuestionCount(sectionId);
        const max = MAX_QUESTIONS[sectionId];
        const tabBtn = document.querySelector(`.tab-btn[data-tab="${sectionId}"]`);
        
        if (tabBtn) {
            const counterSpan = tabBtn.querySelector('.counter');
            counterSpan.textContent = `(${count}/${max})`;
            if (count > max) {
                tabBtn.classList.add('limit-reached');
            } else {
                tabBtn.classList.remove('limit-reached');
            }
        }
    }

    function updatePassageIndexes(container) {
        const passages = container.querySelectorAll('.passage-card');
        passages.forEach((p, idx) => {
            p.querySelector('.passage-name').textContent = `Cụm Câu Hỏi ${idx + 1}`;
        });
    }

    function addQuestion(qContainer, sectionId, initialData = null) {
        const qNode = document.importNode(tplQuestion, true);
        const qCard = qNode.querySelector('.question-card');
        const qId = 'q_' + Math.random().toString(36).substr(2, 9);
        qCard.setAttribute('data-qid', qId);

        qCard.querySelector('.delete-question').addEventListener('click', () => {
            if(confirm('Bạn có chắc chắn muốn xóa câu hỏi này?')) {
                qCard.remove();
                updateQuestionIndexes(qContainer);
                updateSectionCount(sectionId);
            }
        });

        const qTypeSelect = qCard.querySelector('.q-type');
        const ansWrapper = qCard.querySelector('.q-answers-wrapper');

        qTypeSelect.addEventListener('change', (e) => {
            renderAnswerUI(ansWrapper, e.target.value, qId);
        });

        // Nếu có initialData (chế độ sửa)
        const imgPreview = qCard.querySelector('.question-image-preview');
        if (initialData) {
            qCard.querySelector('.q-content').value = initialData.content || '';
            if (initialData.questionImage) {
                imgPreview.src = initialData.questionImage;
                imgPreview.style.display = 'block';
            }
            qTypeSelect.value = initialData.type;
            renderAnswerUI(ansWrapper, initialData.type.toString(), qId, initialData.answers);
        } else {
            renderAnswerUI(ansWrapper, '1', qId);
        }

        // Xử lý upload ảnh cho câu hỏi con
        const fileInput = qCard.querySelector('.question-image-upload');
        fileInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    imgPreview.src = e.target.result;
                    imgPreview.style.display = 'block';
                };
                reader.readAsDataURL(this.files[0]);
            } else {
                imgPreview.src = '';
                imgPreview.style.display = 'none';
            }
        });
        
        qContainer.appendChild(qNode);
        updateQuestionIndexes(qContainer);
        updateSectionCount(sectionId);
        updateMathJax(); // Re-render toán học khi có câu hỏi mới
    }

    function updateQuestionIndexes(qContainer) {
        const questions = qContainer.querySelectorAll('.question-card');
        questions.forEach((q, idx) => {
            q.querySelector('.question-idx').textContent = `Câu ${idx + 1}`;
        });
    }

    // Dynamic Form - Cập nhật để hỗ trợ initialAnswers
    function renderAnswerUI(wrapper, type, qId, initialAnswers = null) {
        wrapper.innerHTML = '';
        
        if (type === '1') {
            wrapper.innerHTML = `
                <div class="ans-row">
                    <input type="radio" name="${qId}_opt" value="0" checked title="Chọn làm đáp án đúng">
                    <strong>A.</strong>
                    <input type="text" class="opt-val" placeholder="Nhập nội dung phương án A...">
                </div>
                <div class="ans-row">
                    <input type="radio" name="${qId}_opt" value="1" title="Chọn làm đáp án đúng">
                    <strong>B.</strong>
                    <input type="text" class="opt-val" placeholder="Nhập nội dung phương án B...">
                </div>
                <div class="ans-row">
                    <input type="radio" name="${qId}_opt" value="2" title="Chọn làm đáp án đúng">
                    <strong>C.</strong>
                    <input type="text" class="opt-val" placeholder="Nhập nội dung phương án C...">
                </div>
                <div class="ans-row">
                    <input type="radio" name="${qId}_opt" value="3" title="Chọn làm đáp án đúng">
                    <strong>D.</strong>
                    <input type="text" class="opt-val" placeholder="Nhập nội dung phương án D...">
                </div>
            `;
            if (initialAnswers) {
                const inputs = wrapper.querySelectorAll('.opt-val');
                initialAnswers.choices.forEach((c, idx) => {
                    if (inputs[idx]) inputs[idx].value = c;
                });
                const radio = wrapper.querySelector(`input[name="${qId}_opt"][value="${initialAnswers.correctIndex}"]`);
                if (radio) radio.checked = true;
            }
        } 
        else if (type === '2') {
            wrapper.innerHTML = `
                <p class="text-gray" style="font-size:13px; margin-bottom:10px;">* Có thể tích chọn nhiều đáp án đúng làm Key.</p>
                <div class="ans-row">
                    <input type="checkbox" class="opt-check" value="0" title="Chọn làm đáp án đúng">
                    <strong>A.</strong>
                    <input type="text" class="opt-val" placeholder="Nhập nội dung phương án A...">
                </div>
                <div class="ans-row">
                    <input type="checkbox" class="opt-check" value="1" title="Chọn làm đáp án đúng">
                    <strong>B.</strong>
                    <input type="text" class="opt-val" placeholder="Nhập nội dung phương án B...">
                </div>
                <div class="ans-row">
                    <input type="checkbox" class="opt-check" value="2" title="Chọn làm đáp án đúng">
                    <strong>C.</strong>
                    <input type="text" class="opt-val" placeholder="Nhập nội dung phương án C...">
                </div>
                <div class="ans-row">
                    <input type="checkbox" class="opt-check" value="3" title="Chọn làm đáp án đúng">
                    <strong>D.</strong>
                    <input type="text" class="opt-val" placeholder="Nhập nội dung phương án D...">
                </div>
            `;
            if (initialAnswers) {
                const inputs = wrapper.querySelectorAll('.opt-val');
                initialAnswers.choices.forEach((c, idx) => {
                    if (inputs[idx]) inputs[idx].value = c;
                });
                initialAnswers.correctIndexes.forEach(idx => {
                    const cb = wrapper.querySelector(`.opt-check[value="${idx}"]`);
                    if (cb) cb.checked = true;
                });
            }
        }
        else if (type === '3') {
            const labels = ['a', 'b', 'c', 'd'];
            let html = '';
            labels.forEach(l => {
                html += `
                    <div class="tf-row" data-label="${l}">
                        <strong>${l}.</strong>
                        <input type="text" class="tf-val" placeholder="Nhập nội dung ý ${l}...">
                        <div class="tf-opts">
                            <label><input type="radio" name="${qId}_tf_${l}" value="T" checked> Đúng</label>
                            <label><input type="radio" name="${qId}_tf_${l}" value="F"> Sai</label>
                        </div>
                    </div>
                `;
            });
            wrapper.innerHTML = html;
            if (initialAnswers) {
                const rows = wrapper.querySelectorAll('.tf-row');
                initialAnswers.forEach((ans, idx) => {
                    if(rows[idx]) {
                        rows[idx].querySelector('.tf-val').value = ans.text;
                        const val = ans.isTrue ? 'T' : 'F';
                        rows[idx].querySelector(`input[value="${val}"]`).checked = true;
                    }
                });
            }
        }
        else if (type === '4') {
            wrapper.innerHTML = `
                <div class="form-group">
                    <label class="font-semibold">Đáp án chuẩn (Hỗ trợ số học hoặc chữ):</label>
                    <input type="text" class="sa-val" placeholder="VD: 42 hoặc 'Nguyễn Trãi'...">
                </div>
            `;
            if (initialAnswers) {
                wrapper.querySelector('.sa-val').value = initialAnswers;
            }
        }
        else if (type === '5') {
            wrapper.innerHTML = `
                <div class="form-group">
                    <label class="font-semibold">Đoạn văn điền khuyết</label>
                    <textarea class="dd-context" rows="2" placeholder="Nhập đoạn văn, sử dụng [1], [2] để tạo khoảng trống..."></textarea>
                </div>
                <div class="dd-cards"></div>
                <button type="button" class="btn-secondary btn-add-dd" style="margin-top: 10px;"><i class="fa-solid fa-plus"></i> Thêm thẻ từ khóa</button>
            `;
            
            const addCardBtn = wrapper.querySelector('.btn-add-dd');
            const cardsContainer = wrapper.querySelector('.dd-cards');
            
            const createCard = (text = '', target = 'distractor') => {
                const item = document.createElement('div');
                item.className = 'dd-item';
                item.innerHTML = `
                    <input type="text" class="dd-txt" placeholder="Nội dung thẻ (VD: quang hợp)" value="${text}">
                    <select class="dd-target">
                        <option value="1">Khớp với ô [1]</option>
                        <option value="2">Khớp với ô [2]</option>
                        <option value="3">Khớp với ô [3]</option>
                        <option value="4">Khớp với ô [4]</option>
                        <option value="distractor">Từ khóa nhiễu</option>
                    </select>
                    <button type="button" class="btn-icon text-red btn-rm-dd" title="Xóa thẻ"><i class="fa-solid fa-trash"></i></button>
                `;
                item.querySelector('.dd-target').value = target;
                item.querySelector('.btn-rm-dd').addEventListener('click', () => item.remove());
                cardsContainer.appendChild(item);
            };

            addCardBtn.addEventListener('click', () => createCard());
            
            if (initialAnswers) {
                wrapper.querySelector('.dd-context').value = initialAnswers.template || '';
                initialAnswers.cards.forEach(c => {
                    createCard(c.text, c.targetBox === null ? 'distractor' : c.targetBox.toString());
                });
            } else {
                createCard(); createCard(); // Mặc định 2 thẻ trống
            }
        }
    }

    // ============================================
    // CHỨC NĂNG EDIT (Chỉnh sửa đề thi)
    // ============================================
    const urlParams = new URLSearchParams(window.location.search);
    const examId = urlParams.get('id');

    if (examId) {
        // Đổi giao diện sang cập nhật
        document.querySelector('.page-title').textContent = 'Cập Nhật Đề Thi Đánh Giá Tư Duy';
        const saveBtn = document.getElementById('btn-save-exam');
        saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Cập Nhật Đề Thi';

        // Gọi API lấy dữ liệu chi tiết
        fetch(`/api/admin/exams/${examId}`)
            .then(res => res.json())
            .then(result => {
                if(result.success && result.data) {
                    fillDataToForm(JSON.parse(result.data.NoiDungJSON));
                } else {
                    alert('Lỗi: ' + (result.message || 'Không tìm thấy đề thi'));
                }
            })
            .catch(err => console.error('Lỗi khi fetch chi tiết đề thi:', err));
    }

    function fillDataToForm(parsedData) {
        document.getElementById('exam-code').value = parsedData.examCode || '';
        document.getElementById('exam-name').value = parsedData.examName || '';

        const sectionsList = ['ToanHoc', 'DocHieu', 'KhoaHoc'];
        sectionsList.forEach(secId => {
            const container = document.getElementById(`tab-${secId}`).querySelector('.passages-container');
            container.innerHTML = ''; // Xóa các cụm rỗng mặc định

            if (parsedData.sections && parsedData.sections[secId] && parsedData.sections[secId].passages) {
                parsedData.sections[secId].passages.forEach(passage => {
                    addPassage(container, secId, passage);
                });
            }
        });
    }

    // 6. Đóng gói dữ liệu JSON
    document.getElementById('btn-save-exam').addEventListener('click', collectExamData);

    function collectExamData() {
        const examCode = document.getElementById('exam-code').value.trim();
        const examName = document.getElementById('exam-name').value.trim();

        if(!examCode || !examName) {
            alert('Lỗi: Vui lòng nhập Mã đề thi và Tên đề thi!');
            return;
        }

        const sectionsList = ['ToanHoc', 'DocHieu', 'KhoaHoc'];
        for (let sec of sectionsList) {
            let count = getSectionQuestionCount(sec);
            if (count > MAX_QUESTIONS[sec]) {
                alert(`Lỗi: Phần ${sec} đang có ${count} câu, vượt mức quy định ${MAX_QUESTIONS[sec]} câu của TSA!`);
                return;
            }
        }

        const data = {
            examCode,
            examName,
            sections: {}
        };

        sectionsList.forEach(secId => {
            const sectionData = { passages: [] };
            const container = document.getElementById(`tab-${secId}`).querySelector('.passages-container');
            const passages = container.querySelectorAll('.passage-card');
            
            passages.forEach(p => {
                const context = p.querySelector('.passage-context').value.trim();
                const fileInput = p.querySelector('.passage-file');
                const imageName = fileInput && fileInput.files.length > 0 ? fileInput.files[0].name : null;

                const passageData = {
                    context: context,
                    image: imageName,
                    questions: []
                };

                const questions = p.querySelectorAll('.question-card');
                questions.forEach(q => {
                    const qContent = q.querySelector('.q-content').value.trim();
                    const qType = parseInt(q.querySelector('.q-type').value);
                    const qId = q.getAttribute('data-qid');
                    const wrapper = q.querySelector('.q-answers-wrapper');
                    
                    const imgPreview = q.querySelector('.question-image-preview');
                    const questionImageBase64 = imgPreview && imgPreview.style.display !== 'none' ? imgPreview.getAttribute('src') : null;

                    const qData = {
                        content: qContent,
                        questionImage: questionImageBase64,
                        type: qType,
                        answers: null
                    };

                    if (qType === 1) {
                        const inputs = wrapper.querySelectorAll('.opt-val');
                        const radios = wrapper.querySelectorAll(`input[name="${qId}_opt"]`);
                        qData.answers = {
                            choices: Array.from(inputs).map(inp => inp.value.trim()),
                            correctIndex: parseInt(Array.from(radios).find(r => r.checked)?.value || 0)
                        };
                    } 
                    else if (qType === 2) {
                        const inputs = wrapper.querySelectorAll('.opt-val');
                        const checkboxes = wrapper.querySelectorAll('.opt-check');
                        const correctIndexes = [];
                        checkboxes.forEach(cb => {
                            if (cb.checked) correctIndexes.push(parseInt(cb.value));
                        });
                        qData.answers = {
                            choices: Array.from(inputs).map(inp => inp.value.trim()),
                            correctIndexes: correctIndexes
                        };
                    }
                    else if (qType === 3) {
                        const labels = ['a', 'b', 'c', 'd'];
                        const statements = [];
                        labels.forEach(l => {
                            const row = wrapper.querySelector(`.tf-row[data-label="${l}"]`) || wrapper.querySelector(`input[name="${qId}_tf_${l}"]`).closest('.tf-row');
                            const text = row.querySelector('.tf-val').value.trim();
                            const isTrue = row.querySelector(`input[name="${qId}_tf_${l}"]:checked`).value === 'T';
                            statements.push({ text, isTrue });
                        });
                        qData.answers = statements;
                    }
                    else if (qType === 4) {
                        qData.answers = wrapper.querySelector('.sa-val').value.trim();
                    }
                    else if (qType === 5) {
                        const ddContext = wrapper.querySelector('.dd-context').value.trim();
                        const cardItems = wrapper.querySelectorAll('.dd-item');
                        const mapping = [];
                        cardItems.forEach(item => {
                            const text = item.querySelector('.dd-txt').value.trim();
                            const target = item.querySelector('.dd-target').value;
                            mapping.push({ 
                                text: text, 
                                targetBox: target === 'distractor' ? null : parseInt(target) 
                            });
                        });
                        qData.answers = {
                            template: ddContext,
                            cards: mapping
                        };
                    }

                    passageData.questions.push(qData);
                });

                sectionData.passages.push(passageData);
            });

            data.sections[secId] = sectionData;
        });

        // Xử lý Gửi dữ liệu (POST hoặc PUT)
        const method = examId ? 'PUT' : 'POST';
        const url = examId ? `/api/admin/exams/${examId}` : '/api/admin/exams';

        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                Swal.fire({ 
                    title: 'Thành công!', 
                    text: examId ? 'Cập nhật đề thi thành công' : 'Lưu đề thi vào Database thành công', 
                    icon: 'success', 
                    confirmButtonText: 'OK' 
                }).then(() => {
                    window.location.href = 'admin-list.html';
                });
            } else {
                Swal.fire('Lỗi', result.message, 'error');
            }
        })
        .catch(error => {
            console.error('Lỗi kết nối API:', error);
            Swal.fire('Lỗi', 'Có lỗi xảy ra khi lưu/cập nhật đề thi. Vui lòng thử lại!', 'error');
        });
    }
});
