document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // WIZARD LOGIC & SORTABLE BLOCKS
    // ==========================================
    const step1 = document.getElementById('wizard-step-1');
    const step2 = document.getElementById('wizard-step-2');
    const badge1 = document.getElementById('badge-step-1');
    const badge2 = document.getElementById('badge-step-2');

    document.getElementById('btn-next-step').addEventListener('click', () => {
        const examCode = document.getElementById('exam-code').value.trim();
        const examName = document.getElementById('exam-name').value.trim();
        if (!examCode || !examName) {
            Swal.fire('Lỗi', 'Vui lòng nhập Mã và Tên đề thi', 'error');
            return;
        }
        step1.style.display = 'none';
        step2.style.display = 'block';
        badge1.classList.remove('active');
        badge2.classList.add('active');
        
        // Cập nhật lại thứ tự tab dựa trên kết quả kéo thả Sortable
        const order = Array.from(document.getElementById('time-blocks-list').children).map(el => el.getAttribute('data-id'));
        const tabsContainer = document.getElementById('exam-tabs-container');
        order.forEach(id => {
            const btn = tabsContainer.querySelector(`[data-tab="${id}"]`);
            if (btn) tabsContainer.appendChild(btn);
        });
        // Active tab đầu tiên
        tabsContainer.querySelector('.tab-btn').click();
    });

    document.getElementById('btn-prev-step').addEventListener('click', () => {
        step2.style.display = 'none';
        step1.style.display = 'block';
        badge2.classList.remove('active');
        badge1.classList.add('active');
    });

    if (window.Sortable) {
        new Sortable(document.getElementById('time-blocks-list'), {
            animation: 150,
            ghostClass: 'sortable-ghost'
        });
    }

    // ==========================================

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
            const activeTab = document.querySelector('.tab-content.active');
            if (!activeTab) return;
            const sectionId = activeTab.getAttribute('data-section');
            const container = activeTab.querySelector('.passages-container');
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

        // Xử lý upload ảnh cho ngữ liệu
        const pImgPreview = passageCard.querySelector('.passage-image-preview');
        const pFileInput = passageCard.querySelector('.passage-file');
        pFileInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const file = this.files[0];
                const reader = new FileReader();
                reader.onload = function(e) {
                    const base64 = e.target.result;
                    fetch('/api/admin/upload-image', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ base64: base64, filename: file.name })
                    })
                    .then(res => res.json())
                    .then(data => {
                        if (data.success) {
                            pImgPreview.src = data.url;
                            pImgPreview.style.display = 'block';
                            pImgPreview.dataset.uploaded = 'true';
                        } else {
                            alert('Lỗi lưu ảnh: ' + data.message);
                        }
                    })
                    .catch(err => console.error(err));
                };
                reader.readAsDataURL(file);
            } else {
                pImgPreview.src = '';
                pImgPreview.style.display = 'none';
                pImgPreview.dataset.uploaded = 'false';
            }
        });

        // Điền dữ liệu nếu đang Edit
        if (initialData) {
            passageCard.querySelector('.passage-context').value = initialData.context || '';
            if (initialData.image) {
                pImgPreview.src = initialData.image;
                pImgPreview.style.display = 'block';
                pImgPreview.dataset.uploaded = 'true';
            }
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
            if (initialData.type === 'drag_drop') {
                renderAnswerUI(ansWrapper, 'drag_drop', qId, initialData);
            } else if (initialData.type === 3) {
                ansWrapper.dataset.initialOptions = JSON.stringify(initialData.options || initialData.answers);
                renderAnswerUI(ansWrapper, '3', qId, initialData.options || initialData.answers);
            } else {
                renderAnswerUI(ansWrapper, initialData.type.toString(), qId, initialData.answers);
            }
        } else {
            renderAnswerUI(ansWrapper, '1', qId);
        }

        // Xử lý upload ảnh cho câu hỏi con
        const fileInput = qCard.querySelector('.question-image-upload');
        fileInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const file = this.files[0];
                const reader = new FileReader();
                reader.onload = function(e) {
                    const base64 = e.target.result;
                    // Upload to server instead of saving base64
                    fetch('/api/admin/upload-image', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ base64: base64, filename: file.name })
                    })
                    .then(res => res.json())
                    .then(data => {
                        if (data.success) {
                            imgPreview.src = data.url;
                            imgPreview.style.display = 'block';
                            imgPreview.dataset.uploaded = 'true';
                        } else {
                            alert('Lỗi lưu ảnh: ' + data.message);
                        }
                    })
                    .catch(err => console.error(err));
                };
                reader.readAsDataURL(file);
            } else {
                imgPreview.src = '';
                imgPreview.style.display = 'none';
                imgPreview.dataset.uploaded = 'false';
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
            wrapper.innerHTML = `
                <div class="tf-container"></div>
                <button type="button" class="btn-secondary btn-add-tf" style="margin-top: 10px;"><i class="fa-solid fa-plus"></i> Thêm mệnh đề</button>
            `;
            const tfContainer = wrapper.querySelector('.tf-container');
            const btnAddTf = wrapper.querySelector('.btn-add-tf');
            
            const renderTfRows = () => {
                const rows = tfContainer.querySelectorAll('.tf-row');
                rows.forEach((row, idx) => {
                    const l = String.fromCharCode(97 + idx); // 0 -> a, 1 -> b
                    row.setAttribute('data-label', l);
                    row.querySelector('.tf-label').textContent = `${l}.`;
                    row.querySelector('.tf-val').placeholder = `Nhập nội dung ý ${l}...`;
                    const radios = row.querySelectorAll('input[type="radio"]');
                    radios[0].name = `${qId}_tf_${l}`;
                    radios[1].name = `${qId}_tf_${l}`;
                });
            };

            const addTfRow = (text = '', isTrue = true) => {
                const row = document.createElement('div');
                row.className = 'tf-row';
                row.style.cssText = 'display: flex; gap: 10px; align-items: center; margin-bottom: 8px;';
                row.innerHTML = `
                    <strong class="tf-label"></strong>
                    <input type="text" class="tf-val math-input" style="flex: 1; padding: 6px; border: 1px solid #ccc; border-radius: 4px;" value="${text.replace(/"/g, '&quot;')}">
                    <div class="tf-opts" style="display: flex; gap: 10px;">
                        <label><input type="radio" value="T" ${isTrue ? 'checked' : ''}> Đúng</label>
                        <label><input type="radio" value="F" ${!isTrue ? 'checked' : ''}> Sai</label>
                    </div>
                    <button type="button" class="btn-icon text-red btn-rm-tf" title="Xóa"><i class="fa-solid fa-trash"></i></button>
                `;
                
                row.querySelector('.btn-rm-tf').addEventListener('click', () => {
                    row.remove();
                    renderTfRows();
                });
                row.querySelector('.tf-val').addEventListener('input', () => {
                    if (window.MathJax) MathJax.typesetPromise([row]).catch(()=>{});
                });

                tfContainer.appendChild(row);
                renderTfRows();
            };

            btnAddTf.addEventListener('click', () => addTfRow());

            // Support both old `answers` and new `options` array
            const initialList = initialAnswers || (wrapper.dataset.initialOptions ? JSON.parse(wrapper.dataset.initialOptions) : null);
            if (initialList && initialList.length > 0) {
                initialList.forEach(ans => addTfRow(ans.text, ans.isTrue !== undefined ? ans.isTrue : ans.correct));
            } else {
                ['a', 'b', 'c', 'd'].forEach(() => addTfRow());
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
        else if (type === 'drag_drop') {
            wrapper.innerHTML = `
                <div class="form-group">
                    <label class="font-semibold text-blue-600"><i class="fa-solid fa-arrows-up-down-left-right"></i> Khu vực 1: Nội dung chung</label>
                    <textarea class="dd-content math-input" rows="3" placeholder="Ví dụ: Cho dãy số $u_n$ xác định bởi..." style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px;"></textarea>
                </div>
                
                <div class="form-group" style="margin-top: 15px; border-top: 1px solid #eee; padding-top: 15px;">
                    <label class="font-semibold text-green-600"><i class="fa-solid fa-tags"></i> Khu vực 2: Danh sách Từ khóa (Ô kéo thả)</label>
                    <div class="dd-draggables" style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;"></div>
                    <button type="button" class="btn-secondary btn-add-draggable" style="margin-top: 10px;"><i class="fa-solid fa-plus"></i> Thêm từ khóa</button>
                </div>
                
                <div class="form-group" style="margin-top: 15px; border-top: 1px solid #eee; padding-top: 15px;">
                    <label class="font-semibold text-red-600"><i class="fa-solid fa-list-ol"></i> Khu vực 3: Các câu hỏi con (Chỗ trống)</label>
                    <p style="font-size: 13px; color: #666; margin-bottom: 8px;">Nhập câu văn và gõ <strong>[[DROP]]</strong> tại vị trí muốn thí sinh kéo thả vào.</p>
                    <div class="dd-subquestions" style="display: flex; flex-direction: column; gap: 10px; margin-top: 8px;"></div>
                    <button type="button" class="btn-secondary btn-add-subq" style="margin-top: 10px;"><i class="fa-solid fa-plus"></i> Thêm câu hỏi con</button>
                </div>
            `;
            
            const draggablesContainer = wrapper.querySelector('.dd-draggables');
            const subqContainer = wrapper.querySelector('.dd-subquestions');
            const btnAddDraggable = wrapper.querySelector('.btn-add-draggable');
            const btnAddSubq = wrapper.querySelector('.btn-add-subq');
            
            const updateSubqSelects = () => {
                const words = Array.from(draggablesContainer.querySelectorAll('.dd-keyword')).map(inp => inp.value.trim()).filter(v => v);
                const selects = subqContainer.querySelectorAll('.dd-correct-answer');
                selects.forEach(select => {
                    const currentVal = select.value;
                    select.innerHTML = '<option value="">-- Chọn đáp án đúng --</option>' + 
                        words.map(w => `<option value="${w.replace(/"/g, '&quot;')}">${w}</option>`).join('');
                    if (words.includes(currentVal)) {
                        select.value = currentVal;
                    }
                });
            };

            const createDraggable = (text = '') => {
                const badge = document.createElement('div');
                badge.style.cssText = "display: inline-flex; align-items: center; background: #e5e7eb; padding: 4px 8px; border-radius: 20px; border: 1px solid #d1d5db; gap: 6px;";
                badge.innerHTML = `
                    <input type="text" class="dd-keyword math-input" placeholder="Từ khóa..." value="${text.replace(/"/g, '&quot;')}" style="border: none; background: transparent; outline: none; width: 80px; font-size: 14px; text-align: center;">
                    <i class="fa-solid fa-xmark text-red cursor-pointer btn-rm-draggable" style="font-size: 12px;"></i>
                `;
                
                const inp = badge.querySelector('.dd-keyword');
                inp.addEventListener('input', () => {
                    updateSubqSelects();
                    if (window.MathJax) {
                        MathJax.typesetPromise([badge]).catch(()=>{});
                    }
                });
                
                badge.querySelector('.btn-rm-draggable').addEventListener('click', () => {
                    badge.remove();
                    updateSubqSelects();
                });
                
                draggablesContainer.appendChild(badge);
                updateSubqSelects();
            };

            const createSubQ = (text = '', correctAnswer = '') => {
                const item = document.createElement('div');
                item.className = 'dd-subq-item';
                item.style.cssText = "display: flex; gap: 10px; align-items: flex-start; background: #f9fafb; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb;";
                item.innerHTML = `
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 8px;">
                        <textarea class="dd-subq-txt math-input" rows="2" placeholder="VD: 1. $u_n$ là dãy [[DROP]]" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">${text}</textarea>
                    </div>
                    <div style="width: 150px; display: flex; flex-direction: column; gap: 4px;">
                        <label style="font-size: 12px; font-weight: 600;">Đáp án đúng:</label>
                        <select class="dd-correct-answer" style="padding: 8px; border: 1px solid #ccc; border-radius: 4px; width: 100%;">
                        </select>
                    </div>
                    <button type="button" class="btn-icon text-red btn-rm-subq" title="Xóa" style="margin-top: 20px;"><i class="fa-solid fa-trash"></i></button>
                `;
                
                const selectEl = item.querySelector('.dd-correct-answer');
                const words = Array.from(draggablesContainer.querySelectorAll('.dd-keyword')).map(inp => inp.value.trim()).filter(v => v);
                selectEl.innerHTML = '<option value="">-- Chọn đáp án đúng --</option>' + 
                    words.map(w => `<option value="${w.replace(/"/g, '&quot;')}">${w}</option>`).join('');
                if (correctAnswer) selectEl.value = correctAnswer;
                
                item.querySelector('.dd-subq-txt').addEventListener('input', (e) => {
                    if (window.MathJax) {
                        MathJax.typesetPromise([item]).catch(()=>{});
                    }
                });

                item.querySelector('.btn-rm-subq').addEventListener('click', () => item.remove());
                subqContainer.appendChild(item);
            };

            btnAddDraggable.addEventListener('click', () => createDraggable());
            btnAddSubq.addEventListener('click', () => createSubQ());
            
            if (initialAnswers && initialAnswers.draggables) {
                wrapper.querySelector('.dd-content').value = initialAnswers.content || '';
                initialAnswers.draggables.forEach(d => createDraggable(d));
                if (initialAnswers.subQuestions) {
                    initialAnswers.subQuestions.forEach(sq => createSubQ(sq.text, sq.correctAnswer));
                }
            } else {
                createDraggable('tăng'); 
                createDraggable('giảm');
                createDraggable('-1');
                createDraggable('1');
                createDraggable('bị chặn');
                createSubQ('1. $u_n$ là dãy [[DROP]]', 'tăng');
                createSubQ('2. Cho $v_n$ thì $v_n$ là dãy [[DROP]]', 'bị chặn');
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
        
        // Populate configs
        if (parsedData.config) {
            document.getElementById('cfg-shuffle-qs').checked = !!parsedData.config.shuffleQuestions;
            document.getElementById('cfg-shuffle-opts').checked = !!parsedData.config.shuffleOptions;
            document.getElementById('cfg-lock-back').checked = !!parsedData.config.lockBack;
        }

        const sectionsList = parsedData.config && parsedData.config.phaseOrder ? parsedData.config.phaseOrder : ['ToanHoc', 'DocHieu', 'KhoaHoc'];
        
        // Re-order time blocks
        const blocksContainer = document.getElementById('time-blocks-list');
        sectionsList.forEach(id => {
            const block = blocksContainer.querySelector(`[data-id="${id}"]`);
            if (block) blocksContainer.appendChild(block);
        });

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

        // Lấy danh sách thứ tự block từ SortableJS
        const phaseOrder = Array.from(document.getElementById('time-blocks-list').children).map(el => el.getAttribute('data-id'));

        const data = {
            examCode,
            examName,
            config: {
                shuffleQuestions: document.getElementById('cfg-shuffle-qs').checked,
                shuffleOptions: document.getElementById('cfg-shuffle-opts').checked,
                lockBack: document.getElementById('cfg-lock-back').checked,
                phaseOrder: phaseOrder
            },
            sections: {}
        };

        sectionsList.forEach(secId => {
            const sectionData = { passages: [] };
            const container = document.getElementById(`tab-${secId}`).querySelector('.passages-container');
            const passages = container.querySelectorAll('.passage-card');
            
            passages.forEach(p => {
                const context = p.querySelector('.passage-context').value.trim();
                const pImgPreview = p.querySelector('.passage-image-preview');
                const passageImageBase64 = pImgPreview && pImgPreview.style.display !== 'none' ? pImgPreview.getAttribute('src') : null;

                const passageData = {
                    context: context,
                    image: passageImageBase64,
                    questions: []
                };

                const questions = p.querySelectorAll('.question-card');
                questions.forEach(q => {
                    const qContent = q.querySelector('.q-content').value.trim();
                    const qTypeStr = q.querySelector('.q-type').value;
                    const qType = qTypeStr === 'drag_drop' ? 'drag_drop' : parseInt(qTypeStr);
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
                        const statements = [];
                        const rows = wrapper.querySelectorAll('.tf-row');
                        rows.forEach(row => {
                            const l = row.getAttribute('data-label');
                            const text = row.querySelector('.tf-val').value.trim();
                            const isTrue = row.querySelector(`input[name="${qId}_tf_${l}"]:checked`).value === 'T';
                            statements.push({ text, isTrue });
                        });
                        qData.options = statements; // Sử dụng mảng linh động
                        delete qData.answers;
                    }
                    else if (qType === 4) {
                        qData.answers = wrapper.querySelector('.sa-val').value.trim();
                    }
                    else if (qType === 'drag_drop') {
                        const content = wrapper.querySelector('.dd-content').value.trim();
                        const draggables = Array.from(wrapper.querySelectorAll('.dd-keyword')).map(inp => inp.value.trim()).filter(v => v);
                        const subQuestions = Array.from(wrapper.querySelectorAll('.dd-subq-item')).map(item => {
                            return {
                                text: item.querySelector('.dd-subq-txt').value.trim(),
                                correctAnswer: item.querySelector('.dd-correct-answer').value
                            };
                        });
                        qData.content = content;
                        qData.draggables = draggables;
                        qData.subQuestions = subQuestions;
                        delete qData.answers;
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
