# Role Management API

API ASP.NET Core (.NET 10) và SQL Server, chạy bằng Docker Compose trong `backend/RoleManagement.Api`.

## 1. Chuẩn bị VPS

SSH vào VPS, rồi cài Git và Docker:

```bash
sudo apt update
sudo apt install -y git ca-certificates curl
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

Đăng xuất rồi SSH lại để nhóm `docker` có hiệu lực.

## 2. Clone repository về VPS

Tạo thư mục và clone. Thay URL bằng địa chỉ repository trên GitHub.

```bash
sudo mkdir -p /opt/port
sudo chown $USER:$USER /opt/port
cd /opt/port
git clone https://github.com/<owner>/<repo>.git .
cd backend/RoleManagement.Api
```

Repository private: trên GitHub vào **Settings → Deploy keys**, thêm public key của VPS (`ssh-keygen -t ed25519`) với quyền đọc. Sau đó clone bằng SSH:

```bash
git clone git@github.com:<owner>/<repo>.git .
```

Trước khi chạy, đổi mật khẩu `sa` trong `docker-compose.yml` (biến `MSSQL_SA_PASSWORD` và chuỗi `ConnectionStrings__DefaultConnection` phải giống nhau).

Khởi động:

```bash
docker compose up -d --build
```

API lắng nghe tại `http://<ip-vps>:8080`. Swagger: `http://<ip-vps>:8080/swagger`.

Cập nhật code sau này:

```bash
cd /opt/port
git pull
cd backend/RoleManagement.Api
docker compose up -d --build
```

## 3. Thông số cần điền trên GitHub Actions

Vào repository trên GitHub: **Settings → Secrets and variables → Actions → New repository secret**.

Tạo đủ các secret sau. Workflow deploy SSH cần khai báo đúng các tên này.

| Secret | Giá trị điền |
| --- | --- |
| `VPS_HOST` | IP hoặc domain của VPS, ví dụ `203.0.113.10` |
| `VPS_PORT` | Cổng SSH, thường là `22` |
| `VPS_USER` | User SSH trên VPS, ví dụ `ubuntu` hoặc `root` |
| `VPS_SSH_KEY` | Nội dung private key SSH (cả khối, kể cả `BEGIN` và `END`). Public key tương ứng phải nằm trong `~/.ssh/authorized_keys` của user trên VPS |
| `DEPLOY_PATH` | Thư mục chứa Compose trên VPS: `/opt/port/backend/RoleManagement.Api` |

Không đưa mật khẩu SQL Server hay private key vào file trong repository. Mật khẩu `sa` chỉ sửa trong `docker-compose.yml` trên VPS, hoặc thay bằng biến môi trường khi chạy Compose.
