const jsonHeaders = {
    'content-type': 'application/json; charset=UTF-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'access-control-allow-headers': 'Content-Type, Authorization'
};

const htmlRoutes = new Map([
    ['/', '/index.html'],
    ['/admin', '/admin.html'],
    ['/products', '/products.html'],
    ['/product', '/products.html'],
    ['/login', '/login.html'],
    ['/signup', '/signup.html'],
    ['/account', '/account.html'],
    ['/cart', '/cart.html']
]);

const DEFAULT_PAYMENT_SETTINGS = {
    bankName: 'Khan Bank',
    accountNumber: '',
    accountHolder: 'UNA Home & Furniture',
    facebookChatUrl: ''
};

const GOOGLE_REDIRECT_URI = 'https://una-furniture.jntsnnrv.workers.dev/auth/google/callback';
const AUTH_COOKIE_NAME = 'una_auth_token';
const GOOGLE_STATE_COOKIE_NAME = 'una_google_oauth_state';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;
const GOOGLE_CLIENT_ID_SUFFIX = '.apps.googleusercontent.com';
const ADMIN_ACCESS_ROLES = new Set(['admin', 'manager']);

function responseHeaders(extraHeaders = {}) {
    const headers = new Headers(jsonHeaders);

    Object.entries(extraHeaders).forEach(([key, value]) => {
        if (Array.isArray(value)) {
            value.forEach((item) => headers.append(key, item));
        } else if (value !== undefined && value !== null) {
            headers.set(key, value);
        }
    });

    return headers;
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

function base64UrlDecode(value) {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

    return new TextDecoder().decode(bytes);
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
    return env.JWT_SECRET || env.ADMIN_SESSION_SECRET || 'change-this-session-secret';
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

async function hashPassword(password) {
    const salt = randomId(12);
    const hash = await sha256(`${salt}:${password}`);
    return `${salt}:${hash}`;
}

async function comparePassword(password, storedHash) {
    const [salt, hash] = String(storedHash || '').split(':');
    if (!salt || !hash) return false;
    return await sha256(`${salt}:${password}`) === hash;
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

    const secrets = [...new Set([
        getJwtSecret(env),
        env.ADMIN_SESSION_SECRET || 'change-this-session-secret'
    ])];
    const verified = await Promise.all(secrets.map((secret) => hmac(`${tokenHeader}.${payload}`, secret)));
    if (!verified.includes(signature)) return null;

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
            const colorValue = String(variant?.colorValue || variant?.color_value || variant?.color || variant?.value || '').trim();
            const normalized = {
                name: String(variant?.name || '').trim(),
                color: colorValue,
                colorValue,
                image: String(variant?.image || variant?.imageUrl || '').trim()
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

function isMissingColumnError(error, columnName) {
    const message = String(error?.message || '').toLowerCase();
    return message.includes('no such column') && message.includes(String(columnName).toLowerCase());
}

function isMissingTableError(error, tableName) {
    const message = String(error?.message || '').toLowerCase();
    return message.includes('no such table') && message.includes(String(tableName).toLowerCase());
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
        images,
        colors,
        colorVariants,
        sizes: normalizeOptionList(body.sizes),
        stock: Number(body.stock || 0)
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
    if (product.images.some((image) => !isHttpUrl(image))) return 'Every product image must be a valid http or https URL.';
    if (product.colorVariants.some((variant) => !variant.name || !variant.color || !variant.image)) {
        return 'Every color variant must include a name, color value, and image.';
    }
    if (product.colorVariants.some((variant) => !isAllowedImageReference(variant.image))) {
        return 'Every color variant image must be a valid URL or supported image path.';
    }
    if (!Number.isFinite(product.stock) || product.stock < 0) return 'Product stock must be 0 or greater.';
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
        description: row.description || '',
        category: row.category || 'Uncategorized',
        categoryName: row.category || 'Uncategorized',
        imageUrl: imageUrls[0] || '',
        imageUrls,
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

    return {
        ...(Number.isInteger(id) && id > 0 ? { id } : {}),
        name: String(row.name || '').trim(),
        color: colorValue,
        colorValue,
        image: String(row.image || '').trim()
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

    const placeholders = uniqueIds.map(() => '?').join(', ');
    let results;

    try {
        ({ results } = await env.DB.prepare(
            `SELECT id, product_id, name, color_value, image, sort_order
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

    try {
        await env.DB.prepare('DELETE FROM product_color_variants WHERE product_id = ?').bind(productId).run();
    } catch (error) {
        if (isMissingTableError(error, 'product_color_variants')) return;
        throw error;
    }

    const now = new Date().toISOString();

    for (const [index, variant] of colorVariants.entries()) {
        await env.DB.prepare(
            'INSERT INTO product_color_variants (product_id, name, color_value, image, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).bind(
            productId,
            variant.name,
            variant.colorValue || variant.color,
            variant.image,
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
    return {
        id: String(row.id),
        orderCode: row.orderCode || '',
        userId: row.userId ? String(row.userId) : '',
        username: row.username || '',
        customerName: row.customerName || row.fullname || '',
        email: row.email || '',
        phone: row.phone || '',
        address: row.address || '',
        items: parseJsonArray(row.items),
        totalAmount: Number(row.totalAmount) || 0,
        paymentMethod: row.paymentMethod || 'bank_transfer',
        transactionCode: row.transactionCode || '',
        status: row.status || 'pending',
        createdAt: row.createdAt || ''
    };
}

async function ensureAdminSettings(env) {
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
        const passwordOk = settings.passwordHash
            ? await comparePassword(password, settings.passwordHash)
            : password === (env.ADMIN_PASSWORD || '1234');

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
        });
    }

    const adminUser = await findAdminUserByLogin(env, username);

    if (!adminUser?.passwordHash) return fail('Invalid admin username or password.', 401);

    const passwordOk = await comparePassword(password, adminUser.passwordHash);
    if (!passwordOk) return fail('Invalid admin username or password.', 401);

    const token = await createToken(env, toAdminUserPayload(adminUser));

    return json({
        token,
        user: toUserResponse(adminUser)
    });
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

    const passwordOk = settings.passwordHash
        ? await comparePassword(currentPassword, settings.passwordHash)
        : currentPassword === (env.ADMIN_PASSWORD || '1234');

    if (!passwordOk) return fail('Current password is incorrect.', 401);

    const passwordHash = await hashPassword(newPassword);
    await env.DB.prepare('UPDATE admin_settings SET passwordHash = ?, updatedAt = ? WHERE id = 1')
        .bind(passwordHash, new Date().toISOString()).run();

    return json({ message: 'Admin password changed.' });
}

async function createAdminAccount(request, env) {
    const { error } = await requireAdminCreator(request, env);
    if (error) return error;

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
        'Set-Cookie': serializeCookie(request, GOOGLE_STATE_COOKIE_NAME, state, { maxAge: 10 * 60 })
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
    if (!code || !state || !expectedState || state !== expectedState) {
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
            serializeCookie(request, AUTH_COOKIE_NAME, token, { maxAge: SESSION_MAX_AGE_SECONDS }),
            clearCookie(request, GOOGLE_STATE_COOKIE_NAME)
        ]
    });
}

async function authMe(request, env) {
    const session = await verifyToken(request, env);
    if (!session) return json(null);

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
    const body = await readJson(request);
    const email = String(body.email || body.username || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!email || !password) return fail('Email and password are required.', 400);

    const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
    if (!user || !await comparePassword(password, user.passwordHash)) {
        return fail('Invalid email or password.', 401);
    }

    const token = await createUserSessionToken(env, user, 'user');

    return json({ token, user: toUserResponse(user) });
}

async function currentUser(request, env) {
    const { session, error } = await requireAuth(request, env);
    if (error) return error;
    if (session.role === 'admin') return json({ username: session.username, email: session.email || '', role: 'admin' });

    const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(session.userId).first();
    if (!user) return fail('User not found.', 404);

    return json(toUserResponse({ ...user, role: 'user' }));
}

async function updateCurrentUser(request, env) {
    const { session, error } = await requireAuth(request, env);
    if (error) return error;
    if (session.role === 'admin') return fail('Admin profile is managed in Admin Account.', 400);

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

async function listProducts(env) {
    let results;

    try {
        ({ results } = await env.DB.prepare(
            'SELECT id, name, price, description, category, imageUrl, imageUrls, colors, colorVariants, sizes, stock, createdAt FROM products ORDER BY datetime(createdAt) DESC, id DESC'
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

    const products = await attachProductColorVariants(env, await attachProductImages(env, results || []));

    return json(products);
}

async function getProduct(env, id) {
    let row;

    try {
        row = await env.DB.prepare(
            'SELECT id, name, price, description, category, imageUrl, imageUrls, colors, colorVariants, sizes, stock, createdAt FROM products WHERE id = ?'
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
    const query = product.id === null
        ? 'INSERT INTO products (name, price, description, category, imageUrl, imageUrls, colors, colorVariants, sizes, stock, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        : 'INSERT INTO products (id, name, price, description, category, imageUrl, imageUrls, colors, colorVariants, sizes, stock, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    const statement = env.DB.prepare(query);
    let result;

    try {
        result = product.id === null
            ? await statement.bind(product.name, Math.round(product.price), product.description, product.category, imageUrl, imageUrls, colors, colorVariants, sizes, Math.round(product.stock), createdAt).run()
            : await statement.bind(product.id, product.name, Math.round(product.price), product.description, product.category, imageUrl, imageUrls, colors, colorVariants, sizes, Math.round(product.stock), createdAt).run();
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

    const body = await readJson(request);
    const product = cleanProductInput(body);
    const shouldSyncColorVariants = Object.prototype.hasOwnProperty.call(body, 'colorVariants')
        || Object.prototype.hasOwnProperty.call(body, 'colors');
    const validationMessage = validateProduct(product);
    if (validationMessage) return fail(validationMessage, 400);

    let result;

    try {
        result = await env.DB.prepare(
            'UPDATE products SET name = ?, price = ?, description = ?, category = ?, imageUrl = ?, imageUrls = ?, colors = ?, colorVariants = ?, sizes = ?, stock = ? WHERE id = ?'
        ).bind(
            product.name,
            Math.round(product.price),
            product.description,
            product.category,
            product.images[0] || '',
            JSON.stringify(product.images),
            JSON.stringify(product.colors),
            JSON.stringify(product.colorVariants),
            JSON.stringify(product.sizes),
            Math.round(product.stock),
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
    try {
        await env.DB.prepare('DELETE FROM product_color_variants WHERE product_id = ?').bind(id).run();
    } catch (error) {
        if (!isMissingTableError(error, 'product_color_variants')) throw error;
    }

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
        accountHolder: settings.accountHolder || '',
        facebookChatUrl: settings.facebookChatUrl || ''
    };
}

async function updatePaymentSettings(request, env) {
    const { error } = await requireAdmin(request, env);
    if (error) return error;

    const body = await readJson(request);
    const settings = {
        bankName: String(body.bankName || '').trim(),
        accountNumber: String(body.accountNumber || '').trim(),
        accountHolder: String(body.accountHolder || '').trim(),
        facebookChatUrl: String(body.facebookChatUrl || '').trim()
    };

    await getPaymentSettings(env);
    await env.DB.prepare(
        'UPDATE payment_settings SET bankName = ?, accountNumber = ?, accountHolder = ?, facebookChatUrl = ?, updatedAt = ? WHERE id = 1'
    ).bind(settings.bankName, settings.accountNumber, settings.accountHolder, settings.facebookChatUrl, new Date().toISOString()).run();

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
    return `UNA-${dateCode()}-${suffix}`;
}

async function insertOrderWithUniqueCode(env, orderValues) {
    for (let attempt = 0; attempt < 10; attempt += 1) {
        const orderCode = generateOrderCode();
        const existing = await env.DB.prepare('SELECT id FROM orders WHERE orderCode = ?').bind(orderCode).first();
        if (existing) continue;

        try {
            const result = await env.DB.prepare(
                'INSERT INTO orders (orderCode, userId, items, totalAmount, paymentMethod, transactionCode, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
            ).bind(
                orderCode,
                orderValues.userId,
                orderValues.items,
                orderValues.totalAmount,
                orderValues.paymentMethod,
                orderCode,
                orderValues.status,
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
    if (session.role === 'admin') return fail('Use a customer account to place orders.', 400);

    const body = await readJson(request);
    const items = Array.isArray(body.items) ? body.items : [];
    const paymentMethod = String(body.paymentMethod || 'bank_transfer');
    const allowedPaymentMethods = new Set(['bank_transfer', 'facebook_chat']);

    if (!items.length) return fail('Order items are required.', 400);
    if (!allowedPaymentMethods.has(paymentMethod)) return fail('Invalid payment method.', 400);

    const cleanItems = [];
    for (const item of items) {
        const productId = Number(item.productId || item.id);
        const quantity = Number(item.quantity);
        if (!productId) return fail('Every order item must include a product ID.', 400);
        if (!Number.isInteger(productId) || productId <= 0) return fail('Every product ID must be a positive integer.', 400);
        if (!Number.isInteger(quantity) || quantity <= 0) return fail('Every order quantity must be a positive integer.', 400);

        let product;

        try {
            product = await env.DB.prepare('SELECT id, name, price, category, imageUrl, imageUrls, colors, colorVariants, stock FROM products WHERE id = ?').bind(productId).first();
        } catch (error) {
            if (!isMissingColumnError(error, 'colorVariants')) {
                if (!isMissingColumnError(error, 'colors')) throw error;

                product = await env.DB.prepare('SELECT id, name, price, category, imageUrl, imageUrls, stock FROM products WHERE id = ?').bind(productId).first();
            } else {
                product = await env.DB.prepare('SELECT id, name, price, category, imageUrl, imageUrls, colors, stock FROM products WHERE id = ?').bind(productId).first();
            }
        }

        if (!product) return fail(`Product ${productId} is no longer available.`, 409);
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

        const productImages = productResponse.images;
        cleanItems.push({
            productId: String(product.id),
            productCode: '',
            name: product.name,
            price: Number(product.price || 0),
            quantity,
            image: selectedVariant?.image || selectedColorImage || productImages[0] || String(item.image || '').trim(),
            selectedColor: selectedVariant?.name || selectedColor,
            selectedColorValue: selectedVariant?.colorValue || selectedVariant?.color || selectedColorValue,
            selectedColorImage: selectedVariant?.image || selectedColorImage
        });
    }

    const totalAmount = cleanItems.reduce((sum, item) => sum + (Number(item.price) || 0) * item.quantity, 0);
    const createdAt = new Date().toISOString();

    const { result } = await insertOrderWithUniqueCode(env, {
        userId: session.userId,
        items: JSON.stringify(cleanItems),
        totalAmount,
        paymentMethod,
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

    const { results } = await env.DB.prepare('SELECT * FROM orders WHERE userId = ? ORDER BY datetime(createdAt) DESC, id DESC')
        .bind(session.userId).all();
    return json((results || []).map(toOrderResponse));
}

async function listAdminOrders(request, env) {
    const { error } = await requireAdmin(request, env);
    if (error) return error;

    const { results } = await env.DB.prepare(
        'SELECT orders.*, users.username, users.fullname, users.email, users.phone, users.address FROM orders LEFT JOIN users ON users.id = orders.userId ORDER BY datetime(orders.createdAt) DESC, orders.id DESC'
    ).all();
    return json((results || []).map(toOrderResponse));
}

async function getAdminOrder(request, env, id) {
    const { error } = await requireAdmin(request, env);
    if (error) return error;

    const row = await env.DB.prepare(
        'SELECT orders.*, users.username, users.fullname, users.email, users.phone, users.address FROM orders LEFT JOIN users ON users.id = orders.userId WHERE orders.id = ?'
    ).bind(id).first();

    if (!row) return fail('Order not found.', 404);
    return json(toOrderResponse(row));
}

async function updateAdminOrderStatus(request, env, id) {
    const { error } = await requireAdmin(request, env);
    if (error) return error;

    const body = await readJson(request);
    const status = String(body.status || '').trim();
    const allowed = new Set(['pending', 'paid', 'confirmed', 'cancelled']);
    if (!allowed.has(status)) return fail('Invalid order status.', 400);

    const result = await env.DB.prepare('UPDATE orders SET status = ?, updatedAt = ? WHERE id = ?')
        .bind(status, new Date().toISOString(), id).run();
    if (!result.meta.changes) return fail('Order not found.', 404);

    return getAdminOrder(request, env, id);
}

async function listAdminUsers(request, env) {
    const { error } = await requireAdmin(request, env);
    if (error) return error;

    const { results } = await env.DB.prepare('SELECT * FROM users ORDER BY datetime(createdAt) DESC, id DESC').all();
    return json((results || []).map(toUserResponse));
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
            return new Response(null, { status: 204, headers: jsonHeaders });
        }

        const url = new URL(request.url);
        const { pathname } = url;
        const productId = getProductId(pathname);
        const categoryId = getCategoryId(pathname);
        const adminOrderId = getAdminOrderId(pathname);
        const adminOrderStatusId = getAdminOrderStatusId(pathname);

        try {
            if (request.method === 'GET' && wantsHtml(request) && htmlRoutes.has(pathname)) {
                return fallbackToAssets(assetRequest(request, htmlRoutes.get(pathname)), env);
            }

            if (pathname === '/register' && request.method === 'POST') return registerUser(request, env);
            if (pathname === '/login' && request.method === 'POST') return loginUser(request, env);
            if (pathname === '/auth/google' && request.method === 'GET') return startGoogleLogin(request, env);
            if (pathname === '/auth/google/callback' && request.method === 'GET') return handleGoogleCallback(request, env);
            if (pathname === '/auth/me' && request.method === 'GET') return authMe(request, env);
            if (pathname === '/auth/logout' && request.method === 'POST') return logoutAuth(request);
            if (pathname === '/account' && request.method === 'GET') return currentUser(request, env);
            if (pathname === '/account' && request.method === 'PUT') return updateCurrentUser(request, env);
            if (pathname === '/change-password' && request.method === 'POST') return changeUserPassword(request, env);

            if (pathname === '/admin/login' && request.method === 'POST') return loginAdmin(request, env);
            if (pathname === '/admin/session' && request.method === 'GET') return getAdminSession(request, env);
            if (pathname === '/admin/me' && request.method === 'GET') return getAdminProfile(request, env);
            if (pathname === '/admin/me' && request.method === 'PUT') return updateAdminProfile(request, env);
            if (pathname === '/admin/change-password' && request.method === 'PUT') return changeAdminPassword(request, env);
            if (pathname === '/api/admin/create' && request.method === 'POST') return createAdminAccount(request, env);
            if (pathname === '/admin/users' && request.method === 'GET') return listAdminUsers(request, env);

            if (pathname === '/settings/payment' && request.method === 'GET') return json(await getPaymentSettings(env));
            if (pathname === '/admin/settings/payment' && request.method === 'PUT') return updatePaymentSettings(request, env);

            if (pathname === '/orders' && request.method === 'POST') return createOrder(request, env);
            if (pathname === '/orders/my' && request.method === 'GET') return listMyOrders(request, env);
            if (pathname === '/admin/orders' && request.method === 'GET') return listAdminOrders(request, env);
            if (adminOrderId && request.method === 'GET') return getAdminOrder(request, env, adminOrderId);
            if (adminOrderStatusId && request.method === 'PUT') return updateAdminOrderStatus(request, env, adminOrderStatusId);

            if (pathname === '/products' && request.method === 'GET') return listProducts(env);
            if (pathname === '/products' && request.method === 'POST') return createProduct(request, env);
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
