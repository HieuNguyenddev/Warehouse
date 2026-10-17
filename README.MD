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

`docker pull` dùng DNS trong `/etc/resolv.conf` của máy. Máy ảo đang Bridged, card `enp2s0` là `192.168.1.5`. Nếu pull báo `no such host`, đổi DNS của card đang dùng sang DNS công cộng và bỏ DNS do DHCP đẩy xuống:

```bash
CONN=$(nmcli -t -f NAME,DEVICE connection show --active | awk -F: '$2 != "" && $2 != "lo" {print $1; exit}')
sudo nmcli connection modify "$CONN" ipv4.dns "8.8.8.8 1.1.1.1"
sudo nmcli connection modify "$CONN" ipv4.ignore-auto-dns yes
sudo nmcli connection up "$CONN"
```

`/etc/resolv.conf` phải còn `nameserver 8.8.8.8` hoặc `nameserver 1.1.1.1`. Sau đó tải image:

```bash
getent hosts mcr.microsoft.com
docker pull mcr.microsoft.com/azure-sql-edge:latest
```

`getent` phải in ra địa chỉ IP. Nếu `nslookup mcr.microsoft.com 8.8.8.8` cũng báo `no such host`, máy chưa ra internet. Khi đó cần sửa gateway hoặc NAT trước khi pull.

## 2. Clone repository về VPS

Các bước clone và chạy Compose giống nhau trên Ubuntu và CentOS Stream 10. Trên VPS, tài khoản là `admin` (prompt `admin@localhost`). Trong mạng nhà, SSH bằng `admin@192.168.1.5`, rồi clone [testCICD](https://github.com/HieuNguyenddev/testCICD):

```bash
ssh admin@192.168.1.5
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

Trong mạng nhà, API lắng nghe tại `http://192.168.1.5:8080`. Swagger: `http://192.168.1.5:8080/swagger`.

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
- **Image SQL Server:** `docker-compose.yml` dùng `mcr.microsoft.com/azure-sql-edge:latest` vì máy ảo là ARM64. Image `mssql/server:2022-latest` chỉ có bản amd64.

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

Workflow `.github/workflows/deploy.yml` đọc đúng năm secret dưới đây. Tên secret phải khớp từng chữ với file workflow.

| Secret trong `deploy.yml` | Ô trong workflow | Giá trị điền |
| --- | --- | --- |
| `VPS_HOST` | `host` | `171.225.184.133` |
| `VPS_USER` | `username` | `admin` |
| `VPS_PASSWORD` | `password` | Mật khẩu SSH của user `admin`. Chỉ tạo secret trên GitHub, không ghi mật khẩu vào repository |
| `VPS_PORT` | `port` | `22` |
| `DEPLOY_PATH` | `script` (`cd`) | `/home/admin/Documents/port/backend/RoleManagement.Api` |

`VPS_HOST` là IP public của router. Máy ảo nằm ở `192.168.1.5`. Router chuyển tiếp TCP `22` tới `192.168.1.5` cổng `22` thì GitHub mới SSH được. Trong mạng nhà, SSH bằng `admin@192.168.1.5` và API là `http://192.168.1.5:8080`.

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

Máy ảo VMware Fusion đang dùng **Bridged Networking → Autodetect**. Card `enp2s0` là `192.168.1.5/24`. `171.225.184.133` là IP public của router nhà.

### Lỗi `dial tcp: i/o timeout` ở `Run entrypoint.sh`

Log dừng ở `Drone SSH version 1.8.1` và `dial tcp ***:***: i/o timeout` nghĩa là runner GitHub chưa bắt tay TCP được với `171.225.184.133:22`. Bước này chạy trước Docker, nên chưa tới bước kiểm tra mật khẩu.

Workflow đăng nhập bằng mật khẩu trong secret `VPS_PASSWORD`. Trên máy ảo, bật đăng nhập bằng mật khẩu rồi mở SSH:

```bash
sudo sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication yes/' /etc/ssh/sshd_config
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --reload
sudo systemctl restart sshd
ss -lnt | grep 22
```

`ss` phải thấy `0.0.0.0:22` hoặc `*:22`. Trong mạng nhà, lệnh sau phải vào được shell:

```bash
ssh admin@192.168.1.5
```

Trên router nhà, chuyển tiếp TCP cổng `22` tới `192.168.1.5` cổng `22`. Không điền IP của Mac. Secret GitHub giữ `VPS_HOST` = `171.225.184.133`, `VPS_PORT` = `22`, `VPS_USER` = `admin`, và `VPS_PASSWORD` là mật khẩu SSH của user `admin`.

Tắt Wi-Fi, dùng mạng di động, rồi kiểm tra trước khi chạy lại Actions:

```bash
ssh -p 22 admin@171.225.184.133
nc -vz -w 5 171.225.184.133 22
```

`timed out` nghĩa là router hoặc nhà mạng chưa mở cổng vào. `Connection refused` nghĩa là gói đã tới nhưng không có dịch vụ cổng 22. Một số nhà mạng dùng CGNAT, khi đó `171.225.184.133` không nhận kết nối từ internet.

## 4. Test bằng Postman sau khi deploy

Trên VPS, cả hai container phải đang chạy:

```bash
cd "$HOME/Documents/port/backend/RoleManagement.Api"
docker compose ps
```

`api` và `sqlserver` đều ở trạng thái `running` (sqlserver là `healthy`). Base URL khi gọi từ máy khác trong cùng mạng là `http://192.168.1.5:8080`. Gọi ngay trên VPS thì dùng `http://localhost:8080`.

Trong Postman, mỗi request bên dưới chọn tab **Body → raw → JSON**.

### Tạo vai trò

`POST http://192.168.1.5:8080/api/roles`

```json
{
  "name": "Admin",
  "description": "Quản trị hệ thống"
}
```

Kết quả đúng là **201 Created**. Phần body có `id`, `name`, `description` và `createdAt`. Gọi lại đúng body trên lần thứ hai trả **409 Conflict** vì tên vai trò đã tồn tại.

### Xem danh sách

`GET http://192.168.1.5:8080/api/roles`

Kết quả đúng là **200 OK**, body là mảng các vai trò vừa tạo.

### Xem một vai trò

`GET http://192.168.1.5:8080/api/roles/1`

Thay `1` bằng `id` trả về ở bước tạo. Kết quả đúng là **200 OK**. Id không có trong database trả **404 Not Found**.

### Sửa vai trò

`PUT http://192.168.1.5:8080/api/roles/1`

```json
{
  "name": "Administrator",
  "description": "Toàn quyền hệ thống"
}
```

Kết quả đúng là **200 OK**, `name` trong body là `Administrator`.

### Xóa vai trò

`DELETE http://192.168.1.5:8080/api/roles/1`

Kết quả đúng là **204 No Content**, body rỗng. Gọi lại `GET /api/roles/1` sau đó trả **404 Not Found**.

Swagger cũng mở tại `http://192.168.1.5:8080/swagger` vì Compose đặt `ASPNETCORE_ENVIRONMENT=Development`. Nếu POST trả **500**, xem log API bằng `docker compose logs api --tail 50`.
