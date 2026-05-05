# UNA Home & Furniture

UNA Home & Furniture нь Cloudflare Worker болон Cloudflare D1 дээр ажиллана. Энэхүү төсөлд уламжлалт Node.js/Express/MongoDB backend байхгүй.

## Stack (Технологиуд)

- HTML, CSS, JavaScript
- Cloudflare Worker
- Cloudflare D1 SQLite өгөгдлийн сан
- Wrangler

## Project Structure (Төслийн бүтэц)

```text
client/              Статик frontend файлууд
worker/index.js      Worker API болон статик файл чиглүүлэгч
migrations/          D1 SQLite migration файлууд
wrangler.toml        Cloudflare Worker, статик файлууд болон D1 тохиргоо
```

## Database (Өгөгдлийн сан)

Схем нь SQLite/D1-тэй нийцэх бөгөөд migrations ашиглан удирдагдана.

- `products`: бүтээгдэхүүний үндсэн өгөгдөл, тогтмол ID, үлдэгдэл, ангилал болон хуучин зурагтай нийцтэй талбарууд
- `product_images`: бүтээгдэхүүний олон зургийн URL-уудыг хадгалах хүснэгт
- `users`: хэрэглэгчийн бүртгэл
- `admin_settings`: хадгалагдсан админы нэвтрэх нэр/имэйл/нууц үгийн hash
- `orders`: захиалгын мэдээлэл, нийт дүн, төлбөрийн нөхцөл, дахин давтагдашгүй гүйлгээ/төлбөрийн код, төлөв
- `order_items`: захиалгын барааны мэдээлэл (бүтээгдэхүүн устгагдсан ч найдвартай хадгалагдаж үлдэнэ)
- `categories`: админаас удирдах бүтээгдэхүүний ангилал
- `payment_settings`: банк болон Facebook чатаар төлбөр төлөх тохиргоо

`imageUrl` болон `imageUrls` нь хуучин хувилбартай нийцтэй байх үүднээс `products` хүснэгтэд үлдсэн ч `product_images` нь олон зураг хадгалах үндсэн эх сурвалж юм.

## API Response Shape (API Хариуны бүтэц)

Бүх Worker API-н амжилттай хариу нь дараах бүтэцтэй байна:

```json
{ "success": true, "data": {} }
```

Бүх Worker API-н алдааны хариу нь дараах бүтэцтэй байна:

```json
{ "success": false, "message": "Ойлгомжтой алдааны мессеж" }
```

Өгөгдлийн сангийн алдаанууд нь Worker дээр бүртгэгдэх(log) бөгөөд frontend рүү илгээгдэхгүй.

## Main API Routes (Үндсэн API чиглүүлэлтүүд)

```text
POST /register
POST /login
GET /account
PUT /account
POST /change-password

POST /admin/login
GET /admin/session
GET /admin/me
PUT /admin/me
PUT /admin/change-password
GET /admin/users

GET /products
POST /products
GET /products/:id
PUT /products/:id
DELETE /products/:id

GET /categories
POST /categories
PUT /categories/:id
DELETE /categories/:id

GET /settings/payment
PUT /admin/settings/payment

POST /orders
GET /orders/my
GET /admin/orders
GET /admin/orders/:id
PUT /admin/orders/:id/status
```

## Local Development (Локал хөгжүүлэлт)

```bash
npm install
npm run db:migrate:local
npm run dev
```

Wrangler нь `client/` болон Worker API-г нэг localhost портон дээр ажиллуулна.

## Production (Продакшн)

Тохируулагдсан D1 өгөгдлийн сан нь `unafurniture` юм:

```toml
database_id = "24f83c24-0678-49f6-b7f4-d9487b6cf63c"
```

## Google OAuth

Google OAuth-г Worker `GET /auth/google` болон `GET /auth/google/callback` замуудаар зохицуулна. Frontend нь зөвхөн `/auth/google` руу үсрэх ёстой ба Google client ID-г frontend код дотор оруулж болохгүй.

Google Cloud дээр дараах зөвшөөрөгдсөн redirect URI-г ашиглана уу:

```text
https://una-furniture.jntsnnrv.workers.dev/auth/google/callback
```

Нууц үг, тохиргоонуудыг Worker secrets байдлаар хадгалах:

```bash
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put JWT_SECRET
```

Migration уншуулж, deploy хийх:

```bash
npm run db:migrate:remote
npm run deploy
```

## Safe Reset / Seed Notes (Аюулгүй шинэчлэлт / Эхний өгөгдөл оруулах)

Migrations нь зөвхөн шаардлагатай анхдагч ангилал, төлбөрийн тохиргоо болон админы тохиргоог `INSERT OR IGNORE` ашиглан оруулна.

Анхдагч админ хэрэглэгчийн нэр нь `wrangler.toml`-ын `[vars] ADMIN_USERNAME` хувьсагчаар тохируулагддаг. Анхны нууц үгийг `wrangler secret`-ээр (НЭЭМЭЛ кодоор НЕ) тохируулна:

```bash
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put ADMIN_SESSION_SECRET
npx wrangler secret put JWT_SECRET
```

Админ эхний удаа амжилттай нэвтэрсний дараа Worker нь нууц үгийг PBKDF2-SHA256 (100,000 iteration) hash хэлбэрээр D1-д хадгалж, `ADMIN_PASSWORD` secret-ийг өөрчилсөн ч хуучин hash хэвээр хэрэглэгдэнэ. Админы хэрэглэгчийн нэр болон нууц үг өөрчлөгдсөн ч refresh хийх, унтрааж асаах, deploy хийх үед устгагдахгүй хадгалагдаж үлдэнэ.

> **Аюулгүй байдлын анхааруулга:** `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `JWT_SECRET` гэсэн нууц утгуудыг **`wrangler.toml`-ын `[vars]`-д хэзээ ч бичиж болохгүй** — `[vars]` нь публик bundle-д ордог. Заавал `wrangler secret put`-ээр хадгална.
