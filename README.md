# UNA Home & Furniture

UNA Home & Furniture нь Node.js, Express, MongoDB, Mongoose backend-тэй тавилга, интерьер бүтээгдэхүүний веб сайт юм. Frontend-ийн `API_BASE = "/api"` хэвээр ажиллана.

## Ашигласан технологи

- HTML
- CSS
- JavaScript
- Node.js
- Express.js
- MongoDB
- Mongoose
- Multer
- bcrypt
- JWT

## Файлын бүтэц

```text
.
├── client/
│   ├── index.html
│   ├── products.html
│   ├── login.html
│   ├── signup.html
│   ├── account.html
│   ├── cart.html
│   ├── admin.html
│   ├── styles.css
│   ├── admin-styles.css
│   ├── script.js
│   ├── admin.js
│   └── images/
├── server/
│   ├── server.js
│   ├── seed.js
│   ├── models/
│   │   ├── Order.js
│   │   ├── Product.js
│   │   ├── Settings.js
│   │   └── User.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── accountRoutes.js
│   │   ├── adminRoutes.js
│   │   ├── orderRoutes.js
│   │   ├── productRoutes.js
│   │   ├── settingsRoutes.js
│   │   └── upload.js
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── controllers/
│   │   └── uploadController.js
│   └── uploads/
├── .env.example
├── package.json
└── README.md
```

## Орчны тохиргоо

`.env.example` файлыг `.env` болгож хуулна.

```bash
cp .env.example .env
```

`.env`:

```text
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/una_home
JWT_SECRET=una_home_change_me
DEFAULT_ADMIN_EMAIL=admin@unahome.mn
DEFAULT_ADMIN_PASSWORD=1234
DEFAULT_ADMIN_FULLNAME=UNA Admin
```

## Ажиллуулах

```bash
npm install
npm run dev
npm start
```

Seed product болон admin user үүсгэх:

```bash
npm run seed
```

Admin login:

```text
username: admin
password: 1234
role: admin
```

## API endpoints

```text
POST /api/login
POST /api/register
GET /api/account
PUT /api/account
POST /api/change-password
GET /api/settings/payment
GET /api/products
GET /api/products/:id
POST /api/products
PUT /api/products/:id
DELETE /api/products/:id
POST /api/upload
POST /api/orders
GET /api/orders/my
GET /api/admin/users
GET /api/admin/me
PUT /api/admin/me
PUT /api/admin/change-password
GET /api/admin/orders
GET /api/admin/orders/:id
PUT /api/admin/orders/:id/status
PUT /api/admin/settings/payment
```

`GET /api/account`, `PUT /api/account`, `POST /api/change-password`, `POST /api/orders`, `GET /api/orders/my` endpoint-ууд login JWT token шаарддаг.

`POST /api/products`, `PUT /api/products/:id`, `DELETE /api/products/:id`, `POST /api/upload`, `/api/admin/*` endpoint-ууд admin JWT token шаарддаг.

## Product JSON

Backend frontend-д MongoDB `_id`-г `id` гэж буцаана.

```json
{
  "id": "mongo_object_id",
  "productCode": "SOFA-001",
  "name": "Бүтээгдэхүүний нэр",
  "description": "Товч тайлбар",
  "price": 1000000,
  "category": "Буйдан",
  "images": ["/uploads/image-name.webp"],
  "details": "Нэмэлт мэдээлэл"
}
```

## Account ба Cart

- Login token browser-ийн `localStorage` дотор `unaToken` нэрээр хадгалагдана.
- Cart data `localStorage` дотор `unaCart` нэрээр хадгалагдана.
- Login хийсэн үед navbar дээр тухайн хэрэглэгчийн `username`, `Сагс`, `Гарах` харагдана. Admin хэрэглэгчийн хувьд `Admin`, `Сагс`, `Гарах` харагдана.
- Login хийгээгүй үед `account.html` эсвэл `cart.html` руу ороход `login.html` руу буцна.
- `cart.html` дээр Facebook chat эсвэл банкны шилжүүлгийн төлбөрийн сонголтоор `POST /api/orders` endpoint руу cart item-ууд илгээгдэнэ.
- Банкны шилжүүлэг сонговол `UNA-YYYYMMDD-XXXX` хэлбэрийн гүйлгээний код үүснэ.

## Admin

- `Бүтээгдэхүүн` хэсэгт Product ID / Бүтээгдэхүүний код (`productCode`) оруулна.
- `Төлбөрийн тохиргоо` хэсэгт банкны нэр, дансны дугаар, данс эзэмшигч, Facebook chat link хадгална.
- `Account Center` хэсэгт бүртгэлтэй хэрэглэгчдийн username, fullname, email, phone, address, role, createdAt харагдана.
- `Орж ирсэн захиалгууд` хэсэгт orderCode, хэрэглэгч, төлбөрийн төрөл, transactionCode, status харагдаж, paid/confirmed/cancelled болгож шинэчилнэ.
- `Admin Account` хэсэгт админ username/email болон нууц үгээ шинэчилнэ.

Category:

- Буйдан
- Ширээ
- Сандал
- Гэрэлтүүлэг
- Чимэглэл
- Зураг

## Зураг upload

Админ самбар дээр бүтээгдэхүүн нэмэх эсвэл засах үед олон зураг upload хийж болно.

Дэмжих формат:

- JPG
- JPEG
- PNG
- WEBP

Upload хийсэн зургууд `server/uploads/` дотор хадгалагдаж, `/uploads/...` path хэлбэрээр MongoDB product document-ийн `images` array-д бичигдэнэ.
