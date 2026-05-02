const API_BASE = (() => {
    return '';
})();
const TOKEN_KEY = 'unaToken';
const CART_KEY = 'unaCart';
const DEFAULT_PRODUCT_IMAGE = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%23f5f1ed%22/%3E%3Cpath%20d%3D%22M260%20360l90-110%2070%2085%2055-65%20105%20125H220z%22%20fill%3D%22%23d4b896%22/%3E%3Ccircle%20cx%3D%22545%22%20cy%3D%22205%22%20r%3D%2242%22%20fill%3D%22%23c9a961%22/%3E%3Ctext%20x%3D%22400%22%20y%3D%22465%22%20text-anchor%3D%22middle%22%20font-family%3D%22Arial%2C%20sans-serif%22%20font-size%3D%2234%22%20fill%3D%22%232a2420%22%3EUNA%20Home%3C/text%3E%3C/svg%3E';
const DEMO_PRODUCT_CODES = ['SOFA-001', 'TABLE-001', 'CHAIR-001', 'LIGHT-001', 'DECOR-001', 'ART-001'];
const DEMO_PRODUCT_NAMES = ['UNA Булан Буйдан', 'Модон Хоолны Ширээ', 'Орчин Үеийн Сандал', 'Алтан Гэрэлтүүлэг', 'Интерьер Чимэглэл', 'Ханын Урлагийн Зураг'];

let selectedCategoryId = 'all';
let selectedSort = 'default';
let selectedSearchTerm = '';
let productsCache = [];
let productsLoaded = false;
let categoriesCache = [];
let categoriesLoaded = false;
let authUserCache = null;

function clearLegacyProductStorage() {
    ['products', 'unaProducts', 'demoProducts', 'productCache', 'sampleProducts'].forEach(key => {
        localStorage.removeItem(key);
    });
}

async function requestJson(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            Accept: 'application/json',
            ...(options.headers || {})
        }
    });
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
        categoryId: product?.categoryId || product?.categoryName || product?.category || '',
        category: product?.categoryName || product?.category || 'Uncategorized',
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
    const products = await requestJson(`${API_BASE}/products`);
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
    const product = await requestJson(`${API_BASE}/products/${productId}`);
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

    productCard.className = 'product-card';
    productCard.dataset.productId = String(product.id);
    productCard.innerHTML = `
        <div class="product-image">
            <img alt="${escapeHtml(product.name)}" src="${escapeHtml(getProductMainImage(product))}" onerror="this.onerror=null;this.src='${DEFAULT_PRODUCT_IMAGE}'"/>
            <div class="product-overlay">
                <button class="view-details-btn" type="button" data-product-id="${escapeHtml(product.id)}">Дэлгэрэнгүй үзэх</button>
            </div>
        </div>
        <div class="product-info">
            <span class="product-category">${escapeHtml(product.category)}</span>
            <h3 class="product-name">${escapeHtml(product.name)}</h3>
            <p class="product-description">${escapeHtml(description)}</p>
            <div class="product-footer">
                <span class="product-price">${formatPrice(product.price)}</span>
                <button class="add-to-cart-btn" type="button" aria-label="Сагсанд нэмэх">
                    <i class="fas fa-shopping-cart"></i>
                </button>
            </div>
        </div>
    `;

    return productCard;
}

function getFilteredAndSortedProducts(products) {
    let visibleProducts = [...products];

    if (selectedCategoryId !== 'all') {
        visibleProducts = visibleProducts.filter(product => product.categoryId === selectedCategoryId);
    }

    if (selectedSearchTerm) {
        const normalizedSearch = selectedSearchTerm.toLowerCase();
        visibleProducts = visibleProducts.filter(product => [
            product.name,
            product.description,
            product.category,
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

function renderCategoryFilters(categories) {
    const filterContainer = document.querySelector('.category-filter-buttons');

    if (!filterContainer) return;

    filterContainer.innerHTML = '';

    const categoryOptions = [
        { id: 'all', name: 'Бүх бүтээгдэхүүн' },
        ...categories
    ];

    if (selectedCategoryId !== 'all' && !categories.some(category => category.id === selectedCategoryId)) {
        selectedCategoryId = 'all';
    }

    categoryOptions.forEach(category => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `category-filter-btn${category.id === selectedCategoryId ? ' active' : ''}`;
        button.textContent = category.name;
        button.addEventListener('click', () => {
            selectedCategoryId = category.id;
            renderProducts();
        });
        filterContainer.appendChild(button);
    });
}

async function renderProducts() {
    const productsGrid = document.querySelector('.products-grid');
    if (!productsGrid) return;

    productsGrid.innerHTML = '<p class="empty-products-message">Бүтээгдэхүүн уншиж байна...</p>';

    const [products, categories] = await Promise.all([
        ensureProductsLoaded(),
        ensureCategoriesLoaded()
    ]);
    const visibleProducts = getFilteredAndSortedProducts(products);
    const resultCount = document.getElementById('productsResultCount');

    renderCategoryFilters(categories);
    productsGrid.innerHTML = '';

    if (resultCount) {
        resultCount.textContent = `${visibleProducts.length} бүтээгдэхүүн`;
    }

    if (visibleProducts.length === 0) {
        productsGrid.innerHTML = `<p class="empty-products-message">${selectedSearchTerm ? 'Энэ хайлтад бүтээгдэхүүн олдсонгүй.' : 'Энэ ангилалд бүтээгдэхүүн байхгүй байна.'}</p>`;
        return;
    }

    visibleProducts.forEach(product => {
        productsGrid.appendChild(createProductCard(product));
    });
}

function setupProductControls() {
    const sortSelect = document.getElementById('productSort');

    selectedSearchTerm = new URLSearchParams(window.location.search).get('q')?.trim() || '';

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
                        <div class="product-detail-purchase-row">
                            <div class="quantity-selector">
                                <button class="quantity-btn quantity-minus" type="button" aria-label="Тоо хасах">-</button>
                                <span id="detailQuantity">1</span>
                                <button class="quantity-btn quantity-plus" type="button" aria-label="Тоо нэмэх">+</button>
                            </div>
                            <div id="detailProductOptions" class="product-detail-options product-color-variants" hidden>
                                <div class="product-option-group">
                                    <span>Өнгөний сонголт</span>
                                    <strong id="detailSelectedColorName" class="selected-color-name"></strong>
                                    <div id="detailColorVariants" class="detail-color-variants" role="listbox" aria-label="Өнгөний сонголт"></div>
                                </div>
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

    setSelectedColorVariant(0);
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
        selectedColorImage: variant.image || ''
    };
}

function setSelectedColorVariant(index) {
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

    if (variant.image) {
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

        if (detailsButton) {
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
                    openProductDetail(product.id);
                } else {
                    addProductToCart(product);
                }
            }
        }

        if (productCard && !e.target.closest('button')) {
            openProductDetail(productCard.dataset.productId);
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

async function renderFeaturedProducts() {
    const featuredGrid = document.querySelector('.featured-products-grid');
    if (!featuredGrid) return;

    featuredGrid.innerHTML = '<p class="empty-products-message">Бүтээгдэхүүн уншиж байна...</p>';

    const featuredProducts = (await ensureProductsLoaded()).slice(0, 4);
    featuredGrid.innerHTML = '';

    if (featuredProducts.length === 0) {
        featuredGrid.innerHTML = '<p class="empty-products-message">Бүтээгдэхүүн одоогоор байхгүй байна.</p>';
        return;
    }

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

    const response = await fetch(url, {
        ...options,
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
    if (!isLoggedIn()) {
        redirectToLogin(getCurrentPageName());
        return false;
    }

    const { colorVariants } = getProductOptions(product);
    const selectedColor = String(selections.selectedColorName || selections.selectedColor || selections.color || '').trim();
    const selectedColorValue = String(selections.selectedColorValue || selections.colorValue || '').trim();
    const selectedColorImage = String(selections.selectedColorImage || selections.colorImage || '').trim();

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

    if (existingItem) {
        existingItem.quantity = (Number(existingItem.quantity) || 1) + nextQuantity;
        existingItem.selectedColorName = selectedColor;
        existingItem.selectedColor = selectedColor;
        existingItem.selectedColorValue = selectedColorValue;
        existingItem.selectedColorImage = selectedColorImage;
        existingItem.image = selectedColorImage || existingItem.image;
        existingItem.cartKey = cartKey;
    } else {
        cart.push({
            id: productId,
            cartKey,
            productCode: '',
            name: product.name,
            category: product.category,
            price: Number(product.price) || 0,
            image: selectedColorImage || getProductMainImage(product),
            selectedColorName: selectedColor,
            selectedColor,
            selectedColorValue,
            selectedColorImage,
            quantity: nextQuantity
        });
    }

    saveCartItems(cart);
    showToast('Бүтээгдэхүүн сагсанд нэмэгдлээ.');
    return true;
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
    updateAuthNavigation();
    window.location.href = 'index.html';
}

function setupLoginForm() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim().toLowerCase();
        const password = document.getElementById('password').value;

        try {
            const data = await requestJson(`${API_BASE}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            saveToken(data.token);
            alert(`Тавтай морил, ${data.user.fullname}!`);
            loginForm.reset();
            const redirectTarget = new URLSearchParams(window.location.search).get('redirect') || 'index.html';
            window.location.href = redirectTarget;
        } catch (error) {
            alert(error.message);
        }
    });
}

function renderAccount(user) {
    const displayName = user.fullname || user.name || user.username || user.email || '-';
    const avatarElement = document.querySelector('.account-avatar');

    if (avatarElement) {
        avatarElement.innerHTML = user.avatar
            ? `<img src="${escapeHtml(user.avatar)}" alt="${escapeHtml(displayName)}" referrerpolicy="no-referrer">`
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
    updateCartCount();
}

async function checkoutCart() {
    return checkoutCartWithMethod('bank_transfer');
}

async function fetchPaymentSettings() {
    return requestJson(`${API_BASE}/settings/payment`);
}

function getPaymentMethodLabel(method) {
    if (method === 'facebook_chat') return 'Facebook chat';
    if (method === 'bank_transfer') return 'Банкны шилжүүлэг';
    return method || '-';
}

function getCartOrderPayload(paymentMethod) {
    const cart = getCartItems();

    if (cart.length === 0) {
        showToast('Таны сагс хоосон байна.');
        return null;
    }

    const items = cart.map(item => ({
        productId: item.id,
        productCode: '',
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
        paymentMethod
    };
}

function renderBankPaymentResult(order, settings) {
    const result = document.getElementById('bankPaymentResult');
    if (!result) return;

    result.classList.remove('hidden');
    result.innerHTML = `
        <span class="account-kicker">Банкны шилжүүлэг</span>
        <h3>Захиалга үүслээ: ${escapeHtml(order.orderCode || '-')}</h3>
        <div class="bank-info-grid">
            <div><span>Банкны нэр</span><strong>${escapeHtml(settings.bankName || '-')}</strong></div>
            <div><span>Дансны дугаар</span><strong>${escapeHtml(settings.accountNumber || '-')}</strong></div>
            <div><span>Данс эзэмшигч</span><strong>${escapeHtml(settings.accountHolder || '-')}</strong></div>
        </div>
        <p class="transaction-code-message">Гүйлгээний утга дээр энэ кодыг бичнэ үү: <strong>${escapeHtml(order.transactionCode || '-')}</strong></p>
        <button id="confirmBankCartClearBtn" class="account-primary-btn" type="button">Ойлголоо, сагс цэвэрлэх</button>
    `;

    document.getElementById('confirmBankCartClearBtn')?.addEventListener('click', () => {
        saveCartItems([]);
        renderCartPage();
        result.classList.add('hidden');
    });
}

async function checkoutCartWithMethod(paymentMethod) {
    const payload = getCartOrderPayload(paymentMethod);
    if (!payload) return;

    try {
        const settings = await fetchPaymentSettings();
        const order = await requestAuthJson(`${API_BASE}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (paymentMethod === 'facebook_chat') {
            saveCartItems([]);
            renderCartPage();
            showToast('Захиалга үүслээ. Facebook chat нээгдэж байна.');

            if (settings.facebookChatUrl) {
                window.open(settings.facebookChatUrl, '_blank', 'noopener');
            }

            return;
        }

        renderBankPaymentResult(order, settings);
    } catch (error) {
        alert(error.message);
    }
}

function setupCartPage() {
    if (!document.querySelector('.cart-section')) return;

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

    document.getElementById('checkoutBtn')?.addEventListener('click', checkoutCart);
    document.getElementById('checkoutFacebookBtn')?.addEventListener('click', () => checkoutCartWithMethod('facebook_chat'));
    document.getElementById('checkoutBankBtn')?.addEventListener('click', () => checkoutCartWithMethod('bank_transfer'));
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
            hamburger.classList.toggle('active', isActive);
            navbar?.classList.toggle('nav-menu-open', isActive);
        });

        hamburger.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            e.preventDefault();
            hamburger.click();
        });
    });

    document.querySelectorAll('.nav-menu .nav-link').forEach(link => {
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

    document.querySelectorAll('.nav-search').forEach(form => {
        const input = form.querySelector('input[type="search"]');

        if (input && document.querySelector('.products-grid')) {
            input.value = currentSearchTerm;
        }

        form.addEventListener('submit', (e) => {
            const query = input?.value.trim() || '';

            if (!query) {
                e.preventDefault();
                window.location.href = 'products.html';
            }
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
        link.addEventListener('click', (e) => {
            e.preventDefault();
            alert('Нууц үг сэргээх хэсэг удахгүй нэмэгдэх болно.');
        });
    });

    document.querySelectorAll('.terms-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            alert('Үйлчилгээний нөхцөл болон нууцлалын бодлого удахгүй нэмэгдэх болно.');
        });
    });

    document.querySelectorAll('.social-links a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            alert('Сошиал холбоос удахгүй нэмэгдэх болно.');
        });
    });

    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Таны зурвас амжилттай илгээгдлээ.');
            contactForm.reset();
        });
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

document.addEventListener('DOMContentLoaded', async () => {
    clearLegacyProductStorage();

    await refreshAuthSession();
    if (await setupProtectedPage()) return;

    setupNavigation();
    setupNavbarScrollState();
    setupNavSearch();
    setupStaticActions();
    setupHeroVideoAutoplay();
    setupPasswordToggles();
    setupLoginForm();
    setupSignupForm();
    setupAccountPage();
    setupCartPage();
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
