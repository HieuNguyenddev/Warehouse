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

### DNS của máy

`docker pull` dùng DNS trong `/etc/resolv.conf` của máy, không dùng mục `"dns"` trong `/etc/docker/daemon.json`. Mạng này phát DNS `192.168.203.2`, và DNS đó không phân giải được `mcr.microsoft.com`, nên lệnh pull báo `lookup mcr.microsoft.com on 192.168.203.2:53: no such host`.

Đổi DNS của card mạng đang dùng sang DNS công cộng, rồi bỏ DNS do DHCP đẩy xuống:

```bash
CONN=$(nmcli -t -f NAME,DEVICE connection show --active | awk -F: '$2 != "" && $2 != "lo" {print $1; exit}')
sudo nmcli connection modify "$CONN" ipv4.dns "8.8.8.8 1.1.1.1"
sudo nmcli connection modify "$CONN" ipv4.ignore-auto-dns yes
sudo nmcli connection up "$CONN"
```

`/etc/resolv.conf` phải còn `nameserver 8.8.8.8` hoặc `nameserver 1.1.1.1`, không còn `192.168.203.2`. Sau đó tải image:

```bash
getent hosts mcr.microsoft.com
docker pull mcr.microsoft.com/mssql/server:2022-latest
```

`getent` phải in ra địa chỉ IP. Nếu `nslookup mcr.microsoft.com 8.8.8.8` cũng báo `no such host`, máy chưa ra internet. Khi đó cần sửa gateway hoặc NAT trước khi pull.

## 2. Clone repository về VPS

Các bước clone và chạy Compose giống nhau trên Ubuntu và CentOS Stream 10. Trên VPS, tài khoản là `admin` (prompt `admin@localhost`). SSH từ máy khác bằng `admin@192.168.203.130`, rồi clone [testCICD](https://github.com/HieuNguyenddev/testCICD):

```bash
ssh admin@192.168.203.130
mkdir -p "$HOME/Documents/port"
cd "$HOME/Documents/port"
git clone https://github.com/HieuNguyenddev/testCICD.git .
cd backend/RoleManagement.Api
```

`~/Documents/port` nằm trong thư mục `Documents` của user `admin`. Đường dẫn đầy đủ là `/home/admin/Documents/port`.

Trước khi chạy, đổi mật khẩu `sa` trong `docker-compose.yml` (biến `MSSQL_SA_PASSWORD` và chuỗi `ConnectionStrings__DefaultConnection` phải giống nhau).

Khởi động:

```bash
docker compose down
docker compose up -d --build
```

API lắng nghe tại `http://192.168.203.130:8080`. Swagger: `http://192.168.203.130:8080/swagger`.

### Lỗi `dependency sqlserver` khi chạy Compose

Lỗi này nghĩa là container `sqlserver` thoát hoặc không đạt healthy, nên `api` không khởi động. Xem nguyên nhân thật trong log:

```bash
docker compose ps -a
docker compose logs sqlserver --tail 50
```

Các nguyên nhân thường gặp:

- **VPS chạy ARM64:** `docker compose up` báo `The requested image's platform (linux/amd64) does not match the detected host platform (linux/arm64)` và container thoát với mã 255. Kiểm tra bằng `uname -m` (`aarch64` là ARM64). Image `mssql/server` không có bản ARM64, nên `docker-compose.yml` dùng `mcr.microsoft.com/azure-sql-edge`, chạy được trên cả amd64 và arm64.
- **Thiếu RAM:** log có `sqlservr: This program requires a machine with at least 2000 megabytes of memory`. SQL Server cần tối thiểu 2 GB RAM. Kiểm tra bằng `free -m`, tăng RAM của VM lên từ 2 GB (nên 4 GB).
- **Mật khẩu `sa` không đủ mạnh:** log có `Password validation failed`. Mật khẩu cần tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.
- **SELinux trên CentOS chặn volume:** log có `Permission denied` ở `/var/opt/mssql`. Chạy `sudo ausearch -m avc -ts recent` để xác nhận.
- **Healthcheck không tìm thấy `sqlcmd`:** compose đã tự thử cả `/opt/mssql-tools18` và `/opt/mssql-tools`. Nếu log SQL Server báo đã khởi động mà container vẫn `unhealthy`, chạy `docker compose exec sqlserver ls /opt`.

Sau khi sửa, xóa container cũ và chạy lại:

```bash
docker compose down
docker compose up -d --build
```

Cập nhật code sau này:

```bash
cd "$HOME/Documents/port"
git pull
cd backend/RoleManagement.Api
docker compose up -d --build
```

## 3. Thông số cần điền trên GitHub Actions

Vào repository trên GitHub: **Settings → Secrets and variables → Actions → New repository secret**.

Workflow `.github/workflows/deploy.yml` giữ nguyên: runner `ubuntu-latest` dùng Drone SSH (`entrypoint.sh`) để vào VPS, rồi `git pull` và `docker compose up`.

| Secret | Giá trị điền |
| --- | --- |
| `VPS_HOST` | `171.225.184.133` |
| `VPS_PORT` | Cổng SSH đã chuyển tiếp ra internet, thường là `22` |
| `VPS_USER` | `admin` |
| `VPS_SSH_KEY` | Private key SSH của user `admin` (cả khối, kể cả `BEGIN` và `END`). Public key nằm trong `~/.ssh/authorized_keys` của user `admin` |
| `DEPLOY_PATH` | `/home/admin/Documents/port/backend/RoleManagement.Api` |

### Lấy IP public của VPS

SSH vào VPS rồi chạy:

```bash
curl -4 ifconfig.me
```

Dòng in ra là IPv4 public. Trên VPS này lệnh trả về `171.225.184.133`. Điền đúng giá trị đó vào secret `VPS_HOST`.

Nếu `curl` không phân giải được tên miền:

```bash
dig +short myip.opendns.com @resolver1.opendns.com
```

Xem địa chỉ gắn trên card mạng:

```bash
ip -4 addr
```

Card mạng chỉ có `192.168.203.130` thì VPS không có IP public riêng. Địa chỉ lệnh trên in ra là IP public của router đang NAT. GitHub Actions SSH được khi router chuyển tiếp cổng `22` tới `192.168.203.130`, và `VPS_HOST` là IP public đó.

### Lỗi `dial tcp: i/o timeout` ở `Run entrypoint.sh`

Log dừng ở `Drone SSH version 1.8.1` và `dial tcp ***:***: i/o timeout` nghĩa là máy runner chưa bắt tay TCP được với `VPS_HOST`:`VPS_PORT`. Bước này chạy trước Docker, nên sửa `Dockerfile` hoặc `docker-compose.yml` không hết lỗi. Key SSH cũng chưa được dùng.

`192.168.203.130` chỉ tồn tại trong LAN. Runner GitHub ở trên internet không định tuyến tới địa chỉ đó, nên sau khoảng 30 giây kết nối bị timeout. Cách SSH giữ nguyên, sửa secret và đường mạng:

1. Đổi secret `VPS_HOST` thành `171.225.184.133`.
2. Trên router, chuyển tiếp cổng SSH tới `192.168.203.130`. Ghi đúng cổng đó vào `VPS_PORT`.
3. Trên VPS, mở SSH:

```bash
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --reload
sudo systemctl enable --now sshd
ss -lnt | grep 22
```

4. Từ một máy ngoài mạng `192.168.203.0/24`, lệnh sau phải vào được shell trước khi chạy lại Actions:

```bash
ssh -p 22 admin@171.225.184.133
```

## 4. Test bằng Postman sau khi deploy

Trên VPS, cả hai container phải đang chạy:

```bash
cd "$HOME/Documents/port/backend/RoleManagement.Api"
docker compose ps
```

`api` và `sqlserver` đều ở trạng thái `running` (sqlserver là `healthy`). Base URL khi gọi từ máy khác trong cùng mạng là `http://192.168.203.130:8080`. Gọi ngay trên VPS thì dùng `http://localhost:8080`.

Trong Postman, mỗi request bên dưới chọn tab **Body → raw → JSON**.

### Tạo vai trò

`POST http://192.168.203.130:8080/api/roles`

```json
{
  "name": "Admin",
  "description": "Quản trị hệ thống"
}
```

Kết quả đúng là **201 Created**. Phần body có `id`, `name`, `description` và `createdAt`. Gọi lại đúng body trên lần thứ hai trả **409 Conflict** vì tên vai trò đã tồn tại.

### Xem danh sách

`GET http://192.168.203.130:8080/api/roles`

Kết quả đúng là **200 OK**, body là mảng các vai trò vừa tạo.

### Xem một vai trò

`GET http://192.168.203.130:8080/api/roles/1`

Thay `1` bằng `id` trả về ở bước tạo. Kết quả đúng là **200 OK**. Id không có trong database trả **404 Not Found**.

### Sửa vai trò

`PUT http://192.168.203.130:8080/api/roles/1`

```json
{
  "name": "Administrator",
  "description": "Toàn quyền hệ thống"
}
```

Kết quả đúng là **200 OK**, `name` trong body là `Administrator`.

### Xóa vai trò

`DELETE http://192.168.203.130:8080/api/roles/1`

Kết quả đúng là **204 No Content**, body rỗng. Gọi lại `GET /api/roles/1` sau đó trả **404 Not Found**.

Swagger cũng mở tại `http://192.168.203.130:8080/swagger` vì Compose đặt `ASPNETCORE_ENVIRONMENT=Development`. Nếu POST trả **500**, xem log API bằng `docker compose logs api --tail 50`.
