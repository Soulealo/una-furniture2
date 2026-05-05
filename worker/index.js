// Default response headers. CORS Allow-Origin is intentionally not set globally — it is
// added per-request from the whitelist below so we don't echo arbitrary origins back.
const jsonHeaders = {
    'content-type': 'application/json; charset=UTF-8',
    'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'access-control-allow-headers': 'Content-Type, Authorization',
    'vary': 'Origin'
};

const ALLOWED_ORIGINS = new Set([
    'https://unafurniture.com',
    'https://www.unafurniture.com',
    'https://una-furniture.jntsnnrv.workers.dev'
]);

function resolveAllowedOrigin(request) {
    const origin = request.headers.get('origin') || '';
    if (!origin) return null;
    if (ALLOWED_ORIGINS.has(origin)) return origin;
    // Allow same-origin requests (browser sends Origin even for same-origin POSTs).
    try {
        const reqUrl = new URL(request.url);
        const originUrl = new URL(origin);
        if (reqUrl.host === originUrl.host && reqUrl.protocol === originUrl.protocol) return origin;
    } catch (error) { /* ignore malformed Origin */ }
    return null;
}

const htmlRoutes = new Map([
    ['/', '/index.html'],
    ['/admin', '/admin.html'],
    ['/products', '/products.html'],
    ['/product', '/products.html'],
    ['/product-detail', '/product-detail.html'],
    ['/login', '/login.html'],
    ['/signup', '/signup.html'],
    ['/account', '/account.html'],
    ['/cart', '/cart.html'],
    ['/checkout', '/checkout.html'],
    ['/forgot-password', '/forgot-password.html'],
    ['/reset-password', '/reset-password.html'],
    ['/terms', '/terms.html'],
    ['/privacy', '/privacy.html']
]);

const DEFAULT_PAYMENT_SETTINGS = {
    bankName: 'Khan Bank',
    accountNumber: '',
    accountHolder: 'UNA Home & Furniture',
    facebookChatUrl: '',
    messengerUrl: '',
    deliveryFee: 0,
    contactPhone: '',
    contactEmail: '',
    storeAddress: '',
    workingHours: '',
    facebookPageUrl: '',
    warrantyNote: '',
    returnPolicy: '',
    qpayInfo: '',
    estimatedDeliveryTime: ''
};

const GOOGLE_REDIRECT_URI = 'https://una-furniture.jntsnnrv.workers.dev/auth/google/callback';
const AUTH_COOKIE_NAME = 'una_auth_token';
const GOOGLE_STATE_COOKIE_NAME = 'una_google_oauth_state';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;
const GOOGLE_CLIENT_ID_SUFFIX = '.apps.googleusercontent.com';
const ADMIN_ACCESS_ROLES = new Set(['admin', 'manager']);
let coreSchemaReady = false;
let productColorVariantsSchemaReady = false;
let ecommerceSchemaReady = false;

function responseHeaders(extraHeaders = {}, request = null) {
    const headers = new Headers(jsonHeaders);

    if (request) {
        const allowedOrigin = resolveAllowedOrigin(request);
        if (allowedOrigin) {
            headers.set('access-control-allow-origin', allowedOrigin);
            headers.set('access-control-allow-credentials', 'true');
        }
    }

    Object.entries(extraHeaders).forEach(([key, value]) => {
        if (Array.isArray(value)) {
            value.forEach((item) => headers.append(key, item));
        } else if (value !== undefined && value !== null) {
            headers.set(key, value);
        }
    });

    return headers;
}

// Per-request response helpers (preferred). The bare versions are kept for legacy call
// sites; they omit CORS headers, which is fine for same-origin asset/HTML responses.
function jsonFor(request, data, status = 200, extraHeaders = {}) {
    const body = data && typeof data === 'object' && typeof data.success === 'boolean'
        ? data
        : { success: true, data };

    return new Response(JSON.stringify(body), {
        status,
        headers: responseHeaders(extraHeaders, request)
    });
}

function failFor(request, message, status = 400, extra = {}) {
    return jsonFor(request, { success: false, message, ...extra }, status);
}

function json(data, status = 200, extraHeaders = {}) {
    const body = data && typeof data === 'object' && typeof data.success === 'boolean'
        ? data
        : { success: true, data };

    return new Response(JSON.stringify(body), {
        status,
        headers: responseHeaders(extraHeaders)
    });
}

function fail(message, status = 400, extra = {}) {
    return json({ success: false, message, ...extra }, status);
}

function wantsHtml(request) {
    return (request.headers.get('accept') || '').includes('text/html');
}

function base64UrlEncode(value) {
    const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
    let binary = '';

    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });

    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecodeBytes(value) {
    const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const binary = atob(padded);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function base64UrlDecode(value) {
    return new TextDecoder().decode(base64UrlDecodeBytes(value));
}

async function hmac(value, secret) {
    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));

    return base64UrlEncode(new Uint8Array(signature));
}

function getJwtSecret(env) {
    const secret = env.JWT_SECRET || env.ADMIN_SESSION_SECRET;
    if (!secret) {
        throw new Error('Server is misconfigured: JWT_SECRET (or ADMIN_SESSION_SECRET) must be set as a Worker secret.');
    }
    return secret;
}

function parseCookies(request) {
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = new Map();

    cookieHeader.split(';').forEach((cookie) => {
        const [name, ...valueParts] = cookie.trim().split('=');
        if (!name) return;
        try {
            cookies.set(name, decodeURIComponent(valueParts.join('=')));
        } catch (error) {
            cookies.set(name, valueParts.join('='));
        }
    });

    return cookies;
}

function getCookie(request, name) {
    return parseCookies(request).get(name) || '';
}

function serializeCookie(request, name, value, options = {}) {
    const url = new URL(request.url);
    const parts = [
        `${name}=${encodeURIComponent(value)}`,
        `Path=${options.path || '/'}`,
        `SameSite=${options.sameSite || 'Lax'}`
    ];

    if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
    if (options.httpOnly !== false) parts.push('HttpOnly');
    if (url.protocol === 'https:') parts.push('Secure');

    return parts.join('; ');
}

function clearCookie(request, name) {
    return serializeCookie(request, name, '', { maxAge: 0 });
}

function authCookie(request, token) {
    return serializeCookie(request, AUTH_COOKIE_NAME, token, {
        maxAge: SESSION_MAX_AGE_SECONDS,
        sameSite: 'Strict'
    });
}

function redirect(location, extraHeaders = {}) {
    const headers = new Headers();
    headers.set('location', location);

    Object.entries(extraHeaders).forEach(([key, value]) => {
        if (Array.isArray(value)) {
            value.forEach((item) => headers.append(key, item));
        } else if (value !== undefined && value !== null) {
            headers.set(key, value);
        }
    });

    return new Response(null, { status: 302, headers });
}

async function sha256(value) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return base64UrlEncode(new Uint8Array(digest));
}

function randomId(length = 16) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return base64UrlEncode(bytes);
}

function safeEqual(a, b) {
    const left = String(a || '');
    const right = String(b || '');
    if (left.length !== right.length) return false;

    let diff = 0;
    for (let index = 0; index < left.length; index += 1) {
        diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
    }

    return diff === 0;
}

// PBKDF2-SHA256, 100,000 iterations. Format: `pbkdf2$<iter>$<saltB64>$<hashB64>`.
// Legacy SHA-256 hashes (`<salt>:<hex>` without prefix) are still verified for backwards
// compatibility, then transparently upgraded on next successful login (see comparePassword
// callers — they should re-hash if `comparePassword` returns true and `needsRehash(storedHash)`).
const PASSWORD_HASH_ITERATIONS = 100000;
const PASSWORD_HASH_BYTES = 32;

async function pbkdf2Hash(password, saltBytes, iterations = PASSWORD_HASH_ITERATIONS) {
    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations },
        key,
        PASSWORD_HASH_BYTES * 8
    );
    return new Uint8Array(bits);
}

async function hashPassword(password) {
    const saltBytes = new Uint8Array(16);
    crypto.getRandomValues(saltBytes);
    const hashBytes = await pbkdf2Hash(password, saltBytes);
    return `pbkdf2$${PASSWORD_HASH_ITERATIONS}$${base64UrlEncode(saltBytes)}$${base64UrlEncode(hashBytes)}`;
}

function needsRehash(storedHash) {
    return !String(storedHash || '').startsWith('pbkdf2$');
}

async function comparePassword(password, storedHash) {
    const stored = String(storedHash || '');
    if (!stored) return false;

    if (stored.startsWith('pbkdf2$')) {
        const parts = stored.split('$');
        if (parts.length !== 4) return false;
        const iterations = Number(parts[1]);
        if (!Number.isFinite(iterations) || iterations < 1000) return false;
        const saltBytes = base64UrlDecodeBytes(parts[2]);
        const candidate = await pbkdf2Hash(password, saltBytes, iterations);
        return safeEqual(base64UrlEncode(candidate), parts[3]);
    }

    // Legacy SHA-256 verification (timing-safe).
    const [salt, hash] = stored.split(':');
    if (!salt || !hash) return false;
    const candidate = await sha256(`${salt}:${password}`);
    return safeEqual(candidate, hash);
}

async function createToken(env, claims) {
    const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = base64UrlEncode(JSON.stringify({
        ...claims,
        exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS
    }));
    const signature = await hmac(`${header}.${payload}`, getJwtSecret(env));

    return `${header}.${payload}.${signature}`;
}

async function verifyToken(request, env) {
    const header = request.headers.get('authorization') || '';
    const cookieToken = getCookie(request, AUTH_COOKIE_NAME);
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : cookieToken;
    const [tokenHeader, payload, signature] = token.split('.');

    if (!tokenHeader || !payload || !signature) return null;

    // Allow rotation: try JWT_SECRET first, optionally fall back to ADMIN_SESSION_SECRET
    // (only when explicitly set as a secret — never accept a hardcoded default).
    const secrets = [...new Set([
        getJwtSecret(env),
        env.ADMIN_SESSION_SECRET
    ].filter(Boolean))];
    const verified = await Promise.all(secrets.map((secret) => hmac(`${tokenHeader}.${payload}`, secret)));
    if (!verified.some((candidate) => safeEqual(candidate, signature))) return null;

    try {
        const session = JSON.parse(base64UrlDecode(payload));
        if (Number(session.exp) < Math.floor(Date.now() / 1000)) return null;
        return session;
    } catch (error) {
        return null;
    }
}

async function requireAuth(request, env) {
    const session = await verifyToken(request, env);

    if (!session) {
        return { error: fail('Login required.', 401) };
    }

    return { session };
}

async function requireAdmin(request, env) {
    const { session, error } = await requireAuth(request, env);

    if (error) return { error };
    if (!ADMIN_ACCESS_ROLES.has(session.role)) return { error: fail('Admin login required.', 403) };

    return { session };
}

async function requireAdminCreator(request, env) {
    const { session, error } = await requireAdmin(request, env);

    if (error) return { error };
    if (session.role !== 'admin') return { error: fail('Only admins can create admin accounts.', 403) };

    return { session };
}

function getProductId(pathname) {
    const match = pathname.match(/^\/products\/(\d+)$/);
    return match ? Number(match[1]) : null;
}

function getCategoryId(pathname) {
    const match = pathname.match(/^\/categories\/(.+)$/);
    return match ? decodeURIComponent(match[1]) : null;
}

function getAdminOrderId(pathname) {
    const match = pathname.match(/^\/admin\/orders\/(\d+)$/);
    return match ? Number(match[1]) : null;
}

function getAdminOrderStatusId(pathname) {
    const match = pathname.match(/^\/admin\/orders\/(\d+)\/status$/);
    return match ? Number(match[1]) : null;
}

function getApiOrderId(pathname) {
    const match = pathname.match(/^\/api\/orders\/(\d+)$/);
    return match ? Number(match[1]) : null;
}

function getNormalizedProductPath(pathname) {
    return pathname.startsWith('/api/products') ? pathname.slice(4) : pathname;
}

async function readJson(request) {
    try {
        return await request.json();
    } catch (error) {
        return {};
    }
}

function parseJsonArray(value) {
    try {
        const parsed = JSON.parse(value || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        return [];
    }
}

function parseJsonObject(value) {
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;

    try {
        const parsed = JSON.parse(value || '{}');
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (error) {
        return {};
    }
}

function normalizeOptionList(value) {
    let source = value;

    if (typeof value === 'string') {
        const trimmedValue = value.trim();

        if (trimmedValue.startsWith('[')) {
            try {
                const parsedValue = JSON.parse(trimmedValue);
                source = Array.isArray(parsedValue) ? parsedValue : trimmedValue;
            } catch (error) {
                source = trimmedValue;
            }
        }
    }

    const values = Array.isArray(source)
        ? source
        : String(source || '').split(/\r?\n|,/);

    return [...new Set(values.map((item) => {
        if (item && typeof item === 'object') {
            return String(item.name || item.colorValue || item.color_value || item.color || item.value || '').trim();
        }

        return String(item || '').trim();
    }).filter(Boolean))];
}

function normalizeColorVariants(value) {
    let source = value;

    if (typeof value === 'string') {
        const trimmedValue = value.trim();

        if (!trimmedValue) return [];

        try {
            const parsedValue = JSON.parse(trimmedValue);
            source = Array.isArray(parsedValue) ? parsedValue : [];
        } catch (error) {
            return [];
        }
    }

    if (!Array.isArray(source)) return [];

    return source
        .map((variant) => {
            const colorValue = String(variant?.colorHex || variant?.colorValue || variant?.color_value || variant?.color || variant?.value || '').trim();
            const price = Number(variant?.price);
            const salePrice = Number(variant?.salePrice || variant?.sale_price);
            const stock = Number(variant?.stock);
            const normalized = {
                name: String(variant?.name || variant?.colorName || '').trim(),
                colorName: String(variant?.name || variant?.colorName || '').trim(),
                color: colorValue,
                colorHex: colorValue,
                colorValue,
                image: String(variant?.image || variant?.imageUrl || '').trim(),
                price: Number.isFinite(price) && price >= 0 ? price : null,
                salePrice: Number.isFinite(salePrice) && salePrice >= 0 ? salePrice : null,
                stock: Number.isFinite(stock) && stock >= 0 ? Math.round(stock) : null,
                sku: String(variant?.sku || variant?.productCode || '').trim()
            };
            const id = Number(variant?.id);

            if (Number.isInteger(id) && id > 0) normalized.id = id;
            return normalized;
        })
        .filter((variant) => variant.name || variant.color || variant.image)
        .filter((variant, index, variants) => {
            const key = `${variant.name.toLowerCase()}::${variant.colorValue.toLowerCase()}::${variant.image}`;
            return variants.findIndex((item) => `${item.name.toLowerCase()}::${item.colorValue.toLowerCase()}::${item.image}` === key) === index;
        });
}

async function addMissingColumns(env, tableName, columns) {
    const existingColumns = await getTableColumns(env, tableName);

    for (const [columnName, statement] of columns) {
        if (!existingColumns.has(String(columnName).toLowerCase())) {
            try {
                await env.DB.prepare(statement).run();
            } catch (error) {
                if (!isDuplicateColumnError(error, columnName)) throw error;
            }
        }
    }
}

async function ensureCoreSchema(env) {
    if (coreSchemaReady) return;

    await env.DB.prepare(
        `CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            price INTEGER DEFAULT 0,
            salePrice INTEGER,
            discountPercent INTEGER DEFAULT 0,
            description TEXT,
            category TEXT,
            imageUrl TEXT,
            imageUrls TEXT,
            colors TEXT,
            colorVariants TEXT,
            sizes TEXT,
            stock INTEGER DEFAULT 0,
            stockStatus TEXT DEFAULT 'available',
            sku TEXT,
            width TEXT,
            height TEXT,
            depth TEXT,
            material TEXT,
            weight TEXT,
            brand TEXT,
            deliveryAvailable INTEGER DEFAULT 1,
            assemblyRequired INTEGER DEFAULT 0,
            warrantyNote TEXT,
            deliveryNote TEXT,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        )`
    ).run();

    await env.DB.prepare(
        `CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            googleId TEXT,
            username TEXT,
            fullname TEXT,
            name TEXT,
            email TEXT UNIQUE,
            avatar TEXT,
            passwordHash TEXT,
            phone TEXT,
            address TEXT,
            role TEXT DEFAULT 'user',
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        )`
    ).run();

    await env.DB.prepare(
        `CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        )`
    ).run();

    await env.DB.prepare(
        `CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            orderCode TEXT UNIQUE,
            userId INTEGER,
            items TEXT,
            totalAmount INTEGER DEFAULT 0,
            paymentMethod TEXT,
            transactionCode TEXT,
            status TEXT DEFAULT 'pending',
            customerName TEXT,
            email TEXT,
            phone TEXT,
            address TEXT,
            deliveryInfo TEXT,
            paymentStatus TEXT DEFAULT 'unpaid',
            orderStatus TEXT DEFAULT 'pending',
            channel TEXT,
            transactionNote TEXT,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        )`
    ).run();

    await env.DB.prepare(
        `CREATE TABLE IF NOT EXISTS payment_settings (
            id INTEGER PRIMARY KEY,
            bankName TEXT,
            accountNumber TEXT,
            accountHolder TEXT,
            facebookChatUrl TEXT,
            messengerUrl TEXT,
            deliveryFee INTEGER DEFAULT 0,
            contactPhone TEXT,
            contactEmail TEXT,
            storeAddress TEXT,
            workingHours TEXT,
            facebookPageUrl TEXT,
            warrantyNote TEXT,
            returnPolicy TEXT,
            qpayInfo TEXT,
            estimatedDeliveryTime TEXT,
            updatedAt TEXT
        )`
    ).run();

    await env.DB.prepare(
        `CREATE TABLE IF NOT EXISTS admin_settings (
            id INTEGER PRIMARY KEY,
            username TEXT UNIQUE,
            email TEXT,
            passwordHash TEXT,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        )`
    ).run();

    await env.DB.prepare(
        `CREATE TABLE IF NOT EXISTS product_images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            productId INTEGER NOT NULL,
            url TEXT NOT NULL,
            position INTEGER NOT NULL DEFAULT 0,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
        )`
    ).run();

    await env.DB.prepare(
        `CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            orderId INTEGER NOT NULL,
            productId INTEGER,
            productCode TEXT,
            productName TEXT NOT NULL,
            productPrice INTEGER DEFAULT 0,
            quantity INTEGER DEFAULT 1,
            imageUrl TEXT,
            selectedColor TEXT,
            selectedSize TEXT,
            selectedColorValue TEXT,
            selectedColorImage TEXT,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE
        )`
    ).run();

    await addMissingColumns(env, 'products', [
        ['imageUrls', 'ALTER TABLE products ADD COLUMN imageUrls TEXT'],
        ['sizes', 'ALTER TABLE products ADD COLUMN sizes TEXT'],
        ['stock', 'ALTER TABLE products ADD COLUMN stock INTEGER DEFAULT 0'],
        ['colors', 'ALTER TABLE products ADD COLUMN colors TEXT'],
        ['colorVariants', 'ALTER TABLE products ADD COLUMN colorVariants TEXT'],
        ['salePrice', 'ALTER TABLE products ADD COLUMN salePrice INTEGER'],
        ['discountPercent', 'ALTER TABLE products ADD COLUMN discountPercent INTEGER DEFAULT 0'],
        ['stockStatus', "ALTER TABLE products ADD COLUMN stockStatus TEXT DEFAULT 'available'"],
        ['sku', 'ALTER TABLE products ADD COLUMN sku TEXT'],
        ['width', 'ALTER TABLE products ADD COLUMN width TEXT'],
        ['height', 'ALTER TABLE products ADD COLUMN height TEXT'],
        ['depth', 'ALTER TABLE products ADD COLUMN depth TEXT'],
        ['material', 'ALTER TABLE products ADD COLUMN material TEXT'],
        ['weight', 'ALTER TABLE products ADD COLUMN weight TEXT'],
        ['brand', 'ALTER TABLE products ADD COLUMN brand TEXT'],
        ['deliveryAvailable', 'ALTER TABLE products ADD COLUMN deliveryAvailable INTEGER DEFAULT 1'],
        ['assemblyRequired', 'ALTER TABLE products ADD COLUMN assemblyRequired INTEGER DEFAULT 0'],
        ['warrantyNote', 'ALTER TABLE products ADD COLUMN warrantyNote TEXT'],
        ['deliveryNote', 'ALTER TABLE products ADD COLUMN deliveryNote TEXT'],
        ['subCategory', 'ALTER TABLE products ADD COLUMN subCategory TEXT']
    ]);

    await addMissingColumns(env, 'users', [
        ['googleId', 'ALTER TABLE users ADD COLUMN googleId TEXT'],
        ['username', 'ALTER TABLE users ADD COLUMN username TEXT'],
        ['fullname', 'ALTER TABLE users ADD COLUMN fullname TEXT'],
        ['name', 'ALTER TABLE users ADD COLUMN name TEXT'],
        ['email', 'ALTER TABLE users ADD COLUMN email TEXT'],
        ['avatar', 'ALTER TABLE users ADD COLUMN avatar TEXT'],
        ['passwordHash', 'ALTER TABLE users ADD COLUMN passwordHash TEXT'],
        ['phone', 'ALTER TABLE users ADD COLUMN phone TEXT'],
        ['address', 'ALTER TABLE users ADD COLUMN address TEXT'],
        ['role', "ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'"],
        ['createdAt', 'ALTER TABLE users ADD COLUMN createdAt TEXT'],
        ['updatedAt', 'ALTER TABLE users ADD COLUMN updatedAt TEXT']
    ]);

    await addMissingColumns(env, 'orders', [
        ['orderCode', 'ALTER TABLE orders ADD COLUMN orderCode TEXT'],
        ['userId', 'ALTER TABLE orders ADD COLUMN userId INTEGER'],
        ['items', 'ALTER TABLE orders ADD COLUMN items TEXT'],
        ['totalAmount', 'ALTER TABLE orders ADD COLUMN totalAmount INTEGER DEFAULT 0'],
        ['paymentMethod', 'ALTER TABLE orders ADD COLUMN paymentMethod TEXT'],
        ['transactionCode', 'ALTER TABLE orders ADD COLUMN transactionCode TEXT'],
        ['status', "ALTER TABLE orders ADD COLUMN status TEXT DEFAULT 'pending'"],
        ['customerName', 'ALTER TABLE orders ADD COLUMN customerName TEXT'],
        ['email', 'ALTER TABLE orders ADD COLUMN email TEXT'],
        ['phone', 'ALTER TABLE orders ADD COLUMN phone TEXT'],
        ['address', 'ALTER TABLE orders ADD COLUMN address TEXT'],
        ['deliveryInfo', 'ALTER TABLE orders ADD COLUMN deliveryInfo TEXT'],
        ['paymentStatus', "ALTER TABLE orders ADD COLUMN paymentStatus TEXT DEFAULT 'unpaid'"],
        ['orderStatus', "ALTER TABLE orders ADD COLUMN orderStatus TEXT DEFAULT 'pending'"],
        ['channel', 'ALTER TABLE orders ADD COLUMN channel TEXT'],
        ['transactionNote', 'ALTER TABLE orders ADD COLUMN transactionNote TEXT'],
        ['createdAt', 'ALTER TABLE orders ADD COLUMN createdAt TEXT'],
        ['updatedAt', 'ALTER TABLE orders ADD COLUMN updatedAt TEXT']
    ]);

    await addMissingColumns(env, 'payment_settings', [
        ['bankName', 'ALTER TABLE payment_settings ADD COLUMN bankName TEXT'],
        ['accountNumber', 'ALTER TABLE payment_settings ADD COLUMN accountNumber TEXT'],
        ['accountHolder', 'ALTER TABLE payment_settings ADD COLUMN accountHolder TEXT'],
        ['facebookChatUrl', 'ALTER TABLE payment_settings ADD COLUMN facebookChatUrl TEXT'],
        ['messengerUrl', 'ALTER TABLE payment_settings ADD COLUMN messengerUrl TEXT'],
        ['deliveryFee', 'ALTER TABLE payment_settings ADD COLUMN deliveryFee INTEGER DEFAULT 0'],
        ['contactPhone', 'ALTER TABLE payment_settings ADD COLUMN contactPhone TEXT'],
        ['contactEmail', 'ALTER TABLE payment_settings ADD COLUMN contactEmail TEXT'],
        ['storeAddress', 'ALTER TABLE payment_settings ADD COLUMN storeAddress TEXT'],
        ['workingHours', 'ALTER TABLE payment_settings ADD COLUMN workingHours TEXT'],
        ['facebookPageUrl', 'ALTER TABLE payment_settings ADD COLUMN facebookPageUrl TEXT'],
        ['warrantyNote', 'ALTER TABLE payment_settings ADD COLUMN warrantyNote TEXT'],
        ['returnPolicy', 'ALTER TABLE payment_settings ADD COLUMN returnPolicy TEXT'],
        ['qpayInfo', 'ALTER TABLE payment_settings ADD COLUMN qpayInfo TEXT'],
        ['estimatedDeliveryTime', 'ALTER TABLE payment_settings ADD COLUMN estimatedDeliveryTime TEXT'],
        ['updatedAt', 'ALTER TABLE payment_settings ADD COLUMN updatedAt TEXT']
    ]);

    await addMissingColumns(env, 'admin_settings', [
        ['username', 'ALTER TABLE admin_settings ADD COLUMN username TEXT'],
        ['email', 'ALTER TABLE admin_settings ADD COLUMN email TEXT'],
        ['passwordHash', 'ALTER TABLE admin_settings ADD COLUMN passwordHash TEXT'],
        ['createdAt', 'ALTER TABLE admin_settings ADD COLUMN createdAt TEXT'],
        ['updatedAt', 'ALTER TABLE admin_settings ADD COLUMN updatedAt TEXT']
    ]);

    await addMissingColumns(env, 'order_items', [
        ['productId', 'ALTER TABLE order_items ADD COLUMN productId INTEGER'],
        ['productCode', 'ALTER TABLE order_items ADD COLUMN productCode TEXT'],
        ['productName', 'ALTER TABLE order_items ADD COLUMN productName TEXT'],
        ['productPrice', 'ALTER TABLE order_items ADD COLUMN productPrice INTEGER DEFAULT 0'],
        ['quantity', 'ALTER TABLE order_items ADD COLUMN quantity INTEGER DEFAULT 1'],
        ['imageUrl', 'ALTER TABLE order_items ADD COLUMN imageUrl TEXT'],
        ['selectedColor', 'ALTER TABLE order_items ADD COLUMN selectedColor TEXT'],
        ['selectedSize', 'ALTER TABLE order_items ADD COLUMN selectedSize TEXT'],
        ['selectedColorValue', 'ALTER TABLE order_items ADD COLUMN selectedColorValue TEXT'],
        ['selectedColorImage', 'ALTER TABLE order_items ADD COLUMN selectedColorImage TEXT'],
        ['createdAt', 'ALTER TABLE order_items ADD COLUMN createdAt TEXT']
    ]);

    await env.DB.prepare("INSERT OR IGNORE INTO categories (name, createdAt, updatedAt) VALUES ('Uncategorized', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)").run();
    await env.DB.prepare(
        `INSERT OR IGNORE INTO payment_settings
            (id, bankName, accountNumber, accountHolder, facebookChatUrl, messengerUrl, deliveryFee, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
        1,
        DEFAULT_PAYMENT_SETTINGS.bankName,
        DEFAULT_PAYMENT_SETTINGS.accountNumber,
        DEFAULT_PAYMENT_SETTINGS.accountHolder,
        DEFAULT_PAYMENT_SETTINGS.facebookChatUrl,
        DEFAULT_PAYMENT_SETTINGS.messengerUrl,
        DEFAULT_PAYMENT_SETTINGS.deliveryFee,
        new Date().toISOString()
    ).run();

    await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_product_images_product_position ON product_images (productId, position, id)').run();
    await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (orderId)').run();
    await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders (userId, createdAt)').run();
    await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_orders_code ON orders (orderCode)').run();
    await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_products_category ON products (category)').run();
    await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)').run();
    await env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users (googleId) WHERE googleId IS NOT NULL AND googleId <> ''").run();
    await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_users_role ON users (role)').run();

    coreSchemaReady = true;
}

async function ensureEcommerceSchema(env) {
    if (ecommerceSchemaReady) return;

    await ensureCoreSchema(env);

    await env.DB.prepare(
        `CREATE TABLE IF NOT EXISTS payment_settings (
            id INTEGER PRIMARY KEY,
            bankName TEXT,
            accountNumber TEXT,
            accountHolder TEXT,
            facebookChatUrl TEXT,
            updatedAt TEXT
        )`
    ).run();

    await addMissingColumns(env, 'products', [
        ['imageUrls', 'ALTER TABLE products ADD COLUMN imageUrls TEXT'],
        ['sizes', 'ALTER TABLE products ADD COLUMN sizes TEXT'],
        ['stock', 'ALTER TABLE products ADD COLUMN stock INTEGER DEFAULT 0'],
        ['colors', 'ALTER TABLE products ADD COLUMN colors TEXT'],
        ['colorVariants', 'ALTER TABLE products ADD COLUMN colorVariants TEXT'],
        ['sku', 'ALTER TABLE products ADD COLUMN sku TEXT'],
        ['width', 'ALTER TABLE products ADD COLUMN width TEXT'],
        ['height', 'ALTER TABLE products ADD COLUMN height TEXT'],
        ['depth', 'ALTER TABLE products ADD COLUMN depth TEXT'],
        ['material', 'ALTER TABLE products ADD COLUMN material TEXT'],
        ['weight', 'ALTER TABLE products ADD COLUMN weight TEXT'],
        ['brand', 'ALTER TABLE products ADD COLUMN brand TEXT'],
        ['deliveryAvailable', 'ALTER TABLE products ADD COLUMN deliveryAvailable INTEGER DEFAULT 1'],
        ['assemblyRequired', 'ALTER TABLE products ADD COLUMN assemblyRequired INTEGER DEFAULT 0'],
        ['salePrice', 'ALTER TABLE products ADD COLUMN salePrice INTEGER'],
        ['discountPercent', 'ALTER TABLE products ADD COLUMN discountPercent INTEGER DEFAULT 0'],
        ['stockStatus', "ALTER TABLE products ADD COLUMN stockStatus TEXT DEFAULT 'available'"],
        ['warrantyNote', 'ALTER TABLE products ADD COLUMN warrantyNote TEXT'],
        ['deliveryNote', 'ALTER TABLE products ADD COLUMN deliveryNote TEXT']
    ]);

    await ensureProductColorVariantsTable(env);
    await addMissingColumns(env, 'product_color_variants', [
        ['price', 'ALTER TABLE product_color_variants ADD COLUMN price INTEGER'],
        ['sale_price', 'ALTER TABLE product_color_variants ADD COLUMN sale_price INTEGER'],
        ['stock', 'ALTER TABLE product_color_variants ADD COLUMN stock INTEGER'],
        ['sku', 'ALTER TABLE product_color_variants ADD COLUMN sku TEXT']
    ]);

    await addMissingColumns(env, 'orders', [
        ['customerName', 'ALTER TABLE orders ADD COLUMN customerName TEXT'],
        ['email', 'ALTER TABLE orders ADD COLUMN email TEXT'],
        ['phone', 'ALTER TABLE orders ADD COLUMN phone TEXT'],
        ['address', 'ALTER TABLE orders ADD COLUMN address TEXT'],
        ['deliveryInfo', 'ALTER TABLE orders ADD COLUMN deliveryInfo TEXT'],
        ['paymentStatus', "ALTER TABLE orders ADD COLUMN paymentStatus TEXT DEFAULT 'unpaid'"],
        ['orderStatus', "ALTER TABLE orders ADD COLUMN orderStatus TEXT DEFAULT 'pending'"],
        ['channel', 'ALTER TABLE orders ADD COLUMN channel TEXT'],
        ['transactionNote', 'ALTER TABLE orders ADD COLUMN transactionNote TEXT']
    ]);

    await addMissingColumns(env, 'payment_settings', [
        ['messengerUrl', 'ALTER TABLE payment_settings ADD COLUMN messengerUrl TEXT'],
        ['deliveryFee', 'ALTER TABLE payment_settings ADD COLUMN deliveryFee INTEGER DEFAULT 0'],
        ['contactPhone', 'ALTER TABLE payment_settings ADD COLUMN contactPhone TEXT'],
        ['contactEmail', 'ALTER TABLE payment_settings ADD COLUMN contactEmail TEXT'],
        ['storeAddress', 'ALTER TABLE payment_settings ADD COLUMN storeAddress TEXT'],
        ['workingHours', 'ALTER TABLE payment_settings ADD COLUMN workingHours TEXT'],
        ['facebookPageUrl', 'ALTER TABLE payment_settings ADD COLUMN facebookPageUrl TEXT'],
        ['warrantyNote', 'ALTER TABLE payment_settings ADD COLUMN warrantyNote TEXT'],
        ['returnPolicy', 'ALTER TABLE payment_settings ADD COLUMN returnPolicy TEXT'],
        ['qpayInfo', 'ALTER TABLE payment_settings ADD COLUMN qpayInfo TEXT'],
        ['estimatedDeliveryTime', 'ALTER TABLE payment_settings ADD COLUMN estimatedDeliveryTime TEXT']
    ]);

    await env.DB.prepare(
        `CREATE TABLE IF NOT EXISTS contact_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            email TEXT,
            phone TEXT,
            message TEXT NOT NULL,
            status TEXT DEFAULT 'new',
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        )`
    ).run();

    await env.DB.prepare(
        `CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER NOT NULL,
            tokenHash TEXT NOT NULL UNIQUE,
            expiresAt TEXT NOT NULL,
            usedAt TEXT,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        )`
    ).run();

    ecommerceSchemaReady = true;
}

function isMissingColumnError(error, columnName) {
    const message = String(error?.message || '').toLowerCase();
    return message.includes('no such column') && message.includes(String(columnName).toLowerCase());
}

function isDuplicateColumnError(error, columnName) {
    const message = String(error?.message || '').toLowerCase();
    return message.includes('duplicate column') && message.includes(String(columnName).toLowerCase());
}

function isMissingTableError(error, tableName) {
    const message = String(error?.message || '').toLowerCase();
    return message.includes('no such table') && message.includes(String(tableName).toLowerCase());
}

async function getTableColumns(env, tableName) {
    try {
        const { results } = await env.DB.prepare(`PRAGMA table_info(${tableName})`).all();
        return new Set((results || []).map((row) => String(row.name || '').toLowerCase()));
    } catch (error) {
        return new Set();
    }
}

async function ensureProductColorVariantsTable(env) {
    if (productColorVariantsSchemaReady) return;

    await env.DB.prepare(
        `CREATE TABLE IF NOT EXISTS product_color_variants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            color_value TEXT,
            image TEXT,
            sort_order INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        )`
    ).run();

    const columns = await getTableColumns(env, 'product_color_variants');
    const missingColumns = [
        ['color_value', 'ALTER TABLE product_color_variants ADD COLUMN color_value TEXT'],
        ['image', 'ALTER TABLE product_color_variants ADD COLUMN image TEXT'],
        ['sort_order', 'ALTER TABLE product_color_variants ADD COLUMN sort_order INTEGER DEFAULT 0'],
        ['created_at', 'ALTER TABLE product_color_variants ADD COLUMN created_at TEXT'],
        ['updated_at', 'ALTER TABLE product_color_variants ADD COLUMN updated_at TEXT'],
        ['price', 'ALTER TABLE product_color_variants ADD COLUMN price INTEGER'],
        ['sale_price', 'ALTER TABLE product_color_variants ADD COLUMN sale_price INTEGER'],
        ['stock', 'ALTER TABLE product_color_variants ADD COLUMN stock INTEGER'],
        ['sku', 'ALTER TABLE product_color_variants ADD COLUMN sku TEXT']
    ];

    for (const [columnName, statement] of missingColumns) {
        if (!columns.has(columnName)) {
            await env.DB.prepare(statement).run();
        }
    }

    await env.DB.prepare(
        'CREATE INDEX IF NOT EXISTS idx_product_color_variants_product_order ON product_color_variants (product_id, sort_order, id)'
    ).run();
    await env.DB.prepare(
        'CREATE INDEX IF NOT EXISTS idx_product_color_variants_product_name ON product_color_variants (product_id, name)'
    ).run();

    productColorVariantsSchemaReady = true;
}

function isHttpUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (error) {
        return false;
    }
}

function isAllowedImageReference(value) {
    const imageValue = String(value || '').trim();
    return isHttpUrl(imageValue)
        || imageValue.startsWith('/uploads/')
        || imageValue.startsWith('uploads/')
        || imageValue.startsWith('images/')
        || imageValue.startsWith('./images/')
        || isSafeImagePath(imageValue);
}

function isSafeImagePath(value) {
    const imageValue = String(value || '').trim();
    return /^(?!https?:)(?!data:)(?!\/\/)(?!.*(?:^|\/)\.\.(?:\/|$))\.?\/?[\w./ -]+\.(png|jpe?g|webp|gif|avif)$/i.test(imageValue);
}

function normalizeImages(body = {}) {
    const source = Array.isArray(body.images)
        ? body.images
        : Array.isArray(body.imageUrls)
            ? body.imageUrls
            : String(body.imageUrls || body.imageUrl || body.image || '')
                .split(/\r?\n|,/);

    return [...new Set(source.map((image) => String(image || '').trim()).filter(Boolean))];
}

function cleanBoolean(value, defaultValue = false) {
    if (value === true || value === 1 || value === '1') return true;
    if (value === false || value === 0 || value === '0') return false;
    const normalized = String(value ?? '').trim().toLowerCase();
    if (['true', 'yes', 'on'].includes(normalized)) return true;
    if (['false', 'no', 'off'].includes(normalized)) return false;
    return defaultValue;
}

function cleanOptionalNumber(value) {
    if (value === undefined || value === null || value === '') return null;
    const numberValue = Number(value);
    return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : null;
}

function cleanProductInput(body = {}) {
    const images = normalizeImages(body);
    const customId = body.id || body.productId || body.customId;
    const savedColorVariants = normalizeColorVariants(body.colorVariants);
    const colorVariants = savedColorVariants.length ? savedColorVariants : normalizeColorVariants(body.colors);
    const savedColors = normalizeOptionList(body.colors);
    const colors = savedColors.length
        ? savedColors
        : colorVariants.map((variant) => variant.name || variant.colorValue || variant.color).filter(Boolean);

    return {
        id: customId === undefined || customId === null || customId === '' ? null : Number(customId),
        name: String(body.name || '').trim(),
        price: Number(body.price),
        description: String(body.description || '').trim(),
        category: String(body.category || body.categoryName || body.categoryId || '').trim(),
        subCategory: String(body.subCategory || '').trim(),
        images,
        colors,
        colorVariants,
        sizes: normalizeOptionList(body.sizes),
        stock: Number(body.stock || 0),
        sku: String(body.sku || body.productCode || '').trim(),
        width: String(body.width || body.dimensions?.width || '').trim(),
        height: String(body.height || body.dimensions?.height || '').trim(),
        depth: String(body.depth || body.dimensions?.depth || '').trim(),
        material: String(body.material || '').trim(),
        weight: String(body.weight || '').trim(),
        brand: String(body.brand || body.manufacturer || '').trim(),
        deliveryAvailable: cleanBoolean(body.deliveryAvailable, true),
        assemblyRequired: cleanBoolean(body.assemblyRequired, false),
        salePrice: cleanOptionalNumber(body.salePrice),
        discountPercent: cleanOptionalNumber(body.discountPercent) || 0,
        stockStatus: String(body.stockStatus || '').trim() || (Number(body.stock || 0) > 0 ? 'available' : 'out_of_stock'),
        warrantyNote: String(body.warrantyNote || '').trim(),
        deliveryNote: String(body.deliveryNote || '').trim()
    };
}

function validateProduct(product, allowCustomId = false) {
    if (allowCustomId && product.id !== null && (!Number.isInteger(product.id) || product.id <= 0)) {
        return 'Product ID must be a positive integer.';
    }
    if (!product.name) return 'Product name is required.';
    if (!Number.isFinite(product.price) || product.price <= 0) return 'Product price must be greater than 0.';
    if (!product.category) return 'Product category is required.';
    if (!product.images.length) return 'At least one product image URL is required.';
    if (product.images.some((image) => !isAllowedImageReference(image))) return 'Every product image must be a valid URL or supported image path.';
    if (product.colorVariants.some((variant) => !variant.name || !variant.image)) {
        return 'Every color variant must include a name and image.';
    }
    if (product.colorVariants.some((variant) => !isAllowedImageReference(variant.image))) {
        return 'Every color variant image must be a valid URL or supported image path.';
    }
    if (!Number.isFinite(product.stock) || product.stock < 0) return 'Product stock must be 0 or greater.';
    if (product.salePrice !== null && product.salePrice > product.price) return 'Sale price cannot be greater than product price.';
    if (!['available', 'preorder', 'out_of_stock'].includes(product.stockStatus)) return 'Stock status is invalid.';
    return '';
}

function toProductResponse(row) {
    const images = parseJsonArray(row.imageUrls);
    const legacyImage = String(row.imageUrl || '').trim();
    const imageUrls = images.length ? images : (legacyImage ? [legacyImage] : []);
    const colorVariants = normalizeColorVariants(row.colorVariants);
    const legacyColorVariants = colorVariants.length ? colorVariants : normalizeColorVariants(row.colors);
    const savedColors = normalizeOptionList(row.colors);
    const colors = savedColors.length
        ? savedColors
        : legacyColorVariants.map((variant) => variant.name || variant.colorValue || variant.color).filter(Boolean);

    return {
        id: String(row.id),
        name: row.name || '',
        price: Number(row.price) || 0,
        salePrice: row.salePrice === null || row.salePrice === undefined ? null : Number(row.salePrice) || null,
        discountPercent: Number(row.discountPercent) || 0,
        description: row.description || '',
        category: row.category || 'Uncategorized',
        categoryName: row.category || 'Uncategorized',
        subCategory: row.subCategory || '',
        sku: row.sku || '',
        productCode: row.sku || '',
        dimensions: {
            width: row.width || '',
            height: row.height || '',
            depth: row.depth || ''
        },
        width: row.width || '',
        height: row.height || '',
        depth: row.depth || '',
        material: row.material || '',
        weight: row.weight || '',
        brand: row.brand || '',
        deliveryAvailable: cleanBoolean(row.deliveryAvailable, true),
        assemblyRequired: cleanBoolean(row.assemblyRequired, false),
        stockStatus: row.stockStatus || (Number(row.stock) > 0 ? 'available' : 'out_of_stock'),
        warrantyNote: row.warrantyNote || '',
        deliveryNote: row.deliveryNote || '',
        imageUrl: imageUrls[0] || '',
        imageUrls,
        galleryImages: imageUrls,
        images: imageUrls,
        colors,
        colorVariants: legacyColorVariants,
        colorsText: colors.join(', '),
        stock: Number(row.stock) || 0,
        createdAt: row.createdAt || ''
    };
}

function toColorVariantResponse(row) {
    const colorValue = String(row.color_value || row.colorValue || row.color || '').trim();
    const id = Number(row.id);
    const price = row.price === null || row.price === undefined ? null : Number(row.price);
    const salePrice = row.sale_price === null || row.sale_price === undefined ? null : Number(row.sale_price);
    const stock = row.stock === null || row.stock === undefined ? null : Number(row.stock);

    return {
        ...(Number.isInteger(id) && id > 0 ? { id } : {}),
        name: String(row.name || '').trim(),
        colorName: String(row.name || '').trim(),
        color: colorValue,
        colorHex: colorValue,
        colorValue,
        image: String(row.image || '').trim(),
        price: Number.isFinite(price) && price >= 0 ? price : null,
        salePrice: Number.isFinite(salePrice) && salePrice >= 0 ? salePrice : null,
        stock: Number.isFinite(stock) && stock >= 0 ? Math.round(stock) : null,
        sku: String(row.sku || '').trim()
    };
}

async function getProductImages(env, productIds) {
    const uniqueIds = [...new Set(productIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
    if (!uniqueIds.length) return new Map();

    const placeholders = uniqueIds.map(() => '?').join(', ');
    const { results } = await env.DB.prepare(
        `SELECT productId, url FROM product_images WHERE productId IN (${placeholders}) ORDER BY productId, position, id`
    ).bind(...uniqueIds).all();
    const imagesByProduct = new Map();

    (results || []).forEach((row) => {
        const key = String(row.productId);
        if (!imagesByProduct.has(key)) imagesByProduct.set(key, []);
        imagesByProduct.get(key).push(row.url);
    });

    return imagesByProduct;
}

async function attachProductImages(env, rows) {
    const productRows = Array.isArray(rows) ? rows : [];
    const imagesByProduct = await getProductImages(env, productRows.map((row) => row.id));

    return productRows.map((row) => {
        const relationalImages = imagesByProduct.get(String(row.id)) || [];
        return toProductResponse({
            ...row,
            imageUrls: relationalImages.length ? JSON.stringify(relationalImages) : row.imageUrls,
            imageUrl: relationalImages[0] || row.imageUrl
        });
    });
}

async function getProductColorVariants(env, productIds) {
    const uniqueIds = [...new Set(productIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
    if (!uniqueIds.length) return new Map();

    await ensureProductColorVariantsTable(env);

    const placeholders = uniqueIds.map(() => '?').join(', ');
    let results;

    try {
        ({ results } = await env.DB.prepare(
            `SELECT id, product_id, name, color_value, image, price, sale_price, stock, sku, sort_order
             FROM product_color_variants
             WHERE product_id IN (${placeholders})
             ORDER BY product_id, sort_order, id`
        ).bind(...uniqueIds).all());
    } catch (error) {
        if (isMissingTableError(error, 'product_color_variants')) return new Map();
        throw error;
    }

    const variantsByProduct = new Map();

    (results || []).forEach((row) => {
        const key = String(row.product_id);
        if (!variantsByProduct.has(key)) variantsByProduct.set(key, []);
        variantsByProduct.get(key).push(toColorVariantResponse(row));
    });

    return variantsByProduct;
}

async function attachProductColorVariants(env, products) {
    const productList = Array.isArray(products) ? products : [];
    const variantsByProduct = await getProductColorVariants(env, productList.map((product) => product.id));

    return productList.map((product) => {
        const colorVariants = variantsByProduct.get(String(product.id)) || [];
        if (!colorVariants.length) return product;

        const colors = colorVariants.map((variant) => variant.name || variant.colorValue || variant.color).filter(Boolean);

        return {
            ...product,
            colors,
            colorVariants,
            colorsText: colors.join(', ')
        };
    });
}

async function syncProductImages(env, productId, images) {
    await env.DB.prepare('DELETE FROM product_images WHERE productId = ?').bind(productId).run();

    for (const [index, image] of images.entries()) {
        await env.DB.prepare(
            'INSERT INTO product_images (productId, url, position, createdAt) VALUES (?, ?, ?, ?)'
        ).bind(productId, image, index, new Date().toISOString()).run();
    }
}

async function syncProductColorVariants(env, productId, variants) {
    const colorVariants = normalizeColorVariants(variants)
        .filter((variant) => variant.name || variant.image);

    await ensureProductColorVariantsTable(env);
    await env.DB.prepare('DELETE FROM product_color_variants WHERE product_id = ?').bind(productId).run();

    const now = new Date().toISOString();

    for (const [index, variant] of colorVariants.entries()) {
        await env.DB.prepare(
            'INSERT INTO product_color_variants (product_id, name, color_value, image, price, sale_price, stock, sku, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(
            productId,
            variant.name,
            variant.colorValue || variant.color,
            variant.image,
            variant.price === null ? null : Math.round(variant.price),
            variant.salePrice === null ? null : Math.round(variant.salePrice),
            variant.stock === null ? null : Math.round(variant.stock),
            variant.sku || '',
            index,
            now,
            now
        ).run();
    }
}

function toUserResponse(row) {
    const displayName = row.name || row.fullname || row.username || '';

    return {
        id: String(row.id),
        googleId: row.googleId || '',
        name: displayName,
        username: row.username || '',
        fullname: row.fullname || displayName,
        email: row.email || '',
        avatar: row.avatar || '',
        phone: row.phone || '',
        address: row.address || '',
        role: row.role || 'user',
        createdAt: row.createdAt || ''
    };
}

function toOrderResponse(row) {
    const deliveryInfo = parseJsonObject(row.deliveryInfo);
    const orderStatus = row.orderStatus || row.status || 'pending';
    const paymentStatus = row.paymentStatus || (row.status === 'paid' ? 'paid' : 'unpaid');

    return {
        id: String(row.id),
        orderCode: row.orderCode || '',
        userId: row.userId ? String(row.userId) : '',
        username: row.username || '',
        customerName: row.customerName || deliveryInfo.fullname || row.fullname || '',
        email: row.email || deliveryInfo.email || '',
        phone: row.phone || deliveryInfo.phone || '',
        address: row.address || deliveryInfo.address || '',
        deliveryInfo,
        customer: {
            fullname: row.customerName || deliveryInfo.fullname || row.fullname || '',
            name: row.customerName || deliveryInfo.fullname || row.fullname || '',
            email: row.email || deliveryInfo.email || '',
            phone: row.phone || deliveryInfo.phone || '',
            address: row.address || deliveryInfo.address || ''
        },
        items: parseJsonArray(row.items),
        totalAmount: Number(row.totalAmount) || 0,
        total: Number(row.totalAmount) || 0,
        paymentMethod: row.paymentMethod || 'bank_transfer',
        channel: row.channel || row.paymentMethod || '',
        paymentStatus,
        orderStatus,
        transactionCode: row.transactionCode || '',
        transactionNote: row.transactionNote || row.transactionCode || '',
        status: orderStatus,
        createdAt: row.createdAt || ''
    };
}

async function ensureAdminSettings(env) {
    await ensureCoreSchema(env);

    let row = await env.DB.prepare('SELECT * FROM admin_settings WHERE id = 1').first();

    if (!row) {
        const now = new Date().toISOString();
        await env.DB.prepare(
            'INSERT INTO admin_settings (id, username, email, passwordHash, createdAt, updatedAt) VALUES (1, ?, ?, ?, ?, ?)'
        ).bind(env.ADMIN_USERNAME || 'admin', '', '', now, now).run();
        row = await env.DB.prepare('SELECT * FROM admin_settings WHERE id = 1').first();
    }

    return row;
}

function normalizeLogin(value) {
    return String(value || '').trim().toLowerCase();
}

function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidUsername(value) {
    return /^[a-z0-9._-]{3,64}$/i.test(value);
}

function cleanAdminAccountInput(body = {}) {
    const rawIdentity = String(body.usernameEmail || body.usernameOrEmail || body.username || body.email || '').trim();
    const rawEmail = String(body.email || '').trim();
    const username = normalizeLogin(rawIdentity);
    const explicitEmail = rawEmail && normalizeLogin(rawEmail) !== username ? normalizeLogin(rawEmail) : '';
    const email = explicitEmail || (isValidEmail(username) ? username : '');

    return {
        name: String(body.name || body.fullname || '').trim(),
        username,
        email,
        password: String(body.password || ''),
        confirmPassword: String(body.confirmPassword || body.passwordConfirm || ''),
        role: normalizeLogin(body.role || 'admin')
    };
}

async function findAdminUserByLogin(env, login) {
    return env.DB.prepare(
        `SELECT * FROM users
         WHERE role IN ('admin', 'manager')
           AND (LOWER(username) = ? OR LOWER(COALESCE(email, '')) = ?)
         LIMIT 1`
    ).bind(login, login).first();
}

async function findDuplicateAdminIdentity(env, username, email = '', ignoreUserId = null, options = {}) {
    const settings = await ensureAdminSettings(env);
    const candidates = [username, email].filter(Boolean);
    const rootUsername = normalizeLogin(settings.username);
    const rootEmail = normalizeLogin(settings.email);

    if (!options.ignoreAdminSettings && candidates.some((value) => value === rootUsername || (rootEmail && value === rootEmail))) {
        return { source: 'admin_settings' };
    }

    const clauses = ['LOWER(username) = ?'];
    const values = [username];

    if (email) {
        clauses.push('LOWER(COALESCE(email, \'\')) = ?');
        values.push(email);
    }

    let sql = `SELECT id FROM users WHERE (${clauses.join(' OR ')})`;

    if (ignoreUserId) {
        sql += ' AND id != ?';
        values.push(ignoreUserId);
    }

    return env.DB.prepare(sql).bind(...values).first();
}

function validateAdminAccountInput(input) {
    if (!input.name) return 'Admin name is required.';
    if (!input.username) return 'Username or email is required.';
    if (input.username.includes('@') && !isValidEmail(input.username)) return 'Valid email is required.';
    if (!input.username.includes('@') && !isValidUsername(input.username)) {
        return 'Username must be 3-64 characters and use only letters, numbers, dots, underscores, or hyphens.';
    }
    if (input.email && !isValidEmail(input.email)) return 'Valid email is required.';
    if (!input.password || !input.confirmPassword) return 'Password and confirmation are required.';
    if (input.password !== input.confirmPassword) return 'Password and confirm password must match.';
    if (input.password.length < 6) return 'Password must be at least 6 characters.';
    if (!ADMIN_ACCESS_ROLES.has(input.role)) return 'Role must be admin or manager.';
    return '';
}

function toAdminUserPayload(user) {
    return {
        userId: String(user.id),
        name: user.name || user.fullname || '',
        username: user.username || '',
        email: user.email || '',
        role: user.role || 'manager'
    };
}

async function loginAdmin(request, env) {
    const body = await readJson(request);
    const username = normalizeLogin(body.username || body.email);
    const password = String(body.password || '');
    const settings = await ensureAdminSettings(env);

    if (!username || !password) return fail('Username and password are required.', 400);

    const settingsUsername = normalizeLogin(settings.username);
    const settingsEmail = normalizeLogin(settings.email);

    if (username === settingsUsername || (settingsEmail && username === settingsEmail)) {
        let passwordOk = false;
        if (settings.passwordHash) {
            passwordOk = await comparePassword(password, settings.passwordHash);
        } else if (env.ADMIN_PASSWORD) {
            // First-time bootstrap: compare with the secret set via `wrangler secret put ADMIN_PASSWORD`.
            // No hardcoded default — if ADMIN_PASSWORD is unset, login is impossible by design.
            passwordOk = safeEqual(password, env.ADMIN_PASSWORD);
        }

        if (!passwordOk) return fail('Invalid admin username or password.', 401);

        if (!settings.passwordHash) {
            await env.DB.prepare('UPDATE admin_settings SET passwordHash = ?, updatedAt = ? WHERE id = 1')
                .bind(await hashPassword(password), new Date().toISOString()).run();
        }

        const token = await createToken(env, {
            username: settings.username,
            email: settings.email || '',
            role: 'admin'
        });

        return json({
            token,
            user: {
                username: settings.username,
                email: settings.email || '',
                role: 'admin'
            }
        }, 200, { 'Set-Cookie': authCookie(request, token) });
    }

    const adminUser = await findAdminUserByLogin(env, username);

    if (!adminUser?.passwordHash) return fail('Invalid admin username or password.', 401);

    const passwordOk = await comparePassword(password, adminUser.passwordHash);
    if (!passwordOk) return fail('Invalid admin username or password.', 401);

    if (needsRehash(adminUser.passwordHash)) {
        try {
            const upgraded = await hashPassword(password);
            await env.DB.prepare('UPDATE users SET passwordHash = ?, updatedAt = ? WHERE id = ?')
                .bind(upgraded, new Date().toISOString(), adminUser.id).run();
            adminUser.passwordHash = upgraded;
        } catch (error) {
            console.error('[Worker] admin password rehash failed', error);
        }
    }

    const token = await createToken(env, toAdminUserPayload(adminUser));

    return json({
        token,
        user: toUserResponse(adminUser)
    }, 200, { 'Set-Cookie': authCookie(request, token) });
}

async function getAdminSession(request, env) {
    const { session, error } = await requireAdmin(request, env);
    if (error) return error;
    return json({
        id: session.userId || '',
        name: session.name || '',
        username: session.username,
        email: session.email || '',
        role: session.role
    });
}

async function getAdminProfile(request, env) {
    const { session, error } = await requireAdmin(request, env);
    if (error) return error;
    await ensureCoreSchema(env);

    if (session.userId) {
        const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(session.userId).first();
        if (!user || !ADMIN_ACCESS_ROLES.has(user.role)) return fail('Admin account not found.', 404);
        return json(toUserResponse(user));
    }

    const settings = await ensureAdminSettings(env);
    return json({ name: '', username: settings.username, email: settings.email || '', role: 'admin' });
}

async function updateAdminProfile(request, env) {
    const { session, error } = await requireAdmin(request, env);
    if (error) return error;
    await ensureCoreSchema(env);

    const body = await readJson(request);
    const username = String(body.username || '').trim().toLowerCase();
    const email = String(body.email || '').trim().toLowerCase();

    if (!username) return fail('Username is required.', 400);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Valid admin email is required.', 400);

    const updatedAt = new Date().toISOString();

    if (session.userId) {
        const duplicate = await findDuplicateAdminIdentity(env, username, email, session.userId);
        if (duplicate) return fail('Username or email already exists.', 409);

        await env.DB.prepare('UPDATE users SET username = ?, email = ?, updatedAt = ? WHERE id = ?')
            .bind(username, email || null, updatedAt, session.userId).run();

        const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(session.userId).first();
        const token = await createToken(env, toAdminUserPayload(user));
        return json({ user: toUserResponse(user), token });
    }

    const duplicate = await findDuplicateAdminIdentity(env, username, email, null, { ignoreAdminSettings: true });
    if (duplicate) return fail('Username or email already exists.', 409);

    await ensureAdminSettings(env);
    await env.DB.prepare('UPDATE admin_settings SET username = ?, email = ?, updatedAt = ? WHERE id = 1')
        .bind(username, email, updatedAt).run();

    const token = await createToken(env, { username, email, role: 'admin' });
    return json({ user: { username, email, role: 'admin' }, token });
}

async function changeAdminPassword(request, env) {
    const { session, error } = await requireAdmin(request, env);
    if (error) return error;
    await ensureCoreSchema(env);

    const body = await readJson(request);
    const currentPassword = String(body.currentPassword || '');
    const newPassword = String(body.newPassword || '');

    if (!currentPassword || !newPassword) return fail('Current and new password are required.', 400);
    if (newPassword.length < 6) return fail('New password must be at least 6 characters.', 400);

    if (session.userId) {
        const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(session.userId).first();
        if (!user || !ADMIN_ACCESS_ROLES.has(user.role)) return fail('Admin account not found.', 404);

        const passwordOk = user.passwordHash && await comparePassword(currentPassword, user.passwordHash);
        if (!passwordOk) return fail('Current password is incorrect.', 401);

        await env.DB.prepare('UPDATE users SET passwordHash = ?, updatedAt = ? WHERE id = ?')
            .bind(await hashPassword(newPassword), new Date().toISOString(), session.userId).run();

        return json({ message: 'Admin password changed.' });
    }

    const settings = await ensureAdminSettings(env);

    let passwordOk = false;
    if (settings.passwordHash) {
        passwordOk = await comparePassword(currentPassword, settings.passwordHash);
    } else if (env.ADMIN_PASSWORD) {
        passwordOk = safeEqual(currentPassword, env.ADMIN_PASSWORD);
    }

    if (!passwordOk) return fail('Current password is incorrect.', 401);

    const passwordHash = await hashPassword(newPassword);
    await env.DB.prepare('UPDATE admin_settings SET passwordHash = ?, updatedAt = ? WHERE id = 1')
        .bind(passwordHash, new Date().toISOString()).run();

    return json({ message: 'Admin password changed.' });
}

async function createAdminAccount(request, env) {
    const { error } = await requireAdminCreator(request, env);
    if (error) return error;
    await ensureCoreSchema(env);

    const input = cleanAdminAccountInput(await readJson(request));
    const validationError = validateAdminAccountInput(input);

    if (validationError) return fail(validationError, 400);

    const duplicate = await findDuplicateAdminIdentity(env, input.username, input.email);
    if (duplicate) return fail('Username or email already exists.', 409);

    const now = new Date().toISOString();
    const passwordHash = await hashPassword(input.password);
    const result = await env.DB.prepare(
        `INSERT INTO users
            (name, fullname, username, email, avatar, passwordHash, phone, address, role, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
        input.name,
        input.name,
        input.username,
        input.email || null,
        '',
        passwordHash,
        '',
        '',
        input.role,
        now,
        now
    ).run();

    const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(result.meta.last_row_id).first();

    return json({
        message: 'Admin account created.',
        user: toUserResponse(user)
    }, 201);
}

function isValidGoogleClientId(clientId) {
    return clientId.endsWith(GOOGLE_CLIENT_ID_SUFFIX) && !clientId.startsWith('GOCSPX-');
}

function getGoogleOAuthConfig(env) {
    const clientId = String(env.GOOGLE_CLIENT_ID || '').trim();
    const clientSecret = String(env.GOOGLE_CLIENT_SECRET || '').trim();
    const jwtSecret = String(env.JWT_SECRET || '').trim();
    let redirectUri = '';

    try {
        const redirectUrl = new URL(GOOGLE_REDIRECT_URI);
        if (
            redirectUrl.toString() !== GOOGLE_REDIRECT_URI
            || redirectUrl.protocol !== 'https:'
            || redirectUrl.pathname !== '/auth/google/callback'
        ) {
            console.error('[Google OAuth] Redirect URI is not configured correctly.');
            return null;
        }

        redirectUri = redirectUrl.toString();
    } catch (error) {
        console.error('[Google OAuth] Redirect URI is invalid.');
        return null;
    }

    if (!clientId || !clientSecret || !jwtSecret) {
        console.error('[Google OAuth] Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or JWT_SECRET.');
        return null;
    }

    if (!isValidGoogleClientId(clientId)) {
        console.error('[Google OAuth] GOOGLE_CLIENT_ID must be the OAuth client ID ending in .apps.googleusercontent.com.');
        return null;
    }

    return {
        clientId,
        clientSecret,
        redirectUri
    };
}

function usernameFromEmail(email) {
    return email.split('@')[0].replace(/[^a-z0-9_]/gi, '').toLowerCase() || `user${Date.now()}`;
}

async function createUserSessionToken(env, user, role = user.role || 'user') {
    return createToken(env, {
        userId: String(user.id),
        username: user.username || usernameFromEmail(user.email || ''),
        fullname: user.fullname || user.name || '',
        name: user.name || user.fullname || '',
        email: user.email || '',
        avatar: user.avatar || '',
        role
    });
}

async function exchangeGoogleCode(code, config) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json'
        },
        body: new URLSearchParams({
            code,
            client_id: config.clientId,
            client_secret: config.clientSecret,
            redirect_uri: config.redirectUri,
            grant_type: 'authorization_code'
        })
    });

    if (!response.ok) {
        console.error('[Google OAuth] Token exchange failed', response.status);
        return null;
    }

    return response.json();
}

async function fetchGoogleProfile(accessToken) {
    const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${accessToken}`
        }
    });

    if (!response.ok) {
        console.error('[Google OAuth] Profile request failed', response.status);
        return null;
    }

    return response.json();
}

async function findOrCreateGoogleUser(env, profile) {
    await ensureCoreSchema(env);

    const googleId = String(profile.sub || '').trim();
    const email = String(profile.email || '').trim().toLowerCase();
    const name = String(profile.name || profile.given_name || email.split('@')[0] || '').trim();
    const avatar = String(profile.picture || '').trim();

    if (!googleId || !email) return { error: fail('Google account did not provide a usable profile.', 400) };
    if (profile.email_verified === false) return { error: fail('Google email must be verified before login.', 403) };

    let user = await env.DB.prepare('SELECT * FROM users WHERE googleId = ?').bind(googleId).first();

    if (!user) {
        user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();

        if (user?.googleId && user.googleId !== googleId) {
            return { error: fail('This email is already linked to a different Google account.', 409) };
        }
    }

    const now = new Date().toISOString();

    if (user) {
        await env.DB.prepare(
            `UPDATE users
             SET googleId = COALESCE(NULLIF(googleId, ''), ?),
                 name = COALESCE(NULLIF(name, ''), ?),
                 fullname = COALESCE(NULLIF(fullname, ''), ?),
                 avatar = ?,
                 updatedAt = ?
             WHERE id = ?`
        ).bind(googleId, name, name, avatar, now, user.id).run();

        user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(user.id).first();
        return { user: { ...user, role: 'user' } };
    }

    const result = await env.DB.prepare(
        `INSERT INTO users
            (googleId, name, username, fullname, email, avatar, passwordHash, phone, address, role, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
        googleId,
        name,
        usernameFromEmail(email),
        name,
        email,
        avatar,
        '',
        '',
        '',
        'user',
        now,
        now
    ).run();

    user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(result.meta.last_row_id).first();
    return { user: { ...user, role: 'user' } };
}

async function startGoogleLogin(request, env) {
    const config = getGoogleOAuthConfig(env);
    if (!config) return fail('Google login is not configured.', 500);

    const state = randomId(24);
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', config.clientId);
    authUrl.searchParams.set('redirect_uri', config.redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('prompt', 'select_account');

    return redirect(authUrl.toString(), {
        'Set-Cookie': serializeCookie(request, GOOGLE_STATE_COOKIE_NAME, state, { maxAge: 10 * 60, sameSite: 'Lax' })
    });
}

async function handleGoogleCallback(request, env) {
    const config = getGoogleOAuthConfig(env);
    if (!config) return fail('Google login is not configured.', 500);

    const url = new URL(request.url);
    const error = url.searchParams.get('error');
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const expectedState = getCookie(request, GOOGLE_STATE_COOKIE_NAME);

    if (error) return fail('Google login was cancelled.', 400);
    if (!code || !state || !expectedState || !safeEqual(state, expectedState)) {
        return fail('Google login state is invalid or expired.', 400);
    }

    const tokenData = await exchangeGoogleCode(code, config);
    if (!tokenData?.access_token) return fail('Google login could not be completed.', 502);

    const profile = await fetchGoogleProfile(tokenData.access_token);
    if (!profile) return fail('Google profile could not be loaded.', 502);

    const { user, error: userError } = await findOrCreateGoogleUser(env, profile);
    if (userError) return userError;

    const token = await createUserSessionToken(env, user, 'user');

    return redirect('/account.html', {
        'Set-Cookie': [
            authCookie(request, token),
            clearCookie(request, GOOGLE_STATE_COOKIE_NAME)
        ]
    });
}

async function authMe(request, env) {
    const session = await verifyToken(request, env);
    if (!session) return json(null);

    await ensureCoreSchema(env);
    const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(session.userId).first();
    if (!user) return json(null);

    return json(toUserResponse({ ...user, role: 'user' }));
}

function logoutAuth(request) {
    return json({ message: 'Logged out.' }, 200, {
        'Set-Cookie': [
            clearCookie(request, AUTH_COOKIE_NAME),
            clearCookie(request, GOOGLE_STATE_COOKIE_NAME)
        ]
    });
}

async function registerUser(request, env) {
    await ensureCoreSchema(env);

    const body = await readJson(request);
    const fullname = String(body.fullname || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!fullname || !email || !password) return fail('Full name, email, and password are required.', 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Valid email is required.', 400);
    if (password.length < 6) return fail('Password must be at least 6 characters.', 400);

    const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
    if (existing) return fail('This email is already registered.', 409);

    const usernameBase = email.split('@')[0].replace(/[^a-z0-9_]/gi, '').toLowerCase() || 'user';
    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();
    const result = await env.DB.prepare(
        'INSERT INTO users (username, fullname, name, email, avatar, passwordHash, phone, address, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(usernameBase, fullname, fullname, email, '', passwordHash, '', '', 'user', now, now).run();

    return json({ message: 'Registration successful.', user: { id: String(result.meta.last_row_id), username: usernameBase, fullname, email, role: 'user' } }, 201);
}

async function loginUser(request, env) {
    await ensureCoreSchema(env);

    const body = await readJson(request);
    const email = String(body.email || body.username || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!email || !password) return fail('Email and password are required.', 400);

    const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
    if (!user || !await comparePassword(password, user.passwordHash)) {
        return fail('Invalid email or password.', 401);
    }

    // Transparently upgrade legacy hashes to PBKDF2.
    if (needsRehash(user.passwordHash)) {
        try {
            const upgraded = await hashPassword(password);
            await env.DB.prepare('UPDATE users SET passwordHash = ?, updatedAt = ? WHERE id = ?')
                .bind(upgraded, new Date().toISOString(), user.id).run();
        } catch (error) {
            console.error('[Worker] password rehash failed', error);
        }
    }

    const token = await createUserSessionToken(env, user, 'user');

    return json({ token, user: toUserResponse(user) }, 200, {
        'Set-Cookie': authCookie(request, token)
    });
}

async function currentUser(request, env) {
    const { session, error } = await requireAuth(request, env);
    if (error) return error;
    if (session.role === 'admin') return json({ username: session.username, email: session.email || '', role: 'admin' });

    await ensureCoreSchema(env);
    const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(session.userId).first();
    if (!user) return fail('User not found.', 404);

    return json(toUserResponse({ ...user, role: 'user' }));
}

async function updateCurrentUser(request, env) {
    const { session, error } = await requireAuth(request, env);
    if (error) return error;
    if (session.role === 'admin') return fail('Admin profile is managed in Admin Account.', 400);
    await ensureCoreSchema(env);

    const body = await readJson(request);
    const fullname = String(body.fullname || '').trim();
    const phone = String(body.phone || '').trim();
    const address = String(body.address || '').trim();

    if (!fullname) return fail('Full name is required.', 400);

    await env.DB.prepare('UPDATE users SET fullname = ?, name = ?, phone = ?, address = ?, updatedAt = ? WHERE id = ?')
        .bind(fullname, fullname, phone, address, new Date().toISOString(), session.userId).run();

    const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(session.userId).first();
    return json(toUserResponse(user));
}

async function changeUserPassword(request, env) {
    const { session, error } = await requireAuth(request, env);
    if (error) return error;
    if (session.role === 'admin') return fail('Use the admin password form.', 400);
    await ensureCoreSchema(env);

    const body = await readJson(request);
    const oldPassword = String(body.oldPassword || '');
    const newPassword = String(body.newPassword || '');

    if (!oldPassword || !newPassword) return fail('Old and new passwords are required.', 400);
    if (newPassword.length < 6) return fail('New password must be at least 6 characters.', 400);

    const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(session.userId).first();
    if (!user || !await comparePassword(oldPassword, user.passwordHash)) return fail('Old password is incorrect.', 401);

    await env.DB.prepare('UPDATE users SET passwordHash = ?, updatedAt = ? WHERE id = ?')
        .bind(await hashPassword(newPassword), new Date().toISOString(), session.userId).run();

    return json({ message: 'Password changed.' });
}

async function listProducts(request, env) {
    await ensureEcommerceSchema(env);
    let results;

    try {
        ({ results } = await env.DB.prepare(
            'SELECT * FROM products ORDER BY datetime(createdAt) DESC, id DESC'
        ).all());
    } catch (error) {
        if (!isMissingColumnError(error, 'colorVariants')) {
            if (!isMissingColumnError(error, 'colors')) throw error;

            ({ results } = await env.DB.prepare(
                'SELECT id, name, price, description, category, imageUrl, imageUrls, sizes, stock, createdAt FROM products ORDER BY datetime(createdAt) DESC, id DESC'
            ).all());
        } else {
            ({ results } = await env.DB.prepare(
                'SELECT id, name, price, description, category, imageUrl, imageUrls, colors, sizes, stock, createdAt FROM products ORDER BY datetime(createdAt) DESC, id DESC'
            ).all());
        }
    }

    const url = new URL(request.url);
    const searchTerm = String(url.searchParams.get('q') || '').trim().toLowerCase();
    const featuredOnly = url.searchParams.get('featured') === 'true';
    let products = await attachProductColorVariants(env, await attachProductImages(env, results || []));

    if (searchTerm) {
        products = products.filter(product => [
            product.name,
            product.description,
            product.category,
            product.sku,
            product.brand
        ].some(value => String(value || '').toLowerCase().includes(searchTerm)));
    }

    if (featuredOnly) {
        const featuredProducts = products.filter(product => product.featured === true || product.isFeatured === true || Number(product.featured) === 1);
        products = featuredProducts.length ? featuredProducts : products.slice(0, 4);
    }

    return json(products);
}

async function getProduct(env, id) {
    await ensureEcommerceSchema(env);
    let row;

    try {
        row = await env.DB.prepare(
            'SELECT * FROM products WHERE id = ?'
        ).bind(id).first();
    } catch (error) {
        if (!isMissingColumnError(error, 'colorVariants')) {
            if (!isMissingColumnError(error, 'colors')) throw error;

            row = await env.DB.prepare(
                'SELECT id, name, price, description, category, imageUrl, imageUrls, sizes, stock, createdAt FROM products WHERE id = ?'
            ).bind(id).first();
        } else {
            row = await env.DB.prepare(
                'SELECT id, name, price, description, category, imageUrl, imageUrls, colors, sizes, stock, createdAt FROM products WHERE id = ?'
            ).bind(id).first();
        }
    }

    if (!row) return fail('Product not found.', 404);
    const [product] = await attachProductColorVariants(env, await attachProductImages(env, [row]));
    return json(product);
}

async function createProduct(request, env) {
    const { error } = await requireAdmin(request, env);
    if (error) return error;

    await ensureEcommerceSchema(env);
    const product = cleanProductInput(await readJson(request));
    const validationMessage = validateProduct(product, true);
    if (validationMessage) return fail(validationMessage, 400);

    if (product.id !== null) {
        const existing = await env.DB.prepare('SELECT id FROM products WHERE id = ?').bind(product.id).first();
        if (existing) return fail('Product ID already exists.', 409);
    }

    const createdAt = new Date().toISOString();
    const imageUrls = JSON.stringify(product.images);
    const imageUrl = product.images[0] || '';
    const colors = JSON.stringify(product.colors);
    const colorVariants = JSON.stringify(product.colorVariants);
    const legacyColors = JSON.stringify(product.colorVariants.length ? product.colorVariants : product.colors);
    const sizes = JSON.stringify(product.sizes);
    const productValues = [
        product.name,
        Math.round(product.price),
        product.salePrice === null ? null : Math.round(product.salePrice),
        Math.round(product.discountPercent || 0),
        product.description,
        product.category,
        product.subCategory,
        imageUrl,
        imageUrls,
        colors,
        colorVariants,
        sizes,
        Math.round(product.stock),
        product.stockStatus,
        product.sku,
        product.width,
        product.height,
        product.depth,
        product.material,
        product.weight,
        product.brand,
        product.deliveryAvailable ? 1 : 0,
        product.assemblyRequired ? 1 : 0,
        product.warrantyNote,
        product.deliveryNote,
        createdAt
    ];
    const query = product.id === null
        ? 'INSERT INTO products (name, price, salePrice, discountPercent, description, category, subCategory, imageUrl, imageUrls, colors, colorVariants, sizes, stock, stockStatus, sku, width, height, depth, material, weight, brand, deliveryAvailable, assemblyRequired, warrantyNote, deliveryNote, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        : 'INSERT INTO products (id, name, price, salePrice, discountPercent, description, category, subCategory, imageUrl, imageUrls, colors, colorVariants, sizes, stock, stockStatus, sku, width, height, depth, material, weight, brand, deliveryAvailable, assemblyRequired, warrantyNote, deliveryNote, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    const statement = env.DB.prepare(query);
    let result;

    try {
        result = product.id === null
            ? await statement.bind(...productValues).run()
            : await statement.bind(product.id, ...productValues).run();
    } catch (error) {
        if (!isMissingColumnError(error, 'colorVariants') && !isMissingColumnError(error, 'colors')) throw error;

        const fallbackQuery = product.id === null
            ? 'INSERT INTO products (name, price, description, category, imageUrl, imageUrls, colors, sizes, stock, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            : 'INSERT INTO products (id, name, price, description, category, imageUrl, imageUrls, colors, sizes, stock, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        const fallbackStatement = env.DB.prepare(fallbackQuery);
        try {
            result = product.id === null
                ? await fallbackStatement.bind(product.name, Math.round(product.price), product.description, product.category, imageUrl, imageUrls, legacyColors, sizes, Math.round(product.stock), createdAt).run()
                : await fallbackStatement.bind(product.id, product.name, Math.round(product.price), product.description, product.category, imageUrl, imageUrls, legacyColors, sizes, Math.round(product.stock), createdAt).run();
        } catch (fallbackError) {
            if (!isMissingColumnError(fallbackError, 'colors')) throw fallbackError;

            const legacyQuery = product.id === null
                ? 'INSERT INTO products (name, price, description, category, imageUrl, imageUrls, sizes, stock, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
                : 'INSERT INTO products (id, name, price, description, category, imageUrl, imageUrls, sizes, stock, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
            const legacyStatement = env.DB.prepare(legacyQuery);
            result = product.id === null
                ? await legacyStatement.bind(product.name, Math.round(product.price), product.description, product.category, imageUrl, imageUrls, sizes, Math.round(product.stock), createdAt).run()
                : await legacyStatement.bind(product.id, product.name, Math.round(product.price), product.description, product.category, imageUrl, imageUrls, sizes, Math.round(product.stock), createdAt).run();
        }
    }
    const productId = product.id || result.meta.last_row_id;

    await syncProductImages(env, productId, product.images);
    await syncProductColorVariants(env, productId, product.colorVariants);
    return getProduct(env, productId);
}

async function updateProduct(request, env, id) {
    const { error } = await requireAdmin(request, env);
    if (error) return error;

    await ensureEcommerceSchema(env);
    const body = await readJson(request);
    const product = cleanProductInput(body);
    const shouldSyncColorVariants = Object.prototype.hasOwnProperty.call(body, 'colorVariants')
        || Object.prototype.hasOwnProperty.call(body, 'colors');
    const validationMessage = validateProduct(product);
    if (validationMessage) return fail(validationMessage, 400);

    let result;

    try {
        result = await env.DB.prepare(
            'UPDATE products SET name = ?, price = ?, salePrice = ?, discountPercent = ?, description = ?, category = ?, subCategory = ?, imageUrl = ?, imageUrls = ?, colors = ?, colorVariants = ?, sizes = ?, stock = ?, stockStatus = ?, sku = ?, width = ?, height = ?, depth = ?, material = ?, weight = ?, brand = ?, deliveryAvailable = ?, assemblyRequired = ?, warrantyNote = ?, deliveryNote = ? WHERE id = ?'
        ).bind(
            product.name,
            Math.round(product.price),
            product.salePrice === null ? null : Math.round(product.salePrice),
            Math.round(product.discountPercent || 0),
            product.description,
            product.category,
            product.subCategory,
            product.images[0] || '',
            JSON.stringify(product.images),
            JSON.stringify(product.colors),
            JSON.stringify(product.colorVariants),
            JSON.stringify(product.sizes),
            Math.round(product.stock),
            product.stockStatus,
            product.sku,
            product.width,
            product.height,
            product.depth,
            product.material,
            product.weight,
            product.brand,
            product.deliveryAvailable ? 1 : 0,
            product.assemblyRequired ? 1 : 0,
            product.warrantyNote,
            product.deliveryNote,
            id
        ).run();
    } catch (error) {
        if (!isMissingColumnError(error, 'colorVariants') && !isMissingColumnError(error, 'colors')) throw error;

        try {
            result = await env.DB.prepare(
                'UPDATE products SET name = ?, price = ?, description = ?, category = ?, imageUrl = ?, imageUrls = ?, colors = ?, sizes = ?, stock = ? WHERE id = ?'
            ).bind(
                product.name,
                Math.round(product.price),
                product.description,
                product.category,
                product.images[0] || '',
                JSON.stringify(product.images),
                JSON.stringify(product.colorVariants.length ? product.colorVariants : product.colors),
                JSON.stringify(product.sizes),
                Math.round(product.stock),
                id
            ).run();
        } catch (fallbackError) {
            if (!isMissingColumnError(fallbackError, 'colors')) throw fallbackError;

            result = await env.DB.prepare(
                'UPDATE products SET name = ?, price = ?, description = ?, category = ?, imageUrl = ?, imageUrls = ?, sizes = ?, stock = ? WHERE id = ?'
            ).bind(
                product.name,
                Math.round(product.price),
                product.description,
                product.category,
                product.images[0] || '',
                JSON.stringify(product.images),
                JSON.stringify(product.sizes),
                Math.round(product.stock),
                id
            ).run();
        }
    }

    if (!result.meta.changes) return fail('Product not found.', 404);

    await syncProductImages(env, id, product.images);
    if (shouldSyncColorVariants) {
        await syncProductColorVariants(env, id, product.colorVariants);
    }
    return getProduct(env, id);
}

async function deleteProduct(env, id) {
    await ensureProductColorVariantsTable(env);
    await env.DB.prepare('DELETE FROM product_color_variants WHERE product_id = ?').bind(id).run();

    await env.DB.prepare('DELETE FROM product_images WHERE productId = ?').bind(id).run();
    const result = await env.DB.prepare('DELETE FROM products WHERE id = ?').bind(id).run();

    if (!result.meta.changes) return fail('Product not found.', 404);
    return json({ message: 'Product deleted.' });
}

async function listCategories(env) {
    const categoryRows = await env.DB.prepare('SELECT id, name, createdAt FROM categories ORDER BY name').all();
    const productRows = await env.DB.prepare(
        "SELECT COALESCE(NULLIF(TRIM(category), ''), 'Uncategorized') AS name, MIN(createdAt) AS createdAt FROM products GROUP BY name ORDER BY name"
    ).all();
    const categoryMap = new Map();

    [{ id: 'Uncategorized', name: 'Uncategorized', createdAt: '' }, ...(categoryRows.results || []), ...(productRows.results || [])].forEach((row) => {
        const name = row.name || 'Uncategorized';
        categoryMap.set(name, { id: row.id ? String(row.id) : name, name, createdAt: row.createdAt || '' });
    });

    return json([...categoryMap.values()].sort((a, b) => a.name.localeCompare(b.name)));
}

async function createCategory(request, env) {
    const { error } = await requireAdmin(request, env);
    if (error) return error;

    const body = await readJson(request);
    const name = String(body.name || '').trim();
    if (!name) return fail('Category name is required.', 400);

    const existing = await env.DB.prepare('SELECT id FROM categories WHERE lower(name) = lower(?)').bind(name).first();
    if (existing) return fail('Category already exists.', 409);

    const now = new Date().toISOString();
    await env.DB.prepare('INSERT INTO categories (name, createdAt, updatedAt) VALUES (?, ?, ?)').bind(name, now, now).run();
    return listCategories(env);
}

async function updateCategory(request, env, id) {
    const { error } = await requireAdmin(request, env);
    if (error) return error;

    const body = await readJson(request);
    const name = String(body.name || '').trim();
    if (!name) return fail('Category name is required.', 400);

    const old = await env.DB.prepare('SELECT * FROM categories WHERE id = ? OR name = ?').bind(id, id).first();
    if (!old) return fail('Category not found.', 404);

    const duplicate = await env.DB.prepare('SELECT id FROM categories WHERE lower(name) = lower(?) AND id <> ?')
        .bind(name, old.id).first();
    if (duplicate) return fail('Category already exists.', 409);

    await env.DB.prepare('UPDATE categories SET name = ?, updatedAt = ? WHERE id = ?').bind(name, new Date().toISOString(), old.id).run();
    await env.DB.prepare('UPDATE products SET category = ? WHERE category = ?').bind(name, old.name).run();
    return listCategories(env);
}

async function deleteCategory(request, env, id) {
    const { error } = await requireAdmin(request, env);
    if (error) return error;

    const url = new URL(request.url);
    const row = await env.DB.prepare('SELECT * FROM categories WHERE id = ? OR name = ?').bind(id, id).first();
    const name = row?.name || id;
    const productCount = await env.DB.prepare('SELECT COUNT(*) AS count FROM products WHERE category = ?').bind(name).first();

    if (Number(productCount?.count || 0) > 0 && url.searchParams.get('reassign') !== 'uncategorized') {
        return fail('Category has products. Reassign to Uncategorized first.', 409, { requiresReassign: true });
    }

    if (Number(productCount?.count || 0) > 0) {
        await env.DB.prepare("UPDATE products SET category = 'Uncategorized' WHERE category = ?").bind(name).run();
    }

    if (row) await env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(row.id).run();
    return json({ message: 'Category deleted.' });
}

async function getPaymentSettings(env) {
    await ensureEcommerceSchema(env);
    let settings = await env.DB.prepare('SELECT * FROM payment_settings WHERE id = 1').first();

    if (!settings) {
        await env.DB.prepare(
            'INSERT INTO payment_settings (id, bankName, accountNumber, accountHolder, facebookChatUrl, updatedAt) VALUES (1, ?, ?, ?, ?, ?)'
        ).bind(DEFAULT_PAYMENT_SETTINGS.bankName, DEFAULT_PAYMENT_SETTINGS.accountNumber, DEFAULT_PAYMENT_SETTINGS.accountHolder, DEFAULT_PAYMENT_SETTINGS.facebookChatUrl, new Date().toISOString()).run();
        settings = await env.DB.prepare('SELECT * FROM payment_settings WHERE id = 1').first();
    }

    return {
        bankName: settings.bankName || '',
        accountNumber: settings.accountNumber || '',
        bankAccount: settings.accountNumber || '',
        accountHolder: settings.accountHolder || '',
        bankAccountHolder: settings.accountHolder || '',
        facebookChatUrl: settings.facebookChatUrl || settings.messengerUrl || '',
        messengerUrl: settings.messengerUrl || settings.facebookChatUrl || '',
        deliveryFee: Number(settings.deliveryFee) || 0,
        contactPhone: settings.contactPhone || '',
        contactEmail: settings.contactEmail || '',
        storeAddress: settings.storeAddress || '',
        workingHours: settings.workingHours || '',
        facebookPageUrl: settings.facebookPageUrl || '',
        warrantyNote: settings.warrantyNote || '',
        returnPolicy: settings.returnPolicy || '',
        qpayInfo: settings.qpayInfo || '',
        estimatedDeliveryTime: settings.estimatedDeliveryTime || ''
    };
}

async function updatePaymentSettings(request, env) {
    const { error } = await requireAdmin(request, env);
    if (error) return error;

    const body = await readJson(request);
    const settings = {
        bankName: String(body.bankName || '').trim(),
        accountNumber: String(body.accountNumber || body.bankAccount || '').trim(),
        accountHolder: String(body.accountHolder || body.bankAccountHolder || '').trim(),
        facebookChatUrl: String(body.facebookChatUrl || body.messengerUrl || '').trim(),
        messengerUrl: String(body.messengerUrl || body.facebookChatUrl || '').trim(),
        deliveryFee: Math.max(0, Math.round(Number(body.deliveryFee) || 0)),
        contactPhone: String(body.contactPhone || '').trim(),
        contactEmail: String(body.contactEmail || '').trim(),
        storeAddress: String(body.storeAddress || '').trim(),
        workingHours: String(body.workingHours || '').trim(),
        facebookPageUrl: String(body.facebookPageUrl || '').trim(),
        warrantyNote: String(body.warrantyNote || '').trim(),
        returnPolicy: String(body.returnPolicy || '').trim(),
        qpayInfo: String(body.qpayInfo || '').trim(),
        estimatedDeliveryTime: String(body.estimatedDeliveryTime || '').trim()
    };

    await getPaymentSettings(env);
    await env.DB.prepare(
        `UPDATE payment_settings
         SET bankName = ?, accountNumber = ?, accountHolder = ?, facebookChatUrl = ?, messengerUrl = ?,
             deliveryFee = ?, contactPhone = ?, contactEmail = ?, storeAddress = ?, workingHours = ?,
             facebookPageUrl = ?, warrantyNote = ?, returnPolicy = ?, qpayInfo = ?, estimatedDeliveryTime = ?,
             updatedAt = ?
         WHERE id = 1`
    ).bind(
        settings.bankName,
        settings.accountNumber,
        settings.accountHolder,
        settings.facebookChatUrl,
        settings.messengerUrl,
        settings.deliveryFee,
        settings.contactPhone,
        settings.contactEmail,
        settings.storeAddress,
        settings.workingHours,
        settings.facebookPageUrl,
        settings.warrantyNote,
        settings.returnPolicy,
        settings.qpayInfo,
        settings.estimatedDeliveryTime,
        new Date().toISOString()
    ).run();

    return json(settings);
}

function dateCode(date = new Date()) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

function generateOrderCode() {
    const suffix = String(Math.floor(100000 + Math.random() * 900000));
    return `UNA-${new Date().getUTCFullYear()}-${suffix}`;
}

async function insertOrderWithUniqueCode(env, orderValues) {
    for (let attempt = 0; attempt < 10; attempt += 1) {
        const orderCode = generateOrderCode();
        const existing = await env.DB.prepare('SELECT id FROM orders WHERE orderCode = ?').bind(orderCode).first();
        if (existing) continue;

        try {
            const result = await env.DB.prepare(
                `INSERT INTO orders
                    (orderCode, userId, items, totalAmount, paymentMethod, transactionCode, status,
                     customerName, email, phone, address, deliveryInfo, paymentStatus, orderStatus, channel, transactionNote,
                     createdAt, updatedAt)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(
                orderCode,
                orderValues.userId,
                orderValues.items,
                orderValues.totalAmount,
                orderValues.paymentMethod,
                orderCode,
                orderValues.status,
                orderValues.customerName,
                orderValues.email,
                orderValues.phone,
                orderValues.address,
                orderValues.deliveryInfo,
                orderValues.paymentStatus,
                orderValues.orderStatus,
                orderValues.channel || orderValues.paymentMethod || '',
                orderValues.transactionNote || orderCode,
                orderValues.createdAt,
                orderValues.updatedAt
            ).run();

            return { result, orderCode };
        } catch (error) {
            if (!String(error?.message || '').toLowerCase().includes('unique')) throw error;
        }
    }

    throw new Error('Unable to generate a unique order code.');
}

async function createOrder(request, env) {
    const { session, error } = await requireAuth(request, env);
    if (error) return error;
    if (session.role !== 'user') return fail('Use a customer account to place orders.', 400);

    await ensureEcommerceSchema(env);
    const body = await readJson(request);
    const items = Array.isArray(body.items) ? body.items : [];
    const paymentMethod = String(body.paymentMethod || 'bank_transfer');
    const transactionNote = String(body.transactionNote || body.bankReference || body.referenceCode || body.transferReference || '').trim();
    const channel = String(body.channel || (paymentMethod === 'facebook_chat' ? 'facebook' : paymentMethod)).trim();
    const allowedPaymentMethods = new Set(['bank_transfer', 'facebook_chat', 'cash_on_delivery', 'qpay']);
    const deliveryInfo = {
        fullname: String(body.deliveryInfo?.fullname || body.customer?.fullname || body.customerName || session.fullname || '').trim(),
        phone: String(body.deliveryInfo?.phone || body.customer?.phone || '').trim(),
        email: String(body.deliveryInfo?.email || body.customer?.email || session.email || '').trim(),
        address: String(body.deliveryInfo?.address || body.customer?.address || '').trim(),
        note: String(body.deliveryInfo?.note || body.note || '').trim()
    };

    if (!items.length) return fail('Order items are required.', 400);
    if (!allowedPaymentMethods.has(paymentMethod)) return fail('Invalid payment method.', 400);
    if (!deliveryInfo.fullname || !deliveryInfo.phone || !deliveryInfo.address) return fail('Delivery name, phone, and address are required.', 400);

    const cleanItems = [];
    for (const item of items) {
        const productId = Number(item.productId || item.id);
        const quantity = Number(item.quantity);
        if (!productId) return fail('Every order item must include a product ID.', 400);
        if (!Number.isInteger(productId) || productId <= 0) return fail('Every product ID must be a positive integer.', 400);
        if (!Number.isInteger(quantity) || quantity <= 0) return fail('Every order quantity must be a positive integer.', 400);

        let product;

        try {
            product = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(productId).first();
        } catch (error) {
            if (!isMissingColumnError(error, 'colorVariants')) {
                if (!isMissingColumnError(error, 'colors')) throw error;

                product = await env.DB.prepare('SELECT id, name, price, category, imageUrl, imageUrls, stock FROM products WHERE id = ?').bind(productId).first();
            } else {
                product = await env.DB.prepare('SELECT id, name, price, category, imageUrl, imageUrls, colors, stock FROM products WHERE id = ?').bind(productId).first();
            }
        }

        if (!product) return fail(`Product ${productId} is no longer available.`, 409);
        if (product.stockStatus === 'out_of_stock') return fail(`${product.name} is out of stock.`, 409);
        if (Number(product.stock) > 0 && quantity > Number(product.stock)) return fail(`Not enough stock for ${product.name}.`, 409);

        const [productResponse] = await attachProductColorVariants(env, await attachProductImages(env, [product]));
        const selectedColor = String(item.selectedColorName || item.selectedColor || item.color || '').trim();
        const selectedColorValue = String(item.selectedColorValue || item.colorValue || item.color_value || '').trim();
        const selectedColorImage = String(item.selectedColorImage || item.colorImage || '').trim();
        const selectedVariant = productResponse.colorVariants.find((variant) => {
            const variantName = String(variant.name || '').trim();
            const variantColorValue = String(variant.colorValue || variant.color || '').trim();

            return (selectedColor && (variantName === selectedColor || variantColorValue === selectedColor))
                || (selectedColorValue && variantColorValue === selectedColorValue);
        });

        if (productResponse.colorVariants.length && !selectedColor && !selectedColorValue) return fail(`Please choose a color for ${product.name}.`, 400);
        if ((selectedColor || selectedColorValue) && productResponse.colorVariants.length && !selectedVariant) return fail(`Selected color is not available for ${product.name}.`, 400);
        if (selectedVariant?.stock !== null && selectedVariant?.stock !== undefined && quantity > Number(selectedVariant.stock)) {
            return fail(`${selectedVariant.name || product.name} color is out of stock.`, 409);
        }

        const productImages = productResponse.images;
        // SECURITY: unit price is derived strictly from server-side product/variant
        // records — frontend `item.price`/`item.totalAmount` are never trusted.
        // Treat 0 as "no sale price" so `salePrice = 0` doesn't accidentally mean free.
        const variantSale = Number(selectedVariant?.salePrice) > 0 ? Number(selectedVariant.salePrice) : 0;
        const variantBase = Number(selectedVariant?.price) > 0 ? Number(selectedVariant.price) : 0;
        const productSale = Number(productResponse.salePrice) > 0 ? Number(productResponse.salePrice) : 0;
        const productBase = Number(product.price) > 0 ? Number(product.price) : 0;
        const unitPrice = variantSale || variantBase || productSale || productBase || 0;
        if (unitPrice <= 0) return fail(`Price for ${product.name} is unavailable.`, 409);

        // Stock decrement target: prefer the variant row when its stock is tracked,
        // otherwise fall back to the parent products.stock when that one is tracked
        // (>0). A stock value of 0 on `products` means "not tracked" by convention.
        const variantStockTracked = selectedVariant && selectedVariant.stock !== null
            && selectedVariant.stock !== undefined && Number.isFinite(Number(selectedVariant.stock));
        const productStockTracked = Number(product.stock) > 0;

        cleanItems.push({
            productId: String(product.id),
            productCode: selectedVariant?.sku || productResponse.sku || '',
            name: product.name,
            price: unitPrice,
            quantity,
            image: selectedVariant?.image || selectedColorImage || productImages[0] || String(item.image || '').trim(),
            selectedColor: selectedVariant?.name || selectedColor,
            selectedColorValue: selectedVariant?.colorValue || selectedVariant?.color || selectedColorValue,
            selectedColorImage: selectedVariant?.image || selectedColorImage,
            sku: selectedVariant?.sku || productResponse.sku || '',
            // Internal-only fields used below for the atomic stock decrement step.
            _stockTarget: variantStockTracked
                ? { kind: 'variant', id: Number(selectedVariant.id) }
                : (productStockTracked ? { kind: 'product', id: Number(product.id) } : null)
        });
    }

    // ATOMIC STOCK DECREMENT — guards against overselling under concurrent checkouts.
    // Each conditional UPDATE only succeeds if the row still has enough stock; if any
    // statement reports 0 changes we restore the rows that did succeed before bailing.
    const applied = [];
    for (const item of cleanItems) {
        if (!item._stockTarget) continue;
        const sql = item._stockTarget.kind === 'variant'
            ? 'UPDATE product_color_variants SET stock = stock - ? WHERE id = ? AND stock >= ?'
            : 'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?';
        try {
            const res = await env.DB.prepare(sql).bind(item.quantity, item._stockTarget.id, item.quantity).run();
            if (!res.meta || Number(res.meta.changes) === 0) {
                // Compensate any prior successful decrements before failing.
                for (const prev of applied) {
                    const restore = prev.kind === 'variant'
                        ? 'UPDATE product_color_variants SET stock = stock + ? WHERE id = ?'
                        : 'UPDATE products SET stock = stock + ? WHERE id = ?';
                    try {
                        await env.DB.prepare(restore).bind(prev.qty, prev.id).run();
                    } catch (restoreError) {
                        console.error('[Worker] stock restore failed', restoreError);
                    }
                }
                return fail(`Not enough stock for ${item.name}.`, 409);
            }
            applied.push({ kind: item._stockTarget.kind, id: item._stockTarget.id, qty: item.quantity });
        } catch (error) {
            // On unexpected failure, also restore previously decremented rows.
            for (const prev of applied) {
                const restore = prev.kind === 'variant'
                    ? 'UPDATE product_color_variants SET stock = stock + ? WHERE id = ?'
                    : 'UPDATE products SET stock = stock + ? WHERE id = ?';
                try { await env.DB.prepare(restore).bind(prev.qty, prev.id).run(); } catch (_) { /* ignore */ }
            }
            throw error;
        }
    }

    // Strip internal-only fields before persisting `items` JSON.
    cleanItems.forEach((item) => { delete item._stockTarget; });

    const totalAmount = cleanItems.reduce((sum, item) => sum + (Number(item.price) || 0) * item.quantity, 0);
    const createdAt = new Date().toISOString();

    const { result } = await insertOrderWithUniqueCode(env, {
        userId: session.userId,
        items: JSON.stringify(cleanItems),
        totalAmount,
        paymentMethod,
        customerName: deliveryInfo.fullname,
        email: deliveryInfo.email,
        phone: deliveryInfo.phone,
        address: deliveryInfo.address,
        deliveryInfo: JSON.stringify(deliveryInfo),
        paymentStatus: 'unpaid',
        orderStatus: 'pending',
        channel,
        transactionNote,
        status: 'pending',
        createdAt,
        updatedAt: createdAt
    });

    for (const item of cleanItems) {
        try {
            await env.DB.prepare(
                'INSERT INTO order_items (orderId, productId, productCode, productName, productPrice, quantity, imageUrl, selectedColor, selectedColorValue, selectedColorImage, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            ).bind(
                result.meta.last_row_id,
                Number(item.productId),
                item.productCode,
                item.name,
                Math.round(item.price),
                item.quantity,
                item.image,
                item.selectedColor,
                item.selectedColorValue,
                item.selectedColorImage,
                createdAt
            ).run();
        } catch (error) {
            if (!isMissingColumnError(error, 'selectedColorValue') && !isMissingColumnError(error, 'selectedColorImage')) {
                if (!isMissingColumnError(error, 'selectedColor')) throw error;

                await env.DB.prepare(
                    'INSERT INTO order_items (orderId, productId, productCode, productName, productPrice, quantity, imageUrl, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
                ).bind(
                    result.meta.last_row_id,
                    Number(item.productId),
                    item.productCode,
                    item.name,
                    Math.round(item.price),
                    item.quantity,
                    item.image,
                    createdAt
                ).run();
            } else {
                await env.DB.prepare(
                    'INSERT INTO order_items (orderId, productId, productCode, productName, productPrice, quantity, imageUrl, selectedColor, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
                ).bind(
                    result.meta.last_row_id,
                    Number(item.productId),
                    item.productCode,
                    item.name,
                    Math.round(item.price),
                    item.quantity,
                    item.image,
                    item.selectedColor,
                    createdAt
                ).run();
            }
        }
    }

    const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(result.meta.last_row_id).first();
    return json(toOrderResponse(order), 201);
}

async function listMyOrders(request, env) {
    const { session, error } = await requireAuth(request, env);
    if (error) return error;
    if (session.role === 'admin') return json([]);
    await ensureEcommerceSchema(env);

    const { results } = await env.DB.prepare('SELECT * FROM orders WHERE userId = ? ORDER BY datetime(createdAt) DESC, id DESC')
        .bind(session.userId).all();
    return json((results || []).map(toOrderResponse));
}

async function listAdminOrders(request, env) {
    const { error } = await requireAdmin(request, env);
    if (error) return error;
    await ensureEcommerceSchema(env);

    const { results } = await env.DB.prepare(
        `SELECT orders.*, users.username, users.fullname,
                COALESCE(NULLIF(orders.email, ''), users.email) AS email,
                COALESCE(NULLIF(orders.phone, ''), users.phone) AS phone,
                COALESCE(NULLIF(orders.address, ''), users.address) AS address
         FROM orders
         LEFT JOIN users ON users.id = orders.userId
         ORDER BY datetime(orders.createdAt) DESC, orders.id DESC`
    ).all();
    return json((results || []).map(toOrderResponse));
}

async function getAdminOrder(request, env, id) {
    const { error } = await requireAdmin(request, env);
    if (error) return error;
    await ensureEcommerceSchema(env);

    const row = await env.DB.prepare(
        `SELECT orders.*, users.username, users.fullname,
                COALESCE(NULLIF(orders.email, ''), users.email) AS email,
                COALESCE(NULLIF(orders.phone, ''), users.phone) AS phone,
                COALESCE(NULLIF(orders.address, ''), users.address) AS address
         FROM orders
         LEFT JOIN users ON users.id = orders.userId
         WHERE orders.id = ?`
    ).bind(id).first();

    if (!row) return fail('Order not found.', 404);
    return json(toOrderResponse(row));
}

async function updateAdminOrderStatus(request, env, id) {
    const { error } = await requireAdmin(request, env);
    if (error) return error;

    const body = await readJson(request);
    await ensureEcommerceSchema(env);
    const status = String(body.orderStatus || body.status || '').trim();
    const paymentStatus = String(body.paymentStatus || '').trim();
    const allowed = new Set(['pending', 'paid', 'complete', 'confirmed', 'delivered', 'cancelled']);
    const paymentAllowed = new Set(['', 'unpaid', 'paid', 'failed', 'refunded']);
    if (!allowed.has(status)) return fail('Invalid order status.', 400);
    if (!paymentAllowed.has(paymentStatus)) return fail('Invalid payment status.', 400);

    const nextPaymentStatus = paymentStatus || (status === 'paid' || status === 'complete' ? 'paid' : '');
    const result = await env.DB.prepare(
        `UPDATE orders
         SET status = ?, orderStatus = ?, paymentStatus = COALESCE(NULLIF(?, ''), paymentStatus), updatedAt = ?
         WHERE id = ?`
    ).bind(status, status, nextPaymentStatus, new Date().toISOString(), id).run();
    if (!result.meta.changes) return fail('Order not found.', 404);

    return getAdminOrder(request, env, id);
}

async function createContactMessage(request, env) {
    await ensureEcommerceSchema(env);
    const body = await readJson(request);
    const name = String(body.name || body.fullname || '').trim();
    const email = String(body.email || '').trim();
    const phone = String(body.phone || '').trim();
    const message = String(body.message || '').trim();

    if (!name || !email || !message) return fail('Name, email, and message are required.', 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Valid email is required.', 400);

    const createdAt = new Date().toISOString();
    const result = await env.DB.prepare(
        'INSERT INTO contact_messages (name, email, phone, message, status, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(name, email, phone, message, 'new', createdAt).run();

    return json({
        id: String(result.meta.last_row_id),
        name,
        email,
        phone,
        message,
        status: 'new',
        createdAt
    }, 201);
}

async function listAdminContactMessages(request, env) {
    const { error } = await requireAdmin(request, env);
    if (error) return error;
    await ensureEcommerceSchema(env);

    const { results } = await env.DB.prepare('SELECT * FROM contact_messages ORDER BY datetime(createdAt) DESC, id DESC').all();
    return json((results || []).map((row) => ({
        id: String(row.id),
        name: row.name || '',
        email: row.email || '',
        phone: row.phone || '',
        message: row.message || '',
        status: row.status || 'new',
        createdAt: row.createdAt || ''
    })));
}

async function listAdminUsers(request, env) {
    const { error } = await requireAdmin(request, env);
    if (error) return error;
    await ensureCoreSchema(env);

    const { results } = await env.DB.prepare('SELECT * FROM users ORDER BY datetime(createdAt) DESC, id DESC').all();
    return json((results || []).map(toUserResponse));
}

async function uploadAdminAsset(request, env) {
    const { error } = await requireAdmin(request, env);
    if (error) return error;

    const bucket = env.R2_BUCKET || env.UPLOAD_BUCKET || env.ASSETS_BUCKET;
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
        const body = await readJson(request);
        const filename = String(body.filename || 'product-image').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '') || 'product-image';
        const key = `products/${Date.now()}-${randomId(6)}-${filename}`;
        const expiresAt = Math.floor(Date.now() / 1000) + 10 * 60;
        const signature = await hmac(`${key}.${expiresAt}`, getJwtSecret(env));
        const url = new URL(request.url);
        url.pathname = '/api/upload/direct';
        url.search = new URLSearchParams({ key, exp: String(expiresAt), sig: signature }).toString();
        const baseUrl = String(env.R2_PUBLIC_URL || env.UPLOAD_PUBLIC_URL || '').replace(/\/+$/, '');

        return json({
            uploadUrl: url.toString(),
            publicUrl: baseUrl ? `${baseUrl}/${key}` : `/uploads/${key}`
        });
    }

    if (!bucket?.put) return fail('R2 upload bucket is not configured.', 501);

    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || typeof file === 'string') return fail('Image file is required.', 400);
    if (!String(file.type || '').startsWith('image/')) return fail('Only image uploads are allowed.', 400);
    if (Number(file.size || 0) > 8 * 1024 * 1024) return fail('Image must be smaller than 8MB.', 400);

    const rawName = String(file.name || 'product-image').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '') || 'product-image';
    const key = `products/${Date.now()}-${randomId(6)}-${rawName}`;
    await bucket.put(key, file.stream(), {
        httpMetadata: { contentType: file.type || 'application/octet-stream' }
    });

    const baseUrl = String(env.R2_PUBLIC_URL || env.UPLOAD_PUBLIC_URL || '').replace(/\/+$/, '');
    return json({
        key,
        publicUrl: baseUrl ? `${baseUrl}/${key}` : `/uploads/${key}`
    }, 201);
}

async function uploadDirectAsset(request, env) {
    const bucket = env.R2_BUCKET || env.UPLOAD_BUCKET || env.ASSETS_BUCKET;
    if (!bucket?.put) return fail('R2 upload bucket is not configured.', 501);
    if (request.method !== 'PUT') return fail('Upload method must be PUT.', 405);

    const url = new URL(request.url);
    const key = String(url.searchParams.get('key') || '').trim();
    const exp = Number(url.searchParams.get('exp') || 0);
    const sig = String(url.searchParams.get('sig') || '').trim();
    if (!key || !exp || !sig || exp < Math.floor(Date.now() / 1000)) return fail('Upload URL is invalid or expired.', 403);

    const expectedSig = await hmac(`${key}.${exp}`, getJwtSecret(env));
    if (!safeEqual(sig, expectedSig)) return fail('Upload signature is invalid.', 403);

    await bucket.put(key, request.body, {
        httpMetadata: { contentType: request.headers.get('content-type') || 'application/octet-stream' }
    });

    const baseUrl = String(env.R2_PUBLIC_URL || env.UPLOAD_PUBLIC_URL || '').replace(/\/+$/, '');
    return json({
        key,
        publicUrl: baseUrl ? `${baseUrl}/${key}` : `/uploads/${key}`
    }, 201);
}

async function getAnalyticsSummary(request, env) {
    const { error } = await requireAdmin(request, env);
    if (error) return error;
    await ensureEcommerceSchema(env);

    const { results } = await env.DB.prepare(
        `SELECT substr(createdAt, 1, 10) AS day,
                COUNT(*) AS orderCount,
                COALESCE(SUM(totalAmount), 0) AS revenue
         FROM orders
         GROUP BY day
         ORDER BY day DESC
         LIMIT 14`
    ).all();

    const daily = (results || []).reverse().map(row => ({
        date: row.day,
        orderCount: Number(row.orderCount) || 0,
        revenue: Number(row.revenue) || 0
    }));

    return json({ daily });
}

async function forgotPassword(request, env) {
    await ensureEcommerceSchema(env);
    const body = await readJson(request);
    const email = String(body.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Valid email is required.', 400);

    const user = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
    if (user) {
        const token = randomId(32);
        const tokenHash = await sha256(token);
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        await env.DB.prepare('INSERT INTO password_reset_tokens (userId, tokenHash, expiresAt, createdAt) VALUES (?, ?, ?, ?)')
            .bind(user.id, tokenHash, expiresAt, new Date().toISOString()).run();

        // SECURITY: never return the token in the HTTP response. The reset link must be
        // delivered through a side channel (email/SMS) so that knowing only an email
        // address is not enough to take over an account. If an email transport is wired
        // up, dispatch it here. For now we just log the link server-side for the operator.
        try {
            const url = new URL(request.url);
            const resetLink = `${url.origin}/reset-password.html?token=${encodeURIComponent(token)}`;
            console.log(`[Worker] Password reset link issued for userId=${user.id} (deliver via email): ${resetLink}`);
        } catch (error) {
            console.error('[Worker] Failed to log reset link', error);
        }
    }

    // Always return the same generic response — never reveal whether the email exists
    // (mitigates user enumeration).
    return json({ message: 'If the email exists, reset instructions will be sent.' });
}

async function resetPassword(request, env) {
    await ensureEcommerceSchema(env);
    const body = await readJson(request);
    const token = String(body.token || '').trim();
    const password = String(body.password || body.newPassword || '');
    if (!token) return fail('Reset token is required.', 400);
    if (password.length < 6) return fail('Password must be at least 6 characters.', 400);

    const tokenHash = await sha256(token);
    const row = await env.DB.prepare(
        `SELECT * FROM password_reset_tokens
         WHERE tokenHash = ? AND usedAt IS NULL AND datetime(expiresAt) > datetime('now')
         ORDER BY id DESC LIMIT 1`
    ).bind(tokenHash).first();

    if (!row) return fail('Reset token is invalid or expired.', 400);

    const now = new Date().toISOString();
    await env.DB.prepare('UPDATE users SET passwordHash = ?, updatedAt = ? WHERE id = ?')
        .bind(await hashPassword(password), now, row.userId).run();
    await env.DB.prepare('UPDATE password_reset_tokens SET usedAt = ? WHERE id = ?')
        .bind(now, row.id).run();

    return json({ message: 'Password has been reset.' });
}

async function fallbackToAssets(request, env) {
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return fail('Not found.', 404);
}

function assetRequest(request, pathname) {
    const url = new URL(request.url);
    url.pathname = pathname;
    return new Request(url.toString(), request);
}

export default {
    async fetch(request, env) {
        if (request.method === 'OPTIONS') {
            // Honour the origin whitelist for CORS preflight responses.
            return new Response(null, { status: 204, headers: responseHeaders({}, request) });
        }

        const url = new URL(request.url);
        const { pathname } = url;
        const productPathname = getNormalizedProductPath(pathname);
        const productId = getProductId(productPathname);
        const categoryId = getCategoryId(pathname);
        const adminOrderId = getAdminOrderId(pathname);
        const adminOrderStatusId = getAdminOrderStatusId(pathname);
        const apiOrderId = getApiOrderId(pathname);

        try {
            if (request.method === 'GET' && wantsHtml(request) && htmlRoutes.has(pathname)) {
                return fallbackToAssets(assetRequest(request, htmlRoutes.get(pathname)), env);
            }

            if (pathname === '/register' && request.method === 'POST') return registerUser(request, env);
            if (pathname === '/login' && request.method === 'POST') return loginUser(request, env);
            if (pathname === '/api/auth/forgot-password' && request.method === 'POST') return forgotPassword(request, env);
            if (pathname === '/api/auth/reset-password' && request.method === 'POST') return resetPassword(request, env);
            if (pathname === '/auth/google' && request.method === 'GET') return startGoogleLogin(request, env);
            if (pathname === '/auth/google/callback' && request.method === 'GET') return handleGoogleCallback(request, env);
            if (pathname === '/auth/me' && request.method === 'GET') return authMe(request, env);
            if (pathname === '/auth/logout' && request.method === 'POST') return logoutAuth(request);
            if (pathname === '/account' && request.method === 'GET') return currentUser(request, env);
            if (pathname === '/account' && request.method === 'PUT') return updateCurrentUser(request, env);
            if (pathname === '/change-password' && request.method === 'POST') return changeUserPassword(request, env);

            if (pathname === '/admin/login' && request.method === 'POST') return loginAdmin(request, env);
            if (pathname === '/admin/logout' && request.method === 'POST') return logoutAuth(request);
            if (pathname === '/admin/session' && request.method === 'GET') return getAdminSession(request, env);
            if (pathname === '/admin/me' && request.method === 'GET') return getAdminProfile(request, env);
            if (pathname === '/admin/me' && request.method === 'PUT') return updateAdminProfile(request, env);
            if (pathname === '/admin/change-password' && request.method === 'PUT') return changeAdminPassword(request, env);
            if (pathname === '/api/admin/create' && request.method === 'POST') return createAdminAccount(request, env);
            if (pathname === '/admin/users' && request.method === 'GET') return listAdminUsers(request, env);

            if (pathname === '/settings/payment' && request.method === 'GET') return json(await getPaymentSettings(env));
            if (pathname === '/admin/settings/payment' && request.method === 'PUT') return updatePaymentSettings(request, env);

            if ((pathname === '/orders' || pathname === '/api/orders') && request.method === 'POST') return createOrder(request, env);
            if (pathname === '/orders/my' && request.method === 'GET') return listMyOrders(request, env);
            if ((pathname === '/contact-messages' || pathname === '/api/contact') && request.method === 'POST') return createContactMessage(request, env);
            if (pathname === '/admin/orders' && request.method === 'GET') return listAdminOrders(request, env);
            if (pathname === '/admin/contact-messages' && request.method === 'GET') return listAdminContactMessages(request, env);
            if (adminOrderId && request.method === 'GET') return getAdminOrder(request, env, adminOrderId);
            if (adminOrderStatusId && request.method === 'PUT') return updateAdminOrderStatus(request, env, adminOrderStatusId);
            if (apiOrderId && request.method === 'PATCH') return updateAdminOrderStatus(request, env, apiOrderId);
            if (pathname === '/api/upload' && request.method === 'POST') return uploadAdminAsset(request, env);
            if (pathname === '/api/upload/direct' && request.method === 'PUT') return uploadDirectAsset(request, env);
            if (pathname === '/api/analytics/summary' && request.method === 'GET') return getAnalyticsSummary(request, env);

            if ((pathname === '/products' || pathname === '/api/products') && request.method === 'GET') return listProducts(request, env);
            if ((pathname === '/products' || pathname === '/api/products') && request.method === 'POST') return createProduct(request, env);
            if (productId && request.method === 'GET') return getProduct(env, productId);
            if (productId && request.method === 'PUT') return updateProduct(request, env, productId);
            if (productId && request.method === 'DELETE') {
                const { error } = await requireAdmin(request, env);
                if (error) return error;
                return deleteProduct(env, productId);
            }

            if (pathname === '/categories' && request.method === 'GET') return listCategories(env);
            if (pathname === '/categories' && request.method === 'POST') return createCategory(request, env);
            if (categoryId && request.method === 'PUT') return updateCategory(request, env, categoryId);
            if (categoryId && request.method === 'DELETE') return deleteCategory(request, env, categoryId);

            return fallbackToAssets(request, env);
        } catch (error) {
            console.error(`[Worker] ${request.method} ${pathname}`, error);
            return fail('Server request failed. Please try again.', 500);
        }
    }
};
