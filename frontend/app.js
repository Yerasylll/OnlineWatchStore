const API_BASE = '/api';

const state = {
    user: null,
    token: localStorage.getItem('token'),
    cart: JSON.parse(localStorage.getItem('cart') || '[]'),
    currentPage: 'home'
};

const updateAuthUI = () => {
    const authLink = document.getElementById('auth-link');
    const authRequired = document.querySelectorAll('.auth-required');
    const adminOnly = document.querySelectorAll('.admin-only');

    // Update cart count on UI update
    const cartBadge = document.getElementById('cart-count');
    if (cartBadge) {
        const count = state.cart.reduce((sum, item) => sum + item.quantity, 0);
        cartBadge.textContent = count;
    }

    if (state.token && state.user) {
        authLink.textContent = 'Logout';
        authLink.dataset.page = 'logout';
        authRequired.forEach(el => el.classList.remove('hidden'));

        if (state.user.role === 'admin') {
            adminOnly.forEach(el => el.classList.remove('hidden'));
        } else {
            adminOnly.forEach(el => el.classList.add('hidden'));
        }
    } else {
        authLink.textContent = 'Login';
        authLink.dataset.page = 'auth';
        authRequired.forEach(el => el.classList.add('hidden'));
        adminOnly.forEach(el => el.classList.add('hidden'));
    }
};

const apiRequest = async (endpoint, options = {}) => {
    const headers = {
        'Content-Type': 'application/json',
        ...(state.token && { 'Authorization': `Bearer ${state.token}` })
    };

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers: { ...headers, ...options.headers }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Request failed');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

const showAlert = (message, type = 'success') => {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;

    const app = document.getElementById('app');
    app.insertBefore(alertDiv, app.firstChild);

    setTimeout(() => alertDiv.remove(), 3000);
};

const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(price);
};

const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

const renderHomePage = async () => {
    const app = document.getElementById('app');

    try {
        const featuredData = await apiRequest('/watches/featured');
        const featured = featuredData.data || [];

        app.innerHTML = `
            <div class="container">
                <div class="hero">
                    <h1>Premium Watch Collection</h1>
                    <p>Discover luxury timepieces from world-renowned brands</p>
                    <a href="#" class="btn btn-primary" data-page="catalog">Browse Catalog</a>
                </div>

                <h2 class="section-title">Featured Watches</h2>
                <div class="watch-grid">
                    ${featured.map(watch => `
                        <div class="watch-card" onclick="navigateTo('watch', '${watch._id}')">
                            <div class="image-wrapper">
                                <div class="watch-image" style="background-image: url('${watch.image || (watch.images && watch.images[0]) || ''}');">
                                    ${!(watch.image || (watch.images && watch.images[0])) ? '<div class="image-placeholder">⌚</div>' : ''}
                                </div>
                            </div>

                            <div class="watch-content">
                                <div class="watch-brand">${watch.brand}</div>
                                <h3 class="watch-model">${watch.model}</h3>

                                <div class="watch-footer">
                                    <div class="watch-price">${formatPrice(watch.price)}</div>
                                    <div class="watch-rating small">
                                        <span>${'★'.repeat(Math.round(watch.averageRating))}${'☆'.repeat(5 - Math.round(watch.averageRating))}</span>
                                        <span class="muted">(${watch.reviewCount})</span>
                                    </div>
                                </div>

                                <div class="watch-actions">
                                    <button class="btn btn-primary" onclick="event.stopPropagation(); navigateTo('watch', '${watch._id}')">Details</button>
                                    <button class="btn btn-secondary" onclick="event.stopPropagation(); addToCart('${watch._id}')">+ Add</button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        attachNavigation();
    } catch (error) {
        app.innerHTML = `<div class="container"><div class="alert alert-error">Failed to load watches</div></div>`;
    }
};

const renderCatalogPage = async (inplace = false) => {
    const app = document.getElementById('app');

    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const category = params.get('category') || '';
    const brand = params.get('brand') || '';
    const search = params.get('search') || '';
    const sort = params.get('sort') || 'newest';

    const queryString = new URLSearchParams({
        ...(category && { category }),
        ...(brand && { brand }),
        ...(search && { search }),
        sort
    }).toString();

    // If not an in-place update or the catalog is not rendered yet, render the full page shell
    if (!inplace || !document.querySelector('.watch-grid')) {
        app.innerHTML = `
            <div class="container">
                <h1 class="section-title">Watch Catalog</h1>
                
                <div class="filters">
                    <div class="filter-grid">
                        <div class="form-group">
                            <label>Category</label>
                            <select id="category-filter" onchange="applyFilters()">
                                <option value="">All Categories</option>
                                <option value="Sport" ${category === 'Sport' ? 'selected' : ''}>Sport</option>
                                <option value="Dress" ${category === 'Dress' ? 'selected' : ''}>Dress</option>
                                <option value="Casual" ${category === 'Casual' ? 'selected' : ''}>Casual</option>
                                <option value="Luxury" ${category === 'Luxury' ? 'selected' : ''}>Luxury</option>
                                <option value="Smartwatch" ${category === 'Smartwatch' ? 'selected' : ''}>Smartwatch</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Sort By</label>
                            <select id="sort-filter" onchange="applyFilters()">
                                <option value="newest" ${sort === 'newest' ? 'selected' : ''}>Newest</option>
                                <option value="price_asc" ${sort === 'price_asc' ? 'selected' : ''}>Price: Low to High</option>
                                <option value="price_desc" ${sort === 'price_desc' ? 'selected' : ''}>Price: High to Low</option>
                                <option value="rating" ${sort === 'rating' ? 'selected' : ''}>Top Rated</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Search</label>
                            <input type="text" id="search-filter" placeholder="Search watches..." value="${search}" oninput="onSearchInput()" onkeydown="if(event.key==='Enter'){ event.preventDefault(); applyFilters(); }">
                        </div>
                    </div>
                </div>

                <div class="watch-grid">
                    <div class="catalog-loading">Loading...</div>
                </div>
            </div>
        `;
    } else {
        // Update filter inputs to reflect current params without re-rendering entire page
        const categorySelect = document.getElementById('category-filter');
        const sortSelect = document.getElementById('sort-filter');
        const searchInput = document.getElementById('search-filter');
        if (categorySelect) categorySelect.value = category;
        if (sortSelect) sortSelect.value = sort;
        if (searchInput) searchInput.value = search;

        const grid = document.querySelector('.watch-grid');
        grid.innerHTML = `<div class="catalog-loading">Loading...</div>`;
    }

    try {
        const data = await apiRequest(`/watches?${queryString}`);
        const watches = data.data || [];

        const gridHtml = watches.length > 0 ? watches.map(watch => `
            <div class="watch-card" onclick="navigateTo('watch', '${watch._id}')">
                <div class="image-wrapper">
                    <div class="watch-image" style="background-image: url('${watch.image || (watch.images && watch.images[0]) || ''}');">
                        ${!(watch.image || (watch.images && watch.images[0])) ? '<div class="image-placeholder">⌚</div>' : ''}
                    </div>
                    
                </div>
                <div class="watch-content">
                    <div class="watch-brand">${watch.brand}</div>
                    <h3 class="watch-model">${watch.model}</h3>
                    <div class="watch-footer">
                        <div class="watch-price">${formatPrice(watch.price)}</div>
                        <div class="watch-rating small">
                            <span>${'★'.repeat(Math.round(watch.averageRating))}${'☆'.repeat(5 - Math.round(watch.averageRating))}</span>
                            <span class="muted">(${watch.reviewCount})</span>
                        </div>
                    </div>
                    <div class="watch-actions">
                        <button class="btn btn-primary" onclick="event.stopPropagation(); navigateTo('watch', '${watch._id}')">Details</button>
                        <button class="btn btn-secondary" onclick="event.stopPropagation(); addToCart('${watch._id}')">+ Add</button>
                    </div>
                </div>
            </div>
        `).join('') : '<p>No watches found</p>';

        const grid = document.querySelector('.watch-grid');
        if (grid) grid.innerHTML = gridHtml;

    } catch (error) {
        const grid = document.querySelector('.watch-grid');
        if (grid) grid.innerHTML = `<div class="alert alert-error">Failed to load catalog</div>`;
    }
};

let searchTimeout;

const onSearchInput = () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => applyFilters(), 300);
};

// When applying filters from UI, prefer in-place updates (no full navigation)
const applyFilters = async () => {
    const category = document.getElementById('category-filter') ? document.getElementById('category-filter').value : '';
    const sort = document.getElementById('sort-filter') ? document.getElementById('sort-filter').value : 'newest';
    const search = document.getElementById('search-filter') ? document.getElementById('search-filter').value : '';

    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (sort) params.set('sort', sort);
    if (search) params.set('search', search);

    const newHash = `catalog?${params.toString()}`;

    // If we're already viewing the catalog, update the URL without triggering a full navigation
    if (window.location.hash.slice(1).startsWith('catalog')) {
        history.replaceState(null, '', `#${newHash}`);
        // Re-render catalog with the new filters (in-place)
        try {
            await renderCatalogPage(true);
        } catch (err) {
            console.error('Error re-rendering catalog after filter change', err);
        }
    } else {
        // Navigate to catalog if we're elsewhere
        window.location.hash = newHash;
    }
};

const renderWatchDetailPage = async (watchId) => {
    const app = document.getElementById('app');

    try {
        const watchData = await apiRequest(`/watches/${watchId}`);
        const watch = watchData.data;

        const reviewsData = await apiRequest(`/reviews/watch/${watchId}`);
        const reviews = reviewsData.data || [];

        app.innerHTML = `
            <div class="container">
                <div class="watch-detail">
                    <div style="margin-bottom: 1rem">
                        <button class="btn btn-secondary" onclick="navigateBack()">← Back</button>
                    </div>
                    <div class="watch-detail-grid">
                        <div class="watch-image" style="height: 400px; font-size: 5rem; background-image: url('${watch.image || (watch.images && watch.images[0]) || ''}');">
                            ${!(watch.image || (watch.images && watch.images[0])) ? '⌚' : ''}
                        </div>
                        <div>
                            <div class="watch-brand">${watch.brand}</div>
                            <h1 class="watch-model">${watch.model}</h1>
                            <div class="watch-price">${formatPrice(watch.price)}</div>
                            <div class="watch-rating">
                                <span>${'★'.repeat(Math.round(watch.averageRating))}${'☆'.repeat(5 - Math.round(watch.averageRating))}</span>
                                <span>(${watch.reviewCount} reviews)</span>
                            </div>
                            <p>${watch.description}</p>
                            <p><strong>Stock:</strong> ${watch.stock} units</p>
                            <p><strong>Category:</strong> ${watch.category}</p>
                            ${state.user ? `
                                <div class="product-action-buttons">
                                    <button class="btn btn-primary" onclick="createOrder('${watch._id}')">Purchase Now</button>
                                    <button class="btn btn-secondary" onclick="addToCart('${watch._id}')">Add to Cart</button>
                                </div>
                            ` : `
                                <p class="alert alert-error">Please login to purchase</p>
                            `}
                        </div>
                    </div>

                    <div class="specifications">
                        <h2>Specifications</h2>
                        <div class="spec-grid">
                            <div class="spec-item">
                                <div class="spec-label">Case Material</div>
                                <div class="spec-value">${watch.specifications.caseMaterial}</div>
                            </div>
                            <div class="spec-item">
                                <div class="spec-label">Case Diameter</div>
                                <div class="spec-value">${watch.specifications.caseDiameter}</div>
                            </div>
                            <div class="spec-item">
                                <div class="spec-label">Movement</div>
                                <div class="spec-value">${watch.specifications.movement}</div>
                            </div>
                            <div class="spec-item">
                                <div class="spec-label">Water Resistance</div>
                                <div class="spec-value">${watch.specifications.waterResistance}</div>
                            </div>
                            <div class="spec-item">
                                <div class="spec-label">Strap Material</div>
                                <div class="spec-value">${watch.specifications.strapMaterial}</div>
                            </div>
                            <div class="spec-item">
                                <div class="spec-label">Warranty</div>
                                <div class="spec-value">${watch.specifications.warranty}</div>
                            </div>
                        </div>
                    </div>

                    <div class="reviews-section">
                        <div class="section-head-row">
                            <h2>Customer Reviews</h2>
                            ${state.user ? `
                                <button class="btn btn-primary" onclick="showReviewForm('${watch._id}')">Write a Review</button>
                            ` : ''}
                        </div>
                        <div id="reviews-list">
                            ${reviews.map(review => `
                                <div class="review-card">
                                    <div class="review-header">
                                        <div>
                                            <strong>${review.user.name}</strong>
                                            <div class="watch-rating">
                                                <span>${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</span>
                                            </div>
                                        </div>
                                        <div>${formatDate(review.createdAt)}</div>
                                    </div>
                                    <p>${review.comment}</p>
                                </div>
                            `).join('') || '<p>No reviews yet</p>'}
                        </div>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        app.innerHTML = `<div class="container"><div class="alert alert-error">Failed to load watch details</div></div>`;
    }
};

const showReviewForm = (watchId) => {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Write a Review</h2>
                <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
            </div>
            <form onsubmit="submitReview(event, '${watchId}')">
                <div class="form-group">
                    <label>Rating</label>
                    <select id="review-rating" required>
                        <option value="">Select rating</option>
                        <option value="5">5 Stars</option>
                        <option value="4">4 Stars</option>
                        <option value="3">3 Stars</option>
                        <option value="2">2 Stars</option>
                        <option value="1">1 Star</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Comment</label>
                    <textarea id="review-comment" required maxlength="500"></textarea>
                </div>
                <button type="submit" class="btn btn-primary">Submit Review</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
};

const submitReview = async (e, watchId) => {
    e.preventDefault();

    try {
        const rating = document.getElementById('review-rating').value;
        const comment = document.getElementById('review-comment').value;

        await apiRequest(`/reviews/watch/${watchId}`, {
            method: 'POST',
            body: JSON.stringify({ rating: Number(rating), comment })
        });

        showAlert('Review submitted successfully');
        document.querySelector('.modal').remove();
        renderWatchDetailPage(watchId);
    } catch (error) {
        showAlert(error.message, 'error');
    }
};

const renderAuthPage = () => {
    const app = document.getElementById('app');

    app.innerHTML = `
        <div class="auth-container">
            <div class="auth-tabs">
                <button class="auth-tab active" onclick="switchAuthTab('login')">Login</button>
                <button class="auth-tab" onclick="switchAuthTab('register')">Register</button>
            </div>
            
            <div id="login-form" class="auth-form">
                <form onsubmit="handleLogin(event)">
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="login-email" required>
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" id="login-password" required>
                    </div>
                    <button type="submit" class="btn btn-primary" style="width: 100%">Login</button>
                </form>
            </div>

            <div id="register-form" class="auth-form hidden">
                <form onsubmit="handleRegister(event)">
                    <div class="form-group">
                        <label>Name</label>
                        <input type="text" id="register-name" required>
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="register-email" required>
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" id="register-password" required minlength="6">
                    </div>
                    <div class="form-group">
                        <label>Phone</label>
                        <input type="tel" id="register-phone">
                    </div>
                    <button type="submit" class="btn btn-primary" style="width: 100%">Register</button>
                </form>
            </div>
        </div>
    `;
};

const switchAuthTab = (tab) => {
    const tabs = document.querySelectorAll('.auth-tab');
    tabs.forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');

    if (tab === 'login') {
        document.getElementById('login-form').classList.remove('hidden');
        document.getElementById('register-form').classList.add('hidden');
    } else {
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('register-form').classList.remove('hidden');
    }
};

const handleLogin = async (e) => {
    e.preventDefault();

    try {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        const data = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        state.token = data.token;
        state.user = data.user;
        localStorage.setItem('token', data.token);

        showAlert('Login successful');
        updateAuthUI();

        const redirect = localStorage.getItem('redirect_after_login');
        if (redirect) {
            localStorage.removeItem('redirect_after_login');
            navigateTo(redirect);
        } else {
            navigateTo('home');
        }
    } catch (error) {
        showAlert(error.message, 'error');
    }
};

const handleRegister = async (e) => {
    e.preventDefault();

    try {
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const phone = document.getElementById('register-phone').value;

        const data = await apiRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password, phone })
        });

        state.token = data.token;
        state.user = data.user;
        localStorage.setItem('token', data.token);

        showAlert('Registration successful');
        updateAuthUI();
        navigateTo('home');
    } catch (error) {
        showAlert(error.message, 'error');
    }
};

const handleLogout = () => {
    if (!confirm('Are you sure you want to logout?')) return;

    state.token = null;
    state.user = null;
    localStorage.removeItem('token');
    updateAuthUI();
    navigateTo('home');
    showAlert('Logged out successfully');
};

const createOrder = (watchId) => {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Complete Purchase</h2>
                <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
            </div>
            <form onsubmit="submitOrder(event, '${watchId}')">
                <div class="form-group">
                    <label>Quantity</label>
                    <input type="number" id="order-quantity" min="1" value="1" required>
                </div>
                <h3>Shipping Address</h3>
                <div class="form-group">
                    <label>Street</label>
                    <input type="text" id="order-street" required>
                </div>
                <div class="form-group">
                    <label>City</label>
                    <input type="text" id="order-city" required>
                </div>
                <div class="form-group">
                    <label>State</label>
                    <input type="text" id="order-state" required>
                </div>
                <div class="form-group">
                    <label>Zip Code</label>
                    <input type="text" id="order-zip" required>
                </div>
                <div class="form-group">
                    <label>Country</label>
                    <input type="text" id="order-country" value="Kazakhstan" required>
                </div>
                <div class="form-group">
                    <label>Payment Method</label>
                    <select id="order-payment" required>
                        <option value="Card">Credit Card</option>
                        <option value="Cash">Cash on Delivery</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%">Place Order</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
};

const submitOrder = async (e, watchId) => {
    e.preventDefault();

    try {
        const quantity = Number(document.getElementById('order-quantity').value);
        const shippingAddress = {
            street: document.getElementById('order-street').value,
            city: document.getElementById('order-city').value,
            state: document.getElementById('order-state').value,
            zipCode: document.getElementById('order-zip').value,
            country: document.getElementById('order-country').value
        };
        const paymentMethod = document.getElementById('order-payment').value;

        await apiRequest('/orders', {
            method: 'POST',
            body: JSON.stringify({
                orderItems: [{ watch: watchId, quantity }],
                shippingAddress,
                paymentMethod
            })
        });

        showAlert('Order placed successfully');
        document.querySelector('.modal').remove();
        navigateTo('orders');
    } catch (error) {
        showAlert(error.message, 'error');
    }
};

const renderOrdersPage = async () => {
    const app = document.getElementById('app');

    try {
        const data = await apiRequest('/orders/my-orders');
        const orders = data.data || [];

        app.innerHTML = `
            <div class="container">
                <h1 class="section-title">My Orders</h1>
                <div class="order-list">
                    ${orders.length > 0 ? orders.map(order => `
                        <div class="order-card">
                            <div class="order-header">
                                <div>
                                    <strong>Order #${order._id.slice(-8)}</strong>
                                    <div>${formatDate(order.createdAt)}</div>
                                </div>
                                <span class="status-badge status-${order.status.toLowerCase()}">${order.status}</span>
                            </div>
                            <div class="order-items">
                                ${order.orderItems.map(item => `
                                    <div class="order-item">
                                        <div>
                                            <strong>${item.brand} ${item.model}</strong>
                                            <div>Quantity: ${item.quantity}</div>
                                        </div>
                                        <div>${formatPrice(item.price * item.quantity)}</div>
                                    </div>
                                `).join('')}
                            </div>
                            <div class="order-summary">
                                <div class="order-summary-row">
                                    <span>Subtotal:</span>
                                    <span>${formatPrice(order.subtotal)}</span>
                                </div>
                                <div class="order-summary-row">
                                    <span>Tax:</span>
                                    <span>${formatPrice(order.tax)}</span>
                                </div>
                                <div class="order-summary-row">
                                    <span>Shipping:</span>
                                    <span>${formatPrice(order.shippingCost)}</span>
                                </div>
                                <div class="order-summary-row total">
                                    <span>Total:</span>
                                    <span>${formatPrice(order.totalPrice)}</span>
                                </div>
                            </div>
                            <div>
                                <strong>Shipping Address:</strong>
                                <p>${order.shippingAddress.street}, ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}</p>
                                <strong>Payment Method:</strong> ${order.paymentMethod}
                            </div>
                        </div>
                    `).join('') : '<p>No orders found</p>'}
                </div>
            </div>
        `;
    } catch (error) {
        app.innerHTML = `<div class="container"><div class="alert alert-error">Failed to load orders</div></div>`;
    }
};

const renderProfilePage = async () => {
    const app = document.getElementById('app');

    try {
        const data = await apiRequest('/auth/me');
        const user = data.data;

        app.innerHTML = `
            <div class="profile-container">
                <h1 class="section-title">My Profile</h1>
                
                <div class="profile-section">
                    <h2>Personal Information</h2>
                    <form onsubmit="updateProfile(event)">
                        <div class="form-group">
                            <label>Name</label>
                            <input type="text" id="profile-name" value="${user.name}" required>
                        </div>
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" value="${user.email}" disabled>
                        </div>
                        <div class="form-group">
                            <label>Phone</label>
                            <input type="tel" id="profile-phone" value="${user.phone || ''}">
                        </div>
                        <button type="submit" class="btn btn-primary">Update Profile</button>
                    </form>

                    <hr style="margin: 2rem 0; border: none; border-top: 1px solid #ddd;">

                    <h3>Change Password</h3>
                    <form onsubmit="updatePassword(event)">
                        <div class="form-group">
                            <label>Current Password</label>
                            <input type="password" id="current-password" required minlength="6">
                        </div>
                        <div class="form-group">
                            <label>New Password</label>
                            <input type="password" id="new-password" required minlength="6">
                        </div>
                        <div class="form-group">
                            <label>Confirm New Password</label>
                            <input type="password" id="confirm-password" required minlength="6">
                        </div>
                        <button type="submit" class="btn btn-primary">Change Password</button>
                    </form>
                </div>

                <div class="profile-section">
                    <div class="section-head-row">
                        <h2>Shipping Addresses</h2>
                        <button class="btn btn-primary" onclick="showAddAddressForm()">Add New Address</button>
                    </div>
                    <div class="address-list">
                        ${user.addresses && user.addresses.length > 0 ? user.addresses.map(addr => `
                            <div class="address-card">
                                ${addr.isDefault ? '<strong>Default Address</strong><br>' : ''}
                                ${addr.street}<br>
                                ${addr.city}, ${addr.state} ${addr.zipCode}<br>
                                ${addr.country}
                                <div class="address-actions">
                                    <button class="btn btn-secondary" onclick="deleteAddress('${addr._id}')">Delete</button>
                                </div>
                            </div>
                        `).join('') : '<p>No addresses saved</p>'}
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        app.innerHTML = `<div class="container"><div class="alert alert-error">Failed to load profile</div></div>`;
    }
};

const updateProfile = async (e) => {
    e.preventDefault();

    try {
        const name = document.getElementById('profile-name').value;
        const phone = document.getElementById('profile-phone').value;

        await apiRequest('/users/profile', {
            method: 'PUT',
            body: JSON.stringify({ name, phone })
        });

        showAlert('Profile updated successfully');
    } catch (error) {
        showAlert(error.message, 'error');
    }
};

const updatePassword = async (e) => {
    e.preventDefault();

    try {
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        // Client-side validation
        if (newPassword !== confirmPassword) {
            showAlert('New passwords do not match', 'error');
            return;
        }

        if (newPassword.length < 6) {
            showAlert('New password must be at least 6 characters', 'error');
            return;
        }

        await apiRequest('/users/password', {
            method: 'PUT',
            body: JSON.stringify({ currentPassword, newPassword })
        });

        showAlert('Password updated successfully');

        // Clear the form
        document.getElementById('current-password').value = '';
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-password').value = '';
    } catch (error) {
        showAlert(error.message, 'error');
    }
};

const showAddAddressForm = () => {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Add Address</h2>
                <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
            </div>
            <form onsubmit="addAddress(event)">
                <div class="form-group">
                    <label>Street</label>
                    <input type="text" id="addr-street" required>
                </div>
                <div class="form-group">
                    <label>City</label>
                    <input type="text" id="addr-city" required>
                </div>
                <div class="form-group">
                    <label>State</label>
                    <input type="text" id="addr-state" required>
                </div>
                <div class="form-group">
                    <label>Zip Code</label>
                    <input type="text" id="addr-zip" required>
                </div>
                <div class="form-group">
                    <label>Country</label>
                    <input type="text" id="addr-country" value="Kazakhstan" required>
                </div>
                <div class="form-group-checkbox">
                    <input type="checkbox" id="addr-default">
                    <label for="addr-default">Set as default address</label>
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%">Add Address</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
};

const addAddress = async (e) => {
    e.preventDefault();

    try {
        const address = {
            street: document.getElementById('addr-street').value,
            city: document.getElementById('addr-city').value,
            state: document.getElementById('addr-state').value,
            zipCode: document.getElementById('addr-zip').value,
            country: document.getElementById('addr-country').value,
            isDefault: document.getElementById('addr-default').checked
        };

        await apiRequest('/users/address', {
            method: 'POST',
            body: JSON.stringify(address)
        });

        showAlert('Address added successfully');
        document.querySelector('.modal').remove();
        renderProfilePage();
    } catch (error) {
        showAlert(error.message, 'error');
    }
};

const deleteAddress = async (addressId) => {
    if (!confirm('Are you sure you want to delete this address?')) return;

    try {
        await apiRequest(`/users/address/${addressId}`, { method: 'DELETE' });
        showAlert('Address deleted successfully');
        renderProfilePage();
    } catch (error) {
        showAlert(error.message, 'error');
    }
};

const renderAdminPage = async () => {
    const app = document.getElementById('app');

    if (!state.user || state.user.role !== 'admin') {
        app.innerHTML = `<div class="container"><div class="alert alert-error">Access denied</div></div>`;
        return;
    }

    app.innerHTML = `
        <div class="admin-container">
            <h1 class="section-title">Admin Dashboard</h1>
            
            <div class="admin-tabs">
                <button class="admin-tab active" onclick="switchAdminTab('watches')">Watches</button>
                <button class="admin-tab" onclick="switchAdminTab('orders')">Orders</button>
                <button class="admin-tab" onclick="switchAdminTab('users')">Users</button>
                <button class="admin-tab" onclick="switchAdminTab('statistics')">Statistics</button>
            </div>

            <div id="admin-watches" class="admin-content">
                <div class="admin-actions-row">
                    <button class="btn btn-primary" onclick="showAddWatchForm()">Add New Watch</button>
                </div>
                <div id="watches-table"></div>
            </div>

            <div id="admin-orders" class="admin-content hidden">
                <div id="orders-table"></div>
            </div>

            <div id="admin-users" class="admin-content hidden">
                <div id="users-table"></div>
            </div>

            <div id="admin-statistics" class="admin-content hidden">
                <div id="statistics-content"></div>
            </div>
        </div>
    `;

    loadAdminWatches();
};

const navigateBack = () => {
    if (window.history.length > 1) {
        window.history.back();
    } else {
        navigateTo('catalog');
    }
};

const addToCart = async (watchId) => {
    try {
        // Fetch watch to get minimal data
        const data = await apiRequest(`/watches/${watchId}`);
        const watch = data.data;
        const existing = state.cart.find(item => item.watch === watchId);

        // Use first image if available
        const image = watch.image || (watch.images && watch.images[0]) || '';

        if (existing) existing.quantity += 1;
        else state.cart.push({
            watch: watchId,
            brand: watch.brand,
            model: watch.model,
            price: watch.price,
            quantity: 1,
            image: image
        });

        localStorage.setItem('cart', JSON.stringify(state.cart));
        updateAuthUI(); // This will trigger cart count update
        showAlert('Added to cart');
    } catch (error) {
        showAlert(error.message, 'error');
    }
};

const renderCartPage = () => {
    const app = document.getElementById('app');

    if (state.cart.length === 0) {
        app.innerHTML = `
            <div class="container">
                <h1 class="section-title">Shopping Cart</h1>
                <div class="empty-cart" style="text-align: center; padding: 4rem; background: white; border-radius: 20px; box-shadow: var(--shadow);">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">🛒</div>
                    <h2>Your cart is empty</h2>
                    <p style="margin-bottom: 2rem;">Looks like you haven't added any watches yet.</p>
                    <a href="#catalog" class="btn btn-primary">Browse Catalog</a>
                </div>
            </div>
        `;
        return;
    }

    const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.12;
    const shipping = subtotal > 500000 ? 0 : 5000;
    const total = subtotal + tax + shipping;

    app.innerHTML = `
        <div class="container">
            <h1 class="section-title">Shopping Cart</h1>
            <div class="cart-container" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem;">
                <div class="cart-items">
                    ${state.cart.map((item, index) => `
                        <div class="cart-item" style="display: flex; gap: 1rem; margin-bottom: 1rem; background: white; padding: 1rem; border-radius: 10px; align-items: center; box-shadow: var(--shadow); position: relative;">
                            <div class="cart-item-image" style="width: 80px; height: 80px; background-size: cover; background-position: center; border-radius: 8px; background-image: url('${item.image || ''}')">
                                ${!item.image ? '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:2rem;">⌚</div>' : ''}
                            </div>
                            <div style="flex: 1;">
                                <div style="font-size: 0.8rem; color: var(--color-medium); text-transform: uppercase;">${item.brand}</div>
                                <h3 style="margin: 0; font-size: 1.1rem;">${item.model}</h3>
                                <div style="color: var(--color-dark); font-weight: bold; margin-top: 0.2rem;">${formatPrice(item.price)}</div>
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.5rem; background: var(--color-lightest); padding: 0.2rem; border-radius: 20px;">
                                <button onclick="updateCartItem(${index}, -1)" style="width: 25px; height: 25px; border-radius: 50%; border: none; background: white; cursor: pointer; font-weight: bold;">-</button>
                                <span style="min-width: 20px; text-align: center; font-weight: 600;">${item.quantity}</span>
                                <button onclick="updateCartItem(${index}, 1)" style="width: 25px; height: 25px; border-radius: 50%; border: none; background: white; cursor: pointer; font-weight: bold;">+</button>
                            </div>
                            <button onclick="removeFromCart(${index})" style="background: none; border: none; color: #c45a5a; font-size: 1.5rem; cursor: pointer; padding: 0 0.5rem;">×</button>
                        </div>
                    `).join('')}
                    <div style="text-align: right; margin-top: 1rem;">
                        <button class="btn btn-secondary" onclick="clearCart()">Clear Cart</button>
                    </div>
                </div>
                
                <div>
                    <div class="cart-summary" style="background: white; padding: 2rem; border-radius: 20px; box-shadow: var(--shadow); position: sticky; top: 100px;">
                        <h2 style="margin-bottom: 1.5rem;">Order Summary</h2>
                        <div class="summary-row" style="display: flex; justify-content: space-between; margin-bottom: 0.8rem;">
                            <span style="color: var(--color-darkest);">Subtotal</span>
                            <strong>${formatPrice(subtotal)}</strong>
                        </div>
                        <div class="summary-row" style="display: flex; justify-content: space-between; margin-bottom: 0.8rem;">
                            <span style="color: var(--color-darkest);">Tax (12%)</span>
                            <strong>${formatPrice(tax)}</strong>
                        </div>
                        <div class="summary-row" style="display: flex; justify-content: space-between; margin-bottom: 1.5rem;">
                            <span style="color: var(--color-darkest);">Shipping</span>
                            <strong>${shipping === 0 ? 'Free' : formatPrice(shipping)}</strong>
                        </div>
                        <div class="summary-total" style="display: flex; justify-content: space-between; margin-top: 1rem; padding-top: 1rem; border-top: 2px solid var(--color-light); font-weight: 800; font-size: 1.3rem; color: var(--color-dark);">
                            <span>Total</span>
                            <span>${formatPrice(total)}</span>
                        </div>
                        <button class="btn btn-primary" onclick="checkoutCart()" style="width: 100%; margin-top: 2rem;">Proceed to Checkout</button>
                    </div>
                </div>
            </div>
        </div>
    `;
};

const updateCartItem = (index, change) => {
    state.cart[index].quantity += change;
    if (state.cart[index].quantity < 1) state.cart[index].quantity = 1;
    localStorage.setItem('cart', JSON.stringify(state.cart));
    updateAuthUI();
    renderCartPage();
};

const removeFromCart = (index) => {
    if (!confirm('Remove this item?')) return;
    state.cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(state.cart));
    updateAuthUI();
    renderCartPage();
};

const clearCart = () => {
    if (!confirm('Are you sure you want to clear your cart?')) return;
    state.cart = [];
    localStorage.removeItem('cart');
    updateAuthUI();
    renderCartPage();
};

const checkoutCart = () => {
    if (!state.user) {
        showAlert('Please login to checkout', 'info');
        localStorage.setItem('redirect_after_login', 'cart');
        navigateTo('auth');
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Checkout</h2>
                <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
            </div>
            <form onsubmit="submitCartOrder(event)">
                <h3>Shipping Address</h3>
                <div class="form-group">
                    <label>Street</label>
                    <input type="text" id="order-street" required>
                </div>
                <div class="form-group">
                    <label>City</label>
                    <input type="text" id="order-city" required>
                </div>
                <div class="form-group">
                    <label>State</label>
                    <input type="text" id="order-state" required>
                </div>
                <div class="form-group">
                    <label>Zip Code</label>
                    <input type="text" id="order-zip" required>
                </div>
                <div class="form-group">
                    <label>Country</label>
                    <input type="text" id="order-country" value="Kazakhstan" required>
                </div>
                <div class="form-group">
                    <label>Payment Method</label>
                    <select id="order-payment" required>
                        <option value="Card">Credit Card</option>
                        <option value="Cash">Cash on Delivery</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%">Place Order</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
};

const submitCartOrder = async (e) => {
    e.preventDefault();

    try {
        const shippingAddress = {
            street: document.getElementById('order-street').value,
            city: document.getElementById('order-city').value,
            state: document.getElementById('order-state').value,
            zipCode: document.getElementById('order-zip').value,
            country: document.getElementById('order-country').value
        };
        const paymentMethod = document.getElementById('order-payment').value;

        await apiRequest('/orders', {
            method: 'POST',
            body: JSON.stringify({
                orderItems: state.cart,
                shippingAddress,
                paymentMethod
            })
        });

        showAlert('Order placed successfully');
        state.cart = [];
        localStorage.removeItem('cart');
        updateAuthUI();
        document.querySelector('.modal').remove();
        navigateTo('orders');
    } catch (error) {
        showAlert(error.message, 'error');
    }
};

const editWatch = async (watchId) => {
    try {
        const data = await apiRequest(`/watches/${watchId}`);
        const watch = data.data;

        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Edit Watch</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <form onsubmit="updateWatch(event, '${watch._id}')">
                    <div class="form-group">
                        <label>Brand</label>
                        <input type="text" id="edit-watch-brand" value="${watch.brand}" required>
                    </div>
                    <div class="form-group">
                        <label>Model</label>
                        <input type="text" id="edit-watch-model" value="${watch.model}" required>
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea id="edit-watch-description" required>${watch.description}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Price</label>
                        <input type="number" id="edit-watch-price" min="0" step="0.01" value="${watch.price}" required>
                    </div>
                    <div class="form-group">
                        <label>Stock</label>
                        <input type="number" id="edit-watch-stock" min="0" value="${watch.stock}" required>
                    </div>
                    <div class="form-group">
                        <label>Category</label>
                        <select id="edit-watch-category" required>
                            <option value="Sport" ${watch.category === 'Sport' ? 'selected' : ''}>Sport</option>
                            <option value="Dress" ${watch.category === 'Dress' ? 'selected' : ''}>Dress</option>
                            <option value="Casual" ${watch.category === 'Casual' ? 'selected' : ''}>Casual</option>
                            <option value="Luxury" ${watch.category === 'Luxury' ? 'selected' : ''}>Luxury</option>
                            <option value="Smartwatch" ${watch.category === 'Smartwatch' ? 'selected' : ''}>Smartwatch</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Image URL</label>
                        <input type="text" id="edit-watch-image" value="${watch.image || ''}">
                    </div>
                    <button type="submit" class="btn btn-primary" style="width: 100%">Update Watch</button>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
    } catch (error) {
        showAlert(error.message, 'error');
    }
};

const updateWatch = async (e, watchId) => {
    e.preventDefault();
    try {
        const watch = {
            brand: document.getElementById('edit-watch-brand').value,
            model: document.getElementById('edit-watch-model').value,
            description: document.getElementById('edit-watch-description').value,
            price: Number(document.getElementById('edit-watch-price').value),
            stock: Number(document.getElementById('edit-watch-stock').value),
            category: document.getElementById('edit-watch-category').value,
            image: document.getElementById('edit-watch-image').value || null
        };

        await apiRequest(`/watches/${watchId}`, {
            method: 'PUT',
            body: JSON.stringify(watch)
        });

        showAlert('Watch updated successfully');
        document.querySelector('.modal').remove();
        loadAdminWatches();
    } catch (error) {
        showAlert(error.message, 'error');
    }
};

const switchAdminTab = (tab) => {
    const tabs = document.querySelectorAll('.admin-tab');
    tabs.forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');

    document.getElementById('admin-watches').classList.add('hidden');
    document.getElementById('admin-orders').classList.add('hidden');
    document.getElementById('admin-users').classList.add('hidden');
    document.getElementById('admin-statistics').classList.add('hidden');

    if (tab === 'watches') {
        document.getElementById('admin-watches').classList.remove('hidden');
        loadAdminWatches();
    } else if (tab === 'orders') {
        document.getElementById('admin-orders').classList.remove('hidden');
        loadAdminOrders();
    } else if (tab === 'users') {
        document.getElementById('admin-users').classList.remove('hidden');
        loadAdminUsers();
    } else if (tab === 'statistics') {
        document.getElementById('admin-statistics').classList.remove('hidden');
        loadStatistics();
    }
};

const loadAdminWatches = async () => {
    try {
        const data = await apiRequest('/watches?limit=100');
        const watches = data.data || [];

        document.getElementById('watches-table').innerHTML = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Brand</th>
                            <th>Model</th>
                            <th>Price</th>
                            <th>Stock</th>
                            <th>Category</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${watches.map(watch => `
                            <tr>
                                <td>${watch.brand}</td>
                                <td>${watch.model}</td>
                                <td>${formatPrice(watch.price)}</td>
                                <td>${watch.stock}</td>
                                <td>${watch.category}</td>
                                <td>
                                    <button class="btn btn-secondary" onclick="editWatch('${watch._id}')">Edit</button>
                                    <button class="btn btn-danger" onclick="deleteWatch('${watch._id}')">Delete</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        showAlert(error.message, 'error');
    }
};

const showAddWatchForm = () => {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Add New Watch</h2>
                <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
            </div>
            <form onsubmit="addWatch(event)">
                <div class="form-group">
                    <label>Brand</label>
                    <input type="text" id="watch-brand" required>
                </div>
                <div class="form-group">
                    <label>Model</label>
                    <input type="text" id="watch-model" required>
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea id="watch-description" required></textarea>
                </div>
                <div class="form-group">
                    <label>Price</label>
                    <input type="number" id="watch-price" min="0" step="0.01" required>
                </div>
                <div class="form-group">
                    <label>Stock</label>
                    <input type="number" id="watch-stock" min="0" required>
                </div>
                <div class="form-group">
                    <label>Category</label>
                    <select id="watch-category" required>
                        <option value="Sport">Sport</option>
                        <option value="Dress">Dress</option>
                        <option value="Casual">Casual</option>
                        <option value="Luxury">Luxury</option>
                        <option value="Smartwatch">Smartwatch</option>
                    </select>
                </div>
                <h3>Specifications</h3>
                <div class="form-group">
                    <label>Case Material</label>
                    <input type="text" id="watch-case-material" required>
                </div>
                <div class="form-group">
                    <label>Case Diameter</label>
                    <input type="text" id="watch-case-diameter" required>
                </div>
                <div class="form-group">
                    <label>Movement</label>
                    <input type="text" id="watch-movement" required>
                </div>
                <div class="form-group">
                    <label>Water Resistance</label>
                    <input type="text" id="watch-water-resistance" required>
                </div>
                <div class="form-group">
                    <label>Strap Material</label>
                    <input type="text" id="watch-strap-material" required>
                </div>
                <div class="form-group">
                    <label>Warranty</label>
                    <input type="text" id="watch-warranty" required>
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%">Add Watch</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
};

const addWatch = async (e) => {
    e.preventDefault();

    try {
        const watch = {
            brand: document.getElementById('watch-brand').value,
            model: document.getElementById('watch-model').value,
            description: document.getElementById('watch-description').value,
            price: Number(document.getElementById('watch-price').value),
            stock: Number(document.getElementById('watch-stock').value),
            category: document.getElementById('watch-category').value,
            specifications: {
                caseMaterial: document.getElementById('watch-case-material').value,
                caseDiameter: document.getElementById('watch-case-diameter').value,
                movement: document.getElementById('watch-movement').value,
                waterResistance: document.getElementById('watch-water-resistance').value,
                strapMaterial: document.getElementById('watch-strap-material').value,
                warranty: document.getElementById('watch-warranty').value
            }
        };

        await apiRequest('/watches', {
            method: 'POST',
            body: JSON.stringify(watch)
        });

        showAlert('Watch added successfully');
        document.querySelector('.modal').remove();
        loadAdminWatches();
    } catch (error) {
        showAlert(error.message, 'error');
    }
};

const deleteWatch = async (watchId) => {
    if (!confirm('Are you sure you want to delete this watch?')) return;

    try {
        await apiRequest(`/watches/${watchId}`, { method: 'DELETE' });
        showAlert('Watch deleted successfully');
        loadAdminWatches();
    } catch (error) {
        showAlert(error.message, 'error');
    }
};

const loadAdminOrders = async () => {
    try {
        const data = await apiRequest('/orders');
        const orders = data.data || [];

        document.getElementById('orders-table').innerHTML = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Customer</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${orders.map(order => `
                            <tr>
                                <td>#${order._id.slice(-8)}</td>
                                <td>${order.user.name}</td>
                                <td>${formatPrice(order.totalPrice)}</td>
                                <td><span class="status-badge status-${order.status.toLowerCase()}">${order.status}</span></td>
                                <td>${formatDate(order.createdAt)}</td>
                                <td>
                                    <select onchange="updateOrderStatus('${order._id}', this.value)">
                                        <option value="">Change Status</option>
                                        <option value="Pending">Pending</option>
                                        <option value="Processing">Processing</option>
                                        <option value="Shipped">Shipped</option>
                                        <option value="Delivered">Delivered</option>
                                        <option value="Cancelled">Cancelled</option>
                                    </select>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        showAlert(error.message, 'error');
    }
};

const updateOrderStatus = async (orderId, status) => {
    if (!status) return;

    try {
        await apiRequest(`/orders/${orderId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
        showAlert('Order status updated');
        loadAdminOrders();
    } catch (error) {
        showAlert(error.message, 'error');
    }
};

const loadAdminUsers = async () => {
    try {
        const data = await apiRequest('/users/all');
        const users = data.data || [];

        document.getElementById('users-table').innerHTML = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Role</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map(user => `
                            <tr>
                                <td>${user.name}</td>
                                <td>${user.email}</td>
                                <td>${user.phone || '-'}</td>
                                <td>${user.role}</td>
                                <td>
                                    ${user.role !== 'admin' ? `
                                        <button class="btn btn-danger" onclick="deleteUser('${user._id}')">Delete</button>
                                    ` : '<span class="muted">Admin</span>'}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        showAlert(error.message, 'error');
    }
};

const deleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
        await apiRequest(`/users/${userId}`, { method: 'DELETE' });
        showAlert('User deleted successfully');
        loadAdminUsers();
    } catch (error) {
        showAlert(error.message, 'error');
    }
};

const loadStatistics = async () => {
    try {
        const watchStats = await apiRequest('/watches/statistics');
        const orderStats = await apiRequest('/orders/statistics');

        document.getElementById('statistics-content').innerHTML = `
            <h2>Watch Statistics</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${watchStats.data.totalWatches}</div>
                    <div class="stat-label">Total Watches</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${formatPrice(watchStats.data.totalInventoryValue)}</div>
                    <div class="stat-label">Inventory Value</div>
                </div>
            </div>

            <h2>Order Statistics</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${orderStats.data.totalOrders}</div>
                    <div class="stat-label">Total Orders</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${formatPrice(orderStats.data.totalRevenue)}</div>
                    <div class="stat-label">Total Revenue</div>
                </div>
            </div>

            <h2>Category Statistics</h2>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Category</th>
                            <th>Count</th>
                            <th>Avg Price</th>
                            <th>Total Stock</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${watchStats.data.categoryStatistics.map(stat => `
                            <tr>
                                <td>${stat._id}</td>
                                <td>${stat.count}</td>
                                <td>${formatPrice(stat.averagePrice)}</td>
                                <td>${stat.totalStock}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        showAlert(error.message, 'error');
    }
};

const navigateTo = (page, id = null) => {
    if (page === 'logout') {
        handleLogout();
        return;
    }

    if (id) {
        window.location.hash = `${page}/${id}`;
    } else {
        window.location.hash = page;
    }
};

const router = async () => {
    const hash = window.location.hash.slice(1) || 'home';
    // Split into page part and optional id, then extract page before any query string
    const [pagePart, id] = hash.split('/');
    const [page] = pagePart.split('?');

    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === page) {
            link.classList.add('active');
        }
    });

    if (state.token && !state.user) {
        try {
            const data = await apiRequest('/auth/me');
            state.user = data.data;
        } catch (error) {
            state.token = null;
            localStorage.removeItem('token');
        }
    }

    updateAuthUI();

    switch (page) {
        case 'home':
            renderHomePage();
            break;
        case 'catalog':
            renderCatalogPage();
            break;
        case 'cart':
            renderCartPage();
            break;
        case 'watch':
            if (id) renderWatchDetailPage(id);
            else navigateTo('catalog');
            break;
        case 'orders':
            if (!state.token) {
                navigateTo('auth');
            } else {
                renderOrdersPage();
            }
            break;
        case 'profile':
            if (!state.token) {
                navigateTo('auth');
            } else {
                renderProfilePage();
            }
            break;
        case 'admin':
            if (!state.token || state.user.role !== 'admin') {
                navigateTo('home');
            } else {
                renderAdminPage();
            }
            break;
        case 'auth':
            if (state.token) {
                navigateTo('home');
            } else {
                renderAuthPage();
            }
            break;
        default:
            navigateTo('home');
    }
};

const attachNavigation = () => {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(link.dataset.page);
        });
    });

    document.querySelectorAll('[data-page]').forEach(link => {
        if (!link.classList.contains('nav-link')) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                navigateTo(link.dataset.page);
            });
        }
    });
};

window.addEventListener('hashchange', router);
window.addEventListener('load', () => {
    router();
    attachNavigation();
});