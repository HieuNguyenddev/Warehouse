# Role Management API

API ASP.NET Core (.NET 10) và SQL Server, chạy bằng Docker Compose trong `backend/RoleManagement.Api`.

## 1. Chuẩn bị VPS

SSH vào VPS, rồi cài Git và Docker. Đăng xuất rồi SSH lại để nhóm `docker` có hiệu lực.

### Ubuntu / Debian

```bash
sudo apt update
sudo apt install -y git ca-certificates curl
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

### CentOS Stream 10

```bash
sudo dnf install -y git ca-certificates curl dnf-plugins-core
sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```

Nếu `dnf install docker-ce` báo gói trùng với Podman, gỡ bản Docker giả lập của Podman rồi cài lại:

```bash
sudo dnf remove -y podman-docker
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

CentOS bật `firewalld` sẵn. Mở cổng API và SQL Server:

```bash
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --permanent --add-port=1433/tcp
sudo firewall-cmd --reload
```

## 2. Clone repository về VPS

Các bước clone và chạy Compose giống nhau trên Ubuntu và CentOS Stream 10. SSH vào VPS bằng `deploy@192.168.203.130`, rồi clone [testCICD](https://github.com/HieuNguyenddev/testCICD):

```bash
ssh deploy@192.168.203.130
sudo mkdir -p /opt/port
sudo chown $USER:$USER /opt/port
cd /opt/port
git clone https://github.com/HieuNguyenddev/testCICD.git .
cd backend/RoleManagement.Api
```

Trước khi chạy, đổi mật khẩu `sa` trong `docker-compose.yml` (biến `MSSQL_SA_PASSWORD` và chuỗi `ConnectionStrings__DefaultConnection` phải giống nhau).

Khởi động:

```bash
docker compose up -d --build
```

API lắng nghe tại `http://192.168.203.130:8080`. Swagger: `http://192.168.203.130:8080/swagger`.

Cập nhật code sau này:

```bash
cd /opt/port
git pull
cd backend/RoleManagement.Api
docker compose up -d --build
```

## 3. Thông số cần điền trên GitHub Actions

Vào repository trên GitHub: **Settings → Secrets and variables → Actions → New repository secret**.

Tạo đủ các secret sau. Workflow `.github/workflows/deploy.yml` chạy khi push lên `main` (hoặc bấm **Run workflow**) và SSH vào VPS bằng đúng các tên này.

| Secret | Giá trị điền |
| --- | --- |
| `VPS_HOST` | `192.168.203.130` |
| `VPS_PORT` | `22` |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | Private key SSH dùng để đăng nhập `deploy@192.168.203.130` (cả khối, kể cả `BEGIN` và `END`). Public key tương ứng phải nằm trong `~/.ssh/authorized_keys` của user `deploy` |
| `DEPLOY_PATH` | `/opt/port/backend/RoleManagement.Api` |

Không đưa mật khẩu SQL Server hay private key vào file trong repository. Mật khẩu `sa` chỉ sửa trong `docker-compose.yml` trên VPS, hoặc thay bằng biến môi trường khi chạy Compose.
