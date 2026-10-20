# Role Management API

API ASP.NET Core (.NET 10), admin React, PostgreSQL 16 và Nginx, chạy bằng Docker Compose trong `backend/RoleManagement.Api`. Mỗi lần đẩy lên nhánh `main`, GitHub Actions SSH vào VPS, `git pull` rồi `docker compose up -d --build` để build lại cả API và frontend. Nginx đưa `admin.minhhieudev.id.vn` tới container frontend và `api.minhhieudev.id.vn` tới API.

Máy chủ là **Ubuntu 24.04** trên VMware Fusion, card mạng **Bridged Networking → Autodetect**. Các lệnh dưới đây chạy bằng user `root`.

| Thông số | Giá trị |
| --- | --- |
| IP máy ảo | `192.168.1.5` |
| SSH trong mạng nhà | `root@192.168.1.5` |
| IP public của router | lấy bằng `curl -4 ifconfig.me` |
| Tên miền admin | `admin.minhhieudev.id.vn` |
| Tên miền API | `api.minhhieudev.id.vn` |
| Thư mục project | `/root/Documents/port` |
| Admin (React) | `https://admin.minhhieudev.id.vn` |
| API | `https://api.minhhieudev.id.vn` |
| .NET | 10, image `aspnet:10.0`. Tiến trình API bị giới hạn khoảng 256 MB |
| RAM VPS | 2 GB. API 512 MB, PostgreSQL 512 MB, frontend 64 MB, Nginx 32 MB |

## 1. Kiểm tra Ubuntu 24.04

Đăng nhập máy ảo bằng `root`, rồi xác nhận phiên bản. `VERSION_ID` phải là `24.04` và `VERSION_CODENAME` là `noble`.

```bash
ssh root@192.168.1.5
. /etc/os-release
echo "$NAME $VERSION_ID $VERSION_CODENAME"
uname -m
```

- `ssh root@192.168.1.5` mở phiên làm việc từ máy khác vào user `root` trên máy ảo. Mọi lệnh sau đó chạy trên Ubuntu, không chạy trên máy đang gõ.
- `. /etc/os-release` đọc file mô tả hệ điều hành vào shell hiện tại. Dấu chấm là lệnh `source`. File này khai báo `NAME`, `VERSION_ID`, `VERSION_CODENAME`.
- `echo "$NAME $VERSION_ID $VERSION_CODENAME"` in ba biến vừa nạp, ví dụ `Ubuntu 24.04 noble`. Dùng để chắc máy đúng bản 24.04 trước khi thêm kho Docker `noble`.
- `uname -m` in kiến trúc CPU. `aarch64` là ARM64, `x86_64` là AMD64. API .NET 10 chạy được trên cả hai.

Ubuntu 24.04 khóa SSH của `root`. Đặt mật khẩu root một lần, rồi chỉ cho phép đăng nhập root bằng SSH key:

```bash
sudo passwd root
printf '%s\n' 'PermitRootLogin prohibit-password' | sudo tee /etc/ssh/sshd_config.d/10-permit-root.conf
sudo systemctl restart ssh
```

- `sudo passwd root` đặt hoặc đổi mật khẩu tài khoản `root`. `sudo` chạy lệnh với quyền quản trị. Lệnh này hỏi mật khẩu mới hai lần. GitHub Actions không dùng mật khẩu này. Mật khẩu chỉ để vào máy khi chưa có key.
- `printf '%s\n' 'PermitRootLogin prohibit-password'` in đúng một dòng cấu hình, có ký tự xuống dòng ở cuối. `prohibit-password` cho `root` đăng nhập bằng SSH key và chặn đăng nhập root bằng mật khẩu.
- `| sudo tee /etc/ssh/sshd_config.d/10-permit-root.conf` chuyển dòng vừa in vào file. `tee` vừa ghi file vừa cần `sudo` vì thư mục cấu hình SSH thuộc root. Ubuntu 24.04 đọc mọi file `*.conf` trong `sshd_config.d` và file này ghi đè cấu hình mặc định.
- `sudo systemctl restart ssh` khởi động lại dịch vụ SSH để áp dụng file vừa ghi. Kết nối SSH hiện tại có thể bị ngắt. `systemctl` là trình quản lý dịch vụ của systemd.

Cập nhật gói và cài công cụ cơ bản:

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y ca-certificates curl gnupg git openssh-server
sudo systemctl enable --now ssh
```

- `sudo apt update` tải danh sách gói mới nhất từ các kho apt. Lệnh này chưa cài hay nâng cấp phần mềm.
- `sudo apt upgrade -y` nâng các gói đã cài lên bản trong danh sách vừa tải. `-y` tự trả lời có, không dừng để hỏi.
- `sudo apt install -y ...` cài các gói còn thiếu. `ca-certificates` là bộ chứng chỉ HTTPS để `curl` và Docker tin cậy máy chủ. `curl` tải file qua HTTP. `gnupg` kiểm tra chữ ký gói. `git` lấy mã nguồn. `openssh-server` là dịch vụ SSH để GitHub Actions kết nối vào máy.
- `sudo systemctl enable --now ssh` bật dịch vụ SSH ngay (`--now`) và ghi dịch vụ tự chạy mỗi lần khởi động (`enable`).

## 2. Cài Docker Engine

Cài theo kho chính thức của Docker cho Ubuntu. Gỡ gói Docker cũ của Ubuntu trước, vì `docker.io` và `containerd` trong Ubuntu tranh file với `docker-ce`.

```bash
for pkg in docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc; do sudo apt-get remove -y "$pkg" || true; done
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
```

- `for pkg in docker.io ...; do sudo apt-get remove -y "$pkg" || true; done` gỡ từng gói Docker có sẵn trong Ubuntu. `|| true` giữ cho vòng lặp chạy tiếp khi máy chưa cài gói đó. `docker.io` là bản Docker của Ubuntu. `docker-compose` và `docker-compose-v2` là lệnh Compose cũ. `podman-docker` giả lập lệnh `docker` bằng Podman. `containerd` và `runc` là runtime đi kèm bản cũ.
- `sudo install -m 0755 -d /etc/apt/keyrings` tạo thư mục chứa khóa kho apt. `-d` chỉ tạo thư mục. `-m 0755` đặt quyền đọc và vào thư mục cho mọi user, chỉ root được sửa.
- `sudo curl -fsSL ... -o /etc/apt/keyrings/docker.asc` tải khóa công khai của Docker và ghi vào file. `-f` báo lỗi nếu HTTP thất bại, `-sS` bớt thanh tiến trình nhưng vẫn in lỗi, `-L` đi theo chuyển hướng.
- `sudo chmod a+r /etc/apt/keyrings/docker.asc` cho mọi user quyền đọc khóa. `apt` chạy bằng user hạn chế vẫn cần đọc được file này.
- `echo "deb ..." | sudo tee ... > /dev/null` ghi một dòng kho phần mềm. `dpkg --print-architecture` điền `amd64` hoặc `arm64` đúng với máy. `signed-by` buộc apt chỉ tin gói được khóa Docker ký. `UBUNTU_CODENAME` trên Ubuntu 24.04 là `noble`. `stable` là kênh ổn định. `tee` ghi file với quyền root. `> /dev/null` bỏ bản sao in ra màn hình.
- `sudo apt-get update` đọc kho vừa thêm để biết các gói Docker.
- `sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin` cài Docker Engine (`docker-ce`), lệnh `docker` (`docker-ce-cli`), runtime container (`containerd.io`), công cụ build image (`docker-buildx-plugin`) và lệnh `docker compose` (`docker-compose-plugin`).
- `sudo systemctl enable --now docker` chạy Docker ngay và cho Docker tự chạy khi máy bật.

`root` dùng Docker trực tiếp, không cần thêm vào nhóm `docker`. Kiểm tra bản đã cài:

```bash
docker version
docker compose version
sudo docker run --rm hello-world
```

- `docker version` in bản client và server. Server có thông tin nghĩa là dịch vụ Docker đang chạy.
- `docker compose version` in bản plugin Compose. Project dùng lệnh `docker compose`, không dùng lệnh cũ `docker-compose`.
- `sudo docker run --rm hello-world` tải image thử của Docker, chạy một container rồi xóa container đó (`--rm`). Dòng `Hello from Docker!` nghĩa là engine kéo image và chạy container được.

Nếu `docker pull` báo `no such host`, đổi DNS của card đang dùng:

```bash
CONN=$(nmcli -t -f NAME,DEVICE connection show --active | awk -F: '$2 != "" && $2 != "lo" {print $1; exit}')
sudo nmcli connection modify "$CONN" ipv4.dns "8.8.8.8 1.1.1.1"
sudo nmcli connection modify "$CONN" ipv4.ignore-auto-dns yes
sudo nmcli connection up "$CONN"
getent hosts mcr.microsoft.com
```

- `nmcli -t -f NAME,DEVICE connection show --active` liệt kê kết nối mạng đang bật. `-t` xuất dạng dễ cắt, `-f` chỉ lấy tên kết nối và tên card.
- `awk -F: '$2 != "" && $2 != "lo" {print $1; exit}'` tách mỗi dòng bằng dấu `:`, bỏ card loopback `lo`, in tên kết nối đầu tiên rồi dừng. Kết quả gán vào biến `CONN`.
- `sudo nmcli connection modify "$CONN" ipv4.dns "8.8.8.8 1.1.1.1"` đặt DNS của kết nối đó thành Google và Cloudflare.
- `sudo nmcli connection modify "$CONN" ipv4.ignore-auto-dns yes` bỏ DNS do DHCP của router đẩy xuống, để máy dùng hai DNS vừa đặt.
- `sudo nmcli connection up "$CONN"` áp dụng lại kết nối. Phiên SSH có thể gián đoạn một nhịp.
- `getent hosts mcr.microsoft.com` hỏi DNS và in địa chỉ IP của registry Microsoft. Có địa chỉ IP thì tên đã phân giải được. Lệnh này chỉ để kiểm tra DNS khi `docker pull` báo `no such host`.

## 3. Firewall

Ubuntu 24.04 dùng `ufw`. Mở SSH, HTTP (Nginx) và PostgreSQL trước khi bật firewall.

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 5432/tcp
sudo ufw --force enable
sudo ufw status
ss -lnt | grep 22
```

- `sudo ufw allow OpenSSH` cho phép gói tới dịch vụ SSH, thường là cổng TCP `22`. Phải mở cổng này trước khi bật firewall, nếu không phiên SSH hiện tại và GitHub Actions đều bị chặn.
- `sudo ufw allow 80/tcp` cho phép vào Nginx. Nginx proxy sang API trong mạng Docker, không mở cổng `8080` ra ngoài.
- `sudo ufw allow 5432/tcp` cho phép DBeaver trên mạng nhà vào PostgreSQL. Không chuyển tiếp cổng `5432` trên router ra internet.
- `sudo ufw --force enable` bật firewall và ghi luật để còn hiệu lực sau khi reboot. `--force` không hỏi xác nhận.
- `sudo ufw status` in các luật đang hoạt động để đối chiếu ba cổng trên.
- `ss -lnt` liệt kê cổng TCP đang lắng nghe. `-l` chỉ socket listen, `-n` in số cổng, `-t` chỉ TCP. `| grep 22` lọc dòng cổng 22. Phải thấy `0.0.0.0:22` hoặc `*:22`, nghĩa là SSH nhận kết nối từ mọi card mạng.

## 4. SSH key cho CI/CD

GitHub Actions đăng nhập bằng private key, không dùng mật khẩu. Tạo key trên Ubuntu, không đặt passphrase vì workflow không nhập được passphrase.

```bash
mkdir -p "$HOME/.ssh"
chmod 700 "$HOME/.ssh"
ssh-keygen -t ed25519 -f "$HOME/.ssh/gha_deploy" -N ""
cat "$HOME/.ssh/gha_deploy.pub" >> "$HOME/.ssh/authorized_keys"
chmod 600 "$HOME/.ssh/authorized_keys"
```

- `mkdir -p "$HOME/.ssh"` tạo thư mục khóa SSH của `root`. Với user này, `$HOME` là `/root`. `-p` không báo lỗi nếu thư mục đã có, và tạo luôn thư mục cha nếu thiếu.
- `chmod 700 "$HOME/.ssh"` chỉ chủ thư mục được vào, đọc và sửa. SSH từ chối dùng thư mục nếu user khác cũng đọc được.
- `ssh-keygen -t ed25519 -f "$HOME/.ssh/gha_deploy" -N ""` tạo một cặp key. `-t ed25519` chọn thuật toán. `-f` đặt đường dẫn private key. File `.pub` cạnh đó là public key. `-N ""` để passphrase rỗng.
- `cat "$HOME/.ssh/gha_deploy.pub" >> "$HOME/.ssh/authorized_keys"` nối public key vào danh sách key được phép đăng nhập. `>>` thêm vào cuối file, không xóa key cũ.
- `chmod 600 "$HOME/.ssh/authorized_keys"` chỉ `root` đọc và sửa file này. SSH bỏ qua file nếu quyền rộng hơn.

Xem private key để dán vào secret `VPS_SSH_KEY`. Không commit file này.

```bash
cat "$HOME/.ssh/gha_deploy"
```

- `cat "$HOME/.ssh/gha_deploy"` in toàn bộ private key ra terminal, gồm dòng `BEGIN OPENSSH PRIVATE KEY` và `END OPENSSH PRIVATE KEY`. Secret trên GitHub phải chứa đúng khối này.

Trong mạng nhà, thử key trước khi đưa lên GitHub:

```bash
ssh -i "$HOME/.ssh/gha_deploy" root@192.168.1.5
```

- `ssh -i ... root@192.168.1.5` đăng nhập lại chính máy ảo bằng private key vừa tạo. `-i` chỉ định file key. Vào được shell thì public key đã nằm đúng trong `authorized_keys`.

## 5. Clone và chạy ứng dụng

```bash
mkdir -p "$HOME/Documents/port"
cd "$HOME/Documents/port"
git clone https://github.com/HieuNguyenddev/testCICD.git .
cd backend/RoleManagement.Api
docker compose up -d --build
```

- `mkdir -p "$HOME/Documents/port"` tạo `/root/Documents/port`. `-p` tạo cả `Documents` nếu chưa có.
- `cd "$HOME/Documents/port"` chuyển thư mục làm việc hiện tại vào đó. Các lệnh tiếp theo đọc và ghi file tại đây.
- `git clone https://github.com/HieuNguyenddev/testCICD.git .` tải repository về thư mục hiện tại. Dấu `.` ở cuối nghĩa là bỏ nội dung vào thư mục đang đứng, không tạo thêm thư mục `testCICD`.
- `cd backend/RoleManagement.Api` vào thư mục có `Dockerfile` và `docker-compose.yml`.
- `docker compose up -d --build` build image API (`Dockerfile`) và image admin (`frontend/Dockerfile`), rồi chạy API, PostgreSQL, frontend và Nginx. `-d` chạy nền. `--build` build lại khi mã nguồn đổi. API chỉ chạy sau khi PostgreSQL healthy, rồi tự tạo bảng.

Đường dẫn đầy đủ là `/root/Documents/port`. Nginx lắng nghe cổng `80` và `443`. Admin ở `https://admin.minhhieudev.id.vn`. API nội bộ cổng `8080`. PostgreSQL cổng `5432`, database `RoleManagementDb`. GitHub Actions làm đúng lệnh này sau mỗi lần push `main`.

Kiểm tra container:

```bash
docker compose ps
```

- `docker compose ps` liệt kê container của project này. `api`, `nginx` và `postgres` phải `running`. `postgres` phải `healthy`.

Nếu còn stack cũ (SQL Server, SQLite, hoặc API map cổng `8080` ra host), xóa rồi chạy lại:

```bash
cd /root/Documents/port
git pull
cd backend/RoleManagement.Api
docker compose down
docker compose up -d --build
docker compose ps
```

`docker compose ps` phải hiện `api`, `frontend` và `nginx` là `running`, `postgres` là `healthy`.

Cập nhật tay khi cần:

```bash
cd "$HOME/Documents/port"
git pull
cd backend/RoleManagement.Api
docker compose up -d --build
```

- `cd "$HOME/Documents/port"` về thư mục gốc của git.
- `git pull` tải commit mới từ GitHub và trộn vào bản đang có trên máy.
- `cd backend/RoleManagement.Api` trở lại thư mục Compose.
- `docker compose up -d --build` dựng lại image API và khởi động lại container theo file Compose mới.

Xem log khi API trả lỗi:

```bash
docker compose logs api --tail 50
```

- `docker compose logs api --tail 50` in 50 dòng log cuối của container API. Dùng khi Postman nhận **500**.

## 6. Secret GitHub Actions

Vào repository: **Settings → Secrets and variables → Actions → New repository secret**.

Workflow `.github/workflows/deploy.yml` chạy khi có push lên nhánh `main`, hoặc khi bấm **Run workflow**. Runner `ubuntu-latest` của GitHub SSH vào VPS bằng key, kéo cả repository, rồi build và chạy API, frontend, Nginx và PostgreSQL. Tên secret phải khớp từng chữ với file workflow.

Script trên VPS làm lần lượt:

1. `cd` vào `DEPLOY_PATH`, thư mục có `docker-compose.yml`.
2. `git pull --ff-only` ở thư mục gốc repository, nên cả `frontend/` và `backend/` đều được cập nhật.
3. Kiểm tra file `frontend/Dockerfile` tồn tại. Thiếu file thì dừng, không deploy bản cũ.
4. `docker compose up -d --build` build image API và image admin, rồi tạo lại container.
5. Nếu chưa có chứng chỉ `admin.minhhieudev.id.vn`, Certbot xin chứng chỉ Let's Encrypt qua cổng 80 khi Nginx cũ vẫn đang chạy.
6. `docker compose up -d --build` build image API và image admin, rồi tạo lại container.
7. `docker compose exec -T nginx nginx -t` rồi `nginx -s reload`. Admin là `https://admin.minhhieudev.id.vn`. API là `https://api.minhhieudev.id.vn`.

| Secret trong `deploy.yml` | Ô trong workflow | Giá trị điền |
| --- | --- | --- |
| `VPS_HOST` | `host` | IP public của máy đang chạy Docker, lấy bằng `curl -4 ifconfig.me` trên máy đó. Chỉ điền IP, không điền `api.minhhieudev.id.vn` |
| `VPS_USER` | `username` | `root` |
| `VPS_SSH_KEY` | `key` | Nội dung file `/root/.ssh/gha_deploy` |
| `VPS_PORT` | `port` | `22` |
| `DEPLOY_PATH` | `script` (`cd`) | `/root/Documents/port/backend/RoleManagement.Api` |

`VPS_HOST` phải là IP của máy mà Actions SSH vào, không phải tên miền. Tên miền chỉ dùng sau khi bản ghi A đã trỏ đúng máy đó. Lấy IP trên chính máy deploy:

```bash
curl -4 ifconfig.me
ip -4 addr
```

- `curl -4 ifconfig.me` hỏi một dịch vụ bên ngoài xem địa chỉ IPv4 nào đang đi ra internet. `-4` buộc dùng IPv4. Kết quả điền vào `VPS_HOST`.
- `ip -4 addr` liệt kê địa chỉ IPv4 gắn trên từng card. Trên máy ảo nhà, card `enp2s0` là `192.168.1.5`. Nếu deploy trên máy này, router phải chuyển tiếp TCP cổng `22` tới `192.168.1.5`.

Dòng `Will download drone-ssh-1.8.1-linux-amd64` chạy trên runner GitHub, không phải trên máy ảo. Log `dial tcp ***:***: i/o timeout` nghĩa là runner chưa mở được TCP tới `VPS_HOST`:`VPS_PORT`. Key chưa được kiểm tra. Từ mạng di động, lệnh sau phải vào được shell rồi mới chạy lại Actions. Thay `IP_PUBLIC` bằng đúng số vừa lấy từ `curl -4 ifconfig.me`:

```bash
ssh -p 22 -i ~/.ssh/gha_deploy root@IP_PUBLIC
```

- `ssh -p 22 -i ~/.ssh/gha_deploy root@IP_PUBLIC` thử đúng đường GitHub Actions sẽ đi: cổng `22`, private key CI, user `root`, IP public. `-p` chọn cổng. Phải chạy lệnh này từ mạng di động, không chạy từ Wi-Fi cùng nhà, vì nhiều router không cho máy trong LAN đi vòng ra IP public của chính router.

`timed out` nghĩa là router hoặc nhà mạng chưa mở cổng vào. `Connection refused` nghĩa là gói đã tới nhưng cổng 22 không có dịch vụ lắng nghe.

## 7. Test bằng Postman

Trong mạng nhà, base URL là `http://192.168.1.5`. Gọi ngay trên máy ảo thì dùng `http://localhost`. Qua tên miền dùng `http://api.minhhieudev.id.vn`. Không cần cổng `8080` vì Nginx nhận cổng `80`. Mỗi request có body chọn tab **Body → raw → JSON**.

| Thao tác | Request | Kết quả đúng |
| --- | --- | --- |
| Tạo vai trò | `POST /api/roles` | **201 Created** |
| Tạo trùng tên | `POST /api/roles` | **409 Conflict** |
| Danh sách | `GET /api/roles` | **200 OK** |
| Một vai trò | `GET /api/roles/1` | **200 OK**, id không có thì **404** |
| Sửa | `PUT /api/roles/1` | **200 OK** |
| Xóa | `DELETE /api/roles/1` | **204 No Content** |

Body tạo vai trò:

```json
{
  "name": "Admin",
  "description": "Quản trị hệ thống"
}
```

Body sửa vai trò:

```json
{
  "name": "Administrator",
  "description": "Toàn quyền hệ thống"
}
```

Sau khi xóa, `GET /api/roles/1` trả **404 Not Found**. Nếu POST trả **500**, xem log bằng `docker compose logs api --tail 50`.

## 8. Mở database bằng DBeaver

PostgreSQL nhận kết nối mạng. DBeaver trên Mac nối thẳng tới máy ảo, không copy file.

1. **Database → New Database Connection**.
2. Chọn **PostgreSQL**, bấm **Next**.
3. Điền:

| Ô | Giá trị |
| --- | --- |
| Host | `192.168.1.5` |
| Port | `5432` |
| Database | `RoleManagementDb` |
| Username | `postgres` |
| Password | `123456Aa@` |

4. Bấm **Test Connection**. Lần đầu DBeaver hỏi tải driver PostgreSQL, chọn **Download**.
5. Thông báo **Connected** thì bấm **Finish**.

Bảng dữ liệu tên `Roles`. Mở **RoleManagementDb → Schemas → public → Tables → Roles → View Data**. Gọi API thêm vai trò xong, bấm làm mới bảng để thấy dòng mới.

## 9. Trỏ `103.183.120.48` vào `minhhieudev.id.vn` và `api.minhhieudev.id.vn`

DNS không mở website. Bản ghi A chỉ nói: tên miền này đi tới IPv4 nào. Muốn admin, tên miền gốc và API tới máy `103.183.120.48`, tạo ba bản ghi A cùng Value.

### 9.1. Tạo bản ghi A trên panel DNS

Đăng nhập nhà đăng ký tên miền (hoặc Cloudflare) → zone `minhhieudev.id.vn` → DNS → Add record. Tạo lần lượt:

| Mục đích | Type | Host / Name | Value | TTL | Tên đầy đủ sau khi lưu |
| --- | --- | --- | --- | --- | --- |
| Trang gốc | `A` | `@` (hoặc để trống) | `103.183.120.48` | `300` | `minhhieudev.id.vn` |
| Admin | `A` | `admin` | `103.183.120.48` | `300` | `admin.minhhieudev.id.vn` |
| API | `A` | `api` | `103.183.120.48` | `300` | `api.minhhieudev.id.vn` |

Giải thích từng ô:

- **Type `A`**: gắn tên với IPv4. Không dùng `CNAME` để trỏ root `@` sang IP.
- **Host `@`**: tên gốc `minhhieudev.id.vn`. Một số panel ghi `root` hoặc để trống thay cho `@`.
- **Host `admin`**: chỉ gõ `admin`. Panel tạo `admin.minhhieudev.id.vn`. Không gõ full tên vào ô Host.
- **Host `api`**: chỉ gõ `api`. Panel tự ghép thành `api.minhhieudev.id.vn`. Không gõ `api.minhhieudev.id.vn` vào ô Host (sẽ thành tên lỗi `api.minhhieudev.id.vn.minhhieudev.id.vn`).
- **Value `103.183.120.48`**: IP máy VPS đang chạy Docker / Nginx. Không ghi `http://`, không ghi cổng, không ghi `192.168.1.5`.
- **TTL `300`**: cache khoảng 5 phút. Đổi IP xong đợi vài phút rồi kiểm tra lại.

Nếu đã có bản ghi A `api` hoặc `@` với IP khác, **sửa Value** thành `103.183.120.48`, không tạo trùng Host.

`www` (tuỳ chọn): thêm bản ghi A Host `www` Value `103.183.120.48`, hoặc CNAME `www` → `minhhieudev.id.vn`.

### 9.2. Kiểm tra DNS đã trỏ đúng

Trên Mac, sau 1–5 phút:

```bash
dig +short minhhieudev.id.vn A
dig +short admin.minhhieudev.id.vn A
dig +short api.minhhieudev.id.vn A
```

Cả ba lệnh phải in `103.183.120.48`.

Trên VPS `103.183.120.48`:

```bash
curl -4 ifconfig.me
```

Phải ra đúng `103.183.120.48`. DNS khớp máy thì gọi tên miền mới tới đúng chỗ.

`VPS_HOST` trên GitHub vẫn chỉ điền `103.183.120.48`, không điền tên miền.

### 9.3. Mở cổng và chạy Compose trên VPS `103.183.120.48`

DNS xong chưa đủ. Trên máy `103.183.120.48`:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw status
cd /root/Documents/port
git pull
cd backend/RoleManagement.Api
docker compose up -d --build
docker compose ps
```

`api`, `frontend`, `nginx` phải `running`. `postgres` phải `healthy`.

Nginx trong Compose đọc `nginx/default.conf`:

- `admin.minhhieudev.id.vn` → container `frontend` (image build từ `frontend/Dockerfile`)
- `api.minhhieudev.id.vn` → API cổng `8080`
- `minhhieudev.id.vn` → chuyển hướng sang `https://admin.minhhieudev.id.vn`

Không cài Nginx bằng `apt` trên host. Nếu chạy trên máy ảo `192.168.1.5` thì forward WAN `22` và `80` tới máy đó.

### 9.4. Thử admin và API

Từ mạng ngoài (di động):

```bash
curl -i http://admin.minhhieudev.id.vn/
curl -i https://api.minhhieudev.id.vn/api/roles
```

Mở trình duyệt `https://admin.minhhieudev.id.vn` để dùng giao diện admin (tạo / sửa / xóa vai trò). Postman base URL API: `https://api.minhhieudev.id.vn`.

Chạy admin local khi đang sửa React:

```bash
cd /root/Documents/port/frontend
npm install
npm run dev
```

Vite mở `http://localhost:5173` và proxy `/api` sang `http://api.minhhieudev.id.vn`.

### 9.5. Secret GitHub Actions

| Secret | Giá trị |
| --- | --- |
| `VPS_HOST` | `103.183.120.48` nếu API chạy trên máy đó. Chỉ IP, không dùng tên miền |
| `VPS_USER` | `root` |
| `VPS_PORT` | `22` |
| `DEPLOY_PATH` | `/root/Documents/port/backend/RoleManagement.Api` |

```bash
ssh -p 22 -i ~/.ssh/gha_deploy root@103.183.120.48
```

Vào được shell từ mạng ngoài rồi mới chạy lại workflow Deploy.

## 10. SSL cho `api.minhhieudev.id.vn`

HTTPS dùng chứng chỉ miễn phí của Let's Encrypt. Nginx trong Docker nhận file chứng chỉ từ máy chủ. Làm trên VPS `103.183.120.48`, sau khi `dig +short api.minhhieudev.id.vn A` đã in `103.183.120.48` và `http://api.minhhieudev.id.vn/api/roles` đã trả **200**.

### 10.1. Mở cổng 443

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status
```

- `sudo ufw allow 80/tcp` giữ cổng HTTP. Let's Encrypt kiểm tra tên miền qua cổng này.
- `sudo ufw allow 443/tcp` mở HTTPS. Trình duyệt và Postman sẽ gọi cổng này.
- `sudo ufw status` phải thấy `80/tcp` và `443/tcp` là `ALLOW`.

Trên router, nếu API chạy ở máy ảo nhà, chuyển tiếp WAN `443` → `192.168.1.5:443`. VPS `103.183.120.48` thì không cần bước router.

### 10.2. Cài Certbot và xin chứng chỉ

```bash
sudo apt update
sudo apt install -y certbot
cd /root/Documents/port
git pull
cd backend/RoleManagement.Api
mkdir -p certbot/www
docker compose up -d --build
sudo certbot certonly --webroot \
  -w /root/Documents/port/backend/RoleManagement.Api/certbot/www \
  -d api.minhhieudev.id.vn \
  --email hieugm22@gmail.com \
  --agree-tos \
  --no-eff-email
```

- `sudo apt install -y certbot` cài chương trình xin và gia hạn chứng chỉ. Certbot chạy trên Ubuntu, không chạy trong container.
- `git pull` lấy bản Nginx có đường dẫn `/.well-known/acme-challenge/`.
- `mkdir -p certbot/www` tạo thư mục Let's Encrypt ghi file kiểm tra. Container Nginx đọc đúng thư mục này.
- `docker compose up -d --build` chạy lại Nginx với cổng `80`, `443` và hai volume chứng chỉ.
- `certbot certonly --webroot` chỉ xin file chứng chỉ, không sửa Nginx. `-w` là thư mục webroot. `-d` là đúng tên `api.minhhieudev.id.vn`. `--email` nhận thư hết hạn. `--agree-tos` chấp nhận điều khoản Let's Encrypt.

Thành công thì có hai file:

- `/etc/letsencrypt/live/api.minhhieudev.id.vn/fullchain.pem`
- `/etc/letsencrypt/live/api.minhhieudev.id.vn/privkey.pem`

### 10.3. Bật HTTPS trong Nginx

Sửa `backend/RoleManagement.Api/nginx/default.conf`. Thay khối `server` của `api.minhhieudev.id.vn` (khối `listen 80` đầu tiên) bằng hai khối sau. Giữ nguyên khối `server` của `minhhieudev.id.vn`.

```nginx
server {
    listen 80;
    server_name api.minhhieudev.id.vn;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name api.minhhieudev.id.vn;

    ssl_certificate /etc/letsencrypt/live/api.minhhieudev.id.vn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.minhhieudev.id.vn/privkey.pem;

    client_max_body_size 10m;

    location / {
        proxy_pass http://rolemanagement_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
    }
}
```

- Khối cổng `80` vẫn phục vụ file kiểm tra gia hạn chứng chỉ, mọi URL khác chuyển sang `https://`.
- `ssl_certificate` là chứng chỉ đầy đủ. `ssl_certificate_key` là khóa riêng. Cả hai nằm trong volume `/etc/letsencrypt` đã gắn vào container.
- `proxy_pass http://rolemanagement_api` vẫn là HTTP nội bộ trong Docker. Chỉ phía ngoài dùng HTTPS.
- `X-Forwarded-Proto` báo cho API biết client gọi bằng `https`.

### 10.4. Reload Nginx

Sửa file trên máy chưa làm container đổi cấu hình. Phải kiểm tra rồi reload Nginx **trong container**:

```bash
cd /root/Documents/port/backend/RoleManagement.Api
docker compose exec nginx nginx -t
docker compose exec nginx nginx -s reload
docker compose ps
```

- `cd /root/Documents/port/backend/RoleManagement.Api` đứng đúng thư mục có `docker-compose.yml`.
- `docker compose exec nginx nginx -t` chạy `nginx -t` bên trong container `nginx`. Lệnh này đọc `default.conf` vừa sửa và hai file `.pem`. Phải in `syntax is ok` và `test is successful`. Nếu báo không thấy file `.pem`, chứng chỉ chưa được cấp hoặc volume `/etc/letsencrypt` chưa gắn.
- `docker compose exec nginx nginx -s reload` bảo tiến trình Nginx đang chạy nạp lại file cấu hình, không tắt container. Dòng `signal process started` nghĩa là reload đã nhận tín hiệu và thành công.
- Không chạy `sudo systemctl reload nginx`. Máy không có dịch vụ `nginx.service` nên lệnh đó báo `nginx.service is not active, cannot reload`. Nginx chỉ chạy trong container.
- `docker compose ps` xác nhận container `nginx` vẫn `running`.

### 10.5. Kiểm tra

```bash
curl -I http://api.minhhieudev.id.vn/api/roles
curl -i https://api.minhhieudev.id.vn/api/roles
```

- Lệnh `http://` phải trả `301` và header `Location: https://api.minhhieudev.id.vn/api/roles`.
- Lệnh `https://` phải trả **200**. Postman dùng base URL `https://api.minhhieudev.id.vn`.

### 10.6. Gia hạn

Chứng chỉ Let's Encrypt hết hạn sau 90 ngày. Certbot tự gia hạn. Thêm lệnh reload Nginx sau khi gia hạn:

```bash
sudo tee /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh >/dev/null <<'EOF'
#!/bin/sh
docker compose -f /root/Documents/port/backend/RoleManagement.Api/docker-compose.yml exec -T nginx nginx -s reload
EOF
sudo chmod 755 /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
sudo certbot renew --dry-run
```

- File hook chạy sau mỗi lần gia hạn thành công. `exec -T` reload Nginx không cần terminal.
- `certbot renew --dry-run` thử gia hạn, không đổi chứng chỉ thật. Dòng `simulated renewal` là ổn.

## 11. SSL cho `admin.minhhieudev.id.vn`

Admin React không tự giữ chứng chỉ. Container `frontend` chỉ nói HTTP trong mạng Docker. Nginx ở cổng 443 nhận HTTPS rồi chuyển vào `frontend:80`.

Điều kiện: `dig +short admin.minhhieudev.id.vn A` in `103.183.120.48`, cổng `80` và `443` đã mở, và `http://admin.minhhieudev.id.vn` đang mở được giao diện.

### 11.1. Xin chứng chỉ

Chạy khi Nginx hiện tại vẫn phục vụ HTTP, trước khi bật khối `listen 443` của admin:

```bash
cd /root/Documents/port/backend/RoleManagement.Api
mkdir -p certbot/www
sudo certbot certonly --webroot --non-interactive --expand \
  --cert-name api.minhhieudev.id.vn \
  -w /root/Documents/port/backend/RoleManagement.Api/certbot/www \
  -d api.minhhieudev.id.vn \
  -d admin.minhhieudev.id.vn \
  --email hieugm22@gmail.com \
  --agree-tos \
  --no-eff-email
```

- `--expand` thêm `admin.minhhieudev.id.vn` vào chứng chỉ đã cấp cho API. Chrome hết báo `NET::ERR_CERT_COMMON_NAME_INVALID`.
- `--cert-name api.minhhieudev.id.vn` sửa đúng bộ file Nginx đang dùng, không tạo bộ chứng chỉ thứ hai.
- `--webroot` ghi file kiểm tra vào `certbot/www`. Nginx đang chạy trả file đó ở `/.well-known/acme-challenge/`.

Lệnh này mở rộng chứng chỉ đang có của `api.minhhieudev.id.vn` để cùng chứa tên `admin.minhhieudev.id.vn`. Không tạo thư mục chứng chỉ riêng. File vẫn là:

- `/etc/letsencrypt/live/api.minhhieudev.id.vn/fullchain.pem`
- `/etc/letsencrypt/live/api.minhhieudev.id.vn/privkey.pem`

Nginx của admin và API cùng dùng hai file này. Workflow Deploy chạy `certbot --expand` trước khi tạo lại container.

### 11.2. Nginx

`backend/RoleManagement.Api/nginx/default.conf` đã có hai khối cho admin:

- cổng `80`: giữ đường dẫn kiểm tra chứng chỉ, URL còn lại trả `301` sang `https://admin.minhhieudev.id.vn`
- cổng `443`: dùng hai file `.pem` ở trên và `proxy_pass` tới container `frontend`

`minhhieudev.id.vn` chuyển hướng sang `https://admin.minhhieudev.id.vn`.

Nạp cấu hình trong container:

```bash
cd /root/Documents/port/backend/RoleManagement.Api
docker compose exec nginx nginx -t
docker compose exec nginx nginx -s reload
```

`nginx -t` phải in `syntax is ok`. Thiếu file `.pem` thì Nginx không khởi động. Không dùng `systemctl reload nginx`.

### 11.3. Kiểm tra

```bash
curl -I http://admin.minhhieudev.id.vn/
curl -I https://admin.minhhieudev.id.vn/
```

- HTTP trả `301` tới `https://admin.minhhieudev.id.vn/`.
- HTTPS trả **200**. Trình duyệt mở `https://admin.minhhieudev.id.vn`.

Gia hạn dùng chung hook ở mục 10.6. `certbot renew` gia hạn mọi chứng chỉ trên máy, rồi reload Nginx.
