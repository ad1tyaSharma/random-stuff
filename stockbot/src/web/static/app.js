const API_URL = '/api';

// --- State ---
let products = [];

// --- DOM Elements ---
const grid = document.getElementById('products-grid');
const addBtn = document.getElementById('add-btn');
const addLoader = document.getElementById('add-loader');
const btnText = addBtn.querySelector('.btn-text');
const urlInput = document.getElementById('product-url');
const statsBars = {
    inStock: document.getElementById('stat-in-stock'),
    outOfStock: document.getElementById('stat-out-of-stock'),
    total: document.getElementById('stat-total')
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', fetchProducts);

// --- API Calls ---
async function fetchProducts() {
    try {
        const response = await fetch(`${API_URL}/products`);
        const data = await response.json();
        if (data.success) {
            products = data.products;
            renderProducts();
            updateStats();
        }
    } catch (err) {
        showToast('Error fetching products', 'error');
    }
}

async function addProduct() {
    const url = urlInput.value.trim();
    if (!url) return showToast('Please enter a URL', 'error');

    setLoading(true);
    try {
        const response = await fetch(`${API_URL}/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        const data = await response.json();

        if (data.success) {
            products.push(data.product);
            renderProducts();
            updateStats();
            urlInput.value = '';
            showToast('Product added successfully', 'success');
        } else {
            showToast(data.error || 'Failed to add product', 'error');
        }
    } catch (err) {
        showToast('Error connecting to server', 'error');
    } finally {
        setLoading(false);
    }
}

async function removeProduct(url) {
    if (!confirm('Are you sure you want to stop tracking this product?')) return;

    try {
        const response = await fetch(`${API_URL}/products`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });

        if (response.ok) {
            products = products.filter(p => p.url !== url);
            renderProducts();
            updateStats();
            showToast('Product removed', 'success');
        }
    } catch (err) {
        showToast('Failed to remove product', 'error');
    }
}

async function checkNow(url) {
    showToast('Checking stock status provided by cached data...', 'info');
    // Using simple status endpoint for now, ideally force-check specific product
    try {
        const response = await fetch(`${API_URL}/status?url=${encodeURIComponent(url)}`);
        const data = await response.json();
        if (data.success) {
            const index = products.findIndex(p => p.url === url);
            if (index !== -1) {
                products[index] = { ...products[index], ...data };
                renderProducts(); // Re-render to update status
                updateStats();
                showToast(`Status updated: ${data.status.replace('_', ' ')}`, 'success');
            }
        }
    } catch (e) { showToast('Check failed', 'error'); }
}

// --- Rendering ---
function renderProducts() {
    grid.innerHTML = '';

    if (products.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-secondary);"><i class="fa-solid fa-basket-shopping" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i><p>No products being tracked yet.</p></div>';
        return;
    }

    products.forEach(product => {
        const isInStock = product.status === 'in_stock';
        const statusClass = isInStock ? 'status-in-stock' : 'status-out-of-stock';
        const statusText = isInStock ? 'In Stock' : (product.status === 'out_of_stock' ? 'Out of Stock' : 'Unknown');

        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="card-image-container">
                <img src="${product.imageUrl || 'https://placehold.co/600x400?text=No+Image'}" alt="${product.name}" class="card-image" onerror="this.src='https://placehold.co/600x400?text=Error'">
                <div class="status-badge ${statusClass}">${statusText}</div>
            </div>
            <div class="card-content">
                <div class="product-name" title="${product.name}">${product.name}</div>
                <div class="product-meta">
                    <span><i class="fa-regular fa-clock"></i> ${new Date(parseInt(product.lastChecked)).toLocaleTimeString()}</span>
                    <span><i class="fa-solid fa-users"></i> ${product.subscribers ? product.subscribers.length : 0} subs</span>
                </div>
                <div class="card-actions">
                    <a href="${product.url}" target="_blank" class="action-btn" title="Visit Link"><i class="fa-solid fa-external-link-alt"></i></a>
                    <button onclick="checkNow('${product.url}')" class="action-btn" title="Check Now"><i class="fa-solid fa-rotate-right"></i></button>
                    <button onclick="removeProduct('${product.url}')" class="action-btn btn-delete" title="Stop Tracking"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function updateStats() {
    const total = products.length;
    const inStock = products.filter(p => p.status === 'in_stock').length;
    const outOfStock = products.filter(p => p.status === 'out_of_stock').length;

    statsBars.total.textContent = total;
    statsBars.inStock.textContent = inStock;
    statsBars.outOfStock.textContent = outOfStock;
}

// --- Helpers ---
function setLoading(isLoading) {
    if (isLoading) {
        addLoader.style.display = 'block';
        btnText.style.display = 'none';
        addBtn.disabled = true;
    } else {
        addLoader.style.display = 'none';
        btnText.style.display = 'block';
        addBtn.disabled = false;
    }
}

function showToast(msg, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';

    toast.innerHTML = `<i class="fa-solid fa-${icon}"></i> <span>${msg}</span>`;

    const container = document.getElementById('toast-container');
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Auto-refresh every 30s
setInterval(fetchProducts, 30000);
