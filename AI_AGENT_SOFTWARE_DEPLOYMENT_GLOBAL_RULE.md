# AI Agent --- Software Development & Deployment Global Rule

## 1. Mục tiêu

Agent phải quản lý toàn bộ vòng đời phần mềm từ yêu cầu → thiết kế →
phát triển → kiểm thử → version control → deployment → vận hành → cập
nhật.

Nguyên tắc cốt lõi:

> **Simplicity First --- dùng kiến trúc và phương thức triển khai đơn
> giản nhất nhưng vẫn đáp ứng đầy đủ yêu cầu.**

**Không được mặc định mọi dự án đều phải dùng Docker.**

Docker là một capability được lựa chọn khi kiến trúc và yêu cầu thực tế
cần đến nó.

------------------------------------------------------------------------

## 2. Nguyên tắc kiến trúc

Agent phải phân biệt rõ:

-   **Git** = quản lý lịch sử và phiên bản source code.
-   **GitHub** = repository trung tâm, cộng tác, review, CI/CD và phân
    phối source.
-   **GitHub Pages** = hosting phù hợp cho static web/SPA.
-   **Serverless** = backend do nền tảng cloud quản lý, ví dụ Google
    Apps Script.
-   **Docker** = đóng gói runtime/application environment thành
    image/container.
-   **Docker Compose** = quản lý nhiều service/container.
-   **CI/CD** = tự động kiểm thử, build và triển khai.
-   **Deployment** = đưa ứng dụng tới môi trường chạy thực tế.

Không được coi GitHub, Git và Docker là ba công cụ thay thế nhau. Chúng
giải quyết các vấn đề khác nhau.

------------------------------------------------------------------------

## 3. Git là xương sống quản lý phiên bản

Mọi project có source code phải sử dụng Git, trừ khi có lý do kỹ thuật
rõ ràng được phê duyệt.

Agent phải:

1.  Kiểm tra repository hiện tại trước khi chỉnh sửa.
2.  Kiểm tra branch hiện tại.
3.  Không tự ý xóa hoặc ghi đè lịch sử Git.
4.  Commit theo từng thay đổi có ý nghĩa.
5.  Commit message phải mô tả đúng thay đổi.
6.  Không commit secrets, API keys, passwords, private keys hoặc dữ liệu
    nhạy cảm.
7.  Sử dụng `.gitignore` phù hợp.
8.  Trước khi merge/deploy phải kiểm tra trạng thái Git sạch hoặc xác
    định rõ các thay đổi chưa commit.

Ví dụ quy trình:

``` text
Inspect
  ↓
Plan
  ↓
Modify
  ↓
Test
  ↓
git diff
  ↓
Commit
  ↓
Push
```

------------------------------------------------------------------------

## 4. GitHub là repository trung tâm

GitHub nên là nguồn lưu trữ chính của source code đối với các project
cần cộng tác, backup hoặc public distribution.

Agent phải ưu tiên:

``` text
Local Working Tree
        ↓
       Git
        ↓
     GitHub
```

GitHub có thể được sử dụng cho:

-   Repository
-   Branch
-   Pull Request
-   Issue
-   Release
-   GitHub Actions
-   GitHub Pages
-   Documentation

Không được hiểu rằng:

> Source code có trên GitHub = application đang chạy.

GitHub repository và runtime/deployment là hai lớp khác nhau.

------------------------------------------------------------------------

## 5. Bắt buộc phân tích deployment trước khi chọn công nghệ

Sau khi hoàn thành hoặc gần hoàn thành kiến trúc, Agent phải đánh giá
deployment target.

Agent phải trả lời:

1.  Ứng dụng có backend server riêng không?
2.  Có cần runtime server liên tục không?
3.  Có database riêng không?
4.  Có nhiều service không?
5.  Có dependency hệ thống phức tạp không?
6.  Có yêu cầu reproducible environment không?
7.  Có cần chạy trên VPS/server riêng không?
8.  Có thể dùng static hosting hoặc serverless không?
9.  Docker có giải quyết một vấn đề thực tế không?

Sau đó chọn deployment strategy.

**Không được thêm Docker chỉ vì Docker phổ biến.**

------------------------------------------------------------------------

# 6. Decision Tree chọn phương thức triển khai

## 6.1 Static Web / SPA

Nếu ứng dụng chỉ gồm:

-   HTML
-   CSS
-   JavaScript
-   Static assets
-   Không cần backend server riêng

thì ưu tiên:

``` text
Git
 ↓
GitHub
 ↓
GitHub Pages / Static Hosting
 ↓
Public
```

**Không cần Docker.**

Ví dụ:

``` text
PushUp
├── index.html
├── app.js
├── style.css
└── assets/
```

→ GitHub Pages là lựa chọn ưu tiên nếu phù hợp.

------------------------------------------------------------------------

## 6.2 Static Frontend + Serverless Backend

Nếu frontend static và backend có thể sử dụng serverless:

``` text
Frontend
   ↓
GitHub Pages / Static Hosting

Backend
   ↓
Google Apps Script / Cloud Functions / Serverless
```

→ Không cần Docker nếu serverless platform đã đáp ứng yêu cầu.

------------------------------------------------------------------------

## 6.3 Backend đơn

Nếu project cần:

-   Node.js
-   Python/FastAPI
-   Go
-   Java
-   hoặc server runtime tương tự

và cần môi trường chạy ổn định/reproducible, có thể chọn:

``` text
GitHub
   ↓
CI/CD
   ↓
Docker Build
   ↓
Docker Image
   ↓
Server/VPS
   ↓
Container
```

Docker nên được sử dụng khi nó mang lại lợi ích thực tế.

------------------------------------------------------------------------

## 6.4 Multi-service application

Nếu ứng dụng có nhiều thành phần như:

``` text
Frontend
Backend
PostgreSQL
Redis
Qdrant
Worker
AI Service
```

thì ưu tiên xem xét:

``` text
Docker Compose
```

Ví dụ:

``` text
docker-compose.yml

services:
  frontend
  backend
  postgres
  redis
  qdrant
  worker
```

------------------------------------------------------------------------

## 6.5 Khi chưa cần Docker

Không dùng Docker nếu:

-   Static SPA có thể chạy trực tiếp trên GitHub Pages.
-   Serverless platform đã đáp ứng backend.
-   Docker không giải quyết vấn đề thực tế.
-   Việc thêm Docker chỉ làm tăng độ phức tạp.
-   Không có nhu cầu reproducible runtime.
-   Không có server/container environment cần quản lý.

------------------------------------------------------------------------

# 7. Docker là capability, không phải requirement

Quy tắc bắt buộc:

> **Không ép mọi project phải có Docker.**

Sai:

``` text
Every project
    ↓
Docker
```

Đúng:

``` text
Every project
    ↓
Architecture Analysis
    ↓
Choose simplest suitable deployment
    ├── Static → GitHub Pages
    ├── Serverless → Serverless platform
    ├── Backend → Docker nếu phù hợp
    └── Multi-service → Docker Compose nếu phù hợp
```

------------------------------------------------------------------------

# 8. CI/CD

Khi project đã có deployment target ổn định, Agent nên thiết lập CI/CD
phù hợp.

Pipeline cơ bản:

``` text
Developer / AI Agent
        ↓
git push
        ↓
GitHub
        ↓
CI
        ↓
Lint
        ↓
Test
        ↓
Build
        ↓
Deploy
```

Không được deploy production nếu kiểm thử bắt buộc thất bại.

------------------------------------------------------------------------

## 8.1 Static project

Ví dụ:

``` text
git push
   ↓
GitHub Actions
   ↓
Validate
   ↓
Build/Test nếu có
   ↓
GitHub Pages
```

Không cần Docker.

------------------------------------------------------------------------

## 8.2 Docker project

Ví dụ:

``` text
git push
   ↓
GitHub Actions
   ↓
Test
   ↓
Docker Build
   ↓
Docker Image
   ↓
Container Registry
   ↓
Deploy Server
```

------------------------------------------------------------------------

# 9. Deployment phải có môi trường

Đối với project có rủi ro cao hoặc backend quan trọng, ưu tiên:

``` text
Development
     ↓
Testing
     ↓
Staging
     ↓
Production
```

Không nên để AI Agent tự động thay đổi production chỉ vì một commit đã
được tạo.

------------------------------------------------------------------------

## 9.1 Quyền của AI Agent

Agent có thể tự động:

-   Đọc source.
-   Phân tích architecture.
-   Sửa code.
-   Chạy test.
-   Tạo commit.
-   Push branch.
-   Tạo Pull Request nếu hệ thống cho phép.
-   Theo dõi CI.
-   Build artifact.
-   Deploy development/staging khi policy cho phép.

Agent phải yêu cầu human approval trước các hành động có rủi ro cao, ví
dụ:

-   Xóa database.
-   Migration phá vỡ dữ liệu.
-   Xóa production resources.
-   Thay đổi secrets.
-   Deploy production khi chưa có policy tự động.
-   Thay đổi kiến trúc có tác động lớn.
-   Thay đổi domain/DNS.
-   Thay đổi quyền truy cập hệ thống.

------------------------------------------------------------------------

# 10. Không commit secrets

Tuyệt đối không đưa vào Git/GitHub:

``` text
API_KEY
TOKEN
PASSWORD
PRIVATE_KEY
DATABASE_PASSWORD
BOT_TOKEN
SERVICE_ACCOUNT_PRIVATE_KEY
```

Sử dụng:

-   Environment variables
-   Secret manager
-   GitHub Actions Secrets
-   Server secret storage
-   `.env` cục bộ và `.gitignore`

Ví dụ:

``` text
.env
.env.local
.env.production
```

phải được kiểm soát phù hợp và không commit secrets thật vào repository.

Nếu phát hiện secret đã bị commit, Agent phải coi đó là security
incident và yêu cầu xử lý/rotate secret thay vì chỉ xóa dòng code.

------------------------------------------------------------------------

# 11. Đồng bộ source code và deployment

Mục tiêu:

> Mỗi phiên bản phần mềm phải có khả năng truy nguyên từ source code →
> commit → build → deployment.

Đối với Docker project nên hướng tới:

``` text
Git Commit
    ↓
Build
    ↓
Docker Image
    ↓
Deployment
```

Image nên có version/tag có thể truy nguyên.

Ví dụ:

``` text
v1.2.0
commit-abc123
```

Không nên phụ thuộc duy nhất vào tag `latest` cho production nếu cần khả
năng rollback/truy vết.

------------------------------------------------------------------------

# 12. Rollback

Mọi deployment có rủi ro phải có phương án rollback.

Ví dụ Docker:

``` text
Production
   ↓
v1.3.0  ← lỗi
   ↓
rollback
   ↓
v1.2.0  ← ổn định
```

Agent phải ưu tiên rollback an toàn hơn là cố sửa trực tiếp production
nếu deployment mới gây lỗi nghiêm trọng.

------------------------------------------------------------------------

# 13. Database migration

Đối với project có database, Agent phải coi schema/database migration là
một phần riêng của deployment.

Không được mặc định:

``` text
Code update
=
Database update an toàn
```

Trước migration phải đánh giá:

-   Có mất dữ liệu không?
-   Có backward compatible không?
-   Có cần backup không?
-   Có rollback được không?
-   Application version cũ có còn hoạt động không?

------------------------------------------------------------------------

# 14. Monitoring và vận hành

Deployment chưa phải điểm kết thúc.

Sau deployment:

``` text
Deploy
  ↓
Health Check
  ↓
Monitoring
  ↓
Logs
  ↓
Error Detection
```

Nếu project có server/backend, nên có:

-   Health check
-   Application logs
-   Error logs
-   Resource monitoring
-   Uptime monitoring

Agent phải phân biệt:

> **Build thành công ≠ Application hoạt động đúng.**

------------------------------------------------------------------------

# 15. Quy trình chuẩn cho AI Agent

Agent nên thực hiện lifecycle:

``` text
1. REQUIREMENT
       ↓
2. ARCHITECTURE
       ↓
3. DEPLOYMENT STRATEGY
       ↓
4. IMPLEMENTATION
       ↓
5. TEST
       ↓
6. SECURITY CHECK
       ↓
7. GIT COMMIT
       ↓
8. GITHUB PUSH
       ↓
9. CI/CD
       ↓
10. BUILD
       ↓
11. DEPLOY
       ↓
12. HEALTH CHECK
       ↓
13. MONITOR
       ↓
14. DOCUMENT
```

------------------------------------------------------------------------

# 16. Quy tắc cho project mới

Khi bắt đầu project mới, Agent phải tạo hoặc xác định tối thiểu:

``` text
README.md
.gitignore
AGENTS.md / project rules
```

Nếu phù hợp:

``` text
CHANGELOG.md
LICENSE
docs/
tests/
.github/workflows/
Dockerfile
docker-compose.yml
```

**Dockerfile và docker-compose.yml chỉ tạo khi deployment strategy yêu
cầu.**

------------------------------------------------------------------------

# 17. Quy tắc cho PushUp và các Static SPA tương tự

Với ứng dụng kiểu PushUp:

``` text
HTML
CSS
JavaScript
Google Apps Script
Google Sheets
```

deployment mặc định:

``` text
Git
 ↓
GitHub
 ↓
GitHub Pages
 ↓
Public
```

Không thêm Docker trừ khi kiến trúc thay đổi và xuất hiện nhu cầu
server/container thực tế.

------------------------------------------------------------------------

# 18. Quy tắc cho AI Agent khi thay đổi phần mềm

Mỗi thay đổi phải được đánh giá theo câu hỏi:

### A. Thay đổi có ảnh hưởng architecture không?

Nếu có → đánh giá lại deployment strategy.

### B. Thay đổi có ảnh hưởng API không?

Nếu có → kiểm tra compatibility.

### C. Thay đổi có ảnh hưởng database không?

Nếu có → đánh giá migration/backup/rollback.

### D. Thay đổi có ảnh hưởng deployment không?

Nếu có → cập nhật deployment configuration/documentation.

### E. Thay đổi có ảnh hưởng security không?

Nếu có → chạy security review phù hợp.

------------------------------------------------------------------------

# 19. Quy tắc "Simplicity First"

Agent phải ưu tiên theo thứ tự:

``` text
1. Không thêm thành phần nếu không cần.
2. Dùng nền tảng managed/serverless nếu đáp ứng yêu cầu.
3. Dùng static hosting cho static application.
4. Chỉ dùng Docker khi Docker giải quyết vấn đề thực tế.
5. Chỉ dùng Docker Compose khi có nhiều service cần quản lý.
6. Chỉ dùng Kubernetes hoặc orchestration phức tạp khi quy mô thực sự yêu cầu.
```

Không được tạo infrastructure chỉ để làm project "trông chuyên nghiệp".

------------------------------------------------------------------------

# 20. Kiến trúc tham chiếu

## Project đơn giản

``` text
AI Agent
   ↓
Git
   ↓
GitHub
   ↓
GitHub Pages
   ↓
User
```

## Static + Serverless

``` text
             GitHub
                │
       ┌────────┴────────┐
       ▼                 ▼
   Frontend           Backend
       │                 │
 GitHub Pages       Serverless
       │                 │
       └────────┬────────┘
                ▼
              User
```

## Backend + Docker

``` text
AI Agent
   ↓
Git
   ↓
GitHub
   ↓
GitHub Actions
   ↓
Docker Build
   ↓
Docker Registry
   ↓
VPS / Server
   ↓
Container
   ↓
User
```

## Multi-service AI system

``` text
GitHub
   ↓
CI/CD
   ↓
Docker Compose
   ├── Frontend
   ├── Backend
   ├── PostgreSQL
   ├── Redis
   ├── Qdrant
   └── Worker
          ↓
       Server
          ↓
        User
```

------------------------------------------------------------------------

# 21. Nguyên tắc cuối cùng

Agent phải luôn ghi nhớ:

> **Git quản lý phiên bản.**

> **GitHub quản lý repository, cộng tác và automation.**

> **Docker quản lý môi trường đóng gói/chạy ứng dụng khi cần.**

> **CI/CD kết nối source code với quá trình build/test/deployment.**

> **Deployment strategy phải phụ thuộc vào architecture, không phụ thuộc
> vào sở thích công nghệ.**

> **Không phải ứng dụng nào cũng cần Docker.**

> **Mục tiêu là một hệ thống đơn giản, có thể truy nguyên, có thể kiểm
> thử, có thể triển khai và có thể rollback.**

------------------------------------------------------------------------

# 22. Default policy

Nếu không có yêu cầu đặc biệt:

### Static SPA

``` text
Git + GitHub + GitHub Pages
```

### Serverless application

``` text
Git + GitHub + Serverless Platform
```

### Single backend server

``` text
Git + GitHub + CI/CD + Docker
```

### Multi-service application

``` text
Git + GitHub + CI/CD + Docker Compose
```

### Production-critical system

``` text
Git
+
GitHub
+
CI/CD
+
Testing
+
Staging
+
Production
+
Monitoring
+
Rollback
```

Agent phải **đánh giá trước khi lựa chọn**, không được áp dụng Docker
hoặc bất kỳ công nghệ nào một cách máy móc.
