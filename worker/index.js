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

function json(data, status = 200) {
    const body = data && typeof data === 'object' && typeof data.success === 'boolean'
        ? data
        : { success: true, data };

    return new Response(JSON.stringify(body), {
        status,
        headers: jsonHeaders
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
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 12)
    }));
    const signature = await hmac(`${header}.${payload}`, env.ADMIN_SESSION_SECRET || 'change-this-session-secret');

    return `${header}.${payload}.${signature}`;
}

async function verifyToken(request, env) {
    const header = request.headers.get('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    const [tokenHeader, payload, signature] = token.split('.');

    if (!tokenHeader || !payload || !signature) return null;

    const expectedSignature = await hmac(`${tokenHeader}.${payload}`, env.ADMIN_SESSION_SECRET || 'change-this-session-secret');
    if (signature !== expectedSignature) return null;

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
    if (session.role !== 'admin') return { error: fail('Admin login required.', 403) };

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

function isHttpUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (error) {
        return false;
    }
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

    return {
        id: customId === undefined || customId === null || customId === '' ? null : Number(customId),
        name: String(body.name || '').trim(),
        price: Number(body.price),
        description: String(body.description || '').trim(),
        category: String(body.category || body.categoryName || body.categoryId || '').trim(),
        images,
        sizes: String(body.sizes || '').trim(),
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
    if (!Number.isFinite(product.stock) || product.stock < 0) return 'Product stock must be 0 or greater.';
    return '';
}

function toProductResponse(row) {
    const images = parseJsonArray(row.imageUrls);
    const legacyImage = String(row.imageUrl || '').trim();
    const imageUrls = images.length ? images : (legacyImage ? [legacyImage] : []);

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
        sizes: row.sizes || '',
        stock: Number(row.stock) || 0,
        createdAt: row.createdAt || ''
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

async function syncProductImages(env, productId, images) {
    await env.DB.prepare('DELETE FROM product_images WHERE productId = ?').bind(productId).run();

    for (const [index, image] of images.entries()) {
        await env.DB.prepare(
            'INSERT INTO product_images (productId, url, position, createdAt) VALUES (?, ?, ?, ?)'
        ).bind(productId, image, index, new Date().toISOString()).run();
    }
}

function toUserResponse(row) {
    return {
        id: String(row.id),
        username: row.username || '',
        fullname: row.fullname || '',
        email: row.email || '',
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

async function loginAdmin(request, env) {
    const body = await readJson(request);
    const username = String(body.username || body.email || '').trim();
    const password = String(body.password || '');
    const settings = await ensureAdminSettings(env);

    if (!username || !password) return fail('Username and password are required.', 400);
    if (username !== settings.username) return fail('Invalid admin username or password.', 401);

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

async function getAdminSession(request, env) {
    const { session, error } = await requireAdmin(request, env);
    if (error) return error;
    return json({ username: session.username, email: session.email || '', role: session.role });
}

async function getAdminProfile(request, env) {
    const { error } = await requireAdmin(request, env);
    if (error) return error;
    const settings = await ensureAdminSettings(env);
    return json({ username: settings.username, email: settings.email || '', role: 'admin' });
}

async function updateAdminProfile(request, env) {
    const { error } = await requireAdmin(request, env);
    if (error) return error;

    const body = await readJson(request);
    const username = String(body.username || '').trim().toLowerCase();
    const email = String(body.email || '').trim().toLowerCase();

    if (!username) return fail('Username is required.', 400);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Valid admin email is required.', 400);

    const updatedAt = new Date().toISOString();
    await ensureAdminSettings(env);
    await env.DB.prepare('UPDATE admin_settings SET username = ?, email = ?, updatedAt = ? WHERE id = 1')
        .bind(username, email, updatedAt).run();

    const token = await createToken(env, { username, email, role: 'admin' });
    return json({ user: { username, email, role: 'admin' }, token });
}

async function changeAdminPassword(request, env) {
    const { error } = await requireAdmin(request, env);
    if (error) return error;

    const body = await readJson(request);
    const currentPassword = String(body.currentPassword || '');
    const newPassword = String(body.newPassword || '');
    const settings = await ensureAdminSettings(env);

    if (!currentPassword || !newPassword) return fail('Current and new password are required.', 400);
    if (newPassword.length < 4) return fail('New password must be at least 4 characters.', 400);

    const passwordOk = settings.passwordHash
        ? await comparePassword(currentPassword, settings.passwordHash)
        : currentPassword === (env.ADMIN_PASSWORD || '1234');

    if (!passwordOk) return fail('Current password is incorrect.', 401);

    const passwordHash = await hashPassword(newPassword);
    await env.DB.prepare('UPDATE admin_settings SET passwordHash = ?, updatedAt = ? WHERE id = 1')
        .bind(passwordHash, new Date().toISOString()).run();

    return json({ message: 'Admin password changed.' });
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
        'INSERT INTO users (username, fullname, email, passwordHash, phone, address, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(usernameBase, fullname, email, passwordHash, '', '', 'user', now, now).run();

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

    const token = await createToken(env, {
        userId: String(user.id),
        username: user.username,
        fullname: user.fullname,
        email: user.email,
        role: user.role || 'user'
    });

    return json({ token, user: toUserResponse(user) });
}

async function currentUser(request, env) {
    const { session, error } = await requireAuth(request, env);
    if (error) return error;
    if (session.role === 'admin') return json({ username: session.username, email: session.email || '', role: 'admin' });

    const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(session.userId).first();
    if (!user) return fail('User not found.', 404);

    return json(toUserResponse(user));
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

    await env.DB.prepare('UPDATE users SET fullname = ?, phone = ?, address = ?, updatedAt = ? WHERE id = ?')
        .bind(fullname, phone, address, new Date().toISOString(), session.userId).run();

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
    const { results } = await env.DB.prepare(
        'SELECT id, name, price, description, category, imageUrl, imageUrls, sizes, stock, createdAt FROM products ORDER BY datetime(createdAt) DESC, id DESC'
    ).all();
    const products = await attachProductImages(env, results || []);

    return json(products);
}

async function getProduct(env, id) {
    const row = await env.DB.prepare(
        'SELECT id, name, price, description, category, imageUrl, imageUrls, sizes, stock, createdAt FROM products WHERE id = ?'
    ).bind(id).first();

    if (!row) return fail('Product not found.', 404);
    const [product] = await attachProductImages(env, [row]);
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
    const query = product.id === null
        ? 'INSERT INTO products (name, price, description, category, imageUrl, imageUrls, sizes, stock, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        : 'INSERT INTO products (id, name, price, description, category, imageUrl, imageUrls, sizes, stock, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    const statement = env.DB.prepare(query);
    const result = product.id === null
        ? await statement.bind(product.name, Math.round(product.price), product.description, product.category, imageUrl, imageUrls, product.sizes, Math.round(product.stock), createdAt).run()
        : await statement.bind(product.id, product.name, Math.round(product.price), product.description, product.category, imageUrl, imageUrls, product.sizes, Math.round(product.stock), createdAt).run();
    const productId = product.id || result.meta.last_row_id;

    await syncProductImages(env, productId, product.images);
    return getProduct(env, productId);
}

async function updateProduct(request, env, id) {
    const { error } = await requireAdmin(request, env);
    if (error) return error;

    const product = cleanProductInput(await readJson(request));
    const validationMessage = validateProduct(product);
    if (validationMessage) return fail(validationMessage, 400);

    const result = await env.DB.prepare(
        'UPDATE products SET name = ?, price = ?, description = ?, category = ?, imageUrl = ?, imageUrls = ?, sizes = ?, stock = ? WHERE id = ?'
    ).bind(
        product.name,
        Math.round(product.price),
        product.description,
        product.category,
        product.images[0] || '',
        JSON.stringify(product.images),
        product.sizes,
        Math.round(product.stock),
        id
    ).run();

    if (!result.meta.changes) return fail('Product not found.', 404);

    await syncProductImages(env, id, product.images);
    return getProduct(env, id);
}

async function deleteProduct(env, id) {
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

        const product = await env.DB.prepare('SELECT id, name, price, category, imageUrl, imageUrls, stock FROM products WHERE id = ?').bind(productId).first();
        if (!product) return fail(`Product ${productId} is no longer available.`, 409);
        if (Number(product.stock) > 0 && quantity > Number(product.stock)) return fail(`Not enough stock for ${product.name}.`, 409);

        const productImages = product ? toProductResponse(product).images : [];
        cleanItems.push({
            productId: String(product.id),
            productCode: String(item.productCode || '').trim(),
            name: product.name,
            price: Number(product.price || 0),
            quantity,
            image: productImages[0] || String(item.image || '').trim()
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
            if (pathname === '/account' && request.method === 'GET') return currentUser(request, env);
            if (pathname === '/account' && request.method === 'PUT') return updateCurrentUser(request, env);
            if (pathname === '/change-password' && request.method === 'POST') return changeUserPassword(request, env);

            if (pathname === '/admin/login' && request.method === 'POST') return loginAdmin(request, env);
            if (pathname === '/admin/session' && request.method === 'GET') return getAdminSession(request, env);
            if (pathname === '/admin/me' && request.method === 'GET') return getAdminProfile(request, env);
            if (pathname === '/admin/me' && request.method === 'PUT') return updateAdminProfile(request, env);
            if (pathname === '/admin/change-password' && request.method === 'PUT') return changeAdminPassword(request, env);
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
