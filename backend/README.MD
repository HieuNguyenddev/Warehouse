# Backend — Role Management API

API ASP.NET Core .NET 10 trong thư mục này. Dữ liệu nằm ở PostgreSQL 16, database `RoleManagementDb`. Khi khởi động, API tự chạy migration và tạo bảng `Roles`.

| | Máy thật | VPS |
| --- | --- | --- |
| Cách chạy | .NET SDK + PostgreSQL | Docker Compose |
| API | `http://localhost:5252` | `https://api.minhhieudev.id.vn` |
| PostgreSQL | `localhost:5432` | trong Docker, cổng `5432` |
| Swagger | `http://localhost:5252/swagger` | `https://api.minhhieudev.id.vn/swagger` |

User PostgreSQL là `postgres`. Mật khẩu database, khóa ký JWT và mật khẩu tài khoản admin không nằm trong git. Máy thật và VPS cùng đặt các giá trị đó trong file `backend/.env`. `dotnet run` đọc file này khi đứng trong thư mục `backend`. Docker Compose đưa các biến trong file vào container.

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

- `cp .env.example .env` tạo file bí mật cục bộ. Sửa `POSTGRES_PASSWORD`, `JWT_KEY` và `SEED_PASSWORD`. `JWT_KEY` là chuỗi tự gõ, dài ít nhất 32 ký tự. File `.env` bị git bỏ qua.
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
- `dotnet user-secrets set` ghi chuỗi kết nối, gồm mật khẩu database, vào kho user secrets của máy. Kho này nằm ngoài repository. Thay `YOUR_PASSWORD` bằng mật khẩu PostgreSQL. Profile Development đọc secret này và ghi đè `appsettings.json`.
- `JWT_KEY` và `SEED_PASSWORD` không đặt bằng user secrets. API đọc hai giá trị đó từ `backend/.env`.
- `dotnet run --launch-profile http` build và chạy. Profile `http` trong `Properties/launchSettings.json` lắng nghe `http://localhost:5252` và đặt `ASPNETCORE_ENVIRONMENT=Development`.
- Lần chạy đầu kết nối PostgreSQL, tạo bảng, rồi tạo vai trò `Admin` và tài khoản trong `SEED_USERNAME` nếu tên đó chưa có. Mật khẩu lúc tạo là `SEED_PASSWORD`. Tài khoản đã có thì file `.env` không đổi mật khẩu đang lưu trong database. Giữ terminal này mở. `Ctrl+C` thì API dừng.

Kiểm tra đăng nhập. Thay `MAT_KHAU_ADMIN` bằng `SEED_PASSWORD` trong `.env`:

```bash
curl -s http://localhost:5252/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"MAT_KHAU_ADMIN"}'
```

- JSON có `token` nghĩa là khóa JWT và tài khoản admin đã dùng được.
- `GET /api/roles` không kèm token trả **401**.
- Swagger: mở `http://localhost:5252/swagger`, bấm **Authorize**, dán token.

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

`appsettings.json` chỉ giữ tên issuer, audience và tên hiển thị. Khóa ký token và mật khẩu admin nằm trong `backend/.env`. Compose từ chối chạy nếu thiếu `JWT_KEY` hoặc `SEED_PASSWORD`.

| Biến | Ý nghĩa |
| --- | --- |
| `POSTGRES_PASSWORD` | Mật khẩu user `postgres`. Phải khớp volume database đang có |
| `JWT_KEY` | Khóa ký JWT do mình tự gõ, ít nhất 32 ký tự. Không dùng khóa đã từng commit trong `appsettings.json` |
| `SEED_USERNAME` | Tên đăng nhập tài khoản tạo lúc khởi động. Bỏ dòng này thì Compose dùng `admin` |
| `SEED_PASSWORD` | Mật khẩu dùng khi tạo tài khoản đó lần đầu. Không ghi đè mật khẩu đã lưu trong database |
| `CONNECTION_STRING` | Chuỗi API dùng trong Docker. Host là `postgres`, mật khẩu trùng `POSTGRES_PASSWORD`. GitHub Actions ghi dòng này nếu thiếu |
| `CONNECTION_STRING_DEVELOPMENT` | Chuỗi khi `dotnet run` trên máy development. Host là IP VPS, ví dụ `103.183.120.48`. Container trên VPS không đọc dòng này |

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

Database đã chạy từ trước thì lấy đúng mật khẩu volume hiện tại:

```bash
docker compose exec postgres printenv POSTGRES_PASSWORD
```

- Lệnh in mật khẩu container `postgres` đang chạy. Dùng đúng chuỗi đó cho `POSTGRES_PASSWORD`. Volume `postgres-data` không đổi mật khẩu khi chỉ sửa `.env`.
- Container chưa có thì bỏ qua lệnh này và tự chọn một mật khẩu dài.

VPS đã có `.env` chỉ với `POSTGRES_PASSWORD` thì thêm các dòng còn lại, không ghi đè file:

```bash
umask 077
grep -q '^JWT_KEY=.' .env || printf '%s\n' 'JWT_KEY=KHOA_TU_DAT_IT_NHAT_32_KY_TU' >> .env
grep -q '^SEED_USERNAME=.' .env || printf '%s\n' 'SEED_USERNAME=Admin' >> .env
grep -q '^SEED_PASSWORD=.' .env || printf '%s\n' 'SEED_PASSWORD=Admin@123' >> .env
grep -q '^CONNECTION_STRING=Host=postgres;' .env || printf '%s\n' "CONNECTION_STRING=Host=postgres;Port=5432;Database=RoleManagementDb;Username=postgres;Password=$(grep -E '^POSTGRES_PASSWORD=' .env | tail -n 1 | cut -d= -f2-)" >> .env
chmod 600 .env
```

- `JWT_KEY` tự gõ một chuỗi bất kỳ dài ít nhất 32 ký tự, thay cho `KHOA_TU_DAT_IT_NHAT_32_KY_TU`. Không dùng khoảng trắng. Khóa chỉ nằm trong `.env`, không dán vào git.
- `grep -q` kiểm tra dòng đã có chưa. `>>` thêm vào cuối file. Dòng `POSTGRES_PASSWORD` cũ được giữ.
- `SEED_PASSWORD` là mật khẩu admin tự đặt. Không thêm khoảng trắng hai bên dấu `=`. Không bọc dấu nháy. Ký tự `@` giữ nguyên.
- Máy chưa có file thì tạo đủ năm dòng. `CONNECTION_STRING` dùng cùng mật khẩu với `POSTGRES_PASSWORD`, host là `postgres`. `>` chỉ dùng khi file chưa tồn tại, vì lệnh này xóa nội dung cũ:

```bash
umask 077
printf '%s\n' \
  'POSTGRES_PASSWORD=MAT_KHAU_DANG_DUNG' \
  'JWT_KEY=KHOA_TU_DAT_IT_NHAT_32_KY_TU' \
  'SEED_USERNAME=Admin' \
  'SEED_PASSWORD=Admin@123' \
  'CONNECTION_STRING=Host=postgres;Port=5432;Database=RoleManagementDb;Username=postgres;Password=MAT_KHAU_DANG_DUNG' > .env
chmod 600 .env
```

Kiểm tra mà không in bí mật:

```bash
ls -l .env
grep -c '^POSTGRES_PASSWORD=.' .env
grep -c '^JWT_KEY=.' .env
grep -c '^SEED_PASSWORD=.' .env
grep -c '^CONNECTION_STRING=Host=postgres;' .env
```

- `ls -l .env` phải thấy quyền `-rw-------`.
- Mỗi lệnh `grep -c` phải in `1`.
- Không `git add .env`. File này nằm trong `.gitignore`. `backend/.dockerignore` cũng bỏ file này khi build image.
- GitHub Actions dừng trước `docker compose up` nếu thiếu `POSTGRES_PASSWORD`, `JWT_KEY` hoặc `SEED_PASSWORD`. Thiếu `CONNECTION_STRING`, hoặc host của dòng đó không phải `postgres`, thì workflow ghi `Host=postgres;Port=5432;Database=RoleManagementDb;Username=postgres;Password=` cộng đúng `POSTGRES_PASSWORD`. Container trên VPS không dùng `CONNECTION_STRING_DEVELOPMENT`.

Tài khoản admin đã được tạo bằng mật khẩu cũ thì `SEED_PASSWORD` mới không đổi mật khẩu trong database. Đăng nhập bằng mật khẩu đang dùng, rồi đổi mật khẩu trong giao diện. Lần cài mới, API tạo user bằng đúng `SEED_PASSWORD`.

Đổi khóa JWT xong, tạo lại container API để nhận biến mới. Token cũ hết hiệu lực.

```bash
docker compose up -d --force-recreate --no-deps api
```

Rồi mới chạy stack:

```bash
sudo docker compose up -d --build
sudo docker compose ps
```

- `docker compose up -d --build` build image API và frontend, kéo PostgreSQL và Nginx, rồi chạy nền. API lấy mật khẩu database, `JWT_KEY` và `SEED_PASSWORD` từ `.env`, không lấy từ `appsettings.json`.
- API chờ PostgreSQL `healthy` rồi mới start và tự migrate.
- `docker compose ps` phải thấy `api`, `frontend`, `nginx` là `running`, `postgres` là `healthy`.
- Thiếu `.env` thì GitHub Actions dừng trước `docker compose up` và in dòng `Thiếu .../backend/.env`.

Đổi mật khẩu sau này: sửa `.env`, rồi đổi luôn mật khẩu bên trong database. Chỉ sửa file thì API không đăng nhập được volume cũ.

```bash
cd /root/Documents/Warehouse/backend
docker compose exec postgres psql -U postgres -d RoleManagementDb -c "ALTER USER postgres PASSWORD 'MAT_KHAU_MOI';"
umask 077
grep -v -E '^(POSTGRES_PASSWORD|CONNECTION_STRING)=' .env > .env.tmp
printf '%s\n' \
  'POSTGRES_PASSWORD=MAT_KHAU_MOI' \
  'CONNECTION_STRING=Host=postgres;Port=5432;Database=RoleManagementDb;Username=postgres;Password=MAT_KHAU_MOI' >> .env.tmp
mv .env.tmp .env
chmod 600 .env
docker compose up -d --force-recreate --no-deps api
```

- `ALTER USER` đổi mật khẩu user `postgres` trong volume đang có.
- `grep -v` bỏ `POSTGRES_PASSWORD` và `CONNECTION_STRING` cũ, rồi ghi cả hai dòng với mật khẩu mới. Host của chuỗi kết nối vẫn là `postgres`. `JWT_KEY` và `SEED_PASSWORD` được giữ. Không dùng `>` để ghi đè cả file.
- `--force-recreate --no-deps api` tạo lại API để nhận chuỗi kết nối mới. PostgreSQL không cần tạo lại.

Gọi API qua Nginx. Trên VPS đã có chứng chỉ và DNS `api` trỏ về IP máy:

```bash
curl -s https://api.minhhieudev.id.vn/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"MAT_KHAU_ADMIN"}'
```

- JSON có `token` nghĩa là API đang phục vụ và khóa JWT trong `.env` đã vào container. Thay `MAT_KHAU_ADMIN` bằng `SEED_PASSWORD`, hoặc bằng mật khẩu đã đổi trong giao diện nếu tài khoản tạo từ trước.
- `GET /api/roles` không kèm header `Authorization: Bearer <token>` trả **401**.
- Chưa có chứng chỉ thì gọi `http://IP-VPS` với header `Host: api.minhhieudev.id.vn`, vì Nginx chọn site theo tên miền.

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
