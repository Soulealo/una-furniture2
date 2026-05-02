const API_BASE = (() => {
    return '';
})();
const TOKEN_KEY = 'unaAdminToken';
const DEFAULT_PRODUCT_IMAGE = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%23f5f1ed%22/%3E%3Cpath%20d%3D%22M260%20360l90-110%2070%2085%2055-65%20105%20125H220z%22%20fill%3D%22%23d4b896%22/%3E%3Ccircle%20cx%3D%22545%22%20cy%3D%22205%22%20r%3D%2242%22%20fill%3D%22%23c9a961%22/%3E%3Ctext%20x%3D%22400%22%20y%3D%22465%22%20text-anchor%3D%22middle%22%20font-family%3D%22Arial%2C%20sans-serif%22%20font-size%3D%2234%22%20fill%3D%22%232a2420%22%3EUNA%20Home%3C/text%3E%3C/svg%3E';
const DEMO_PRODUCT_CODES = ['SOFA-001', 'TABLE-001', 'CHAIR-001', 'LIGHT-001', 'DECOR-001', 'ART-001'];
const DEMO_PRODUCT_NAMES = ['UNA Булан Буйдан', 'Модон Хоолны Ширээ', 'Орчин Үеийн Сандал', 'Алтан Гэрэлтүүлэг', 'Интерьер Чимэглэл', 'Ханын Урлагийн Зураг'];

let editingProductId = null;
let productCache = [];
let categoriesCache = [];
let ordersCache = [];
let usersCache = [];
let adminProfile = null;

function clearLegacyProductStorage() {
    ['products', 'unaProducts', 'demoProducts', 'productCache', 'sampleProducts'].forEach(key => {
        localStorage.removeItem(key);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    clearLegacyProductStorage();
    initializeAdmin();
});

async function initializeAdmin() {
    setupEventListeners();

    if (tokenIsAdmin()) {
        try {
            await loadAdminProfile();
            showDashboard();
            return;
        } catch (error) {
            console.log('Stored admin session is invalid:', error);
            removeToken();
        }
    }

    showLoginScreen();
}

function setupEventListeners() {
    const loginForm = document.getElementById('adminLoginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleAdminLogin);
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', handleSidebarMenuClick);
    });

    const addProductBtn = document.getElementById('addProductBtn');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', openAddProductModal);
    }

    const closeModalBtn = document.getElementById('closeModalBtn');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeProductModal);
    }

    const cancelFormBtn = document.getElementById('cancelFormBtn');
    if (cancelFormBtn) {
        cancelFormBtn.addEventListener('click', closeProductModal);
    }

    const productForm = document.getElementById('productForm');
    if (productForm) {
        productForm.addEventListener('submit', handleProductFormSubmit);
    }

    const productsTableBody = document.getElementById('productsTableBody');
    if (productsTableBody) {
        productsTableBody.addEventListener('click', handleProductActionClick);
    }

    const productImages = document.getElementById('productImages');
    if (productImages) {
        productImages.addEventListener('input', renderImagePreview);
    }

    const addColorVariantBtn = document.getElementById('addColorVariantBtn');
    if (addColorVariantBtn) {
        addColorVariantBtn.addEventListener('click', () => addColorVariantRow());
    }

    const colorVariantsList = document.getElementById('colorVariantsList');
    if (colorVariantsList) {
        colorVariantsList.addEventListener('input', handleColorVariantInput);
        colorVariantsList.addEventListener('click', handleColorVariantClick);
    }

    const categoryForm = document.getElementById('categoryForm');
    if (categoryForm) {
        categoryForm.addEventListener('submit', handleCategorySubmit);
    }

    const categoriesTableBody = document.getElementById('categoriesTableBody');
    if (categoriesTableBody) {
        categoriesTableBody.addEventListener('click', handleCategoryActionClick);
    }

    const paymentSettingsForm = document.getElementById('paymentSettingsForm');
    if (paymentSettingsForm) {
        paymentSettingsForm.addEventListener('submit', handlePaymentSettingsSubmit);
    }

    const adminProfileForm = document.getElementById('adminProfileForm');
    if (adminProfileForm) {
        adminProfileForm.addEventListener('submit', handleAdminProfileSubmit);
    }

    const adminPasswordForm = document.getElementById('adminPasswordForm');
    if (adminPasswordForm) {
        adminPasswordForm.addEventListener('submit', handleAdminPasswordSubmit);
    }

    const createAdminForm = document.getElementById('createAdminForm');
    if (createAdminForm) {
        createAdminForm.addEventListener('submit', handleCreateAdminSubmit);
    }

    const closeOrderModalBtn = document.getElementById('closeOrderModalBtn');
    if (closeOrderModalBtn) {
        closeOrderModalBtn.addEventListener('click', closeOrderModal);
    }

    const ordersTableBody = document.getElementById('ordersTableBody');
    if (ordersTableBody) {
        ordersTableBody.addEventListener('click', handleOrderActionClick);
    }

    document.querySelectorAll('.quick-action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = e.currentTarget.getAttribute('data-action');

            if (action === 'addProduct') {
                openAddProductModal();
                switchView('products');
            } else if (action === 'viewProducts') {
                switchView('products');
            } else if (action === 'manageCategories') {
                switchView('categories');
            } else if (action === 'viewOrders') {
                switchView('orders');
            }
        });
    });

    const modal = document.getElementById('productModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeProductModal();
            }
        });
    }

    const orderModal = document.getElementById('orderModal');
    if (orderModal) {
        orderModal.addEventListener('click', (e) => {
            if (e.target === orderModal) {
                closeOrderModal();
            }
        });
    }
}

function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function saveToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}

function removeToken() {
    localStorage.removeItem(TOKEN_KEY);
}

function getTokenPayload() {
    const token = getToken();
    if (!token) return null;

    try {
        const tokenParts = token.split('.');
        const payload = tokenParts.length === 2 ? tokenParts[0] : tokenParts[1];
        if (!payload) return null;
        const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
        const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, '=');
        return JSON.parse(atob(paddedPayload));
    } catch (error) {
        return null;
    }
}

function tokenIsAdmin() {
    const payload = getTokenPayload();
    return ['admin', 'manager'].includes(payload?.role) && Number(payload.exp) > Math.floor(Date.now() / 1000);
}

async function requestJson(url, options = {}) {
    const headers = {
        Accept: 'application/json',
        ...(options.headers || {})
    };
    const token = getToken();

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        ...options,
        headers
    });
    const responseText = await response.text();
    let data = null;

    try {
        data = responseText ? JSON.parse(responseText) : null;
    } catch (error) {
        data = null;
    }

    if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            removeToken();
            showLoginScreen();
        }

        const error = new Error(data?.message || 'Сервертэй холбогдох үед алдаа гарлаа.');
        Object.assign(error, data || {});
        throw error;
    }

    return data?.success === true && Object.prototype.hasOwnProperty.call(data, 'data') ? data.data : data;
}

async function handleAdminLogin(e) {
    e.preventDefault();

    const username = document.getElementById('adminUsername').value.trim();
    const password = document.getElementById('adminPassword').value;
    const errorDiv = document.getElementById('loginError');

    errorDiv.classList.remove('show');
    errorDiv.textContent = '';

    if (!username || !password) {
        errorDiv.textContent = 'Username and password are required.';
        errorDiv.classList.add('show');
        return;
    }

    try {
        const data = await requestJson(API_BASE + '/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        saveToken(data.token);
        document.getElementById('adminLoginForm').reset();
        showDashboard();
    } catch (error) {
        console.log('Admin login failed:', error);
        errorDiv.textContent = error.message;
        errorDiv.classList.add('show');
    }
}
function handleLogout() {
    const confirmLogout = confirm('Та системээс гарах уу?');

    if (confirmLogout) {
        removeToken();
        showLoginScreen();
        document.getElementById('adminLoginForm').reset();
    }
}

function showLoginScreen() {
    document.getElementById('loginScreen').classList.add('active');
    document.getElementById('dashboardScreen').classList.remove('active');
}

function showDashboard() {
    if (!tokenIsAdmin()) {
        showLoginScreen();
        return;
    }

    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('dashboardScreen').classList.add('active');
    updateAdminNavbarName();
    loadAdminProfile().catch(() => {});
    switchView('dashboard');
}

function handleSidebarMenuClick(e) {
    e.preventDefault();

    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.classList.remove('active');
    });

    e.currentTarget.classList.add('active');
    switchView(e.currentTarget.getAttribute('data-menu'));
}

async function switchView(viewType) {
    const pageTitle = document.getElementById('pageTitle');

    document.querySelectorAll('.admin-view').forEach(view => {
        view.classList.remove('active');
    });
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.classList.remove('active');
    });

    const activeView = document.getElementById(`${viewType}View`);
    const activeLink = document.querySelector(`[data-menu="${viewType}"]`);

    activeView?.classList.add('active');
    activeLink?.classList.add('active');

    if (viewType === 'dashboard') {
        pageTitle.textContent = 'Админ Самбар';
        await updateDashboard();
    } else if (viewType === 'products') {
        pageTitle.textContent = 'Бүтээгдэхүүн Удирдах';
        await loadProductsTable();
    } else if (viewType === 'categories') {
        pageTitle.textContent = 'Manage Categories';
        await loadCategoriesTable();
    } else if (viewType === 'orders') {
        pageTitle.textContent = 'Орж ирсэн захиалгууд';
        await loadOrdersTable();
    } else if (viewType === 'accounts') {
        pageTitle.textContent = 'Account Center';
        await loadUsersTable();
    } else if (viewType === 'paymentSettings') {
        pageTitle.textContent = 'Төлбөрийн тохиргоо';
        await loadPaymentSettings();
    } else if (viewType === 'adminAccount') {
        pageTitle.textContent = 'Admin Account';
        await loadAdminAccountSection();
    }
}

async function updateDashboard() {
    const [products, orders, users] = await Promise.all([
        fetchProducts(),
        fetchOrders(),
        fetchUsers()
    ]);
    const totalProductsElement = document.getElementById('totalProducts');
    const totalOrdersElement = document.getElementById('totalOrders');
    const totalUsersElement = document.getElementById('totalUsers');

    if (totalProductsElement) {
        totalProductsElement.textContent = products.length;
    }
    if (totalOrdersElement) {
        totalOrdersElement.textContent = orders.length;
    }
    if (totalUsersElement) {
        totalUsersElement.textContent = users.length;
    }
}

async function fetchProducts() {
    const products = await requestJson(`${API_BASE}/products`);
    productCache = normalizeProducts(products);
    return productCache;
}

async function fetchProduct(productId) {
    const product = await requestJson(`${API_BASE}/products/${productId}`);
    return normalizeProduct(product);
}

function normalizeCategory(category) {
    return {
        id: String(category?.id || category?._id || ''),
        name: category?.name || 'Uncategorized',
        createdAt: category?.createdAt
    };
}

async function fetchCategories() {
    const categories = await requestJson(`${API_BASE}/categories`);
    categoriesCache = Array.isArray(categories) ? categories.map(normalizeCategory).filter(category => category.id) : [];
    return categoriesCache;
}

async function ensureCategoriesLoaded() {
    if (categoriesCache.length === 0) {
        await fetchCategories();
    }

    return categoriesCache;
}

function logColorVariants(label, value) {
    if (localStorage.getItem('unaDebugColorVariants') === 'true') {
        console.debug(`[colorVariants] ${label}`, value);
    }
}

function getSafeProductImage(image) {
    const imageValue = String(image || '').trim();

    if (imageValue.startsWith('/uploads/')) return imageValue;
    if (imageValue.startsWith('uploads/')) return `/${imageValue}`;
    if (imageValue.startsWith('images/') || imageValue.startsWith('./images/')) return imageValue;
    if (imageValue.startsWith('data:image/')) return imageValue;
    if (/^https?:\/\//i.test(imageValue)) return imageValue;
    if (isSafeImagePath(imageValue)) {
        const normalizedPath = imageValue.replace(/^\.?\//, '');
        return normalizedPath.includes('/') ? normalizedPath : `images/${normalizedPath}`;
    }

    return DEFAULT_PRODUCT_IMAGE;
}

function getProductMainImage(product) {
    return getSafeProductImage(product?.images?.[0] || product?.imageUrl || product?.image);
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

    return [...new Set(values.map(item => {
        if (item && typeof item === 'object') {
            return String(item.name || item.color || item.value || '').trim();
        }

        return String(item || '').trim();
    }).filter(Boolean))];
}

function formatOptionList(value) {
    return normalizeOptionList(value).join(', ');
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
        .map(variant => ({
            name: String(variant?.name || '').trim(),
            color: String(variant?.color || variant?.value || '').trim(),
            image: String(variant?.image || variant?.imageUrl || '').trim()
        }))
        .filter(variant => variant.name || variant.color || variant.image);
}

function shortenText(text, maxLength = 120) {
    const cleanText = String(text ?? '').trim();

    if (cleanText.length <= maxLength) return cleanText;
    return `${cleanText.slice(0, maxLength).trim()}...`;
}

function normalizeProduct(product, index = 0) {
    const numericPrice = Number(product?.price);
    const numericStock = Number(product?.stock);
    const savedColorVariants = normalizeColorVariants(product?.colorVariants);
    const legacyColorVariants = savedColorVariants.length ? savedColorVariants : normalizeColorVariants(product?.colors);
    const colors = normalizeOptionList(product?.colors ?? product?.colorsText);
    const colorVariants = legacyColorVariants;

    logColorVariants('frontend received product.colorVariants', {
        id: product?.id,
        colorVariants: product?.colorVariants,
        normalized: colorVariants
    });

    return {
        id: product?.id ? String(product.id) : String(index + 1),
        name: product?.name || 'Бүтээгдэхүүн',
        description: product?.description || '',
        price: Number.isFinite(numericPrice) ? numericPrice : 0,
        categoryId: product?.categoryId || product?.categoryName || product?.category || '',
        category: product?.categoryName || product?.category || 'Uncategorized',
        images: Array.isArray(product?.images)
            ? product.images.map(image => String(image || '').trim()).filter(Boolean)
            : String(product?.imageUrl || product?.image || '').trim() ? [String(product?.imageUrl || product?.image || '').trim()] : [],
        colors,
        colorVariants,
        colorsText: formatOptionList(colors),
        colorVariantsText: colorVariants.map(variant => variant.name || variant.color || 'Variant').join(', '),
        stock: Number.isFinite(numericStock) ? numericStock : 0,
        createdAt: product?.createdAt
    };
}

function normalizeProducts(products) {
    if (!Array.isArray(products)) return [];

    return products
        .filter(product => !DEMO_PRODUCT_CODES.includes(product?.productCode) && !DEMO_PRODUCT_NAMES.includes(product?.name))
        .map((product, index) => normalizeProduct(product, index));
}

async function openAddProductModal() {
    editingProductId = null;
    document.getElementById('modalTitle').textContent = 'Шинэ бүтээгдэхүүн нэмэх';
    document.getElementById('productForm').reset();
    await renderProductCategoryOptions();
    document.getElementById('productStock').value = '0';
    renderImagePreview();
    renderColorVariantRows([]);
    document.getElementById('productModal').classList.add('show');
}

async function openEditProductModal(productId) {
    let product = productCache.find(item => String(item.id) === String(productId));

    if (!product) {
        product = await fetchProduct(productId);
    }

    editingProductId = product.id;
    document.getElementById('modalTitle').textContent = 'Бүтээгдэхүүн засварлах';
    await renderProductCategoryOptions(product.categoryId);
    document.getElementById('productName').value = product.name;
    document.getElementById('productDescription').value = product.description;
    document.getElementById('productColors').value = product.colorsText;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productStock').value = product.stock;
    document.getElementById('productImages').value = product.images.join('\n');
    renderImagePreview();
    renderColorVariantRows(product.colorVariants);
    document.getElementById('productModal').classList.add('show');
}

function closeProductModal() {
    document.getElementById('productModal').classList.remove('show');
    editingProductId = null;
    document.getElementById('productForm').reset();
    renderImagePreview();
    renderColorVariantRows([]);
}

function renderImagePreview() {
    const preview = document.getElementById('imagePreview');
    if (!preview) return;

    const images = getProductImageUrlsFromForm();
    const previewImages = images.length > 0 ? images : [DEFAULT_PRODUCT_IMAGE];
    preview.innerHTML = previewImages.map((image, index) => (
        `<img src="${escapeHtml(getSafeProductImage(image))}" alt="Зургийн урьдчилсан харагдац ${index + 1}" onerror="this.onerror=null;this.src='${DEFAULT_PRODUCT_IMAGE}'">`
    )).join('');
}

function getProductImageUrlsFromForm() {
    return String(document.getElementById('productImages')?.value || '')
        .split(/\r?\n/)
        .map(image => image.trim())
        .filter(Boolean);
}

function isValidImageUrl(image) {
    try {
        const url = new URL(image);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (error) {
        return false;
    }
}

function isSafeImagePath(image) {
    const imageValue = String(image || '').trim();
    return /^(?!https?:)(?!data:)(?!\/\/)(?!.*(?:^|\/)\.\.(?:\/|$))\.?\/?[\w./ -]+\.(png|jpe?g|webp|gif|avif)$/i.test(imageValue);
}

function isValidImageReference(image) {
    const imageValue = String(image || '').trim();
    return isValidImageUrl(imageValue)
        || imageValue.startsWith('/uploads/')
        || imageValue.startsWith('uploads/')
        || imageValue.startsWith('images/')
        || imageValue.startsWith('./images/')
        || isSafeImagePath(imageValue);
}

function createColorVariantRow(variant = {}) {
    const row = document.createElement('div');
    row.className = 'color-variant-row-admin';
    row.innerHTML = `
        <div class="color-variant-preview-admin">
            <img src="${escapeHtml(getSafeProductImage(variant.image))}" alt="${escapeHtml(variant.name || 'Color variant')}" onerror="this.onerror=null;this.src='${DEFAULT_PRODUCT_IMAGE}'">
        </div>
        <div class="form-group-admin">
            <label>Color name</label>
            <input type="text" class="color-variant-name" placeholder="Black" value="${escapeHtml(variant.name || '')}">
        </div>
        <div class="form-group-admin">
            <label>Color value</label>
            <input type="text" class="color-variant-value" placeholder="#222222 or Black" value="${escapeHtml(variant.color || '')}">
        </div>
        <div class="form-group-admin color-variant-image-field-admin">
            <label>Image URL</label>
            <input type="text" class="color-variant-image" placeholder="https://example.com/black-sofa.jpg эсвэл black-sofa.jpg" value="${escapeHtml(variant.image || '')}">
        </div>
        <button type="button" class="color-variant-remove-btn" data-color-variant-action="remove" aria-label="Remove color variant">
            <i class="fas fa-trash"></i>
        </button>
    `;

    return row;
}

function renderColorVariantRows(variants = []) {
    const list = document.getElementById('colorVariantsList');
    if (!list) return;

    list.innerHTML = '';
    normalizeColorVariants(variants).forEach(variant => {
        list.appendChild(createColorVariantRow(variant));
    });
}

function addColorVariantRow(variant = {}) {
    const list = document.getElementById('colorVariantsList');
    if (!list) return;

    list.appendChild(createColorVariantRow(variant));
}

function getColorVariantsFromForm() {
    return [...document.querySelectorAll('.color-variant-row-admin')]
        .map(row => ({
            name: row.querySelector('.color-variant-name')?.value.trim() || '',
            color: row.querySelector('.color-variant-value')?.value.trim() || '',
            image: row.querySelector('.color-variant-image')?.value.trim() || ''
        }))
        .filter(variant => variant.name || variant.image);
}

function handleColorVariantInput(e) {
    const input = e.target.closest('.color-variant-image, .color-variant-name');
    if (!input) return;

    const row = input.closest('.color-variant-row-admin');
    const image = row?.querySelector('.color-variant-preview-admin img');
    const imageValue = row?.querySelector('.color-variant-image')?.value.trim();
    const nameValue = row?.querySelector('.color-variant-name')?.value.trim();

    if (image) {
        image.src = getSafeProductImage(imageValue);
        image.alt = nameValue || 'Color variant';
    }
}

function handleColorVariantClick(e) {
    const removeButton = e.target.closest('[data-color-variant-action="remove"]');
    if (!removeButton) return;

    removeButton.closest('.color-variant-row-admin')?.remove();
}

async function renderProductCategoryOptions(selectedCategoryId = '') {
    const select = document.getElementById('productCategory');
    if (!select) return;

    const categories = await ensureCategoriesLoaded();
    select.innerHTML = '';

    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.name;
        option.textContent = category.name;
        option.selected = selectedCategoryId ? category.name === selectedCategoryId : category.name === 'Uncategorized';
        select.appendChild(option);
    });

    if (!select.value && categories[0]) {
        select.value = categories[0].name;
    }
}

async function handleProductFormSubmit(e) {
    e.preventDefault();

    const saveButton = document.getElementById('saveProductBtn');
    const originalButtonText = saveButton.textContent;
    const name = document.getElementById('productName').value.trim();
    const description = document.getElementById('productDescription').value.trim();
    const colorVariants = getColorVariantsFromForm();
    const colors = colorVariants.map(variant => variant.name || variant.color).filter(Boolean);
    const price = Number(document.getElementById('productPrice').value);
    const categorySelect = document.getElementById('productCategory');
    const categoryId = categorySelect.value;
    const category = categorySelect.options[categorySelect.selectedIndex]?.textContent || categoryId || 'Uncategorized';
    const stock = Number(document.getElementById('productStock').value);
    const images = getProductImageUrlsFromForm();

    if (images.length === 0) {
        alert('At least one image URL is required.');
        return;
    }

    if (images.some(image => !isValidImageUrl(image))) {
        alert('Image URLs must start with http:// or https://');
        return;
    }

    if (!name || !Number.isFinite(price) || !categoryId || !Number.isFinite(stock)) {
        alert('Бүх талбарыг бөглөнө үү!');
        return;
    }

    if (price <= 0) {
        alert('Үнэ 0-ээс их байх ёстой!');
        return;
    }

    if (stock < 0) {
        alert('Үлдэгдэл 0 эсвэл түүнээс их байх ёстой!');
        return;
    }

    if (colorVariants.some(variant => !variant.name || !variant.color || !variant.image)) {
        alert('Color variant бүрт нэр, өнгөний утга, зурагны URL/зам оруулна уу.');
        return;
    }

    if (colorVariants.some(variant => !isValidImageReference(variant.image))) {
        alert('Color variant image нь http(s) URL эсвэл дэмжигдэх image path байх ёстой.');
        return;
    }

    saveButton.disabled = true;
    saveButton.textContent = 'Хадгалж байна...';

    try {
        const productData = {
            name,
            description,
            price,
            categoryId,
            category,
            colors,
            colorVariants,
            images,
            imageUrl: images[0] || '',
            stock
        };

        logColorVariants('admin submit payload', productData);

        if (editingProductId) {
            await requestJson(`${API_BASE}/products/${editingProductId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(productData)
            });
            alert('Бүтээгдэхүүн амжилттай шинэчлэгдлээ!');
        } else {
            await requestJson(`${API_BASE}/products`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(productData)
            });
            alert('Бүтээгдэхүүн амжилттай нэмэгдлээ!');
        }

        closeProductModal();
        await loadProductsTable();
        await updateDashboard();
        localStorage.setItem('unaProductsUpdatedAt', String(Date.now()));
        window.dispatchEvent(new CustomEvent('products:updated'));
    } catch (error) {
        console.log('Product save failed:', error);
        alert(error.message);
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = originalButtonText;
    }
}

async function loadProductsTable() {
    const tableBody = document.getElementById('productsTableBody');
    const emptyState = document.getElementById('emptyState');
    const table = document.getElementById('productsTable');

    tableBody.innerHTML = '<tr><td colspan="8">Бүтээгдэхүүн уншиж байна...</td></tr>';

    let products = [];

    try {
        products = await fetchProducts();
    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="8">${escapeHtml(error.message)}</td></tr>`;
        return;
    }

    tableBody.innerHTML = '';

    if (products.length === 0) {
        table.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    table.style.display = 'table';
    emptyState.style.display = 'none';

    products.forEach(product => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><img src="${escapeHtml(getProductMainImage(product))}" alt="${escapeHtml(product.name)}" class="product-image-thumb" onerror="this.onerror=null;this.src='${DEFAULT_PRODUCT_IMAGE}'"></td>
            <td class="product-cell-name">${escapeHtml(product.name)}</td>
            <td class="product-cell-description">${escapeHtml(shortenText(product.description, 140))}</td>
            <td><span class="admin-category-badge">${escapeHtml(product.category)}</span></td>
            <td class="product-option-cell">${escapeHtml(product.colorVariantsText || product.colorsText || '-')}</td>
            <td>${Number(product.stock) || 0}</td>
            <td class="product-cell-price">${formatPrice(product.price)}</td>
            <td>
                <div class="table-actions">
                    <button class="action-btn edit-btn" type="button" data-product-action="edit" data-product-id="${escapeHtml(product.id)}">
                        <i class="fas fa-edit"></i> Засварлах
                    </button>
                    <button class="action-btn delete-btn" type="button" data-product-action="delete" data-product-id="${escapeHtml(product.id)}">
                        <i class="fas fa-trash"></i> Устгах
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

async function loadCategoriesTable() {
    const tableBody = document.getElementById('categoriesTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="3">Ангилал уншиж байна...</td></tr>';

    try {
        const categories = await fetchCategories();

        tableBody.innerHTML = categories.map(category => `
            <tr>
                <td>${escapeHtml(category.name)}</td>
                <td>${formatDate(category.createdAt)}</td>
                <td>
                    <div class="table-actions">
                        <button class="action-btn edit-btn" type="button" data-category-action="edit" data-category-id="${escapeHtml(category.id)}">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="action-btn delete-btn" type="button" data-category-action="delete" data-category-id="${escapeHtml(category.id)}">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        await renderProductCategoryOptions(document.getElementById('productCategory')?.value || '');
    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="3">${escapeHtml(error.message)}</td></tr>`;
    }
}

async function handleCategorySubmit(e) {
    e.preventDefault();

    const input = document.getElementById('categoryNameInput');
    const name = input.value.trim();

    if (!name) {
        alert('Category name is required.');
        return;
    }

    try {
        await requestJson(`${API_BASE}/categories`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name })
        });

        input.value = '';
        await loadCategoriesTable();
        localStorage.setItem('unaCategoriesUpdatedAt', String(Date.now()));
        alert('Category added.');
    } catch (error) {
        alert(error.message);
    }
}

async function handleCategoryActionClick(e) {
    const button = e.target.closest('[data-category-action]');
    if (!button) return;

    const categoryId = button.dataset.categoryId;
    const action = button.dataset.categoryAction;
    const category = categoriesCache.find(item => item.id === categoryId);

    if (!category) return;

    if (action === 'edit') {
        const nextName = prompt('New category name:', category.name);
        if (!nextName || nextName.trim() === category.name) return;

        try {
            await requestJson(`${API_BASE}/categories/${categoryId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: nextName.trim() })
            });

            await loadCategoriesTable();
            await loadProductsTable();
            localStorage.setItem('unaCategoriesUpdatedAt', String(Date.now()));
            localStorage.setItem('unaProductsUpdatedAt', String(Date.now()));
        } catch (error) {
            alert(error.message);
        }
    }

    if (action === 'delete') {
        await deleteCategory(categoryId);
    }
}

async function deleteCategory(categoryId, reassign = false) {
    const endpoint = `${API_BASE}/categories/${encodeURIComponent(categoryId)}${reassign ? '?reassign=uncategorized' : ''}`;

    try {
        await requestJson(endpoint, { method: 'DELETE' });
        await loadCategoriesTable();
        await loadProductsTable();
        localStorage.setItem('unaCategoriesUpdatedAt', String(Date.now()));
        localStorage.setItem('unaProductsUpdatedAt', String(Date.now()));
    } catch (error) {
        if (error.requiresReassign || String(error.message).includes('Reassign')) {
            const shouldReassign = confirm('This category has products. Reassign them to Uncategorized?');

            if (shouldReassign) {
                await deleteCategory(categoryId, true);
            }

            return;
        }

        alert(error.message);
    }
}

async function handleProductActionClick(e) {
    const button = e.target.closest('[data-product-action]');
    if (!button) return;

    const productId = button.dataset.productId;
    const action = button.dataset.productAction;

    if (!productId) {
        alert('Бүтээгдэхүүний ID олдсонгүй.');
        return;
    }

    button.disabled = true;
    const originalHtml = button.innerHTML;
    button.innerHTML = 'Түр хүлээнэ үү...';

    try {
        if (action === 'edit') {
            await openEditProductModal(productId);
        } else if (action === 'delete') {
            await deleteProduct(productId);
        }
    } catch (error) {
        alert(error.message);
    } finally {
        button.disabled = false;
        button.innerHTML = originalHtml;
    }
}

async function deleteProduct(productId) {
    const product = productCache.find(item => String(item.id) === String(productId)) || await fetchProduct(productId);

    if (!product) return;

    const confirmDelete = confirm(`"${product.name}" бүтээгдэхүүнийг устгах уу?`);

    if (!confirmDelete) return;

    try {
        await requestJson(`${API_BASE}/products/${productId}`, {
            method: 'DELETE'
        });
        alert('Бүтээгдэхүүн амжилттай устгагдлаа!');
        await loadProductsTable();
        await updateDashboard();
        localStorage.setItem('unaProductsUpdatedAt', String(Date.now()));
    } catch (error) {
        alert(error.message);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text ?? '');
    return div.innerHTML;
}

function formatPrice(price) {
    const numericPrice = Number(price);
    return Number.isFinite(numericPrice) ? `₮${numericPrice.toLocaleString()}` : String(price);
}

function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('mn-MN');
}

function showAdminMessage(elementId, message, type = 'success') {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.textContent = message;
    element.className = `admin-message show ${type}`;
}

function updateAdminNavbarName(user = adminProfile) {
    const payload = getTokenPayload();
    const name = user?.username || payload?.username || 'Админ';

    document.querySelectorAll('.admin-username').forEach(element => {
        element.textContent = name;
    });
}

function getPaymentMethodLabel(method) {
    if (method === 'facebook_chat') return 'Facebook chat';
    if (method === 'bank_transfer') return 'Банк';
    return method || '-';
}

async function fetchOrders() {
    ordersCache = await requestJson(`${API_BASE}/admin/orders`);
    return ordersCache;
}

async function fetchUsers() {
    usersCache = await requestJson(`${API_BASE}/admin/users`);
    return usersCache;
}

async function loadPaymentSettings() {
    const settings = await requestJson(`${API_BASE}/settings/payment`);
    document.getElementById('bankName').value = settings.bankName || '';
    document.getElementById('accountNumber').value = settings.accountNumber || '';
    document.getElementById('accountHolder').value = settings.accountHolder || '';
    document.getElementById('facebookChatUrl').value = settings.facebookChatUrl || '';
}

async function loadAdminProfile() {
    adminProfile = await requestJson(`${API_BASE}/admin/session`);
    updateAdminNavbarName(adminProfile);
    return adminProfile;
}

async function loadAdminAccountSection() {
    const admin = await loadAdminProfile();
    const createAdminForm = document.getElementById('createAdminForm');

    document.getElementById('adminProfileUsername').value = admin.username || '';
    document.getElementById('adminProfileEmail').value = admin.email || '';

    if (createAdminForm) {
        createAdminForm.hidden = admin.role !== 'admin';
    }
}

async function handleAdminProfileSubmit(e) {
    e.preventDefault();

    const username = document.getElementById('adminProfileUsername').value.trim().toLowerCase();
    const email = document.getElementById('adminProfileEmail').value.trim().toLowerCase();

    if (!username) {
        showAdminMessage('adminProfileMessage', 'Username is required.', 'error');
        return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showAdminMessage('adminProfileMessage', 'Valid email is required.', 'error');
        return;
    }

    try {
        const data = await requestJson(`${API_BASE}/admin/me`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email })
        });

        adminProfile = data.user;
        if (data.token) saveToken(data.token);
        updateAdminNavbarName(adminProfile);
        showAdminMessage('adminProfileMessage', 'Admin profile saved.');
    } catch (error) {
        showAdminMessage('adminProfileMessage', error.message, 'error');
    }
}

async function handleAdminPasswordSubmit(e) {
    e.preventDefault();

    const newPassword = document.getElementById('adminNewPassword').value;
    const confirmPassword = document.getElementById('adminConfirmPassword').value;

    if (newPassword !== confirmPassword) {
        showAdminMessage('adminPasswordMessage', 'New passwords do not match.', 'error');
        return;
    }

    if (newPassword.length < 4) {
        showAdminMessage('adminPasswordMessage', 'New password must be at least 4 characters.', 'error');
        return;
    }

    try {
        await requestJson(`${API_BASE}/admin/change-password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                currentPassword: document.getElementById('adminCurrentPassword').value,
                newPassword
            })
        });

        document.getElementById('adminPasswordForm').reset();
        showAdminMessage('adminPasswordMessage', 'Admin password changed.');
    } catch (error) {
        showAdminMessage('adminPasswordMessage', error.message, 'error');
    }
}

async function handleCreateAdminSubmit(e) {
    e.preventDefault();

    const form = document.getElementById('createAdminForm');
    const submitButton = form?.querySelector('button[type="submit"]');
    const originalButtonText = submitButton?.textContent || '';
    const name = document.getElementById('newAdminName').value.trim();
    const usernameEmail = document.getElementById('newAdminUsernameEmail').value.trim().toLowerCase();
    const password = document.getElementById('newAdminPassword').value;
    const confirmPassword = document.getElementById('newAdminConfirmPassword').value;
    const role = document.getElementById('newAdminRole').value;

    if (!name || !usernameEmail || !password || !confirmPassword) {
        showAdminMessage('createAdminMessage', 'All fields are required.', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showAdminMessage('createAdminMessage', 'Password and confirm password must match.', 'error');
        return;
    }

    if (password.length < 6) {
        showAdminMessage('createAdminMessage', 'Password must be at least 6 characters.', 'error');
        return;
    }

    if (!['admin', 'manager'].includes(role)) {
        showAdminMessage('createAdminMessage', 'Role must be admin or manager.', 'error');
        return;
    }

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Бүртгэж байна...';
    }

    try {
        const data = await requestJson(`${API_BASE}/api/admin/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, usernameEmail, password, confirmPassword, role })
        });

        form.reset();
        document.getElementById('newAdminRole').value = 'admin';
        usersCache = [];
        showAdminMessage('createAdminMessage', `${data.user?.username || usernameEmail} account created.`);

        if (document.getElementById('accountsView')?.classList.contains('active')) {
            await loadUsersTable();
        }

        await updateDashboard();
    } catch (error) {
        showAdminMessage('createAdminMessage', error.message, 'error');
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    }
}

async function handlePaymentSettingsSubmit(e) {
    e.preventDefault();

    const settings = {
        bankName: document.getElementById('bankName').value.trim(),
        accountNumber: document.getElementById('accountNumber').value.trim(),
        accountHolder: document.getElementById('accountHolder').value.trim(),
        facebookChatUrl: document.getElementById('facebookChatUrl').value.trim()
    };

    try {
        await requestJson(`${API_BASE}/admin/settings/payment`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });
        alert('Payment settings saved.');
    } catch (error) {
        alert(error.message);
    }
}

async function loadUsersTable() {
    const tableBody = document.getElementById('usersTableBody');
    const emptyState = document.getElementById('usersEmptyState');
    tableBody.innerHTML = '<tr><td colspan="7">Хэрэглэгчид уншиж байна...</td></tr>';

    let users = [];

    try {
        users = await fetchUsers();
    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="7">${escapeHtml(error.message)}</td></tr>`;
        return;
    }

    tableBody.innerHTML = '';
    emptyState.style.display = users.length === 0 ? 'block' : 'none';

    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${escapeHtml(user.username || '-')}</td>
            <td>${escapeHtml(user.fullname || '-')}</td>
            <td>${escapeHtml(user.email || '-')}</td>
            <td>${escapeHtml(user.phone || '-')}</td>
            <td>${escapeHtml(user.address || '-')}</td>
            <td><span class="admin-category-badge">${escapeHtml(user.role || '-')}</span></td>
            <td>${formatDate(user.createdAt)}</td>
        `;
        tableBody.appendChild(row);
    });
}

async function loadOrdersTable() {
    const tableBody = document.getElementById('ordersTableBody');
    const emptyState = document.getElementById('ordersEmptyState');
    tableBody.innerHTML = '<tr><td colspan="10">Захиалгууд уншиж байна...</td></tr>';

    let orders = [];

    try {
        orders = await fetchOrders();
    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="10">${escapeHtml(error.message)}</td></tr>`;
        return;
    }

    tableBody.innerHTML = '';
    emptyState.style.display = orders.length === 0 ? 'block' : 'none';

    orders.forEach(order => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><span class="admin-code-badge">${escapeHtml(order.orderCode || '-')}</span></td>
            <td>${escapeHtml(order.username || '-')}</td>
            <td>${escapeHtml(order.customerName || '-')}</td>
            <td>${escapeHtml(order.phone || '-')}</td>
            <td class="product-cell-price">${formatPrice(order.totalAmount)}</td>
            <td>${escapeHtml(getPaymentMethodLabel(order.paymentMethod))}</td>
            <td>${escapeHtml(order.transactionCode || '-')}</td>
            <td><span class="order-status-badge ${escapeHtml(order.status || 'pending')}">${escapeHtml(order.status || 'pending')}</span></td>
            <td>${formatDate(order.createdAt)}</td>
            <td>
                <div class="table-actions order-actions">
                    <button class="action-btn edit-btn" type="button" data-order-action="details" data-order-id="${escapeHtml(order.id)}">Дэлгэрэнгүй</button>
                    <button class="action-btn edit-btn" type="button" data-order-action="status" data-order-status="paid" data-order-id="${escapeHtml(order.id)}">Төлсөн</button>
                    <button class="action-btn edit-btn" type="button" data-order-action="status" data-order-status="confirmed" data-order-id="${escapeHtml(order.id)}">Баталгаажуулах</button>
                    <button class="action-btn delete-btn" type="button" data-order-action="status" data-order-status="cancelled" data-order-id="${escapeHtml(order.id)}">Цуцлах</button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

async function handleOrderActionClick(e) {
    const button = e.target.closest('[data-order-action]');
    if (!button) return;

    const orderId = button.dataset.orderId;
    const action = button.dataset.orderAction;

    if (!orderId) {
        alert('Захиалгын ID олдсонгүй.');
        return;
    }

    button.disabled = true;
    const originalText = button.textContent;
    button.textContent = 'Түр хүлээнэ үү...';

    try {
        if (action === 'details') {
            await viewOrderDetails(orderId);
        } else if (action === 'status') {
            await updateOrderStatus(orderId, button.dataset.orderStatus);
        }
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
}

async function viewOrderDetails(orderId) {
    try {
        const order = await requestJson(`${API_BASE}/admin/orders/${orderId}`);
        const content = document.getElementById('orderDetailContent');
        document.getElementById('orderModalTitle').textContent = `Захиалга ${order.orderCode || ''}`;
        content.innerHTML = `
            <div class="order-detail-grid">
                <div><span>Username</span><strong>${escapeHtml(order.username || '-')}</strong></div>
                <div><span>Нэр</span><strong>${escapeHtml(order.customerName || '-')}</strong></div>
                <div><span>И-мэйл</span><strong>${escapeHtml(order.email || '-')}</strong></div>
                <div><span>Утас</span><strong>${escapeHtml(order.phone || '-')}</strong></div>
                <div><span>Хаяг</span><strong>${escapeHtml(order.address || '-')}</strong></div>
                <div><span>Нийт</span><strong>${formatPrice(order.totalAmount)}</strong></div>
                <div><span>Төлбөр</span><strong>${escapeHtml(getPaymentMethodLabel(order.paymentMethod))}</strong></div>
                <div><span>Гүйлгээний код</span><strong>${escapeHtml(order.transactionCode || '-')}</strong></div>
                <div><span>Төлөв</span><strong>${escapeHtml(order.status || '-')}</strong></div>
                <div><span>Огноо</span><strong>${formatDate(order.createdAt)}</strong></div>
            </div>
            <h3>Бүтээгдэхүүнүүд</h3>
            <div class="order-items-list">
                ${order.items.map(item => {
                    const options = [
                        item.selectedColor ? `Өнгө: ${item.selectedColor}` : '',
                        item.selectedColorValue ? `Утга: ${item.selectedColorValue}` : ''
                    ].filter(Boolean);

                    return `
                        <div class="order-detail-item">
                            <img src="${escapeHtml(getSafeProductImage(item.image))}" alt="${escapeHtml(item.name)}" onerror="this.onerror=null;this.src='${DEFAULT_PRODUCT_IMAGE}'">
                            <div>
                                <strong>${escapeHtml(item.name)}</strong>
                                ${options.length ? `<div class="order-item-options">${options.map(option => `<small>${escapeHtml(option)}</small>`).join('')}</div>` : ''}
                                <p>${formatPrice(item.price)} × ${Number(item.quantity) || 1}</p>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        document.getElementById('orderModal').classList.add('show');
    } catch (error) {
        alert(error.message);
    }
}

function closeOrderModal() {
    document.getElementById('orderModal').classList.remove('show');
}

async function updateOrderStatus(orderId, status) {
    const labels = {
        paid: 'төлсөн',
        confirmed: 'баталгаажсан',
        cancelled: 'цуцлагдсан'
    };

    try {
        await requestJson(`${API_BASE}/admin/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });
        await loadOrdersTable();
        await updateDashboard();
        alert(`Захиалгын төлөв ${labels[status] || status} боллоо.`);
    } catch (error) {
        alert(`Захиалгын төлөв шинэчлэхэд алдаа гарлаа: ${error.message}`);
    }
}

window.openEditProductModal = openEditProductModal;
window.deleteProduct = deleteProduct;
window.viewOrderDetails = viewOrderDetails;
window.updateOrderStatus = updateOrderStatus;
