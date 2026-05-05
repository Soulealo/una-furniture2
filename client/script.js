const API_BASE = (() => {
    const configuredBase = String(window.UNA_API_BASE || localStorage.getItem('UNA_API_BASE') || '').trim();
    if (configuredBase) return configuredBase.replace(/\/+$/, '');
    if (window.location.protocol === 'file:') return 'http://localhost:8787';
    return '';
})();
const TOKEN_KEY = 'unaToken';
const CART_KEY = 'unaCart';
const DEFAULT_PRODUCT_IMAGE = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%23f5f1ed%22/%3E%3Cpath%20d%3D%22M260%20360l90-110%2070%2085%2055-65%20105%20125H220z%22%20fill%3D%22%23d4b896%22/%3E%3Ccircle%20cx%3D%22545%22%20cy%3D%22205%22%20r%3D%2242%22%20fill%3D%22%23c9a961%22/%3E%3Ctext%20x%3D%22400%22%20y%3D%22465%22%20text-anchor%3D%22middle%22%20font-family%3D%22Arial%2C%20sans-serif%22%20font-size%3D%2234%22%20fill%3D%22%232a2420%22%3EUNA%20Home%3C/text%3E%3C/svg%3E';
const DEMO_PRODUCT_CODES = ['SOFA-001', 'TABLE-001', 'CHAIR-001', 'LIGHT-001', 'DECOR-001', 'ART-001'];
const DEMO_PRODUCT_NAMES = ['UNA Булан Буйдан', 'Модон Хоолны Ширээ', 'Орчин Үеийн Сандал', 'Алтан Гэрэлтүүлэг', 'Интерьер Чимэглэл', 'Ханын Урлагийн Зураг'];
const DEFAULT_CATEGORY_FILTERS = ['Зочны өрөө', 'Унтлагын өрөө', 'Гал тогоо', 'Ажлын өрөө', 'Захиалгат тавилга'];
const CATEGORY_TREE = {
    "Орон зай": ["Зочны өрөө", "Унтлагын өрөө", "Гал тогоо", "Ажлын өрөө", "Захиалгат тавилга"],
    "Тавилга": ["Буйдан ба сандал", "Ширээ ба шүүгээ", "Гэрэлтүүлэг", "Даавуун эдлэл"],
    "Гоёл чимэглэл": ["Ваар ба аяга", "Тавиур ба ширээний хэрэглэл", "Лааны суурь", "Чимэглэлийн хөшөө ба эдлэл", "Зургийн жааз ба хайрцаг"],
    "Хана ба гадна": ["Толь", "Ханын чимэглэл", "Цаг", "Гадна орчны тавилга", "Шинэ загварууд"]
};
const CATEGORY_NAME_MAP = {
    "Office": "Ажлын өрөө",
    "Оффис": "Ажлын өрөө",
    "Textile": "Даавуун эдлэл",
    "Текстиль": "Даавуун эдлэл",
    "Bed": "Ор",
    "Chair": "Сандал",
    "Decor": "Чимэглэл",
    "Sofa": "Буйдан",
    "Uncategorized": "Ангилаагүй",
    "Буйдан & сандал": "Буйдан ба сандал",
    "Ширээ & шүүгээ": "Ширээ ба шүүгээ",
    "Ваар & аяга": "Ваар ба аяга",
    "Tray & tabletop": "Тавиур ба ширээний хэрэглэл",
    "Хөшөө & decor": "Чимэглэлийн хөшөө ба эдлэл",
    "Зургийн жааз & хайрцаг": "Зургийн жааз ба хайрцаг",
    "Гадна орчин": "Гадна орчны тавилга"
};
const LEGACY_CATEGORY_MAP = {
    "Bed": { category: "Орон зай", subCategory: "Унтлагын өрөө" },
    "Chair": { category: "Тавилга", subCategory: "Буйдан ба сандал" },
    "Sofa": { category: "Тавилга", subCategory: "Буйдан ба сандал" },
    "Decor": { category: "Гоёл чимэглэл", subCategory: "Чимэглэлийн хөшөө ба эдлэл" },
    "Uncategorized": { category: "Орон зай", subCategory: "Зочны өрөө" },
    "Office": { category: "Орон зай", subCategory: "Ажлын өрөө" },
    "Оффис": { category: "Орон зай", subCategory: "Ажлын өрөө" },
    "Textile": { category: "Тавилга", subCategory: "Даавуун эдлэл" },
    "Текстиль": { category: "Тавилга", subCategory: "Даавуун эдлэл" },
    "Буйдан & сандал": { category: "Тавилга", subCategory: "Буйдан ба сандал" },
    "Ширээ & шүүгээ": { category: "Тавилга", subCategory: "Ширээ ба шүүгээ" },
    "Ваар & аяга": { category: "Гоёл чимэглэл", subCategory: "Ваар ба аяга" },
    "Tray & tabletop": { category: "Гоёл чимэглэл", subCategory: "Тавиур ба ширээний хэрэглэл" },
    "Хөшөө & decor": { category: "Гоёл чимэглэл", subCategory: "Чимэглэлийн хөшөө ба эдлэл" },
    "Зургийн жааз & хайрцаг": { category: "Гоёл чимэглэл", subCategory: "Зургийн жааз ба хайрцаг" },
    "Гадна орчин": { category: "Хана ба гадна", subCategory: "Гадна орчны тавилга" }
};
const ALL_SUB_CATEGORIES = Object.values(CATEGORY_TREE).flat();

let selectedMainCategory = 'all';
let selectedSubCategory = 'all';
let selectedSort = 'default';
let selectedSearchTerm = '';
let productsCache = [];
let productsLoaded = false;
let categoriesCache = [];
let categoriesLoaded = false;
let authUserCache = null;
let paymentSettingsCache = null;

function clearLegacyProductStorage() {
    ['products', 'unaProducts', 'demoProducts', 'productCache', 'sampleProducts'].forEach(key => {
        localStorage.removeItem(key);
    });
}

async function requestJson(url, options = {}) {
    let response;

    try {
        response = await fetch(url, {
            ...options,
            headers: {
                Accept: 'application/json',
                ...(options.headers || {})
            }
        });
    } catch (error) {
        throw new Error('Сервертэй холбогдох боломжгүй байна. Local server асаалттай эсэхийг шалгана уу.');
    }

    const responseText = await response.text();
    let data = null;

    try {
        data = responseText ? JSON.parse(responseText) : null;
    } catch (error) {
        data = null;
    }

    if (!response.ok) {
        throw new Error(data?.message || 'Сервертэй холбогдох үед алдаа гарлаа.');
    }

    return data?.success === true && Object.prototype.hasOwnProperty.call(data, 'data') ? data.data : data;
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

function isSafeImagePath(image) {
    const imageValue = String(image || '').trim();
    return /^(?!https?:)(?!data:)(?!\/\/)(?!.*(?:^|\/)\.\.(?:\/|$))\.?\/?[\w./ -]+\.(png|jpe?g|webp|gif|avif)$/i.test(imageValue);
}

function getProductMainImage(product) {
    return getSafeProductImage(product?.images?.[0] || product?.imageUrl || product?.image);
}

function normalizeProduct(product, index = 0) {
    const numericPrice = Number(product?.price);
    const numericStock = Number(product?.stock);
    const savedColorVariants = normalizeColorVariants(product?.colorVariants);
    const legacyColorVariants = savedColorVariants.length ? savedColorVariants : normalizeColorVariants(product?.colors);
    const colors = normalizeOptionList(product?.colors ?? product?.colorsText);
    const colorVariants = legacyColorVariants;

    return {
        id: product?.id ? String(product.id) : String(index + 1),
        name: product?.name || 'Бүтээгдэхүүн',
        description: product?.description || '',
        price: Number.isFinite(numericPrice) ? numericPrice : 0,
        salePrice: product?.salePrice === null || product?.salePrice === undefined ? null : Number(product.salePrice) || null,
        discountPercent: Number(product?.discountPercent) || 0,
        categoryId: product?.categoryId || product?.categoryName || product?.category || '',
        category: (() => {
            const raw = CATEGORY_NAME_MAP[product?.categoryName || product?.category] || product?.categoryName || product?.category || 'Ангилаагүй';
            if (CATEGORY_TREE[raw]) return raw;
            if (LEGACY_CATEGORY_MAP[raw]) return LEGACY_CATEGORY_MAP[raw].category;
            // Check if raw is a sub category name and find its parent
            for (const [main, subs] of Object.entries(CATEGORY_TREE)) {
                if (subs.includes(raw)) return main;
            }
            return raw;
        })(),
        subCategory: (() => {
            const rawSub = CATEGORY_NAME_MAP[product?.subCategory] || product?.subCategory || '';
            if (rawSub && ALL_SUB_CATEGORIES.includes(rawSub)) return rawSub;
            const rawCat = product?.categoryName || product?.category || 'Ангилаагүй';
            const mappedCat = CATEGORY_NAME_MAP[rawCat] || rawCat;
            if (LEGACY_CATEGORY_MAP[rawCat]) return LEGACY_CATEGORY_MAP[rawCat].subCategory;
            if (LEGACY_CATEGORY_MAP[mappedCat]) return LEGACY_CATEGORY_MAP[mappedCat].subCategory;
            // If mappedCat is actually a sub category name
            if (ALL_SUB_CATEGORIES.includes(mappedCat)) return mappedCat;
            return rawSub;
        })(),
        sku: product?.sku || product?.productCode || '',
        width: product?.width || product?.dimensions?.width || '',
        height: product?.height || product?.dimensions?.height || '',
        depth: product?.depth || product?.dimensions?.depth || '',
        material: product?.material || '',
        weight: product?.weight || '',
        brand: product?.brand || product?.manufacturer || '',
        deliveryAvailable: product?.deliveryAvailable !== false,
        assemblyRequired: product?.assemblyRequired === true,
        stockStatus: product?.stockStatus || (Number(product?.stock) > 0 ? 'available' : 'out_of_stock'),
        warrantyNote: product?.warrantyNote || '',
        deliveryNote: product?.deliveryNote || '',
        images: Array.isArray(product?.images)
            ? product.images.map(image => String(image || '').trim()).filter(Boolean)
            : String(product?.imageUrl || product?.image || '').trim() ? [String(product?.imageUrl || product?.image || '').trim()] : [],
        colors,
        colorVariants,
        colorsText: formatOptionList(colors),
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

async function fetchProducts() {
    const query = selectedSearchTerm ? `?q=${encodeURIComponent(selectedSearchTerm)}` : '';
    const products = await requestJson(`${API_BASE}/api/products${query}`);
    return normalizeProducts(products);
}

function normalizeCategory(category) {
    const name = category?.name || 'Uncategorized';

    return {
        id: name,
        name,
        createdAt: category?.createdAt
    };
}

async function fetchCategories() {
    const categories = await requestJson(`${API_BASE}/categories`);
    return Array.isArray(categories) ? categories.map(normalizeCategory).filter(category => category.id) : [];
}

async function ensureCategoriesLoaded() {
    if (!categoriesLoaded) {
        try {
            categoriesCache = await fetchCategories();
        } catch (error) {
            console.error(error);
            categoriesCache = [];
        }

        categoriesLoaded = true;
    }

    return categoriesCache;
}

async function ensureProductsLoaded() {
    if (!productsLoaded) {
        try {
            productsCache = await fetchProducts();
        } catch (error) {
            console.error(error);
            productsCache = [];
        }

        productsLoaded = true;
    }

    return productsCache;
}

async function fetchProduct(productId) {
    const product = await requestJson(`${API_BASE}/api/products/${productId}`);
    return normalizeProduct(product);
}

function formatPrice(price) {
    const numericPrice = Number(price);
    return Number.isFinite(numericPrice) ? `₮${numericPrice.toLocaleString()}` : String(price);
}

function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('mn-MN');
}

function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = String(value ?? '');
    return div.innerHTML;
}

// Returns a safe URL for use in href/src attributes. Only http(s), site-relative paths,
// and data:image are permitted — javascript:, vbscript:, file:, etc. are rejected.
function safeUrl(value, fallback = '') {
    const raw = String(value ?? '').trim();
    if (!raw) return fallback;

    // Allow site-relative URLs (`/...`, `./...`, `../...`) and pure paths.
    if (/^(?:\/|\.\.?\/)/.test(raw)) return raw;

    // Allow inline image data URLs.
    if (/^data:image\/(?:png|jpe?g|gif|webp|avif|svg\+xml);/i.test(raw)) return raw;

    // For absolute URLs, require http(s).
    try {
        const parsed = new URL(raw, window.location.origin);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            return parsed.toString();
        }
    } catch (error) {
        // Falls through to fallback.
    }
    return fallback;
}

function parseJsonArray(value) {
    if (Array.isArray(value)) return value;

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

    return [...new Set(values.map(item => {
        if (item && typeof item === 'object') {
            return String(item.name || item.colorValue || item.color_value || item.color || item.value || '').trim();
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
        .map(variant => {
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
        .filter(variant => variant.name || variant.color || variant.image);
}

function shortenText(text, maxLength = 110) {
    const cleanText = String(text ?? '').trim();

    if (cleanText.length <= maxLength) {
        return cleanText;
    }

    return `${cleanText.slice(0, maxLength).trim()}...`;
}

function formatLongText(text) {
    const cleanText = String(text ?? '').trim();

    if (!cleanText) {
        return '<p>Дэлгэрэнгүй мэдээлэл одоогоор байхгүй байна.</p>';
    }

    return cleanText
        .split(/\n{2,}/)
        .map(paragraph => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
        .join('');
}

function getProductOptions(product) {
    const colorVariants = normalizeColorVariants(product?.colorVariants);

    return {
        colorVariants: colorVariants.length ? colorVariants : normalizeColorVariants(product?.colors)
    };
}

function createProductCard(product, useShortDescription = false) {
    const productCard = document.createElement('div');
    const description = shortenText(product.description, useShortDescription ? 110 : 105);
    const { colorVariants } = getProductOptions(product);
    const detailUrl = `product-detail.html?id=${encodeURIComponent(product.id)}`;
    const displayPrice = product.salePrice ? product.salePrice : product.price;
    const materialText = product.material ? escapeHtml(product.material) : 'Сонгомол материал';

    productCard.className = 'product-card';
    productCard.dataset.productId = String(product.id);
    productCard.innerHTML = `
        <div class="product-image">
            <img alt="${escapeHtml(product.name)}" src="${escapeHtml(getProductMainImage(product))}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${DEFAULT_PRODUCT_IMAGE}'"/>
            <div class="product-overlay">
                <a class="view-details-btn" href="${escapeHtml(detailUrl)}" data-product-id="${escapeHtml(product.id)}">Дэлгэрэнгүй харах</a>
            </div>
        </div>
        <div class="product-info">
            <div class="product-meta-row">
                <span class="product-category">${escapeHtml(product.category)}</span>
                <span class="product-material">${materialText}</span>
            </div>
            <h3 class="product-name">${escapeHtml(product.name)}</h3>
            <p class="product-description">${escapeHtml(description)}</p>
            ${colorVariants.length ? `<div class="product-card-swatches" aria-label="Өнгөний сонголт">${colorVariants.slice(0, 5).map(variant => `
                <span title="${escapeHtml(variant.name || variant.colorValue || 'Өнгө')}" style="--swatch:${escapeHtml(variant.colorValue || variant.color || '#d8c7ae')}"></span>
            `).join('')}</div>` : ''}
            <div class="product-footer">
                <span class="product-price">${product.salePrice ? `<small>${formatPrice(product.price)}</small>` : ''}${formatPrice(displayPrice)}</span>
            </div>
            <div class="product-actions">
                <a class="view-details-btn product-details-link" href="${escapeHtml(detailUrl)}" data-product-id="${escapeHtml(product.id)}">Дэлгэрэнгүй харах</a>
                <button class="add-to-cart-btn" type="button" aria-label="Сагсанд нэмэх">
                    <i class="fas fa-shopping-cart"></i>
                    <span>Сагсанд хийх</span>
                </button>
            </div>
        </div>
    `;

    return productCard;
}

function getFilteredAndSortedProducts(products) {
    let visibleProducts = [...products];

    if (selectedMainCategory !== 'all') {
        visibleProducts = visibleProducts.filter(product => product.category === selectedMainCategory);
    }

    if (selectedSubCategory !== 'all') {
        visibleProducts = visibleProducts.filter(product => product.subCategory === selectedSubCategory);
    }

    if (selectedSearchTerm) {
        const normalizedSearch = selectedSearchTerm.toLowerCase();
        visibleProducts = visibleProducts.filter(product => [
            product.name,
            product.description,
            product.category,
            product.subCategory,
            product.colorsText
        ].some(value => String(value || '').toLowerCase().includes(normalizedSearch)));
    }

    if (selectedSort === 'price-asc') {
        visibleProducts.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (selectedSort === 'price-desc') {
        visibleProducts.sort((a, b) => Number(b.price) - Number(a.price));
    } else if (selectedSort === 'name-asc') {
        visibleProducts.sort((a, b) => a.name.localeCompare(b.name, 'mn'));
    } else if (selectedSort === 'name-desc') {
        visibleProducts.sort((a, b) => b.name.localeCompare(a.name, 'mn'));
    }

    return visibleProducts;
}

function renderCategoryFilters() {
    const filterContainer = document.querySelector('.category-filter-buttons');
    let subContainer = document.querySelector('.subcategory-filter-buttons');

    if (!filterContainer) return;

    // Create sub container if not present
    if (!subContainer) {
        subContainer = document.createElement('div');
        subContainer.className = 'subcategory-filter-buttons';
        filterContainer.parentNode.insertBefore(subContainer, filterContainer.nextSibling);
    }

    filterContainer.innerHTML = '';

    const mainCategories = [
        { id: 'all', name: 'Бүх бүтээгдэхүүн' },
        ...Object.keys(CATEGORY_TREE).map(name => ({ id: name, name }))
    ];

    mainCategories.forEach(category => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `category-filter-btn${category.id === selectedMainCategory ? ' active' : ''}`;
        button.textContent = category.name;
        button.addEventListener('click', () => {
            selectedMainCategory = category.id;
            selectedSubCategory = 'all';
            const nextUrl = new URL(window.location.href);
            if (category.id === 'all') {
                nextUrl.searchParams.delete('category');
                nextUrl.searchParams.delete('sub');
            } else {
                nextUrl.searchParams.set('category', category.id);
                nextUrl.searchParams.delete('sub');
            }
            window.history.replaceState({}, '', nextUrl);
            updateActiveNavLinks();
            renderSubCategoryFilters(subContainer);
            renderProducts();
        });
        filterContainer.appendChild(button);
    });

    renderSubCategoryFilters(subContainer);
}

function renderSubCategoryFilters(subContainer) {
    if (!subContainer) return;

    subContainer.innerHTML = '';

    if (selectedMainCategory === 'all' || !CATEGORY_TREE[selectedMainCategory]) {
        subContainer.classList.remove('visible');
        return;
    }

    subContainer.classList.add('visible');
    const subs = CATEGORY_TREE[selectedMainCategory];

    const allButton = document.createElement('button');
    allButton.type = 'button';
    allButton.className = `subcategory-filter-btn${selectedSubCategory === 'all' ? ' active' : ''}`;
    allButton.textContent = 'Бүгд';
    allButton.addEventListener('click', () => {
        selectedSubCategory = 'all';
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.delete('sub');
        window.history.replaceState({}, '', nextUrl);
        renderSubCategoryFilters(subContainer);
        renderProducts();
    });
    subContainer.appendChild(allButton);

    subs.forEach(sub => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `subcategory-filter-btn${sub === selectedSubCategory ? ' active' : ''}`;
        button.textContent = sub;
        button.addEventListener('click', () => {
            selectedSubCategory = sub;
            const nextUrl = new URL(window.location.href);
            nextUrl.searchParams.set('sub', sub);
            window.history.replaceState({}, '', nextUrl);
            renderSubCategoryFilters(subContainer);
            renderProducts();
        });
        subContainer.appendChild(button);
    });
}

async function renderProducts() {
    const productsGrid = document.querySelector('.products-grid');
    if (!productsGrid) return;

    productsGrid.innerHTML = '<p class="empty-products-message">Бүтээгдэхүүн уншиж байна...</p>';

    const products = await ensureProductsLoaded();
    const visibleProducts = getFilteredAndSortedProducts(products);
    const resultCount = document.getElementById('productsResultCount');

    renderCategoryFilters();
    productsGrid.innerHTML = '';

    if (resultCount) {
        resultCount.textContent = `${visibleProducts.length} бүтээгдэхүүн`;
    }

    if (visibleProducts.length === 0) {
        productsGrid.innerHTML = `<p class="empty-products-message">${selectedSearchTerm ? 'Энэ хайлтад бүтээгдэхүүн олдсонгүй.' : 'Бүтээгдэхүүн олдсонгүй'}</p>`;
        return;
    }

    visibleProducts.forEach(product => {
        productsGrid.appendChild(createProductCard(product));
    });
}

function setupProductControls() {
    const sortSelect = document.getElementById('productSort');
    const params = new URLSearchParams(window.location.search);

    selectedSearchTerm = params.get('q')?.trim() || '';

    // Parse category/sub from URL params
    const urlCategory = params.get('category')?.trim() || '';
    const urlSub = params.get('sub')?.trim() || '';

    if (urlCategory && CATEGORY_TREE[urlCategory]) {
        // Direct main category match
        selectedMainCategory = urlCategory;
        if (urlSub && CATEGORY_TREE[urlCategory].includes(urlSub)) {
            selectedSubCategory = urlSub;
        }
    } else if (urlCategory) {
        // Backward compat: urlCategory might be a sub category name
        for (const [main, subs] of Object.entries(CATEGORY_TREE)) {
            if (subs.includes(urlCategory)) {
                selectedMainCategory = main;
                selectedSubCategory = urlCategory;
                // Fix URL
                const nextUrl = new URL(window.location.href);
                nextUrl.searchParams.set('category', main);
                nextUrl.searchParams.set('sub', urlCategory);
                window.history.replaceState({}, '', nextUrl);
                break;
            }
        }
        if (selectedMainCategory === 'all') {
            // Legacy category name like Bed, Chair, etc.
            const mapped = LEGACY_CATEGORY_MAP[urlCategory];
            if (mapped) {
                selectedMainCategory = mapped.category;
                selectedSubCategory = mapped.subCategory;
            }
        }
    }

    if (!sortSelect) return;

    sortSelect.addEventListener('change', (e) => {
        selectedSort = e.target.value;
        renderProducts();
    });
}

function createProductDetailModal() {
    if (document.getElementById('productDetailModal')) return;

    const modal = document.createElement('div');
    modal.id = 'productDetailModal';
    modal.className = 'product-detail-modal';
    modal.innerHTML = `
        <div class="product-detail-content" role="dialog" aria-modal="true" aria-labelledby="detailProductName">
            <button class="product-detail-close" type="button" aria-label="Хаах">
                <i class="fas fa-times"></i>
            </button>
            <div class="product-detail-layout">
                <div class="product-detail-gallery">
                    <div class="product-detail-main-image-wrap">
                        <button class="product-gallery-arrow product-gallery-prev" type="button" aria-label="Өмнөх зураг">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <img id="detailProductImage" src="" alt="">
                        <button class="product-gallery-arrow product-gallery-next" type="button" aria-label="Дараах зураг">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                    <div id="detailProductThumbs" class="product-detail-thumbs"></div>
                </div>
                <div class="product-detail-info">
                    <span id="detailProductCategory" class="product-detail-category"></span>
                    <h2 id="detailProductName"></h2>
                    <p id="detailProductPrice" class="product-detail-price"></p>
                    <div id="detailProductDescription" class="product-detail-description"></div>
                    <div class="product-detail-purchase">
                        <div id="detailProductOptions" class="product-detail-options product-color-variants" hidden>
                            <div class="product-option-group">
                                <span>Өнгөний сонголт</span>
                                <strong id="detailSelectedColorName" class="selected-color-name"></strong>
                                <div id="detailColorVariants" class="detail-color-variants" role="listbox" aria-label="Өнгөний сонголт"></div>
                            </div>
                        </div>
                        <div class="product-detail-purchase-row">
                            <div class="quantity-selector">
                                <button class="quantity-btn quantity-minus" type="button" aria-label="Тоо хасах">-</button>
                                <span id="detailQuantity">1</span>
                                <button class="quantity-btn quantity-plus" type="button" aria-label="Тоо нэмэх">+</button>
                            </div>
                        </div>
                        <div class="product-action-buttons">
                            <button class="cart-action-btn" type="button">Сагслах</button>
                            <button class="buy-action-btn" type="button">Худалдан авах</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

function setDetailMainImage(index) {
    const modal = document.getElementById('productDetailModal');
    const image = document.getElementById('detailProductImage');
    const thumbs = [...document.querySelectorAll('.product-detail-thumb')];
    const images = parseJsonArray(modal?.dataset.images);

    if (!image || images.length === 0) return;

    const nextIndex = (index + images.length) % images.length;
    image.classList.remove('loaded');
    image.src = getSafeProductImage(images[nextIndex]);
    image.onerror = () => {
        image.onerror = null;
        image.src = DEFAULT_PRODUCT_IMAGE;
    };
    modal.dataset.activeImage = String(nextIndex);

    thumbs.forEach((thumb, thumbIndex) => {
        thumb.classList.toggle('active', thumbIndex === nextIndex);
    });

    requestAnimationFrame(() => {
        image.classList.add('loaded');
    });
}

function renderDetailThumbnails(images) {
    const thumbsContainer = document.getElementById('detailProductThumbs');
    if (!thumbsContainer) return;

    thumbsContainer.innerHTML = '';

    images.forEach((image, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `product-detail-thumb${index === 0 ? ' active' : ''}`;
        button.dataset.imageIndex = String(index);
        button.innerHTML = `<img src="${escapeHtml(getSafeProductImage(image))}" alt="Бүтээгдэхүүний зураг ${index + 1}" onerror="this.onerror=null;this.src='${DEFAULT_PRODUCT_IMAGE}'">`;
        thumbsContainer.appendChild(button);
    });
}

function renderProductDetailOptions(product) {
    const optionsContainer = document.getElementById('detailProductOptions');
    const variantsContainer = document.getElementById('detailColorVariants');
    const selectedName = document.getElementById('detailSelectedColorName');
    const { colorVariants } = getProductOptions(product);

    if (!optionsContainer || !variantsContainer) return;

    optionsContainer.hidden = colorVariants.length === 0;
    variantsContainer.innerHTML = '';

    if (colorVariants.length === 0) {
        if (selectedName) selectedName.textContent = '';
        return;
    }

    colorVariants.forEach((variant, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `detail-color-variant${index === 0 ? ' active' : ''}`;
        button.dataset.variantIndex = String(index);
        button.setAttribute('role', 'option');
        button.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
        button.innerHTML = `
            <img src="${escapeHtml(getSafeProductImage(variant.image))}" alt="${escapeHtml(variant.name || variant.colorValue || variant.color || 'Өнгө')}" onerror="this.onerror=null;this.src='${DEFAULT_PRODUCT_IMAGE}'">
            <span>${escapeHtml(variant.name || variant.colorValue || variant.color || 'Өнгө')}</span>
        `;
        variantsContainer.appendChild(button);
    });

    setSelectedColorVariant(0, false);
}

function getDetailSelections() {
    const modal = document.getElementById('productDetailModal');
    const variants = normalizeColorVariants(parseJsonArray(modal?.dataset.colorVariants));
    const selectedIndex = Number(modal?.dataset.selectedColorVariant || 0);
    const variant = variants[selectedIndex];

    if (!variant) return {};

    return {
        selectedColorName: variant.name || variant.colorValue || variant.color || '',
        selectedColor: variant.name || variant.colorValue || variant.color || '',
        selectedColorValue: variant.colorValue || variant.color || '',
        selectedColorImage: variant.image || '',
        selectedSku: variant.sku || '',
        selectedPrice: variant.salePrice || variant.price || '',
        selectedStock: variant.stock
    };
}

function setSelectedColorVariant(index, updateImage = true) {
    const modal = document.getElementById('productDetailModal');
    const selectedName = document.getElementById('detailSelectedColorName');
    const variants = normalizeColorVariants(parseJsonArray(modal?.dataset.colorVariants));
    const variant = variants[index];

    if (!modal || !variant) return;

    modal.dataset.selectedColorVariant = String(index);

    document.querySelectorAll('.detail-color-variant').forEach((button) => {
        const isActive = Number(button.dataset.variantIndex) === index;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    if (selectedName) selectedName.textContent = variant.name || variant.colorValue || variant.color || '';

    if (updateImage && variant.image) {
        const images = parseJsonArray(modal.dataset.images);
        const variantImage = getSafeProductImage(variant.image);
        const existingIndex = images.findIndex(image => getSafeProductImage(image) === variantImage);

        if (existingIndex >= 0) {
            setDetailMainImage(existingIndex);
        } else {
            const image = document.getElementById('detailProductImage');
            if (image) {
                image.classList.remove('loaded');
                image.src = variantImage;
                image.onerror = () => {
                    image.onerror = null;
                    image.src = DEFAULT_PRODUCT_IMAGE;
                };
                requestAnimationFrame(() => {
                    image.classList.add('loaded');
                });
            }
        }
    }
}

async function openProductDetail(productId) {
    const modal = document.getElementById('productDetailModal');
    if (!modal) return;

    await ensureProductsLoaded();

    let product = productsCache.find(item => String(item.id) === String(productId));

    try {
        const freshProduct = await fetchProduct(productId);
        const cachedIndex = productsCache.findIndex(item => String(item.id) === String(productId));
        product = freshProduct;

        if (cachedIndex >= 0) {
            productsCache[cachedIndex] = freshProduct;
        } else {
            productsCache.push(freshProduct);
        }
    } catch (error) {
        if (!product) {
            alert('Бүтээгдэхүүний мэдээлэл унших үед алдаа гарлаа.');
            return;
        }
    }

    const images = product.images.length > 0 ? product.images : [getProductMainImage(product)];
    const image = document.getElementById('detailProductImage');
    const { colorVariants } = getProductOptions(product);
    image.alt = product.name;
    modal.dataset.productId = String(product.id);
    modal.dataset.images = JSON.stringify(images);
    modal.dataset.activeImage = '0';
    modal.dataset.colorVariants = JSON.stringify(colorVariants);
    modal.dataset.selectedColorVariant = '';

    document.getElementById('detailProductCategory').textContent = product.category;
    document.getElementById('detailProductName').textContent = product.name;
    document.getElementById('detailProductDescription').innerHTML = formatLongText(product.description);
    document.getElementById('detailProductPrice').textContent = formatPrice(product.price);
    document.getElementById('detailQuantity').textContent = '1';
    renderDetailThumbnails(images);
    setDetailMainImage(0);
    renderProductDetailOptions(product);

    modal.classList.add('show');
    document.body.classList.add('modal-open');
}

function closeProductDetail() {
    const modal = document.getElementById('productDetailModal');

    if (!modal) return;

    modal.classList.remove('show');
    document.body.classList.remove('modal-open');
}

function setupProductDetailModal() {
    createProductDetailModal();

    document.addEventListener('click', async (e) => {
        const detailsButton = e.target.closest('.view-details-btn');
        const addToCartButton = e.target.closest('.add-to-cart-btn');
        const productCard = e.target.closest('.product-card');
        const closeButton = e.target.closest('.product-detail-close');
        const thumbButton = e.target.closest('.product-detail-thumb');
        const colorVariantButton = e.target.closest('.detail-color-variant');
        const previousButton = e.target.closest('.product-gallery-prev');
        const nextButton = e.target.closest('.product-gallery-next');
        const minusButton = e.target.closest('.quantity-minus');
        const plusButton = e.target.closest('.quantity-plus');
        const cartButton = e.target.closest('.cart-action-btn');
        const buyButton = e.target.closest('.buy-action-btn');
        const modal = document.getElementById('productDetailModal');

        if (detailsButton && detailsButton.tagName !== 'A') {
            openProductDetail(detailsButton.getAttribute('data-product-id'));
        }

        if (addToCartButton && productCard) {
            let product = productsCache.find(item => String(item.id) === String(productCard.dataset.productId));
            try {
                product = await fetchProduct(productCard.dataset.productId);
            } catch (error) {
                // The cached list product is enough for products without variants.
            }

            if (product) {
                const { colorVariants } = getProductOptions(product);

                if (colorVariants.length) {
                    window.location.href = `product-detail.html?id=${encodeURIComponent(product.id)}`;
                } else {
                    addProductToCart(product);
                }
            }
        }

        if (productCard && !e.target.closest('button, a')) {
            window.location.href = `product-detail.html?id=${encodeURIComponent(productCard.dataset.productId)}`;
        }

        if (thumbButton) {
            setDetailMainImage(Number(thumbButton.dataset.imageIndex));
        }

        if (colorVariantButton) {
            setSelectedColorVariant(Number(colorVariantButton.dataset.variantIndex || 0));
        }

        if (previousButton || nextButton) {
            const activeIndex = Number(modal?.dataset.activeImage || 0);
            setDetailMainImage(previousButton ? activeIndex - 1 : activeIndex + 1);
        }

        if (minusButton || plusButton) {
            const quantity = document.getElementById('detailQuantity');
            const currentValue = Number(quantity.textContent);
            const nextValue = plusButton ? currentValue + 1 : Math.max(1, currentValue - 1);
            quantity.textContent = String(nextValue);
        }

        if (cartButton) {
            const productId = modal?.dataset.productId;
            const quantity = Number(document.getElementById('detailQuantity')?.textContent || 1);
            let product = productsCache.find(item => String(item.id) === String(productId));

            if (!product && productId) {
                product = await fetchProduct(productId);
            }

            if (product) addProductToCart(product, quantity, getDetailSelections());
        }

        if (buyButton) {
            const productId = modal?.dataset.productId;
            const quantity = Number(document.getElementById('detailQuantity')?.textContent || 1);
            let product = productsCache.find(item => String(item.id) === String(productId));

            if (!product && productId) {
                product = await fetchProduct(productId);
            }

            if (product && addProductToCart(product, quantity, getDetailSelections())) {
                window.location.href = 'cart.html';
            }
        }

        if (closeButton || e.target === modal) {
            closeProductDetail();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeProductDetail();
        }
    });
}

function getVariantDisplayPrice(product, variant = null) {
    const regular = Number(variant?.price ?? product.price ?? 0);
    const sale = Number(variant?.salePrice ?? product.salePrice ?? 0);

    return {
        regular: Number.isFinite(regular) ? regular : 0,
        sale: Number.isFinite(sale) && sale > 0 ? sale : null,
        current: Number.isFinite(sale) && sale > 0 ? sale : (Number.isFinite(regular) ? regular : 0)
    };
}

function getVariantStock(product, variant = null) {
    if (variant && variant.stock !== null && variant.stock !== undefined && variant.stock !== '') {
        return Number(variant.stock) || 0;
    }

    return Number(product.stock) || 0;
}

function getStockStatus(product, variant = null) {
    const stock = getVariantStock(product, variant);
    if (product.stockStatus === 'preorder') return 'preorder';
    if (product.stockStatus === 'out_of_stock' || stock <= 0) return 'out_of_stock';
    return 'available';
}

function renderProductDetailPrice(product, variant = null) {
    const price = getVariantDisplayPrice(product, variant);
    return price.sale && price.sale < price.regular
        ? `<span class="detail-sale-price">${formatPrice(price.sale)}</span><span class="detail-old-price">${formatPrice(price.regular)}</span>`
        : `<span class="detail-sale-price">${formatPrice(price.current)}</span>`;
}

function getStockStatusLabel(status) {
    if (status === 'preorder') return 'Preorder';
    if (status === 'out_of_stock') return 'Out of stock';
    return 'Available';
}

function getFirstAvailableVariantIndex(product) {
    const { colorVariants } = getProductOptions(product);
    const availableIndex = colorVariants.findIndex(variant => getVariantStock(product, variant) > 0);
    return availableIndex >= 0 ? availableIndex : 0;
}

function setProductDetailPageImage(imageUrl) {
    const mainImage = document.getElementById('pageDetailMainImage');
    if (!mainImage) return;

    mainImage.src = getSafeProductImage(imageUrl);
    mainImage.onerror = () => {
        mainImage.onerror = null;
        mainImage.src = DEFAULT_PRODUCT_IMAGE;
    };
}

function updateProductDetailPageVariant(product, index) {
    const { colorVariants } = getProductOptions(product);
    const variant = colorVariants[index] || null;
    const status = getStockStatus(product, variant);
    const priceElement = document.getElementById('pageDetailPrice');
    const stockElement = document.getElementById('pageDetailStock');
    const skuElement = document.getElementById('pageDetailSku');
    const addButton = document.getElementById('pageDetailAddToCart');

    document.querySelectorAll('.page-color-variant').forEach(button => {
        const active = Number(button.dataset.variantIndex) === index;
        button.classList.toggle('active', active);
        button.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    if (variant?.image) setProductDetailPageImage(variant.image);
    if (priceElement) priceElement.innerHTML = renderProductDetailPrice(product, variant);
    if (stockElement) {
        const stockNumber = Number(getVariantStock(product, variant)) || 0;
        const stockText = status === 'out_of_stock'
            ? 'Дууссан'
            : (stockNumber > 0 ? `${stockNumber} ширхэг бэлэн байна` : getStockStatusLabel(status));
        stockElement.textContent = stockText;
        // Preserve `pd-stock-text` (new layout class) alongside the legacy status class.
        stockElement.className = `pd-stock-text detail-stock-status ${status}`;
    }
    if (skuElement) {
        const skuValue = variant?.sku || product.sku || product.id;
        // The new layout renders the SKU as "SKU: <value>" inline.
        skuElement.textContent = skuElement.classList.contains('pd-buy__sku')
            ? `SKU: ${skuValue}`
            : skuValue;
    }
    if (addButton) addButton.disabled = status === 'out_of_stock';

    const root = document.getElementById('productDetailPageRoot');
    if (root) {
        root.dataset.selectedVariantIndex = variant ? String(index) : '';
        root.dataset.productId = product.id;
    }
}

function renderProductDetailPage(product) {
    const root = document.getElementById('productDetailPageRoot');
    if (!root) return;

    const { colorVariants } = getProductOptions(product);
    const selectedIndex = colorVariants.length ? getFirstAvailableVariantIndex(product) : -1;
    const selectedVariant = selectedIndex >= 0 ? colorVariants[selectedIndex] : null;
    const images = [...new Set([...(product.images || []), ...colorVariants.map(variant => variant.image).filter(Boolean)])];
    const firstImage = selectedVariant?.image || images[0] || getProductMainImage(product);
    const status = getStockStatus(product, selectedVariant);
    const stockNumber = Number(getVariantStock(product, selectedVariant)) || 0;

    // Spec chips at the top of the meta section. Each chip is `{ label, value }`.
    // We only emit chips that have a real value so the row stays clean for sparse data.
    const sku = selectedVariant?.sku || product.sku || product.id;
    const topColor = selectedVariant?.name || product.topColor || product.color || '';
    const legColor = product.legColor || product.secondaryColor || '';
    const dimensions = [product.width, product.height, product.depth].filter(Boolean).join(' × ');
    const specChipsRaw = [
        { label: 'Барааны код', value: sku, accent: true },
        { label: 'Брэнд', value: product.brand },
        { label: 'Тавцангийн өнгө', value: topColor },
        { label: 'Хөлний өнгө', value: legColor },
        { label: 'Материал', value: product.material },
        { label: 'Хэмжээ', value: dimensions }
    ].filter(chip => chip.value);

    // Detailed key/value list shown in the "Үзүүлэлтүүд" block.
    const detailRowsRaw = [
        ['Тавцангийн өнгө', topColor],
        ['Хөлний өнгө', legColor],
        ['Материал', product.material],
        ['Брэнд', product.brand],
        ['Хэмжээ', dimensions],
        ['Жин', product.weight],
        ['Загвар', product.style || product.theme],
        ['Хүргэлт', product.deliveryAvailable ? 'Боломжтой' : ''],
        ['Угсралт', product.assemblyRequired ? 'Шаардлагатай' : '']
    ].filter(([, value]) => value);

    const stockBadgeText = status === 'out_of_stock'
        ? 'Дууссан'
        : (stockNumber > 0 ? `${stockNumber} ширхэг бэлэн байна` : getStockStatusLabel(status));

    const brandLabel = product.brand || 'UNA';
    const brandInitials = brandLabel
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(word => word.charAt(0).toUpperCase())
        .join('') || 'U';

    root.classList.remove('is-loading');
    root.dataset.productId = product.id;
    root.dataset.selectedVariantIndex = selectedIndex >= 0 ? String(selectedIndex) : '';
    root.innerHTML = `
        <div class="pd-page">
            <header class="pd-header">
                <button class="pd-back-btn" type="button" aria-label="Буцах" data-pd-action="back">
                    <i class="fas fa-arrow-left" aria-hidden="true"></i>
                </button>
                <div class="pd-brand-chip" aria-hidden="true">
                    <span class="pd-brand-chip__mark">${escapeHtml(brandInitials)}</span>
                    <span class="pd-brand-chip__name">${escapeHtml(brandLabel)}</span>
                </div>
                <div class="pd-title-block">
                    <h1 class="pd-title">${escapeHtml(product.name)}</h1>
                    <p class="pd-subtitle">
                        <span class="pd-category">${escapeHtml(product.category || '-')}</span>
                        <span class="pd-sku">#${escapeHtml(sku)}</span>
                    </p>
                </div>
            </header>

            <div class="pd-grid">
                <section class="pd-gallery" aria-label="Бүтээгдэхүүний зураг">
                    <div class="pd-main-image-wrap">
                        <button class="pd-icon-btn pd-icon-btn--top-right" type="button" aria-label="Томруулж харах" data-pd-action="zoom">
                            <i class="fas fa-up-right-and-down-left-from-center" aria-hidden="true"></i>
                        </button>
                        <img id="pageDetailMainImage" class="pd-main-image" src="${escapeHtml(getSafeProductImage(firstImage))}" alt="${escapeHtml(product.name)}" onerror="this.onerror=null;this.src='${DEFAULT_PRODUCT_IMAGE}'">
                        <button class="pd-icon-btn pd-icon-btn--bottom-right" type="button" aria-label="Зураг нээх" data-pd-action="zoom">
                            <i class="fas fa-magnifying-glass-plus" aria-hidden="true"></i>
                        </button>
                    </div>
                    <div class="pd-thumbs page-detail-thumbs">
                        ${images.map((image, index) => `
                            <button class="pd-thumb page-detail-thumb${getSafeProductImage(image) === getSafeProductImage(firstImage) ? ' active' : ''}" type="button" data-image="${escapeHtml(image)}" aria-label="Зураг ${index + 1}">
                                <img src="${escapeHtml(getSafeProductImage(image))}" alt="${escapeHtml(product.name)} ${index + 1}" onerror="this.onerror=null;this.src='${DEFAULT_PRODUCT_IMAGE}'">
                            </button>
                        `).join('')}
                    </div>
                </section>

                <aside class="pd-buy" aria-label="Худалдан авалт">
                    <span class="pd-buy__label">Үнэ</span>
                    <div id="pageDetailPrice" class="pd-buy__price">${renderProductDetailPrice(product, selectedVariant)}</div>
                    <hr class="pd-buy__divider">

                    <div class="pd-buy__row">
                        <div class="pd-qty-field" role="group" aria-label="Тоо ширхэг">
                            <span class="pd-qty-field__label">Тоо ширхэг</span>
                            <div class="pd-qty-control">
                                <button class="pd-qty-btn page-quantity-minus" type="button" aria-label="Бууруулах">−</button>
                                <span id="pageDetailQuantity" class="pd-qty-value" aria-live="polite">1</span>
                                <button class="pd-qty-btn page-quantity-plus" type="button" aria-label="Нэмэх">+</button>
                            </div>
                        </div>
                        <p id="pageDetailStock" class="pd-stock-text detail-stock-status ${status}">${escapeHtml(stockBadgeText)}</p>
                    </div>

                    ${colorVariants.length ? `
                        <div class="pd-variant-block">
                            <div class="pd-variant-head">
                                <strong>Өнгөний сонголт</strong>
                                <span>${escapeHtml(selectedVariant?.name || '')}</span>
                            </div>
                            <div class="page-color-variants pd-variant-list" role="listbox" aria-label="Өнгөний сонголт">
                                ${colorVariants.map((variant, index) => `
                                    <button class="page-color-variant pd-variant-chip${index === selectedIndex ? ' active' : ''}" type="button" data-variant-index="${index}" role="option" aria-selected="${index === selectedIndex ? 'true' : 'false'}">
                                        <img src="${escapeHtml(getSafeProductImage(variant.image))}" alt="${escapeHtml(variant.name || 'Өнгө')}" onerror="this.onerror=null;this.src='${DEFAULT_PRODUCT_IMAGE}'">
                                        <span>${escapeHtml(variant.name || variant.colorValue || 'Өнгө')}</span>
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <button id="pageDetailAddToCart" class="pd-buy__cta buy-action-btn" type="button" ${status === 'out_of_stock' ? 'disabled' : ''}>
                        <i class="fas fa-cart-plus" aria-hidden="true"></i>
                        <span>Сагсанд нэмэх</span>
                    </button>
                    <span id="pageDetailSku" class="pd-buy__sku">SKU: ${escapeHtml(sku)}</span>
                </aside>
            </div>

            ${specChipsRaw.length ? `
                <div class="pd-spec-chips" role="list">
                    ${specChipsRaw.map(chip => `
                        <div class="pd-spec-chip${chip.accent ? ' is-accent' : ''}" role="listitem">
                            <span class="pd-spec-chip__label">${escapeHtml(chip.label)}</span>
                            <strong class="pd-spec-chip__value">${escapeHtml(chip.value)}</strong>
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            <div class="pd-banner pd-delivery-banner">
                <span class="pd-banner__icon"><i class="fas fa-location-dot" aria-hidden="true"></i></span>
                <div class="pd-banner__text">
                    <strong>Энгийн</strong>
                    <span>${escapeHtml(product.deliveryNote || '24-48 цагт хүргэнэ')}</span>
                </div>
            </div>

            <div class="pd-banner pd-review-banner" role="button" tabindex="0" data-pd-action="reviews">
                <span class="pd-banner__icon pd-banner__icon--review"><i class="fas fa-comments" aria-hidden="true"></i></span>
                <div class="pd-banner__text">
                    <strong>Сэтгэгдэл байхгүй</strong>
                    <div class="pd-review-stars" aria-label="Үнэлгээ алга">
                        ${'<i class="far fa-star" aria-hidden="true"></i>'.repeat(5)}
                    </div>
                </div>
                <i class="fas fa-chevron-right pd-banner__chevron" aria-hidden="true"></i>
            </div>

            ${detailRowsRaw.length ? `
                <section class="pd-info-section">
                    <h2 class="pd-section-title">Дэлгэрэнгүй мэдээлэл</h2>
                    <h3 class="pd-section-subtitle">Үзүүлэлтүүд</h3>
                    <dl class="pd-info-table">
                        ${detailRowsRaw.map(([label, value]) => `
                            <div class="pd-info-row">
                                <dt>${escapeHtml(label)}</dt>
                                <dd>${escapeHtml(value)}</dd>
                            </div>
                        `).join('')}
                    </dl>
                </section>
            ` : ''}

            ${product.description ? `
                <section class="pd-extra-section">
                    <h2 class="pd-section-title">Нэмэлт мэдээлэл</h2>
                    <div class="pd-extra-text">${formatLongText(product.description)}</div>
                </section>
            ` : ''}

            ${product.deliveryNote || product.warrantyNote ? `
                <div class="pd-notes">
                    ${product.deliveryNote ? `<p><strong>Хүргэлт:</strong> ${escapeHtml(product.deliveryNote)}</p>` : ''}
                    ${product.warrantyNote ? `<p><strong>Баталгаа:</strong> ${escapeHtml(product.warrantyNote)}</p>` : ''}
                </div>
            ` : ''}
        </div>
    `;

    updateProductDetailPageVariant(product, selectedIndex);

    // Wire up the new affordances. The variant/qty/thumb listeners are bound elsewhere
    // (setupProductDetailPage) via event delegation on #productDetailPageRoot, so we
    // only need to handle the new back/zoom/reviews actions here.
    root.querySelector('[data-pd-action="back"]')?.addEventListener('click', () => {
        if (window.history.length > 1) window.history.back();
        else window.location.href = 'products.html';
    });

    const openZoom = () => {
        const img = document.getElementById('pageDetailMainImage');
        if (img?.src) window.open(img.src, '_blank', 'noopener');
    };
    root.querySelectorAll('[data-pd-action="zoom"]').forEach(btn => btn.addEventListener('click', openZoom));
    document.getElementById('pageDetailMainImage')?.addEventListener('click', openZoom);

    const reviewBanner = root.querySelector('[data-pd-action="reviews"]');
    if (reviewBanner) {
        const trigger = () => showToast('Сэтгэгдэл удахгүй нэмэгдэнэ.', 'info');
        reviewBanner.addEventListener('click', trigger);
        reviewBanner.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                trigger();
            }
        });
    }
}

async function renderRelatedProducts(product) {
    const grid = document.getElementById('relatedProductsGrid');
    if (!grid) return;

    const products = await ensureProductsLoaded();
    const related = products
        .filter(item => item.id !== product.id && item.category === product.category)
        .slice(0, 4);

    grid.innerHTML = related.length
        ? ''
        : '<p class="empty-products-message">Төстэй бүтээгдэхүүн одоогоор байхгүй байна.</p>';
    related.forEach(item => grid.appendChild(createProductCard(item, true)));
}

async function setupProductDetailPage() {
    const root = document.getElementById('productDetailPageRoot');
    if (!root) return;

    const productId = new URLSearchParams(window.location.search).get('id');
    if (!productId) {
        root.innerHTML = '<p class="empty-products-message">Бүтээгдэхүүний ID олдсонгүй.</p>';
        return;
    }

    try {
        const product = await fetchProduct(productId);
        const cachedIndex = productsCache.findIndex(item => item.id === product.id);
        if (cachedIndex >= 0) productsCache[cachedIndex] = product;
        else productsCache.push(product);
        renderProductDetailPage(product);
        await renderRelatedProducts(product);
    } catch (error) {
        root.innerHTML = `<p class="empty-products-message">${escapeHtml(error.message)}</p>`;
    }

    root.addEventListener('click', async (e) => {
        const thumb = e.target.closest('.page-detail-thumb');
        const variantButton = e.target.closest('.page-color-variant');
        const minus = e.target.closest('.page-quantity-minus');
        const plus = e.target.closest('.page-quantity-plus');
        const addButton = e.target.closest('#pageDetailAddToCart');
        const product = productsCache.find(item => String(item.id) === String(root.dataset.productId));

        if (!product) return;

        if (thumb) {
            document.querySelectorAll('.page-detail-thumb').forEach(button => button.classList.toggle('active', button === thumb));
            setProductDetailPageImage(thumb.dataset.image);
        }

        if (variantButton) {
            updateProductDetailPageVariant(product, Number(variantButton.dataset.variantIndex || 0));
        }

        if (minus || plus) {
            const quantity = document.getElementById('pageDetailQuantity');
            const value = Number(quantity?.textContent || 1);
            if (quantity) quantity.textContent = String(plus ? value + 1 : Math.max(1, value - 1));
        }

        if (addButton) {
            const { colorVariants } = getProductOptions(product);
            const selectedIndex = Number(root.dataset.selectedVariantIndex || -1);
            const variant = colorVariants[selectedIndex] || null;
            const price = getVariantDisplayPrice(product, variant);
            const quantity = Number(document.getElementById('pageDetailQuantity')?.textContent || 1);
            const added = addProductToCart(product, quantity, {
                selectedColorName: variant?.name || '',
                selectedColorValue: variant?.colorValue || variant?.color || '',
                selectedColorImage: variant?.image || '',
                selectedSku: variant?.sku || product.sku || '',
                selectedPrice: price.current,
                selectedStock: getVariantStock(product, variant)
            });

            if (added) window.location.href = 'cart.html';
        }
    });
}

async function renderFeaturedProducts() {
    const featuredGrid = document.querySelector('.featured-products-grid');
    if (!featuredGrid) return;

    featuredGrid.innerHTML = Array.from({ length: 4 }).map(() => '<div class="product-card product-card-skeleton" aria-hidden="true"></div>').join('');

    let featuredProducts = [];

    try {
        featuredProducts = normalizeProducts(await requestJson(`${API_BASE}/api/products?featured=true`)).slice(0, 4);
    } catch (error) {
        featuredProducts = (await ensureProductsLoaded()).slice(0, 4);
    }

    if (featuredProducts.length === 0) {
        featuredGrid.innerHTML = '<p class="empty-products-message">Бүтээгдэхүүн одоогоор байхгүй байна.</p>';
        return;
    }

    featuredGrid.innerHTML = '';
    featuredProducts.forEach(product => {
        featuredGrid.appendChild(createProductCard(product, true));
    });
}

function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function saveToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}

function removeToken() {
    localStorage.removeItem(TOKEN_KEY);
    authUserCache = null;
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

function getCurrentAuthUser() {
    const payload = authUserCache || getTokenPayload();
    if (!payload) return null;
    if (payload.exp && Number(payload.exp) <= Math.floor(Date.now() / 1000)) return null;
    return payload;
}

function isLoggedIn() {
    return Boolean(getCurrentAuthUser());
}

function getCurrentPageName() {
    const page = window.location.pathname.split('/').pop();
    return page || 'index.html';
}

function redirectToLogin(targetPage = getCurrentPageName()) {
    window.location.href = `login.html?redirect=${encodeURIComponent(targetPage)}`;
}

async function refreshAuthSession() {
    const token = getToken();
    const headers = { Accept: 'application/json' };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE}/auth/me`, {
            headers,
            credentials: 'same-origin'
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
                authUserCache = null;
                if (token) removeToken();
            }

            return null;
        }

        authUserCache = data?.success === true && Object.prototype.hasOwnProperty.call(data, 'data') ? data.data : data;
        return authUserCache;
    } catch (error) {
        return null;
    }
}

async function requestAuthJson(url, options = {}) {
    const token = getToken();

    const headers = {
        Accept: 'application/json',
        ...(options.headers || {})
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    let response;

    try {
        response = await fetch(url, {
            ...options,
            headers,
            credentials: 'same-origin'
        });
    } catch (error) {
        throw new Error('Сервертэй холбогдох боломжгүй байна. Local server асаалттай эсэхийг шалгана уу.');
    }

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
            authUserCache = null;
            redirectToLogin();
        }

        throw new Error(data?.message || 'Сервертэй холбогдох үед алдаа гарлаа.');
    }

    return data?.success === true && Object.prototype.hasOwnProperty.call(data, 'data') ? data.data : data;
}

function showToast(message) {
    let toast = document.querySelector('.site-toast');

    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'site-toast';
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timeoutId);
    showToast.timeoutId = setTimeout(() => {
        toast.classList.remove('show');
    }, 2200);
}

function getCartItems() {
    try {
        const items = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
        return Array.isArray(items) ? items : [];
    } catch (error) {
        return [];
    }
}

function saveCartItems(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    updateCartCount();
}

function getCartCount() {
    return getCartItems().reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
}

function updateCartCount() {
    document.querySelectorAll('[data-cart-count]').forEach(element => {
        element.textContent = String(getCartCount());
    });
}

function getCartItemKey(item) {
    return [item.id, item.selectedColorName || item.selectedColor || item.color || '', item.selectedColorValue || ''].join('::');
}

function getCartOptionLines(item) {
    const selectedColor = String(item.selectedColorName || item.selectedColor || item.color || '').trim();
    const selectedColorValue = String(item.selectedColorValue || item.colorValue || '').trim();
    const lines = [];

    if (selectedColor) lines.push(`Өнгө: ${selectedColor}`);
    if (selectedColorValue && selectedColorValue !== selectedColor) lines.push(selectedColorValue);

    return lines;
}

function addProductToCart(product, quantity = 1, selections = {}) {
    const loggedOut = !isLoggedIn();

    const { colorVariants } = getProductOptions(product);
    const selectedColor = String(selections.selectedColorName || selections.selectedColor || selections.color || '').trim();
    const selectedColorValue = String(selections.selectedColorValue || selections.colorValue || '').trim();
    const selectedColorImage = String(selections.selectedColorImage || selections.colorImage || '').trim();
    const selectedSku = String(selections.selectedSku || selections.sku || product.sku || '').trim();
    const selectedPrice = Number(selections.selectedPrice || selections.price || product.salePrice || product.price || 0);
    const selectedStock = selections.selectedStock === null || selections.selectedStock === undefined || selections.selectedStock === ''
        ? null
        : Number(selections.selectedStock);

    if (colorVariants.length && !selectedColor) {
        alert('Өнгөө сонгоно уу.');
        return false;
    }

    if (selectedColor && colorVariants.length && !colorVariants.some(variant => (variant.name || variant.colorValue || variant.color) === selectedColor || (variant.colorValue || variant.color) === selectedColorValue)) {
        alert('Сонгосон өнгө энэ бүтээгдэхүүнд байхгүй байна.');
        return false;
    }

    const cart = getCartItems();
    const productId = String(product.id);
    const cartKey = [productId, selectedColor, selectedColorValue].join('::');
    const existingItem = cart.find(item => getCartItemKey(item) === cartKey);
    const nextQuantity = Math.max(1, Number(quantity) || 1);

    if ((product.stockStatus === 'out_of_stock') || (Number.isFinite(selectedStock) && selectedStock <= 0)) {
        showToast('Энэ сонголт одоогоор дууссан байна.', 'error');
        return false;
    }

    if (existingItem) {
        existingItem.quantity = (Number(existingItem.quantity) || 1) + nextQuantity;
        existingItem.selectedColorName = selectedColor;
        existingItem.selectedColor = selectedColor;
        existingItem.selectedColorValue = selectedColorValue;
        existingItem.selectedColorImage = selectedColorImage;
        existingItem.image = selectedColorImage || existingItem.image;
        existingItem.price = selectedPrice;
        existingItem.sku = selectedSku;
        existingItem.cartKey = cartKey;
    } else {
        cart.push({
            id: productId,
            cartKey,
            productCode: selectedSku,
            sku: selectedSku,
            name: product.name,
            category: product.category,
            price: selectedPrice,
            image: selectedColorImage || getProductMainImage(product),
            selectedColorName: selectedColor,
            selectedColor,
            selectedColorValue,
            selectedColorImage,
            quantity: nextQuantity
        });
    }

    saveCartItems(cart);
    if (loggedOut) {
        showLoginPromptModal();
        return false;
    }

    showToast('Бүтээгдэхүүн сагсанд нэмэгдлээ.');
    return true;
}

function showLoginPromptModal(redirectTarget = getCurrentPageName()) {
    let modal = document.getElementById('loginPromptModal');

    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'loginPromptModal';
        modal.className = 'auth-prompt-modal';
        modal.innerHTML = `
            <div class="auth-prompt-card" role="dialog" aria-modal="true">
                <button class="auth-prompt-close" type="button" aria-label="Хаах">&times;</button>
                <h3>Сагс хадгалагдлаа</h3>
                <p>Захиалгаа үргэлжлүүлэхийн тулд нэвтэрнэ үү эсвэл шинэ бүртгэл үүсгэнэ үү.</p>
                <div class="auth-prompt-actions">
                    <a class="account-primary-btn" data-auth-login-link href="login.html?redirect=${escapeHtml(redirectTarget)}">Нэвтрэх</a>
                    <a class="account-secondary-btn" href="signup.html">Бүртгүүлэх</a>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.closest('.auth-prompt-close')) {
                modal.classList.remove('show');
            }
        });
    }

    const loginLink = modal.querySelector('[data-auth-login-link]');
    if (loginLink) loginLink.href = `login.html?redirect=${encodeURIComponent(redirectTarget)}`;
    modal.classList.add('show');
}

function removeCartItem(cartItemKey) {
    const cart = getCartItems().filter(item => getCartItemKey(item) !== String(cartItemKey));
    saveCartItems(cart);
    renderCartPage();
}

function changeCartQuantity(cartItemKey, delta) {
    const cart = getCartItems();
    const item = cart.find(cartItem => getCartItemKey(cartItem) === String(cartItemKey));

    if (!item) return;

    item.quantity = Math.max(1, (Number(item.quantity) || 1) + delta);
    saveCartItems(cart);
    renderCartPage();
}

function updateAuthNavigation() {
    const payload = getCurrentAuthUser();
    const isAdmin = payload?.role === 'admin';
    const displayName = isAdmin ? 'Admin' : (payload?.name || payload?.fullname || payload?.username || payload?.email || 'Account');

    document.querySelectorAll('.nav-right').forEach(navRight => {
        if (isLoggedIn()) {
            navRight.innerHTML = `
                <a class="nav-account-link nav-icon-link" href="account.html" aria-label="Аккаунт"><i class="fas fa-user"></i><span>${escapeHtml(displayName)}</span></a>
                <a class="nav-cart-link nav-icon-link" href="cart.html" aria-label="Сагс"><i class="fas fa-shopping-cart"></i><span>Сагс</span><strong data-cart-count>${getCartCount()}</strong></a>
                <button class="nav-logout-btn nav-icon-link logout-btn" type="button" aria-label="Гарах"><i class="fas fa-sign-out-alt"></i><span>Гарах</span></button>
            `;
        } else {
            navRight.innerHTML = `
                <a class="nav-account-link nav-icon-link" href="login.html" aria-label="Нэвтрэх"><i class="fas fa-user"></i><span>Нэвтрэх</span></a>
                <a class="nav-cart-link nav-icon-link" href="cart.html" aria-label="Сагс"><i class="fas fa-shopping-cart"></i><span>Сагс</span><strong data-cart-count>${getCartCount()}</strong></a>
            `;
        }
    });

    const page = document.body.dataset.page;
    if (page === 'account') {
        document.querySelectorAll('.nav-account-link').forEach(link => link.classList.add('active'));
    }
    if (page === 'cart') {
        document.querySelectorAll('.nav-cart-link').forEach(link => link.classList.add('active'));
    }

    updateCartCount();
}

function updateActiveNavLinks() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const currentCategory = new URLSearchParams(window.location.search).get('category')?.trim() || '';

    document.querySelectorAll('.nav-menu .nav-link, .nav-menu .nav-dropdown-link').forEach(link => {
        const href = link.getAttribute('href') || '';
        const linkUrl = new URL(href, window.location.href);
        const linkPage = linkUrl.pathname.split('/').pop() || 'index.html';
        const linkCategory = linkUrl.searchParams.get('category')?.trim() || '';
        const isHomeLink = currentPage === 'index.html' && linkPage === 'index.html' && !href.includes('#');
        const isProductsLink = currentPage === 'products.html' && linkPage === 'products.html' && !linkCategory;
        const isCategoryLink = currentPage === 'products.html' && currentCategory && linkCategory === currentCategory;

        link.classList.toggle('active', isHomeLink || isProductsLink || isCategoryLink);
    });
}

async function setupProtectedPage() {
    if (document.body.dataset.protectedPage === 'true' && !isLoggedIn()) {
        await refreshAuthSession();
    }

    if (document.body.dataset.protectedPage === 'true' && !isLoggedIn()) {
        redirectToLogin(getCurrentPageName());
        return true;
    }

    return false;
}

async function logoutUser() {
    const token = getToken();

    try {
        await fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            credentials: 'same-origin',
            keepalive: true
        });
    } catch (error) {
        // Local logout still clears client state even if the server is unreachable.
    }

    removeToken();
    authUserCache = null;
    // Wipe per-user client state so the next account on this device starts clean.
    try {
        localStorage.removeItem(CART_KEY);
    } catch (error) {
        // localStorage may be unavailable (private mode) — ignore.
    }
    updateAuthNavigation();
    window.location.href = 'index.html';
}

function setupLoginForm() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;
    const params = new URLSearchParams(window.location.search);
    const adminMode = params.get('admin') === '1' || params.get('redirect') === 'admin.html';

    if (adminMode) {
        document.querySelector('.login-form-container h2')?.replaceChildren(document.createTextNode('Админ нэвтрэх'));
        document.querySelector('.login-form-container > p')?.replaceChildren(document.createTextNode('UNA admin эрхээр нэвтрэх'));
        document.querySelector('.create-account')?.setAttribute('hidden', '');
        document.querySelector('label[for="email"]')?.replaceChildren(document.createTextNode('Хэрэглэгчийн нэр'));
        const identityInput = document.getElementById('email');
        if (identityInput) {
            identityInput.type = 'text';
            identityInput.placeholder = 'admin';
            identityInput.autocomplete = 'username';
            identityInput.inputMode = 'text';
        }
    } else {
        const identityInput = document.getElementById('email');
        if (identityInput) {
            identityInput.autocomplete = 'email';
            identityInput.inputMode = 'email';
        }
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim().toLowerCase();
        const password = document.getElementById('password').value;

        try {
            const data = await requestJson(`${API_BASE}${adminMode ? '/admin/login' : '/login'}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(adminMode ? { username: email, password } : { email, password })
            });

            if (adminMode) {
                localStorage.setItem('unaAdminToken', data.token);
            } else {
                saveToken(data.token);
            }
            alert(`Тавтай морил, ${data.user.fullname || data.user.username || data.user.name || 'UNA'}!`);
            loginForm.reset();
            const redirectTarget = params.get('redirect') || (adminMode ? 'admin.html' : 'index.html');
            window.location.href = redirectTarget;
        } catch (error) {
            alert(error.message);
        }
    });
}

function setupPasswordResetForms() {
    const forgotForm = document.getElementById('forgotPasswordForm');
    const resetForm = document.getElementById('resetPasswordForm');

    forgotForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = document.getElementById('forgotPasswordMessage');
        const email = document.getElementById('forgotEmail')?.value.trim().toLowerCase() || '';

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            if (message) message.textContent = 'Зөв имэйл хаяг оруулна уу.';
            return;
        }

        try {
            const data = await requestJson(`${API_BASE}/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            // Backend deliberately does not return a reset link — show only the generic
            // message. The link must reach the user via email, never via the response body.
            if (message) {
                message.textContent = data.message || 'Хэрэв энэ имэйл бүртгэлтэй бол сэргээх заавар очно.';
            }
        } catch (error) {
            if (message) message.textContent = error.message;
        }
    });

    resetForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = document.getElementById('resetPasswordMessage');
        const token = new URLSearchParams(window.location.search).get('token') || '';
        const password = document.getElementById('resetPassword')?.value || '';
        const confirmPassword = document.getElementById('resetConfirmPassword')?.value || '';

        if (password.length < 6) {
            if (message) message.textContent = 'Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой.';
            return;
        }
        if (password !== confirmPassword) {
            if (message) message.textContent = 'Нууц үг таарахгүй байна.';
            return;
        }

        try {
            const data = await requestJson(`${API_BASE}/api/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password })
            });
            if (message) message.innerHTML = `${escapeHtml(data.message || 'Нууц үг солигдлоо.')} <a href="login.html">Нэвтрэх</a>`;
            resetForm.reset();
        } catch (error) {
            if (message) message.textContent = error.message;
        }
    });
}

function renderAccount(user) {
    const displayName = user.fullname || user.name || user.username || user.email || '-';
    const avatarElement = document.querySelector('.account-avatar');

    if (avatarElement) {
        // safeUrl rejects javascript:/vbscript:/etc. — anything that isn't http(s),
        // site-relative, or a data:image URL falls back to the icon.
        const avatarSrc = user.avatar ? safeUrl(user.avatar, '') : '';
        avatarElement.innerHTML = avatarSrc
            ? `<img src="${escapeHtml(avatarSrc)}" alt="${escapeHtml(displayName)}" referrerpolicy="no-referrer">`
            : '<i class="fas fa-user"></i>';
    }

    document.getElementById('accountFullname').textContent = displayName;
    document.getElementById('accountUsername').textContent = user.username || '-';
    document.getElementById('accountName').textContent = displayName;
    document.getElementById('accountEmail').textContent = user.email || '-';
    document.getElementById('accountPhone').textContent = user.phone || '-';
    document.getElementById('accountAddress').textContent = user.address || '-';
    document.getElementById('accountCreatedAt').textContent = formatDate(user.createdAt);
    document.getElementById('accountRole').textContent = user.role || '-';
    document.getElementById('editFullname').value = user.fullname || user.name || '';
    document.getElementById('editPhone').value = user.phone || '';
    document.getElementById('editAddress').value = user.address || '';
}

function showAccountMessage(message, type = 'success') {
    const messageElement = document.getElementById('accountMessage');
    if (!messageElement) return;

    messageElement.textContent = message;
    messageElement.className = `account-message show ${type}`;
}

async function loadAccount() {
    const user = await requestAuthJson(`${API_BASE}/account`);
    renderAccount(user);
    return user;
}

async function loadOrderHistory() {
    const ordersList = document.getElementById('ordersList');
    if (!ordersList) return;

    try {
        const orders = await requestAuthJson(`${API_BASE}/orders/my`);

        if (!Array.isArray(orders) || orders.length === 0) {
            ordersList.innerHTML = '<p class="empty-products-message">Одоогоор захиалгын түүх байхгүй байна.</p>';
            return;
        }

        ordersList.innerHTML = orders.map(order => `
            <article class="order-history-item">
                <div>
                    <strong>${escapeHtml(order.orderCode || '-')}</strong>
                    <span>${formatDate(order.createdAt)}</span>
                </div>
                <p>${formatPrice(order.totalAmount)} · ${escapeHtml(getPaymentMethodLabel(order.paymentMethod))}</p>
                <p>${escapeHtml(order.transactionCode || '-')}</p>
                <strong>${escapeHtml(order.status || 'pending')}</strong>
            </article>
        `).join('');
    } catch (error) {
        ordersList.innerHTML = `<p class="empty-products-message">${escapeHtml(error.message)}</p>`;
    }
}

function setupAccountPage() {
    if (!document.querySelector('.account-section')) return;

    loadAccount().catch(error => showAccountMessage(error.message, 'error'));
    loadOrderHistory();

    const editForm = document.getElementById('accountEditForm');
    const passwordForm = document.getElementById('changePasswordForm');

    document.getElementById('showEditAccountBtn')?.addEventListener('click', () => {
        editForm?.classList.toggle('hidden');
        passwordForm?.classList.add('hidden');
    });

    document.getElementById('showPasswordBtn')?.addEventListener('click', () => {
        passwordForm?.classList.toggle('hidden');
        editForm?.classList.add('hidden');
    });

    editForm?.addEventListener('submit', async (e) => {
        e.preventDefault();

        try {
            const user = await requestAuthJson(`${API_BASE}/account`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fullname: document.getElementById('editFullname').value.trim(),
                    phone: document.getElementById('editPhone').value.trim(),
                    address: document.getElementById('editAddress').value.trim()
                })
            });

            renderAccount(user);
            showAccountMessage('Мэдээлэл амжилттай шинэчлэгдлээ.');
        } catch (error) {
            showAccountMessage(error.message, 'error');
        }
    });

    passwordForm?.addEventListener('submit', async (e) => {
        e.preventDefault();

        try {
            await requestAuthJson(`${API_BASE}/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    oldPassword: document.getElementById('oldPassword').value,
                    newPassword: document.getElementById('newPassword').value
                })
            });

            passwordForm.reset();
            showAccountMessage('Нууц үг амжилттай солигдлоо.');
        } catch (error) {
            showAccountMessage(error.message, 'error');
        }
    });
}

function renderCartPage() {
    const cartItemsElement = document.getElementById('cartItems');
    if (!cartItemsElement) return;

    const emptyElement = document.getElementById('cartEmpty');
    const summaryElement = document.getElementById('cartSummary');
    const itemCountElement = document.getElementById('cartItemCount');
    const totalElement = document.getElementById('cartTotal');
    const resultElement = document.getElementById('bankPaymentResult');
    const cart = getCartItems();
    const itemCount = cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const totalAmount = cart.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);

    if (cart.length === 0) {
        cartItemsElement.innerHTML = '';
        emptyElement?.classList.remove('hidden');
        summaryElement?.classList.add('hidden');
    } else {
        emptyElement?.classList.add('hidden');
        summaryElement?.classList.remove('hidden');
        resultElement?.classList.add('hidden');
        cartItemsElement.innerHTML = cart.map(item => {
            const optionLines = getCartOptionLines(item);

            return `
                <article class="cart-item" data-cart-id="${escapeHtml(getCartItemKey(item))}">
                    <img src="${escapeHtml(getSafeProductImage(item.image))}" alt="${escapeHtml(item.name)}" onerror="this.onerror=null;this.src='${DEFAULT_PRODUCT_IMAGE}'">
                    <div class="cart-item-info">
                        <span>${escapeHtml(item.category || '-')}</span>
                        <h3>${escapeHtml(item.name)}</h3>
                        ${optionLines.length ? `<div class="cart-item-options">${optionLines.map(line => `<small>${escapeHtml(line)}</small>`).join('')}</div>` : ''}
                        <strong>${formatPrice(item.price)}</strong>
                    </div>
                    <div class="cart-quantity-controls">
                        <button class="cart-qty-btn" type="button" data-cart-action="decrease" aria-label="Тоо хасах">-</button>
                        <span>${Number(item.quantity) || 1}</span>
                        <button class="cart-qty-btn" type="button" data-cart-action="increase" aria-label="Тоо нэмэх">+</button>
                    </div>
                    <button class="cart-remove-btn" type="button" data-cart-action="remove">Remove</button>
                </article>
            `;
        }).join('');
    }

    if (itemCountElement) itemCountElement.textContent = String(itemCount);
    if (totalElement) totalElement.textContent = formatPrice(totalAmount);
    renderCheckoutConfirmation();
    fetchPaymentSettings().then(renderCheckoutPaymentInfo).catch(() => renderCheckoutPaymentInfo({}));
    updateCartCount();
}

// In-flight flag to defend against double-clicks creating duplicate orders.
let checkoutInFlight = false;

async function checkoutCart() {
    return checkoutCartWithMethod(getSelectedPaymentMethod());
}

async function fetchPaymentSettings() {
    if (!paymentSettingsCache) {
        paymentSettingsCache = await requestJson(`${API_BASE}/settings/payment`);
    }

    return paymentSettingsCache;
}

function getPaymentMethodLabel(method) {
    if (method === 'facebook_chat') return 'Facebook chat';
    if (method === 'bank_transfer') return 'Банкны шилжүүлэг';
    if (method === 'cash_on_delivery') return 'Бэлэн төлөх';
    if (method === 'qpay') return 'QPay';
    return method || '-';
}

function getCheckoutDeliveryInfo() {
    return {
        fullname: document.getElementById('checkoutFullname')?.value.trim() || '',
        phone: document.getElementById('checkoutPhone')?.value.trim() || '',
        email: document.getElementById('checkoutEmail')?.value.trim() || '',
        address: document.getElementById('checkoutAddress')?.value.trim() || '',
        note: document.getElementById('checkoutNote')?.value.trim() || ''
    };
}

function getSelectedPaymentMethod() {
    return document.querySelector('input[name="checkoutPaymentMethod"]:checked')?.value || 'bank_transfer';
}

function getCheckoutReference() {
    return document.getElementById('checkoutReference')?.value.trim() || '';
}

function getCartOrderPayload(paymentMethod, deliveryInfo = getCheckoutDeliveryInfo()) {
    const cart = getCartItems();

    if (cart.length === 0) {
        showToast('Таны сагс хоосон байна.');
        return null;
    }

    const items = cart.map(item => ({
        productId: item.id,
        productCode: item.sku || item.productCode || '',
        sku: item.sku || item.productCode || '',
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image,
        selectedColorName: item.selectedColorName || item.selectedColor || '',
        selectedColor: item.selectedColorName || item.selectedColor || '',
        selectedColorValue: item.selectedColorValue || '',
        selectedColorImage: item.selectedColorImage || ''
    }));

    const totalAmount = cart.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);

    return {
        items,
        totalAmount,
        paymentMethod,
        channel: paymentMethod === 'facebook_chat' ? 'facebook' : paymentMethod,
        transactionNote: getCheckoutReference(),
        bankReference: getCheckoutReference(),
        deliveryInfo,
        customer: deliveryInfo
    };
}

function renderCheckoutConfirmation() {
    const container = document.getElementById('checkoutConfirmation');
    if (!container) return;

    const cart = getCartItems();
    const totalAmount = cart.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
    const deliveryInfo = getCheckoutDeliveryInfo();
    const paymentMethod = getSelectedPaymentMethod();

    container.innerHTML = `
        <div class="checkout-confirm-lines">
            <span>Бараа</span><strong>${cart.length} төрөл · ${formatPrice(totalAmount)}</strong>
            <span>Хүргэлт</span><strong>${escapeHtml(deliveryInfo.fullname || '-')}, ${escapeHtml(deliveryInfo.phone || '-')}</strong>
            <span>Төлбөр</span><strong>${escapeHtml(getPaymentMethodLabel(paymentMethod))}</strong>
        </div>
    `;
}

function renderCheckoutPaymentInfo(settings = {}) {
    const info = document.getElementById('checkoutPaymentInfo');
    if (!info) return;

    const method = getSelectedPaymentMethod();
    info.classList.remove('hidden');

    if (method === 'bank_transfer') {
        info.innerHTML = `
            <strong>Банкны мэдээлэл</strong>
            <p>${escapeHtml(settings.bankName || 'Банкны мэдээлэл тохируулаагүй байна.')} · ${escapeHtml(settings.accountNumber || '-')}</p>
            <p>${escapeHtml(settings.accountHolder || 'UNA Home & Furniture')}</p>
        `;
    } else if (method === 'facebook_chat') {
        info.innerHTML = '<p>Захиалга баталгаажсаны дараа Messenger link нээгдэнэ.</p>';
    } else if (method === 'qpay') {
        info.innerHTML = `<p>${escapeHtml(settings.qpayInfo || 'QPay төлбөрийн мэдээлэл удахгүй нэмэгдэнэ.')}</p>`;
    } else {
        info.innerHTML = '<p>Бараа хүргэгдэх үед төлбөрөө төлнө.</p>';
    }
}

function renderOrderSuccess(order, settings = {}, paymentMethod = 'bank_transfer') {
    const result = document.getElementById('bankPaymentResult');
    if (!result) return;

    saveCartItems([]);
    renderCartPage();
    document.getElementById('cartSummary')?.classList.remove('hidden');
    result.classList.remove('hidden');
    const messengerUrl = settings.messengerUrl || settings.facebookChatUrl || '';
    const messengerSummary = `Захиалга: ${order.orderCode || ''}\nНийт: ${formatPrice(order.totalAmount || order.total || 0)}`;
    result.innerHTML = `
        <span class="account-kicker">Step 4</span>
        <h3>Таны захиалга амжилттай бүртгэгдлээ</h3>
        <p>Захиалгын код: <strong>${escapeHtml(order.orderCode || '-')}</strong></p>
        ${paymentMethod === 'bank_transfer' ? `
            <div class="bank-info-grid">
                <div><span>Банк</span><strong>${escapeHtml(settings.bankName || '-')}</strong></div>
                <div><span>Данс</span><strong>${escapeHtml(settings.accountNumber || '-')}</strong></div>
                <div><span>Эзэмшигч</span><strong>${escapeHtml(settings.accountHolder || '-')}</strong></div>
            </div>
            <p class="transaction-code-message">Гүйлгээний утга: <strong>${escapeHtml(order.orderCode || '-')}</strong></p>
        ` : ''}
        ${paymentMethod === 'facebook_chat' ? `
            ${messengerUrl ? `<a class="account-primary-btn" href="${escapeHtml(messengerUrl)}" target="_blank" rel="noopener">Messenger нээх</a>` : '<p>Messenger link админ тохиргоонд ороогүй байна.</p>'}
            <button class="account-secondary-btn" type="button" data-copy-order="${escapeHtml(messengerSummary)}">Order summary copy</button>
        ` : ''}
        <a class="account-primary-btn" href="products.html">Бүтээгдэхүүн үзэх</a>
    `;
}

async function checkoutCartWithMethod(paymentMethod) {
    if (checkoutInFlight) return;            // hard guard against rapid double-click
    if (!isLoggedIn()) {
        showLoginPromptModal('checkout.html');
        return;
    }

    const deliveryInfo = getCheckoutDeliveryInfo();
    if (!deliveryInfo.fullname || !deliveryInfo.phone || !deliveryInfo.address) {
        showToast('Хүргэлтийн нэр, утас, хаягаа бөглөнө үү.', 'error');
        return;
    }

    // Mongolian phone: optional +976 prefix, then 8 digits (e.g. 88112233 / +976 9911 2233).
    const phoneDigits = deliveryInfo.phone.replace(/[\s-]/g, '');
    if (!/^(?:\+?976)?\d{8}$/.test(phoneDigits)) {
        showToast('Зөв утасны дугаар оруулна уу (8 оронтой эсвэл +976...).', 'error');
        return;
    }

    if (deliveryInfo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(deliveryInfo.email)) {
        showToast('Зөв имэйл хаяг оруулна уу.', 'error');
        return;
    }

    const payload = getCartOrderPayload(paymentMethod, deliveryInfo);
    if (!payload) return;

    // Idempotency key — backend can use this to drop duplicate submissions if it ever
    // adds a uniqueness check. Even without backend support, the client-side flag below
    // already prevents in-tab double-submits.
    payload.clientRequestId = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const confirmBtn = document.getElementById('confirmCheckoutBtn');
    const originalLabel = confirmBtn ? confirmBtn.textContent : '';
    checkoutInFlight = true;
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.dataset.busy = '1';
        confirmBtn.textContent = 'Захиалж байна...';
    }

    try {
        const settings = await fetchPaymentSettings();
        const order = await requestAuthJson(`${API_BASE}/api/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        renderOrderSuccess(order, settings, paymentMethod);
        if (paymentMethod === 'facebook_chat') {
            const messengerUrl = settings.messengerUrl || settings.facebookChatUrl || '';
            if (messengerUrl) window.open(messengerUrl, '_blank', 'noopener');
        }
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        checkoutInFlight = false;
        if (confirmBtn) {
            confirmBtn.disabled = false;
            delete confirmBtn.dataset.busy;
            if (originalLabel) confirmBtn.textContent = originalLabel;
        }
    }
}

function setupCartPage() {
    if (!document.querySelector('.cart-section') || document.querySelector('.checkout-page-section')) return;

    renderCartPage();

    document.getElementById('cartItems')?.addEventListener('click', (e) => {
        const button = e.target.closest('[data-cart-action]');
        const itemElement = e.target.closest('.cart-item');
        if (!button || !itemElement) return;

        const productId = itemElement.dataset.cartId;
        const action = button.dataset.cartAction;

        if (action === 'increase') changeCartQuantity(productId, 1);
        if (action === 'decrease') changeCartQuantity(productId, -1);
        if (action === 'remove') removeCartItem(productId);
    });

    document.getElementById('checkoutDeliveryForm')?.addEventListener('input', renderCheckoutConfirmation);
    document.querySelectorAll('input[name="checkoutPaymentMethod"]').forEach(input => {
        input.addEventListener('change', async () => {
            renderCheckoutConfirmation();
            renderCheckoutPaymentInfo(await fetchPaymentSettings().catch(() => ({})));
        });
    });
    document.getElementById('confirmCheckoutBtn')?.addEventListener('click', checkoutCart);
    document.getElementById('bankPaymentResult')?.addEventListener('click', async (e) => {
        const copyButton = e.target.closest('[data-copy-order]');
        if (!copyButton) return;
        await navigator.clipboard?.writeText(copyButton.dataset.copyOrder || '');
        showToast('Order summary copied.');
    });
}

function renderCheckoutPage() {
    const layout = document.getElementById('checkoutPageLayout');
    const empty = document.getElementById('checkoutEmpty');
    const itemsElement = document.getElementById('checkoutItems');
    if (!layout || !itemsElement) return;

    const cart = getCartItems();
    const totalAmount = cart.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);

    if (!cart.length) {
        layout.classList.add('hidden');
        empty?.classList.remove('hidden');
        return;
    }

    layout.classList.remove('hidden');
    empty?.classList.add('hidden');
    itemsElement.innerHTML = cart.map(item => {
        const options = getCartOptionLines(item);
        return `
            <article class="cart-item">
                <img src="${escapeHtml(getSafeProductImage(item.image))}" alt="${escapeHtml(item.name)}" onerror="this.onerror=null;this.src='${DEFAULT_PRODUCT_IMAGE}'">
                <div class="cart-item-info">
                    <span>${escapeHtml(item.category || '-')}</span>
                    <h3>${escapeHtml(item.name)}</h3>
                    ${options.length ? `<div class="cart-item-options">${options.map(line => `<small>${escapeHtml(line)}</small>`).join('')}</div>` : ''}
                    <strong>${formatPrice(item.price)} × ${Number(item.quantity) || 1}</strong>
                </div>
            </article>
        `;
    }).join('');

    const totalLine = document.createElement('div');
    totalLine.className = 'summary-row total';
    totalLine.innerHTML = `<span>Нийт үнэ</span><strong>${formatPrice(totalAmount)}</strong>`;
    itemsElement.appendChild(totalLine);
    renderCheckoutConfirmation();
}

function setupCheckoutPage() {
    if (!document.querySelector('.checkout-page-section')) return;

    renderCheckoutPage();
    document.getElementById('checkoutDeliveryForm')?.addEventListener('input', renderCheckoutConfirmation);
    document.getElementById('checkoutReference')?.addEventListener('input', renderCheckoutConfirmation);
    document.querySelectorAll('input[name="checkoutPaymentMethod"]').forEach(input => {
        input.addEventListener('change', async () => {
            renderCheckoutConfirmation();
            renderCheckoutPaymentInfo(await fetchPaymentSettings().catch(() => ({})));
        });
    });
    document.getElementById('confirmCheckoutBtn')?.addEventListener('click', checkoutCart);
    fetchPaymentSettings().then(renderCheckoutPaymentInfo).catch(() => renderCheckoutPaymentInfo({}));
    document.getElementById('bankPaymentResult')?.addEventListener('click', async (e) => {
        const copyButton = e.target.closest('[data-copy-order]');
        if (!copyButton) return;
        await navigator.clipboard?.writeText(copyButton.dataset.copyOrder || '');
        showToast('Order summary copied.');
    });
}

function setupSignupForm() {
    const signupForm = document.getElementById('signupForm');
    if (!signupForm) return;

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fullname = document.getElementById('fullname').value.trim();
        const email = document.getElementById('signup-email').value.trim().toLowerCase();
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (password !== confirmPassword) {
            alert('Нууц үг таарахгүй байна!');
            return;
        }

        if (password.length < 6) {
            alert('Нууц үг дор хаяж 6 тэмдэгт байх ёстой!');
            return;
        }

        try {
            await requestJson(`${API_BASE}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ fullname, email, password })
            });

            alert(`UNA Home & Furniture-д тавтай морил, ${fullname}! Таны бүртгэл амжилттай үүслээ.`);
            signupForm.reset();
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1200);
        } catch (error) {
            alert(error.message);
        }
    });
}

function setupPasswordToggles() {
    const passwordToggles = [
        ['togglePasswordSignup', 'signup-password'],
        ['togglePassword', 'password'],
        ['togglePasswordConfirm', 'confirm-password']
    ];

    passwordToggles.forEach(([buttonId, inputId]) => {
        const button = document.getElementById(buttonId);
        const input = document.getElementById(inputId);

        if (!button || !input) return;

        button.addEventListener('click', (e) => {
            e.preventDefault();
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            button.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
        });
    });
}

function setupNavigation() {
    updateAuthNavigation();
    updateActiveNavLinks();

    document.querySelectorAll('.nav-logo').forEach(logo => {
        logo.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    });

    document.querySelectorAll('.hamburger').forEach(hamburger => {
        hamburger.addEventListener('click', () => {
            const navMenu = hamburger.closest('.nav-container')?.querySelector('.nav-menu');
            const navbar = hamburger.closest('.navbar');
            const isActive = navMenu?.classList.toggle('active') || false;
            if (isActive && navMenu) navMenu.scrollTop = 0;
            hamburger.classList.toggle('active', isActive);
            navbar?.classList.toggle('nav-menu-open', isActive);
        });

        hamburger.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            e.preventDefault();
            hamburger.click();
        });
    });

    document.querySelectorAll('.nav-menu .nav-link, .nav-menu .nav-dropdown-link').forEach(link => {
        link.addEventListener('click', () => {
            document.querySelectorAll('.nav-menu.active').forEach(menu => menu.classList.remove('active'));
            document.querySelectorAll('.hamburger.active').forEach(hamburger => hamburger.classList.remove('active'));
            document.querySelectorAll('.navbar.nav-menu-open').forEach(navbar => navbar.classList.remove('nav-menu-open'));
        });
    });

    document.addEventListener('click', (e) => {
        if (e.target.closest('.logout-btn')) {
            e.preventDefault();
            logoutUser();
        }
    });
}

function setupNavbarScrollState() {
    const navbar = document.querySelector('.navbar');

    if (!navbar || !document.body.classList.contains('home-page')) return;

    const updateNavbarState = () => {
        navbar.classList.toggle('navbar-scrolled', window.scrollY > 18);
    };

    updateNavbarState();
    window.addEventListener('scroll', updateNavbarState, { passive: true });
}

function setupNavSearch() {
    const currentSearchTerm = new URLSearchParams(window.location.search).get('q')?.trim() || '';
    let searchTimer = null;

    document.querySelectorAll('.nav-search').forEach(form => {
        const input = form.querySelector('input[type="search"]');
        const isProductsPage = Boolean(document.querySelector('.products-grid'));

        if (input && isProductsPage) {
            input.value = currentSearchTerm;
            selectedSearchTerm = currentSearchTerm;
            input.addEventListener('input', () => {
                clearTimeout(searchTimer);
                searchTimer = setTimeout(async () => {
                    selectedSearchTerm = input.value.trim();
                    const nextUrl = selectedSearchTerm ? `products.html?q=${encodeURIComponent(selectedSearchTerm)}` : 'products.html';
                    window.history.replaceState({}, '', nextUrl);
                    productsLoaded = false;
                    await renderProducts();
                }, 300);
            });
        }

        form.addEventListener('submit', (e) => {
            const query = input?.value.trim() || '';

            e.preventDefault();
            if (!query) {
                window.location.href = 'products.html';
                return;
            }

            if (isProductsPage) {
                selectedSearchTerm = query;
                productsLoaded = false;
                renderProducts();
                return;
            }

            window.location.href = `products.html?q=${encodeURIComponent(query)}`;
        });
    });
}

function setupStaticActions() {
    document.querySelectorAll('.google-signup-btn, .google-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            alert('Google-ийн нэвтрэлт удахгүй нэмэгдэх болно.');
        });
    });

    document.querySelectorAll('.forgot-password').forEach(link => {
        link.setAttribute('href', 'forgot-password.html');
    });

    document.querySelectorAll('.terms-link').forEach(link => {
        if (link.textContent.includes('Нууцлал')) {
            link.setAttribute('href', 'privacy.html');
        } else {
            link.setAttribute('href', 'terms.html');
        }
    });

    document.querySelectorAll('.social-links a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            alert('Сошиал холбоос удахгүй нэмэгдэх болно.');
        });
    });

    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(contactForm);
            const payload = {
                name: String(formData.get('name') || '').trim(),
                email: String(formData.get('email') || '').trim(),
                phone: String(formData.get('phone') || '').trim(),
                message: String(formData.get('message') || '').trim()
            };

            if (!payload.name || !payload.email || !payload.message) {
                showToast('Нэр, имэйл, зурвасаа бөглөнө үү.', 'error');
                return;
            }

            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
                showToast('Зөв имэйл хаяг оруулна уу.', 'error');
                return;
            }

            try {
                await requestJson(`${API_BASE}/api/contact`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
                showToast('Таны зурвас амжилттай илгээгдлээ.');
                contactForm.reset();
            } catch (error) {
                showToast(error.message, 'error');
            }
        });
    }
}

async function hydrateContactInfo() {
    const targets = {
        '[data-contact-address]': 'storeAddress',
        '[data-contact-phone]': 'contactPhone',
        '[data-contact-email]': 'contactEmail',
        '[data-contact-hours]': 'workingHours'
    };

    if (!document.querySelector(Object.keys(targets).join(','))) return;

    try {
        const settings = await fetchPaymentSettings();
        Object.entries(targets).forEach(([selector, key]) => {
            const element = document.querySelector(selector);
            const wrapper = element?.closest('[data-contact-field]');
            const fallback = element?.dataset.fallback || '';
            const value = settings[key] || fallback;
            if (element && value) {
                element.textContent = value;
                if (wrapper) wrapper.hidden = false;
            } else if (wrapper) {
                wrapper.hidden = true;
            }
        });
        const map = document.querySelector('[data-contact-map]');
        const iframe = map?.querySelector('iframe');
        if (map && iframe && settings.storeAddress) {
            iframe.src = `https://www.google.com/maps?q=${encodeURIComponent(settings.storeAddress)}&output=embed`;
            map.hidden = false;
        } else if (map) {
            map.hidden = true;
        }
    } catch (error) {
        Object.keys(targets).forEach(selector => {
            const element = document.querySelector(selector);
            const wrapper = element?.closest('[data-contact-field]');
            const fallback = element?.dataset.fallback || '';
            if (element && fallback) {
                element.textContent = fallback;
                if (wrapper) wrapper.hidden = false;
            } else if (wrapper) {
                wrapper.hidden = true;
            }
        });
        document.querySelector('[data-contact-map]')?.setAttribute('hidden', '');
    }
}

function setupHeroVideoAutoplay() {
    const video = document.querySelector('.hero-video');

    if (video) {
        video.muted = true;
        video.controls = false;
        video.preload = 'auto';
        video.removeAttribute('controls');
        video.setAttribute('muted', '');
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        video.setAttribute('preload', 'auto');
        video.play().catch(() => {
            video.classList.add('is-autoplay-blocked');
        });
    }
}

function setupHashSmoothScroll() {
    if (window.location.hash !== '#services') return;

    window.requestAnimationFrame(() => {
        document.getElementById('services')?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    clearLegacyProductStorage();

    await refreshAuthSession();
    if (await setupProtectedPage()) return;

    setupNavigation();
    setupNavbarScrollState();
    setupNavSearch();
    setupStaticActions();
    setupHeroVideoAutoplay();
    setupHashSmoothScroll();
    await hydrateContactInfo();
    setupPasswordToggles();
    setupLoginForm();
    setupPasswordResetForms();
    setupSignupForm();
    setupAccountPage();
    setupCartPage();
    setupCheckoutPage();
    await setupProductDetailPage();
    setupProductControls();
    setupProductDetailModal();
    await renderProducts();
    await renderFeaturedProducts();

    window.addEventListener('products:updated', async () => {
        productsLoaded = false;
        await renderProducts();
        await renderFeaturedProducts();
    });

    window.addEventListener('categories:updated', async () => {
        categoriesLoaded = false;
        productsLoaded = false;
        await renderProducts();
        await renderFeaturedProducts();
    });

    window.addEventListener('storage', async (event) => {
        if (!['unaProductsUpdatedAt', 'unaCategoriesUpdatedAt'].includes(event.key)) return;

        categoriesLoaded = false;
        productsLoaded = false;
        await renderProducts();
        await renderFeaturedProducts();
    });

    window.addEventListener('focus', async () => {
        if (!document.querySelector('.products-grid, .featured-products-grid')) return;

        productsLoaded = false;
        categoriesLoaded = false;
        await renderProducts();
        await renderFeaturedProducts();
    });
});
