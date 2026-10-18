const express = require('express');
const sql = require('mssql/msnodesqlv8');
const path = require('path');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const fs = require('fs');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'phanhuuthanh8206@gmail.com',
        pass: 'ghknyfofbknlqspi'
    }
});

transporter.verify((error, success) => {
    if (error) {
        console.error('Lỗi kết nối SMTP:', error);
    } else {
        console.log('Server đã sẵn sàng gửi email');
    }
});

const app = express();
const port = 3000;

// Middleware đọc dữ liệu từ form
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Redirect root to home/index.html
app.get('/', (req, res) => {
    res.redirect('/home/index.html');
});

// Cấu hình kết nối SQL Server bằng TÀI KHOẢN & MẬT KHẨU
const dbConfig = {
    server: 'localhost\\SQLEXPRESS',
    database: 'DB_ThiTsaHsa',
    user: 'sa',                           // Tên tài khoản SQL Server của bạn
    password: '12345678',     // MẬT KHẨU BẠN VỪA ĐỔI (hãy sửa lại cho đúng nhé)
    driver: 'ODBC Driver 17 for SQL Server',
    options: {
        trustServerCertificate: true      // Bỏ qua lỗi chứng chỉ SSL
    }
};

// API 1: Xử lý Đăng ký
app.post('/api/register', async (req, res) => {
    try {
        const { hoTen, email, matKhau } = req.body;
        const pool = app.locals.db;

        // Kiểm tra xem email đã tồn tại chưa
        const checkEmail = await pool.request()
            .input('Email', sql.VarChar, email)
            .query('SELECT Id FROM TaiKhoan WHERE Email = @Email');

        if (checkEmail.recordset.length > 0) {
            return res.status(400).json({ success: false, message: 'Email này đã được sử dụng!' });
        }

        // Mã hóa mật khẩu
        const saltRounds = 10;
        const hashedPwd = await bcrypt.hash(matKhau, saltRounds);

        // Sinh OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpire = new Date(Date.now() + 15 * 60000); // 15 phút

        // Lưu vào Database (TrangThai = 0)
        await pool.request()
            .input('HoTen', sql.NVarChar, hoTen)
            .input('Email', sql.VarChar, email)
            .input('MatKhauHash', sql.VarChar, hashedPwd)
            .input('OtpCode', sql.VarChar, otpCode)
            .input('OtpExpire', sql.DateTime, otpExpire)
            .query('INSERT INTO TaiKhoan (HoTen, Email, MatKhauHash, TrangThai, OtpCode, OtpExpire) VALUES (@HoTen, @Email, @MatKhauHash, 0, @OtpCode, @OtpExpire)');

        // Gửi email OTP
        const mailOptions = {
            from: '"Hệ thống DOLEARN" <phanhuuthanh8206@gmail.com>',
            to: email,
            subject: 'DOLEARN - Mã OTP Xác thực tài khoản',
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #b91c1c; text-align: center;">HỆ THỐNG KHẢO THÍ TRỰC TUYẾN DOLEARN</h2>
                <h3 style="color: #333; text-align: center;">XÁC THỰC TÀI KHOẢN ĐĂNG KÝ</h3>
                <p style="color: #555; font-size: 16px;">Chào bạn,</p>
                <p style="color: #555; font-size: 16px;">Bạn vừa thực hiện đăng ký tài khoản trên hệ thống DOLEARN. Dưới đây là mã OTP để hoàn tất quá trình xác thực:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <span style="font-size: 32px; font-weight: bold; color: #b91c1c; padding: 15px 30px; background-color: #fef2f2; border-radius: 8px; letter-spacing: 5px;">${otpCode}</span>
                </div>
                <p style="color: #555; font-size: 14px; text-align: center;"><em>Mã OTP này có hiệu lực trong vòng 15 phút.</em></p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #888; font-size: 12px; text-align: center;">Nếu bạn không thực hiện đăng ký này, vui lòng bỏ qua email này.</p>
            </div>
            `
        };
        try {
            await transporter.sendMail(mailOptions);
        } catch (mailError) {
            console.error('Lỗi gửi email xác thực trong /api/register:', mailError);
            return res.status(500).json({ success: false, message: 'Lỗi gửi email xác thực' });
        }

        res.status(201).json({ success: true, message: 'Đăng ký thành công! Vui lòng kiểm tra email để nhận mã OTP.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Lỗi server khi đăng ký.' });
    }
});

// API 2: Xử lý Đăng nhập
app.post('/api/login', async (req, res) => {
    try {
        const { email, matKhau } = req.body;
        const pool = app.locals.db;

        const result = await pool.request()
            .input('Email', sql.VarChar, email)
            .query('SELECT * FROM TaiKhoan WHERE Email = @Email AND TrangThai = 1');

        if (result.recordset.length === 0) {
            return res.status(400).json({ success: false, message: 'Sai email hoặc tài khoản đang bị khóa!' });
        }

        const user = result.recordset[0];

        const isMatch = await bcrypt.compare(matKhau, user.MatKhauHash);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Mật khẩu không chính xác!' });
        }

        res.status(200).json({
            success: true,
            message: 'Đăng nhập thành công',
            data: {
                hoTen: user.HoTen,
                vaiTro: user.VaiTro
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Lỗi server khi đăng nhập.' });
    }
});

// API 3: Xác thực tài khoản
app.post('/api/verify-account', async (req, res) => {
    try {
        const { email, otp } = req.body;
        const pool = app.locals.db;

        const result = await pool.request()
            .input('Email', sql.VarChar, email)
            .query('SELECT * FROM TaiKhoan WHERE Email = @Email');

        if (result.recordset.length === 0) {
            return res.status(400).json({ success: false, message: 'Tài khoản không tồn tại!' });
        }

        const user = result.recordset[0];
        
        if (user.OtpCode !== otp) {
            return res.status(400).json({ success: false, message: 'Mã OTP không chính xác!' });
        }
        
        if (new Date(user.OtpExpire) < new Date()) {
            return res.status(400).json({ success: false, message: 'Mã OTP đã hết hạn!' });
        }

        // Cập nhật TrangThai = 1
        await pool.request()
            .input('Email', sql.VarChar, email)
            .query('UPDATE TaiKhoan SET TrangThai = 1, OtpCode = NULL, OtpExpire = NULL WHERE Email = @Email');

        res.status(200).json({ success: true, message: 'Xác thực tài khoản thành công!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Lỗi server khi xác thực.' });
    }
});

// API 4: Quên mật khẩu (Gửi OTP)
app.post('/api/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const pool = app.locals.db;

        const result = await pool.request()
            .input('Email', sql.VarChar, email)
            .query('SELECT Id FROM TaiKhoan WHERE Email = @Email');

        if (result.recordset.length === 0) {
            return res.status(400).json({ success: false, message: 'Email không tồn tại trong hệ thống!' });
        }

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpire = new Date(Date.now() + 15 * 60000);

        await pool.request()
            .input('Email', sql.VarChar, email)
            .input('OtpCode', sql.VarChar, otpCode)
            .input('OtpExpire', sql.DateTime, otpExpire)
            .query('UPDATE TaiKhoan SET OtpCode = @OtpCode, OtpExpire = @OtpExpire WHERE Email = @Email');

        const mailOptions = {
            from: '"Hệ thống DOLEARN" <phanhuuthanh8206@gmail.com>',
            to: email,
            subject: 'DOLEARN - Mã OTP Khôi phục mật khẩu',
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #b91c1c; text-align: center;">HỆ THỐNG KHẢO THÍ TRỰC TUYẾN DOLEARN</h2>
                <h3 style="color: #333; text-align: center;">KHÔI PHỤC MẬT KHẨU</h3>
                <p style="color: #555; font-size: 16px;">Chào bạn,</p>
                <p style="color: #555; font-size: 16px;">Hệ thống nhận được yêu cầu khôi phục mật khẩu cho tài khoản của bạn. Dưới đây là mã OTP để đặt lại mật khẩu:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <span style="font-size: 32px; font-weight: bold; color: #b91c1c; padding: 15px 30px; background-color: #fef2f2; border-radius: 8px; letter-spacing: 5px;">${otpCode}</span>
                </div>
                <p style="color: #555; font-size: 14px; text-align: center;"><em>Mã OTP này có hiệu lực trong vòng 15 phút.</em></p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #888; font-size: 12px; text-align: center;">Nếu bạn không yêu cầu khôi phục mật khẩu, vui lòng bỏ qua email này và bảo mật tài khoản của bạn.</p>
            </div>
            `
        };
        try {
            await transporter.sendMail(mailOptions);
        } catch (mailError) {
            console.error('Lỗi gửi email xác thực trong /api/forgot-password:', mailError);
            return res.status(500).json({ success: false, message: 'Lỗi gửi email xác thực' });
        }

        res.status(200).json({ success: true, message: 'Mã OTP đã được gửi đến email của bạn.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Lỗi server khi gửi OTP.' });
    }
});

// API 5: Đặt lại mật khẩu
app.post('/api/reset-password', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        const pool = app.locals.db;

        const result = await pool.request()
            .input('Email', sql.VarChar, email)
            .query('SELECT * FROM TaiKhoan WHERE Email = @Email');

        if (result.recordset.length === 0) {
            return res.status(400).json({ success: false, message: 'Tài khoản không tồn tại!' });
        }

        const user = result.recordset[0];
        if (user.OtpCode !== otp) {
            return res.status(400).json({ success: false, message: 'Mã OTP không chính xác!' });
        }
        if (new Date(user.OtpExpire) < new Date()) {
            return res.status(400).json({ success: false, message: 'Mã OTP đã hết hạn!' });
        }

        const hashedPwd = await bcrypt.hash(newPassword, 10);

        await pool.request()
            .input('Email', sql.VarChar, email)
            .input('MatKhauHash', sql.VarChar, hashedPwd)
            .query('UPDATE TaiKhoan SET MatKhauHash = @MatKhauHash, OtpCode = NULL, OtpExpire = NULL WHERE Email = @Email');

        res.status(200).json({ success: true, message: 'Mật khẩu đã được đặt lại thành công!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Lỗi server khi đặt lại mật khẩu.' });
    }
});

// API 6: Tạo đề thi mới (Admin)
app.post('/api/admin/exams', async (req, res) => {
    try {
        const data = req.body;
        // Nếu không có examCode, tự sinh mã ngẫu nhiên TSA-xxx
        const maDeThi = data.examCode || 'TSA-' + Math.random().toString(36).substr(2, 6).toUpperCase();
        const tenDeThi = data.examName;
        const noiDungJSON = JSON.stringify(data);

        const pool = app.locals.db;

        // Kiểm tra xem mã đề thi đã tồn tại chưa
        const checkExam = await pool.request()
            .input('MaDeThi', sql.VarChar, maDeThi)
            .query('SELECT Id FROM DeThi WHERE MaDeThi = @MaDeThi');

        if (checkExam.recordset.length > 0) {
            return res.status(400).json({ success: false, message: 'Mã đề thi này đã tồn tại trong hệ thống!' });
        }

        // Thêm vào bảng DeThi
        await pool.request()
            .input('MaDeThi', sql.VarChar, maDeThi)
            .input('TenDeThi', sql.NVarChar, tenDeThi)
            .input('NoiDungJSON', sql.NVarChar(sql.MAX), noiDungJSON)
            .query('INSERT INTO DeThi (MaDeThi, TenDeThi, NoiDungJSON, TrangThai) VALUES (@MaDeThi, @TenDeThi, @NoiDungJSON, 1)');

        res.status(200).json({ success: true, message: 'Lưu đề thi vào Database thành công!' });
    } catch (err) {
        console.error('Lỗi khi lưu đề thi:', err);
        res.status(500).json({ success: false, message: 'Lỗi server khi kết nối cơ sở dữ liệu.' });
    }
});
// API 7: Lấy danh sách đề thi (Có tính tổng số câu hỏi)
app.get('/api/admin/exams', async (req, res) => {
    try {
        const pool = app.locals.db;
        const result = await pool.request().query('SELECT * FROM DeThi ORDER BY NgayTao DESC');
        
        const data = result.recordset.map(item => {
            let soCauToan = 0, soCauDoc = 0, soCauKhoa = 0;
            if (item.NoiDungJSON) {
                try {
                    const parsed = JSON.parse(item.NoiDungJSON);
                    item.examType = parsed.examType || 'full';
                    if (parsed.sections) {
                        const countQuestions = (sectionId) => {
                            if (!parsed.sections[sectionId] || !parsed.sections[sectionId].passages) return 0;
                            return parsed.sections[sectionId].passages.reduce((sum, p) => sum + (p.questions ? p.questions.length : 0), 0);
                        };
                        soCauToan = countQuestions('ToanHoc');
                        soCauDoc = countQuestions('DocHieu');
                        soCauKhoa = countQuestions('KhoaHoc');
                    }
                } catch (e) {
                    console.error('Lỗi parse JSON của đề thi', item.Id);
                }
            }
            item.soCauToan = soCauToan;
            item.soCauDoc = soCauDoc;
            item.soCauKhoa = soCauKhoa;
            
            // Xóa nội dung JSON gốc để tối ưu băng thông
            delete item.NoiDungJSON;
            return item;
        });

        res.status(200).json({ success: true, data: data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Lỗi lấy danh sách đề thi' });
    }
});

// API 8: Lấy chi tiết 1 đề thi
app.get('/api/admin/exams/:id', async (req, res) => {
    try {
        const pool = app.locals.db;
        const result = await pool.request()
            .input('Id', sql.Int, req.params.id)
            .query('SELECT * FROM DeThi WHERE Id = @Id');
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đề thi!' });
        }
        res.status(200).json({ success: true, data: result.recordset[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Lỗi lấy chi tiết đề thi' });
    }
});

// API 9: Cập nhật đề thi
app.put('/api/admin/exams/:id', async (req, res) => {
    try {
        const pool = app.locals.db;
        const data = req.body;
        const maDeThi = data.examCode;
        const tenDeThi = data.examName;
        const noiDungJSON = JSON.stringify(data);
        const trangThai = 1;

        // Kiểm tra xem MaDeThi có bị trùng với đề thi khác không
        const checkExam = await pool.request()
            .input('MaDeThi', sql.VarChar, maDeThi)
            .input('Id', sql.Int, req.params.id)
            .query('SELECT Id FROM DeThi WHERE MaDeThi = @MaDeThi AND Id != @Id');

        if (checkExam.recordset.length > 0) {
            return res.status(400).json({ success: false, message: 'Mã đề thi đã tồn tại ở một đề khác!' });
        }

        await pool.request()
            .input('MaDeThi', sql.VarChar, maDeThi)
            .input('TenDeThi', sql.NVarChar, tenDeThi)
            .input('NoiDungJSON', sql.NVarChar(sql.MAX), noiDungJSON)
            .input('TrangThai', sql.Int, trangThai)
            .input('Id', sql.Int, req.params.id)
            .query('UPDATE DeThi SET MaDeThi = @MaDeThi, TenDeThi = @TenDeThi, NoiDungJSON = @NoiDungJSON, TrangThai = @TrangThai WHERE Id = @Id');
        
        res.status(200).json({ success: true, message: 'Cập nhật đề thi thành công!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Lỗi cập nhật đề thi' });
    }
});

// API 10: Xóa đề thi
app.delete('/api/admin/exams/:id', async (req, res) => {
    try {
        const pool = app.locals.db;
        await pool.request()
            .input('Id', sql.Int, req.params.id)
            .query('DELETE FROM DeThi WHERE Id = @Id');
        res.status(200).json({ success: true, message: 'Xóa đề thi thành công!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Lỗi xóa đề thi' });
    }
});

// API 11: Lấy danh sách khóa học
app.get('/api/admin/courses', async (req, res) => {
    try {
        const pool = app.locals.db;
        const result = await pool.request().query('SELECT Id, TenKhoaHoc, HocPhan, TrangThai, NgayTao FROM KhoaHoc ORDER BY NgayTao DESC');
        res.status(200).json({ success: true, data: result.recordset });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Lỗi lấy danh sách khóa học' });
    }
});

// API 12: Lấy chi tiết 1 khóa học
app.get('/api/admin/courses/:id', async (req, res) => {
    try {
        const pool = app.locals.db;
        const result = await pool.request()
            .input('Id', sql.Int, req.params.id)
            .query('SELECT * FROM KhoaHoc WHERE Id = @Id');
        
        if (result.recordset.length > 0) {
            res.status(200).json({ success: true, data: result.recordset[0] });
        } else {
            res.status(404).json({ success: false, message: 'Không tìm thấy khóa học!' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Lỗi lấy chi tiết khóa học' });
    }
});

// API 13: Tạo khóa học mới
app.post('/api/admin/upload-image', (req, res) => {
    try {
        const { base64, filename } = req.body;
        if (!base64) {
            return res.status(400).json({ success: false, message: 'Thiếu dữ liệu ảnh base64' });
        }

        // Tách header của base64 (vd: data:image/png;base64,...)
        const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            return res.status(400).json({ success: false, message: 'Chuỗi base64 không hợp lệ' });
        }

        const extension = matches[1].split('/')[1];
        const buffer = Buffer.from(matches[2], 'base64');
        const fileName = (filename || Date.now()) + '.' + extension;
        
        const uploadDir = path.join(__dirname, 'public', 'uploads', 'exams');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, fileName);
        fs.writeFileSync(filePath, buffer);

        res.status(200).json({ 
            success: true, 
            url: `/uploads/exams/${fileName}`
        });
    } catch (err) {
        console.error('Lỗi lưu ảnh:', err);
        res.status(500).json({ success: false, message: 'Lỗi server khi lưu ảnh' });
    }
});
app.post('/api/admin/courses', async (req, res) => {
    try {
        const { tenKhoaHoc, moTa, hocPhan } = req.body;
        const noiDungJSON = JSON.stringify(req.body);
        const pool = app.locals.db;

        await pool.request()
            .input('TenKhoaHoc', sql.NVarChar, tenKhoaHoc)
            .input('MoTa', sql.NVarChar, moTa)
            .input('HocPhan', sql.NVarChar, hocPhan)
            .input('NoiDungJSON', sql.NVarChar(sql.MAX), noiDungJSON)
            .query('INSERT INTO KhoaHoc (TenKhoaHoc, MoTa, HocPhan, NoiDungJSON, TrangThai) VALUES (@TenKhoaHoc, @MoTa, @HocPhan, @NoiDungJSON, 1)');

        res.status(200).json({ success: true, message: 'Tạo khóa học thành công!' });
    } catch (err) {
        console.error('Lỗi khi tạo khóa học:', err);
        res.status(500).json({ success: false, message: 'Lỗi server khi lưu khóa học.' });
    }
});

// API 14: Cập nhật khóa học
app.put('/api/admin/courses/:id', async (req, res) => {
    try {
        const { tenKhoaHoc, moTa, hocPhan } = req.body;
        const noiDungJSON = JSON.stringify(req.body);
        const pool = app.locals.db;

        await pool.request()
            .input('TenKhoaHoc', sql.NVarChar, tenKhoaHoc)
            .input('MoTa', sql.NVarChar, moTa)
            .input('HocPhan', sql.NVarChar, hocPhan)
            .input('NoiDungJSON', sql.NVarChar(sql.MAX), noiDungJSON)
            .input('Id', sql.Int, req.params.id)
            .query('UPDATE KhoaHoc SET TenKhoaHoc = @TenKhoaHoc, MoTa = @MoTa, HocPhan = @HocPhan, NoiDungJSON = @NoiDungJSON WHERE Id = @Id');

        res.status(200).json({ success: true, message: 'Cập nhật khóa học thành công!' });
    } catch (err) {
        console.error('Lỗi khi cập nhật khóa học:', err);
        res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật khóa học.' });
    }
});

// API 15: Xóa khóa học
app.delete('/api/admin/courses/:id', async (req, res) => {
    try {
        const pool = app.locals.db;
        await pool.request()
            .input('Id', sql.Int, req.params.id)
            .query('DELETE FROM KhoaHoc WHERE Id = @Id');
        res.status(200).json({ success: true, message: 'Xóa khóa học thành công!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Lỗi xóa khóa học' });
    }
});

// API 16: Lấy danh sách khóa học cho User
app.get('/api/courses', async (req, res) => {
    try {
        const pool = app.locals.db;
        const result = await pool.request().query('SELECT Id, TenKhoaHoc, MoTa, HocPhan, NoiDungJSON FROM KhoaHoc WHERE TrangThai = 1 ORDER BY NgayTao DESC');
        res.status(200).json({ success: true, data: result.recordset });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Lỗi lấy danh sách khóa học' });
    }
});

// API 17: Lấy danh sách đề thi (User)
app.get('/api/exams', async (req, res) => {
    try {
        const pool = app.locals.db;
        const result = await pool.request().query('SELECT Id, MaDeThi, TenDeThi, TrangThai, NgayTao, NoiDungJSON FROM DeThi WHERE TrangThai = 1 ORDER BY NgayTao DESC');
        res.status(200).json({ success: true, data: result.recordset });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Lỗi lấy danh sách đề thi' });
    }
});

// API 18: Lấy chi tiết 1 đề thi (User)
app.get('/api/exams/:id', async (req, res) => {
    try {
        const pool = app.locals.db;
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('SELECT * FROM DeThi WHERE Id = @id AND TrangThai = 1');
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Đề thi không tồn tại hoặc đã bị ẩn' });
        }
        res.status(200).json({ success: true, data: result.recordset[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Lỗi lấy chi tiết đề thi' });
    }
});

// Khởi động Server & DB
sql.connect(dbConfig).then(pool => {
    console.log('Đã kết nối thành công tới SQL Server!');
    app.locals.db = pool;

    app.listen(port, () => {
        console.log(`Server đang chạy tại http://localhost:${port}`);
    });
}).catch(err => {
    console.error('Lỗi kết nối SQL Server: ', err);
});