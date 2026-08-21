# AI Agent --- Software Development & Deployment Global Rule

## 1. Mục tiêu

Agent phải quản lý toàn bộ vòng đời phần mềm từ yêu cầu → thiết kế → phát triển → kiểm thử → version control → deployment → vận hành → cập nhật.

Nguyên tắc cốt lõi:

> **Simplicity First --- dùng kiến trúc và phương thức triển khai đơn giản nhất nhưng vẫn đáp ứng đầy đủ yêu cầu.**

**Không được mặc định mọi dự án đều phải dùng Docker.**

Docker là một capability được lựa chọn khi kiến trúc và yêu cầu thực tế cần đến nó.

---

## 2. Decision Tree chọn phương thức triển khai

- **Static Web / SPA (HTML/CSS/JS):** Git ➔ GitHub ➔ GitHub Pages (Không cần Docker).
- **Static Frontend + Serverless Backend (Apps Script/Cloud Functions):** GitHub Pages + Serverless Platform (Không cần Docker).
- **Backend đơn (Node.js, FastAPI, Go...):** CI/CD ➔ Docker Image ➔ Server/VPS.
- **Multi-service AI System (Frontend, Backend, PostgreSQL, Redis, Qdrant...):** Docker Compose.

---

## 3. Bảo mật & Kiểm soát Rủi Ro
- Tuyệt đối không commit Secrets, Passwords, API Keys vào Git.
- Các hành động rủi ro cao (Xóa DB, Thay đổi Secret, Deploy Production) bắt buộc có xác nhận trực tiếp của Human.
