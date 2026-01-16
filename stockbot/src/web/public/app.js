/**
 * Amul Stock Tracker - Dashboard JavaScript
 */

// ============================================
// CONFIGURATION
// ============================================

const API_BASE = '/api';
const REFRESH_INTERVAL = 30000; // 30 seconds

// ============================================
// STATE
// ============================================

let products = [];
let refreshTimer = null;

// ============================================
// DOM ELEMENTS
// ============================================

const elements = {
    statsTotal: document.getElementById('stat-total'),
    statsInStock: document.getElementById('stat-instock'),
    statsOutStock: document.getElementById('stat-outstock'),
    productsGrid: document.getElementById('products-grid'),
    loading: document.getElementById('loading'),
    emptyState: document.getElementById('empty-state'),
    addForm: document.getElementById('add-product-form'),
    productUrlInput: document.getElementById('product-url'),
    addBtn: document.getElementById('add-btn'),
    refreshBtn: document.getElementById('refresh-btn'),
    forceCheckBtn: document.getElementById('force-check-btn'),
    toastContainer: document.getElementById('toast-container'),
    productCardTemplate: document.getElementById('product-card-template'),
};

// ============================================
// API FUNCTIONS
// ============================================

async function fetchProducts() {
    try {
        const response = await fetch(`${API_BASE}/products`);
        const data = await response.json();

        if (data.success) {
            return data.products;
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Error fetching products:', error);
        showToast('Failed to load products', 'error');
        return [];
    }
}

async function fetchStats() {
    try {
        const response = await fetch(`${API_BASE}/stats`);
        const data = await response.json();

        if (data.success) {
            return data;
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Error fetching stats:', error);
        return null;
    }
}

async function addProduct(url) {
    try {
        const response = await fetch(`${API_BASE}/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
        });

        const data = await response.json();

        if (data.success) {
            return data.product;
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Error adding product:', error);
        throw error;
    }
}

async function removeProduct(url) {
    try {
        const response = await fetch(`${API_BASE}/products`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
        });

        const data = await response.json();

        if (data.success) {
            return true;
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Error removing product:', error);
        throw error;
    }
}

async function forceCheck() {
    try {
        const response = await fetch(`${API_BASE}/check`, {
            method: 'POST',
        });

        const data = await response.json();

        if (data.success) {
            return true;
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Error forcing check:', error);
        throw error;
    }
}

// ============================================
// UI FUNCTIONS
// ============================================

function updateStats(stats) {
    if (stats) {
        elements.statsTotal.textContent = stats.totalProducts || 0;
        elements.statsInStock.textContent = stats.inStock || 0;
        elements.statsOutStock.textContent = stats.outOfStock || 0;
    }
}

function renderProducts(productList) {
    // Hide loading
    elements.loading.hidden = true;

    // Clear existing products (except loading and empty state)
    const existingCards = elements.productsGrid.querySelectorAll('.product-card');
    existingCards.forEach(card => card.remove());

    if (productList.length === 0) {
        elements.emptyState.hidden = false;
        return;
    }

    elements.emptyState.hidden = true;

    productList.forEach(product => {
        const card = createProductCard(product);
        elements.productsGrid.appendChild(card);
    });
}

function createProductCard(product) {
    const template = elements.productCardTemplate.content.cloneNode(true);
    const card = template.querySelector('.product-card');

    // Image
    const img = card.querySelector('.product-image img');
    if (product.imageUrl) {
        img.src = product.imageUrl;
        img.alt = product.name;
    } else {
        img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%2312121a" width="100" height="100"/><text x="50%" y="50%" fill="%236a6a7a" font-size="30" text-anchor="middle" dy=".3em">📦</text></svg>';
    }

    // Status badge
    const badge = card.querySelector('.status-badge');
    badge.textContent = formatStatus(product.status);
    badge.classList.add(getStatusClass(product.status));

    // Name
    card.querySelector('.product-name').textContent = product.name || 'Unknown Product';

    // Meta info
    const lastChecked = card.querySelector('.last-checked');
    if (product.lastChecked) {
        const time = new Date(parseInt(product.lastChecked));
        lastChecked.textContent = `Checked: ${formatTimeAgo(time)}`;
    } else {
        lastChecked.textContent = 'Never checked';
    }

    const subscribers = card.querySelector('.subscribers');
    const subCount = product.subscribers?.length || 0;
    subscribers.textContent = `${subCount} subscriber${subCount !== 1 ? 's' : ''}`;

    // Link
    const link = card.querySelector('.product-link');
    link.href = product.url;

    // Delete button
    const deleteBtn = card.querySelector('.btn-delete');
    deleteBtn.addEventListener('click', () => handleDeleteProduct(product.url, product.name));

    return card;
}

function formatStatus(status) {
    switch (status) {
        case 'in_stock': return 'In Stock';
        case 'out_of_stock': return 'Sold Out';
        default: return 'Unknown';
    }
}

function getStatusClass(status) {
    switch (status) {
        case 'in_stock': return 'in-stock';
        case 'out_of_stock': return 'out-of-stock';
        default: return 'unknown';
    }
}

function formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    elements.toastContainer.appendChild(toast);

    // Remove after 4 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function setLoading(isLoading) {
    elements.addBtn.disabled = isLoading;
    elements.addBtn.querySelector('.btn-text').hidden = isLoading;
    elements.addBtn.querySelector('.btn-loader').hidden = !isLoading;
}

// ============================================
// EVENT HANDLERS
// ============================================

async function handleAddProduct(e) {
    e.preventDefault();

    const url = elements.productUrlInput.value.trim();

    if (!url) {
        showToast('Please enter a product URL', 'error');
        return;
    }

    setLoading(true);

    try {
        await addProduct(url);
        showToast('Product added successfully!', 'success');
        elements.productUrlInput.value = '';
        await refreshData();
    } catch (error) {
        showToast(error.message || 'Failed to add product', 'error');
    } finally {
        setLoading(false);
    }
}

async function handleDeleteProduct(url, name) {
    if (!confirm(`Remove "${name}" from tracking?`)) {
        return;
    }

    try {
        await removeProduct(url);
        showToast('Product removed', 'success');
        await refreshData();
    } catch (error) {
        showToast(error.message || 'Failed to remove product', 'error');
    }
}

async function handleRefresh() {
    elements.refreshBtn.disabled = true;
    showToast('Refreshing...', 'info');

    await refreshData();

    elements.refreshBtn.disabled = false;
}

async function handleForceCheck() {
    elements.forceCheckBtn.disabled = true;
    showToast('Initiating stock check...', 'info');

    try {
        await forceCheck();
        showToast('Stock check initiated! Refresh in a minute to see updates.', 'success');
    } catch (error) {
        showToast('Failed to initiate stock check', 'error');
    }

    elements.forceCheckBtn.disabled = false;
}

// ============================================
// DATA REFRESH
// ============================================

async function refreshData() {
    products = await fetchProducts();
    renderProducts(products);

    const stats = await fetchStats();
    updateStats(stats);
}

function startAutoRefresh() {
    refreshTimer = setInterval(refreshData, REFRESH_INTERVAL);
}

function stopAutoRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
    }
}

// ============================================
// INITIALIZATION
// ============================================

function init() {
    // Event listeners
    elements.addForm.addEventListener('submit', handleAddProduct);
    elements.refreshBtn.addEventListener('click', handleRefresh);
    elements.forceCheckBtn.addEventListener('click', handleForceCheck);

    // Initial load
    refreshData();

    // Start auto-refresh
    startAutoRefresh();

    // Pause when tab is hidden
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopAutoRefresh();
        } else {
            refreshData();
            startAutoRefresh();
        }
    });

    console.log('📦 Amul Stock Tracker Dashboard initialized');
}

// Start the app
init();
