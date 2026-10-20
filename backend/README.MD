# Backend — Role Management API

API ASP.NET Core .NET 10 trong thư mục này. Dữ liệu nằm ở PostgreSQL 16, database `RoleManagementDb`. Khi khởi động, API tự chạy migration và tạo bảng `Roles`.

| | Máy thật | VPS |
| --- | --- | --- |
| Cách chạy | .NET SDK + PostgreSQL | Docker Compose |
| API | `http://localhost:5252` | `https://api.minhhieudev.id.vn` |
| PostgreSQL | `localhost:5432` | trong Docker, cổng `5432` |
| Swagger | `http://localhost:5252/swagger` | `https://api.minhhieudev.id.vn/swagger` |

User PostgreSQL là `postgres`. Mật khẩu không nằm trong git. Máy thật đặt bằng user secrets. VPS và Docker đặt bằng file `backend/.env`.

Thư mục mã nguồn:

```text
backend/
  Program.cs
  docker-compose.yml
  Data/            AppDbContext
  Modules/Roles/
    Controllers/   nhận HTTP
    Services/      kiểm tra tên trùng, chuẩn hóa dữ liệu
    Repositories/  đọc ghi PostgreSQL
    DTOs/          dữ liệu vào và ra
    Entities/      bảng Roles
```

## 1. Chạy trên máy thật

Máy phát triển cần .NET SDK 10 và PostgreSQL 16. API chạy bằng `dotnet run`, không cần Nginx.

### 1.1. Cài .NET SDK 10

macOS:

```bash
brew install dotnet@10
dotnet --version
```

- `brew install dotnet@10` cài SDK 10. Project khai báo `net10.0` trong `RoleManagement.Api.csproj`, SDK thấp hơn sẽ không build được.
- `dotnet --version` phải in số bắt đầu bằng `10.`.

Ubuntu:

```bash
wget https://packages.microsoft.com/config/ubuntu/24.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb
rm packages-microsoft-prod.deb
sudo apt update
sudo apt install -y dotnet-sdk-10.0
dotnet --version
```

- `wget` tải kho gói Microsoft cho Ubuntu 24.04.
- `sudo dpkg -i` đăng ký kho đó.
- `sudo apt install -y dotnet-sdk-10.0` cài SDK. `-y` không hỏi lại.

### 1.2. Chạy PostgreSQL

Đứng trong thư mục `backend` (nơi có `docker-compose.yml`). Chỉ bật database, không bật Nginx:

```bash
cd backend
cp .env.example .env
docker compose up -d postgres
docker compose ps postgres
```

- `cp .env.example .env` tạo file mật khẩu cục bộ. Sửa `POSTGRES_PASSWORD` thành mật khẩu dài. File `.env` bị git bỏ qua.
- Database đã tạo từ trước thì `POSTGRES_PASSWORD` phải đúng mật khẩu cũ của volume `postgres-data`. Đổi mật khẩu trong `.env` không đổi mật khẩu bên trong volume đã có.
- `docker compose up -d postgres` tạo container `postgres:16-alpine`, database `RoleManagementDb`, user `postgres`, và mở cổng `5432` ra máy thật.
- `docker compose ps postgres` phải thấy trạng thái `running` và health `healthy`.

Chưa có Docker thì cài PostgreSQL 16 bằng trình cài của hệ điều hành, tạo database `RoleManagementDb` và user `postgres`. `appsettings.json` chỉ giữ host, cổng, database và username. Mật khẩu đặt ở bước sau.

### 1.3. Chạy API

```bash
cd backend
dotnet restore
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=RoleManagementDb;Username=postgres;Password=YOUR_PASSWORD"
dotnet run --launch-profile http
```

- `dotnet restore` tải NuGet (EF Core, Npgsql, Swagger).
- `dotnet user-secrets set` ghi chuỗi kết nối, gồm mật khẩu, vào kho user secrets của máy. Kho này nằm ngoài repository. Thay `YOUR_PASSWORD` bằng mật khẩu PostgreSQL. Profile Development đọc secret này và ghi đè `appsettings.json`.
- `dotnet run --launch-profile http` build và chạy. Profile `http` trong `Properties/launchSettings.json` lắng nghe `http://localhost:5252` và đặt `ASPNETCORE_ENVIRONMENT=Development`.
- Lần chạy đầu kết nối PostgreSQL và tạo bảng. Giữ terminal này mở. `Ctrl+C` thì API dừng.

Kiểm tra:

```bash
curl http://localhost:5252/api/roles
```

- Mảng `[]` nghĩa là API và database đã nối được, chưa có vai trò nào.
- Swagger: mở `http://localhost:5252/swagger`.

Tạo một vai trò:

```bash
curl -X POST http://localhost:5252/api/roles \
  -H 'Content-Type: application/json' \
  -d '{"name":"Admin","description":"Quản trị hệ thống"}'
```

- `201` và JSON có `id` là đã ghi vào PostgreSQL. Gửi lại cùng tên thì `409` vì tên không được trùng.

### 1.4. Dừng trên máy thật

`Ctrl+C` trong terminal đang chạy `dotnet run`, rồi tắt database nếu không dùng nữa:

```bash
cd backend
docker compose stop postgres
```

- `docker compose stop postgres` dừng container nhưng giữ volume `postgres-data`, nên dữ liệu còn khi bật lại.

## 2. Chạy trên VPS

VPS dùng Ubuntu, Docker Compose, khoảng 2 GB RAM. API không mở cổng `8080` ra internet. Nginx trong Compose nhận cổng `80` và `443`, rồi chuyển `api.minhhieudev.id.vn` vào container API.

Thư mục trên VPS: `/root/Documents/Warehouse`. Compose nằm ở `/root/Documents/Warehouse/backend`.

### 2.1. Cài Docker

Trên Ubuntu 24.04, dùng user có quyền `sudo`:

```bash
sudo apt update
sudo apt install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
docker compose version
```

- Khối lệnh thêm kho Docker chính thức rồi cài Engine và plugin `docker compose`.
- `sudo systemctl enable --now docker` cho Docker chạy ngay và chạy lại sau khi reboot.
- `docker compose version` in được số phiên bản thì lệnh Compose đã có. Dùng `docker compose`, không dùng `docker-compose`.

Mở cổng SSH, HTTP, HTTPS. PostgreSQL chỉ mở nếu cần nối DBeaver từ mạng tin cậy. Không chuyển tiếp cổng `5432` ra internet.

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status
```

### 2.2. Lấy mã nguồn và chạy

```bash
sudo mkdir -p /root/Documents/Warehouse
sudo git clone https://github.com/HieuNguyenddev/Warehouse.git /root/Documents/Warehouse
cd /root/Documents/Warehouse/backend
```

- `git clone` tải cả repository. Frontend nằm cạnh `backend`, Compose cần thư mục đó để build giao diện admin.
- Chưa chạy `docker compose up` ở bước này. Tạo `.env` trước, nếu không PostgreSQL nhận mật khẩu rỗng.

### 2.3. Tạo file `.env` trên VPS

Từ máy đang dùng, SSH vào VPS rồi đứng đúng thư mục Compose:

```bash
ssh -p 22 root@103.183.120.48
cd /root/Documents/Warehouse/backend
pwd
ls .env.example
```

- `ssh -p 22 root@103.183.120.48` mở shell trên VPS. Các lệnh sau chạy trên VPS, không chạy trên máy cá nhân.
- `cd /root/Documents/Warehouse/backend` vào thư mục có `docker-compose.yml`.
- `pwd` phải in `/root/Documents/Warehouse/backend`. Sai thư mục thì `.env` không được Compose đọc.
- `ls .env.example` xác nhận file mẫu đã có sau `git clone` hoặc `git pull`.

Database đã chạy từ trước thì lấy đúng mật khẩu volume hiện tại, trước khi sửa Compose:

```bash
docker compose exec postgres printenv POSTGRES_PASSWORD
```

- Lệnh in mật khẩu container `postgres` đang chạy. Dùng đúng chuỗi đó ở bước ghi file. Volume `postgres-data` không đổi mật khẩu khi chỉ sửa `.env`.
- Container chưa có thì bỏ qua lệnh này và tự chọn một mật khẩu dài.

Ghi file, hạn chế quyền đọc, rồi kiểm tra mà không in lại mật khẩu:

```bash
umask 077
printf '%s\n' 'POSTGRES_PASSWORD=MAT_KHAU_DANG_DUNG' > .env
chmod 600 .env
ls -l .env
wc -l .env
grep -c '^POSTGRES_PASSWORD=.' .env
```

- `umask 077` khiến file mới chỉ user hiện tại đọc được.
- `printf '%s\n' 'POSTGRES_PASSWORD=...'` ghi đúng một dòng. Thay `MAT_KHAU_DANG_DUNG` bằng mật khẩu thật. Không thêm khoảng trắng hai bên dấu `=`. Không bọc dấu nháy. Ký tự `@` trong mật khẩu giữ nguyên.
- `>` ghi đè `.env` nếu file đã tồn tại.
- `chmod 600 .env` chỉ `root` đọc và sửa. User khác trên máy không đọc được mật khẩu.
- `ls -l .env` phải thấy quyền `-rw-------`.
- `wc -l .env` phải in `1`.
- `grep -c '^POSTGRES_PASSWORD=.' .env` phải in `1`. Số này chỉ đếm dòng đúng dạng, không in mật khẩu.
- Không `git add .env`. File này nằm trong `.gitignore`.

Rồi mới chạy stack:

```bash
sudo docker compose up -d --build
sudo docker compose ps
```

- `docker compose up -d --build` build image API và frontend, kéo PostgreSQL và Nginx, rồi chạy nền. API lấy chuỗi kết nối từ biến `ConnectionStrings__DefaultConnection`, mật khẩu lấy từ `.env`, không lấy từ `appsettings.json`.
- API chờ PostgreSQL `healthy` rồi mới start và tự migrate.
- `docker compose ps` phải thấy `api`, `frontend`, `nginx` là `running`, `postgres` là `healthy`.
- Thiếu `.env` thì GitHub Actions dừng trước `docker compose up` và in dòng `Thiếu .../backend/.env`.

Đổi mật khẩu sau này: sửa `.env`, rồi đổi luôn mật khẩu bên trong database. Chỉ sửa file thì API không đăng nhập được volume cũ.

```bash
cd /root/Documents/Warehouse/backend
docker compose exec postgres psql -U postgres -d RoleManagementDb -c "ALTER USER postgres PASSWORD 'MAT_KHAU_MOI';"
umask 077
printf '%s\n' 'POSTGRES_PASSWORD=MAT_KHAU_MOI' > .env
chmod 600 .env
docker compose up -d --force-recreate --no-deps api
```

- `ALTER USER` đổi mật khẩu user `postgres` trong volume đang có.
- Dòng `printf` ghi cùng mật khẩu đó vào `.env`.
- `--force-recreate --no-deps api` tạo lại API để nhận chuỗi kết nối mới. PostgreSQL không cần tạo lại.

Gọi API qua Nginx. Trên VPS đã có chứng chỉ và DNS `api` trỏ về IP máy:

```bash
curl -i https://api.minhhieudev.id.vn/api/roles
```

- Dòng trạng thái `200` và body JSON là API đang phục vụ. Chưa có chứng chỉ thì dùng `curl -i http://IP-VPS/api/roles` với header `Host: api.minhhieudev.id.vn`, vì Nginx chọn site theo tên miền.

Xem log khi API không lên:

```bash
cd /root/Documents/Warehouse/backend
sudo docker compose logs api --tail 80
sudo docker compose logs postgres --tail 40
```

### 2.4. Cập nhật sau khi có commit mới

```bash
cd /root/Documents/Warehouse
sudo git pull --ff-only
cd backend
sudo docker compose up -d --build
sudo docker compose up -d --force-recreate --no-deps nginx
sudo docker compose exec -T nginx nginx -t
sudo docker compose exec -T nginx nginx -s reload
```

- `git pull --ff-only` chỉ cập nhật khi không có commit local lệch nhánh.
- `docker compose up -d --build` build lại image đổi mã nguồn.
- `--force-recreate --no-deps nginx` tạo lại Nginx để đọc `nginx/default.conf` mới. Chỉ `docker compose up` không làm việc này nếu image Nginx không đổi.
- `nginx -t` kiểm tra cấu hình. `nginx -s reload` nạp lại trong container. Dòng `signal process started` là reload đã nhận. Không dùng `systemctl reload nginx` vì máy không cài Nginx trên host.

GitHub Actions làm các bước này khi đẩy nhánh `main`. Secret `DEPLOY_PATH` là `/root/Documents/Warehouse/backend`. Phần DNS, chứng chỉ và secret SSH nằm ở `README.MD` thư mục gốc repository.

### 2.5. Dừng stack trên VPS

```bash
cd /root/Documents/Warehouse/backend
sudo docker compose down
```

- `docker compose down` tắt và xóa container. Volume `postgres-data` vẫn giữ database. Thêm `-v` sẽ xóa luôn dữ liệu.

## 3. Đường dẫn API

| Phương thức | Đường dẫn | Kết quả |
| --- | --- | --- |
| `GET` | `/api/roles` | Danh sách vai trò |
| `GET` | `/api/roles/{id}` | Một vai trò, `404` nếu không có |
| `POST` | `/api/roles` | Tạo mới, body `{ "name", "description" }`. `409` nếu tên trùng |
| `PUT` | `/api/roles/{id}` | Sửa tên và mô tả |
| `DELETE` | `/api/roles/{id}` | `204` khi xóa xong |

`name` bắt buộc, tối đa 50 ký tự. `description` tối đa 250 ký tự.
