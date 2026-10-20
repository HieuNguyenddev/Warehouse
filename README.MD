# Role Management API

API ASP.NET Core (.NET 10) và PostgreSQL 16, chạy bằng Docker Compose trong `backend/RoleManagement.Api`. PostgreSQL phù hợp máy 2 GB: image `postgres:16-alpine` khởi động với vài chục MB RAM, không có mức sàn 2 GB như SQL Server.

Máy chủ là **Ubuntu 24.04** trên VMware Fusion, card mạng **Bridged Networking → Autodetect**. Các lệnh dưới đây chạy bằng user `root`.

| Thông số | Giá trị |
| --- | --- |
| IP máy ảo | `192.168.1.5` |
| SSH trong mạng nhà | `root@192.168.1.5` |
| IP public của router | `171.225.184.87` (lấy lại bằng `curl -4 ifconfig.me`) |
| Tên miền API | `api.minhhieudev.id.vn` |
| Thư mục project | `/root/Documents/port` |
| API trong mạng nhà | `http://192.168.1.5:8080` |
| API qua tên miền | `http://api.minhhieudev.id.vn:8080` |
| .NET | 10, image `aspnet:10.0`. Tiến trình API bị giới hạn khoảng 256 MB |
| RAM VPS | 2 GB. API trần 512 MB, PostgreSQL trần 512 MB, `shared_buffers` 128 MB |

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

Ubuntu 24.04 dùng `ufw`. Mở SSH và API trước khi bật firewall.

```bash
sudo ufw allow OpenSSH
sudo ufw allow 8080/tcp
sudo ufw allow 5432/tcp
sudo ufw --force enable
sudo ufw status
ss -lnt | grep 22
```

- `sudo ufw allow OpenSSH` cho phép gói tới dịch vụ SSH, thường là cổng TCP `22`. Phải mở cổng này trước khi bật firewall, nếu không phiên SSH hiện tại và GitHub Actions đều bị chặn.
- `sudo ufw allow 8080/tcp` cho phép vào cổng API.
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
- `docker compose up -d --build` build image API rồi chạy API và PostgreSQL. `-d` chạy nền, terminal được trả lại. `--build` build lại image khi Dockerfile hoặc mã nguồn đổi. API chỉ chạy sau khi PostgreSQL healthy, rồi tự tạo bảng.

Đường dẫn đầy đủ là `/root/Documents/port`. API lắng nghe cổng `8080`. PostgreSQL lắng nghe cổng `5432`, database tên `RoleManagementDb`.

Kiểm tra container:

```bash
docker compose ps
```

- `docker compose ps` liệt kê container của project này. `api` và `postgres` phải `running`. `postgres` phải `healthy`.

Nếu log còn `dependency sqlserver` hoặc container SQLite cũ, xóa stack cũ rồi chạy bản PostgreSQL:

```bash
cd /root/Documents/port
git pull
cd backend/RoleManagement.Api
docker compose down
docker compose up -d --build
docker compose ps
```

`docker compose ps` phải hiện `api` là `running` và `postgres` là `healthy`.

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

Workflow `.github/workflows/deploy.yml` chạy trên runner `ubuntu-latest` của GitHub, SSH vào Ubuntu 24.04 bằng key, rồi `git pull` và `docker compose up -d --build`. Tên secret phải khớp từng chữ với file workflow.

| Secret trong `deploy.yml` | Ô trong workflow | Giá trị điền |
| --- | --- | --- |
| `VPS_HOST` | `host` | `171.225.184.87` hoặc `api.minhhieudev.id.vn` khi bản ghi A đã đúng |
| `VPS_USER` | `username` | `root` |
| `VPS_SSH_KEY` | `key` | Nội dung file `/root/.ssh/gha_deploy` |
| `VPS_PORT` | `port` | `22` |
| `DEPLOY_PATH` | `script` (`cd`) | `/root/Documents/port/backend/RoleManagement.Api` |

`171.225.184.87` là IP public của router nhà tại thời điểm ghi. Nhà mạng có thể đổi IP. Lấy lại trên Ubuntu bằng:

```bash
curl -4 ifconfig.me
ip -4 addr
```

- `curl -4 ifconfig.me` hỏi một dịch vụ bên ngoài xem địa chỉ IPv4 nào đang đi ra internet. `-4` buộc dùng IPv4. Kết quả là IP public của router, điền vào `VPS_HOST` và vào bản ghi DNS A.
- `ip -4 addr` liệt kê địa chỉ IPv4 gắn trên từng card của máy ảo. Card `enp2s0` là `192.168.1.5`. Router phải chuyển tiếp TCP cổng `22` tới địa chỉ này, cổng `22`.

Dòng `Will download drone-ssh-1.8.1-linux-amd64` chạy trên runner GitHub, không phải trên máy ảo. Log `dial tcp ***:***: i/o timeout` nghĩa là runner chưa mở được TCP tới `VPS_HOST`:`VPS_PORT`. Key chưa được kiểm tra. Từ mạng di động, lệnh sau phải vào được shell rồi mới chạy lại Actions:

```bash
ssh -p 22 -i ~/.ssh/gha_deploy root@171.225.184.87
```

- `ssh -p 22 -i ~/.ssh/gha_deploy root@171.225.184.87` thử đúng đường GitHub Actions sẽ đi: cổng `22`, private key CI, user `root`, IP public. `-p` chọn cổng. Phải chạy lệnh này từ mạng di động, không chạy từ Wi-Fi cùng nhà, vì nhiều router không cho máy trong LAN đi vòng ra IP public của chính router.

`timed out` nghĩa là router hoặc nhà mạng chưa mở cổng vào. `Connection refused` nghĩa là gói đã tới nhưng cổng 22 không có dịch vụ lắng nghe.

## 7. Test bằng Postman

Trong mạng nhà, base URL là `http://192.168.1.5:8080`. Gọi ngay trên máy ảo thì dùng `http://localhost:8080`. Mỗi request có body chọn tab **Body → raw → JSON**.

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

## 9. Tên miền `api.minhhieudev.id.vn`

### 9.1. Lỗi đang gặp

Hai lệnh trên Mac cho kết quả lệch nhau:

```bash
curl -4 ifconfig.me
# 171.225.184.87

dig +short api.minhhieudev.id.vn A
# 103.183.120.48

nslookup api.minhhieudev.id.vn
# Address: 103.183.120.48
```

- `171.225.184.87` là IP public thật của router nhà lúc này.
- `103.183.120.48` là value đang ghi trong bản ghi A. Đó là máy khác, không phải máy ảo của bạn.
- `192.168.1.5` là IP LAN. Không đưa số này vào bản ghi A trên internet.

DNS đang đúng cú pháp nhưng trỏ sai chỗ. Sửa bằng cách đổi value của bản ghi A.

### 9.2. Sửa bản ghi A

Vào trang quản lý DNS của `minhhieudev.id.vn` (nhà đăng ký tên miền hoặc Cloudflare, nếu đang dùng):

| Ô | Giá trị đúng |
| --- | --- |
| Type | `A` |
| Host / Name | `api` |
| Value / Points to | `171.225.184.87` |
| TTL | `300` |

Lưu bản ghi. Nếu đang có bản ghi A `api` trỏ `103.183.120.48`, sửa value đó, không tạo thêm bản ghi A trùng tên.

### 9.3. Đợi TTL và kiểm tra lại

TTL `300` nghĩa là máy DNS khác có thể giữ IP cũ tối đa khoảng năm phút. Sau khi sửa:

```bash
curl -4 ifconfig.me
dig +short api.minhhieudev.id.vn A
dig @8.8.8.8 +short api.minhhieudev.id.vn A
```

- `curl -4 ifconfig.me` in IP public hiện tại.
- `dig +short api.minhhieudev.id.vn A` hỏi DNS mặc định của Mac.
- `dig @8.8.8.8 +short ...` hỏi thẳng Google DNS, bỏ cache DNS nhà mạng trên Mac.

Hai kết quả `dig` phải in đúng `171.225.184.87`. Nếu vẫn thấy `103.183.120.48`, đợi hết TTL hoặc xóa cache DNS trên Mac:

```bash
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
```

- `dscacheutil -flushcache` xóa cache DNS của macOS.
- `killall -HUP mDNSResponder` bảo dịch vụ DNS của macOS đọc lại cấu hình.

Nhà mạng Viettel/FPT thường cấp IP động. Mỗi lần `curl -4 ifconfig.me` ra số khác với bản ghi A, phải sửa lại value A và secret `VPS_HOST`.

### 9.4. Chuyển tiếp cổng trên router

DNS đúng chưa đủ. Router phải chuyển tiếp cổng vào máy ảo:

| Cổng ngoài (WAN) | Cổng trong (LAN) | Máy đích | Mục đích |
| --- | --- | --- | --- |
| `22` | `22` | `192.168.1.5` | GitHub Actions SSH |
| `8080` | `8080` | `192.168.1.5` | Gọi API bằng tên miền |

Không chuyển tiếp `5432`.

Trên Ubuntu:

```bash
sudo ufw allow 8080/tcp
sudo ufw allow OpenSSH
sudo ufw status
docker compose -f /root/Documents/port/backend/RoleManagement.Api/docker-compose.yml ps
```

`api` phải `running`, `postgres` phải `healthy`.

### 9.5. Thử API bằng tên miền

Từ **mạng di động**, không từ Wi-Fi nhà:

```bash
curl -i http://api.minhhieudev.id.vn:8080/api/roles
```

- **200** hoặc body `[]` nghĩa là DNS, port forward và container đều ổn.
- `Connection timed out` nghĩa là chưa forward cổng `8080` hoặc firewall chặn.
- Vào nhầm trang/máy khác nghĩa là bản ghi A vẫn còn IP cũ.

Postman base URL: `http://api.minhhieudev.id.vn:8080`. Các đường dẫn `/api/roles` giữ như mục 7.

### 9.6. (Tuỳ chọn) Bỏ `:8080` bằng Nginx

1. Router: WAN `80` → LAN `80` tới `192.168.1.5`.
2. Trên Ubuntu:

```bash
sudo apt install -y nginx
sudo ufw allow 80/tcp
sudo tee /etc/nginx/sites-available/api <<'EOF'
server {
    listen 80;
    server_name api.minhhieudev.id.vn;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
sudo ln -sf /etc/nginx/sites-available/api /etc/nginx/sites-enabled/api
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx
curl -i http://api.minhhieudev.id.vn/api/roles
```

- `server_name api.minhhieudev.id.vn` phải khớp bản ghi A.
- `proxy_pass http://127.0.0.1:8080` đưa request sang container API.
- `nginx -t` phải báo `ok` trước khi `reload`.

### 9.7. Cập nhật GitHub Actions

Trong **Settings → Secrets and variables → Actions**, sửa `VPS_HOST` thành `171.225.184.87` (an toàn nhất) hoặc `api.minhhieudev.id.vn` sau khi `dig` đã trả đúng IP đó.

Từ mạng di động:

```bash
ssh -p 22 -i ~/.ssh/gha_deploy root@171.225.184.87
# hoặc sau khi DNS đúng:
ssh -p 22 -i ~/.ssh/gha_deploy root@api.minhhieudev.id.vn
```

Vào được shell rồi mới chạy lại workflow Deploy.
