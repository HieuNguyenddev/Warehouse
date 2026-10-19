# Role Management API

API ASP.NET Core (.NET 10) và SQLite, chạy bằng một container trong `backend/RoleManagement.Api`. SQLite nằm trong tiến trình API, không cần container SQL Server. Máy 2 GB không chạy được SQL Server cho Linux vì tiến trình đó cần khoảng 2 GB chỉ để khởi động.

Máy chủ là **Ubuntu 24.04** trên VMware Fusion, card mạng **Bridged Networking → Autodetect**. Các lệnh dưới đây chạy bằng user `root`.

| Thông số | Giá trị |
| --- | --- |
| IP máy ảo | `192.168.1.5` |
| SSH trong mạng nhà | `root@192.168.1.5` |
| IP public của router | `171.225.184.133` |
| Thư mục project | `/root/Documents/port` |
| API trong mạng nhà | `http://192.168.1.5:8080` |
| .NET | 10, image `aspnet:10.0`. Tiến trình API bị giới hạn khoảng 256 MB |
| RAM VPS | 2 GB. Chỉ container API, trần 768 MB. File database là `/data/rolemanagement.db` |

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
sudo ufw --force enable
sudo ufw status
ss -lnt | grep 22
```

- `sudo ufw allow OpenSSH` cho phép gói tới dịch vụ SSH, thường là cổng TCP `22`. Phải mở cổng này trước khi bật firewall, nếu không phiên SSH hiện tại và GitHub Actions đều bị chặn.
- `sudo ufw allow 8080/tcp` cho phép vào cổng API.
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
- `docker compose up -d --build` build image API rồi chạy một container. `-d` chạy nền, terminal được trả lại. `--build` build lại image khi Dockerfile hoặc mã nguồn đổi. API tự tạo file SQLite lúc khởi động.

Đường dẫn đầy đủ là `/root/Documents/port`. API lắng nghe cổng `8080`. File database nằm trong volume Docker, đường dẫn trong container là `/data/rolemanagement.db`.

Kiểm tra container:

```bash
docker compose ps
```

- `docker compose ps` liệt kê container của project này. Chỉ có `api`, trạng thái phải là `running`. Database SQLite được tạo lúc API khởi động.

Nếu log còn `dependency sqlserver`, máy đang chạy bản Compose cũ còn container SQL Server. Bản hiện tại chỉ có service `api` và SQLite. Xóa container SQL cũ rồi chạy lại:

```bash
cd /root/Documents/port
git pull
cd backend/RoleManagement.Api
docker compose down
docker compose up -d --build
docker compose ps
```

`docker compose ps` chỉ còn container `api` ở trạng thái `running`. Không còn `sqlserver`.

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
| `VPS_HOST` | `host` | `171.225.184.133` |
| `VPS_USER` | `username` | `root` |
| `VPS_SSH_KEY` | `key` | Nội dung file `/root/.ssh/gha_deploy` |
| `VPS_PORT` | `port` | `22` |
| `DEPLOY_PATH` | `script` (`cd`) | `/root/Documents/port/backend/RoleManagement.Api` |

`171.225.184.133` là IP public của router nhà. Lấy lại trên Ubuntu bằng:

```bash
curl -4 ifconfig.me
ip -4 addr
```

- `curl -4 ifconfig.me` hỏi một dịch vụ bên ngoài xem địa chỉ IPv4 nào đang đi ra internet. `-4` buộc dùng IPv4. Kết quả là IP public của router, điền vào `VPS_HOST`.
- `ip -4 addr` liệt kê địa chỉ IPv4 gắn trên từng card của máy ảo. Card `enp2s0` là `192.168.1.5`. Router phải chuyển tiếp TCP cổng `22` tới địa chỉ này, cổng `22`.

Dòng `Will download drone-ssh-1.8.1-linux-amd64` chạy trên runner GitHub, không phải trên máy ảo. Log `dial tcp ***:***: i/o timeout` nghĩa là runner chưa mở được TCP tới `VPS_HOST`:`VPS_PORT`. Key chưa được kiểm tra. Từ mạng di động, lệnh sau phải vào được shell rồi mới chạy lại Actions:

```bash
ssh -p 22 -i ~/.ssh/gha_deploy root@171.225.184.133
```

- `ssh -p 22 -i ~/.ssh/gha_deploy root@171.225.184.133` thử đúng đường GitHub Actions sẽ đi: cổng `22`, private key CI, user `root`, IP public. `-p` chọn cổng. Phải chạy lệnh này từ mạng di động, không chạy từ Wi-Fi cùng nhà, vì nhiều router không cho máy trong LAN đi vòng ra IP public của chính router.

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
