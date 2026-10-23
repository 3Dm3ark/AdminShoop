const SUPABASE_URL = 'https://hfsmxrfvlygudusoyuij.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_KwPDclPcrmdzcS4xclcbZA_Y4ZAcDKu';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let publicProducts = [];
let cart = [];
let currentFilter = 'all';
const selectedSizes = {};
const selectedQuantities = {};

document.addEventListener('DOMContentLoaded', () => {
  fetchPublicProducts();
});

async function fetchPublicProducts() {
  const { data, error } = await supabaseClient
    .from('products')
    .select('*')
    .order('sort_order', { ascending: true });
    
  if (error) { console.error('Error cargando productos:', error); return; }
  publicProducts = data;
  renderPublicProducts(publicProducts);
}

function filterCategory(category) {
  currentFilter = category;
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.className = 'cat-btn px-4 py-1.5 rounded-full text-xs font-semibold bg-white border text-gray-600 hover:bg-gray-100 transition';
  });
  document.getElementById(`cat-${category}`).className = 'cat-btn px-4 py-1.5 rounded-full text-xs font-semibold bg-gray-900 text-white transition';

  if (category === 'all') {
    renderPublicProducts(publicProducts);
  } else {
    const filtered = publicProducts.filter(p => p.gender === category);
    renderPublicProducts(filtered);
  }
}

function renderPublicProducts(items) {
  const grid = document.getElementById('store-products-grid');
  grid.innerHTML = '';
  if (items.length === 0) {
    grid.innerHTML = `<p class="col-span-full text-center text-gray-400 text-sm py-10">No hay productos disponibles en esta categoría.</p>`;
    return;
  }

  items.forEach(product => {
    const img = product.main_image || (product.images && product.images[0]) || 'https://via.placeholder.com/300';
    
    if (!selectedQuantities[product.id]) {
      selectedQuantities[product.id] = 1;
    }
    const currentQty = selectedQuantities[product.id];

    let sizesHtml = '';
    if (product.sizes && product.sizes.length > 0) {
      sizesHtml = `<div class="flex flex-wrap gap-1 mb-3">` + 
        product.sizes.map(s => `<button onclick="selectSize('${product.id}', '${s}', this)" class="size-btn-${product.id} px-2 py-1 border rounded text-[10px] font-bold text-gray-600 hover:border-gray-900">${s}</button>`).join('') +
        `</div>`;
    }

    const isOutOfStock = product.stock <= 0;

    grid.innerHTML += `
      <div class="bg-white border rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between p-4">
        <div>
          <img src="${img}" class="w-full h-48 object-cover rounded-xl mb-3">
          <h3 class="font-bold text-sm text-gray-900 mb-1">${product.name}</h3>
          <p class="text-xs text-gray-400 mb-2 line-clamp-2">${product.description || ''}</p>
          ${sizesHtml}
        </div>
        <div>
          <div class="flex justify-between items-center mb-3">
            <span class="font-black text-sm text-blue-600">$${product.price.toFixed(2)}</span>
            <span class="text-xs font-semibold px-2 py-0.5 rounded-full ${isOutOfStock ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-700'}">
              Stock: ${product.stock}
            </span>
          </div>

          ${isOutOfStock ? `
            <button disabled class="w-full bg-gray-200 text-gray-400 py-2 rounded-xl text-xs font-bold cursor-not-allowed">
              Agotado
            </button>
          ` : `
            <div class="flex items-center justify-between mb-2 bg-gray-50 border rounded-xl p-1">
              <span class="text-[10px] font-bold text-gray-500 pl-2">Cantidad:</span>
              <div class="flex items-center space-x-2">
                <button onclick="changeProductQuantity('${product.id}', -1, ${product.stock})" class="w-7 h-7 bg-white border rounded-lg text-xs font-bold hover:bg-gray-100">-</button>
                <span id="qty-disp-${product.id}" class="text-xs font-bold w-6 text-center">${currentQty}</span>
                <button onclick="changeProductQuantity('${product.id}', 1, ${product.stock})" class="w-7 h-7 bg-white border rounded-lg text-xs font-bold hover:bg-gray-100">+</button>
              </div>
            </div>

            <button onclick="addToCart('${product.id}')" class="w-full bg-gray-900 text-white py-2 rounded-xl text-xs font-bold hover:bg-gray-800 transition">
              Añadir al Carrito
            </button>
          `}
        </div>
      </div>
    `;
  });
}

function selectSize(productId, size, element) {
  document.querySelectorAll(`.size-btn-${productId}`).forEach(b => b.classList.remove('bg-gray-900', 'text-white'));
  element.classList.add('bg-gray-900', 'text-white');
  selectedSizes[productId] = size;
}

function changeProductQuantity(productId, delta, maxStock) {
  if (!selectedQuantities[productId]) {
    selectedQuantities[productId] = 1;
  }
  
  let newQty = selectedQuantities[productId] + delta;
  if (newQty < 1) newQty = 1;
  if (newQty > maxStock) {
    alert(`Solo hay ${maxStock} unidades disponibles en stock.`);
    newQty = maxStock;
  }

  selectedQuantities[productId] = newQty;
  const dispEl = document.getElementById(`qty-disp-${productId}`);
  if (dispEl) {
    dispEl.textContent = newQty;
  }
}

function toggleCart() {
  const drawer = document.getElementById('cart-drawer');
  drawer.classList.toggle('hidden');
}

function addToCart(productId) {
  const product = publicProducts.find(p => p.id === productId);
  if (!product) return;

  if (product.sizes && product.sizes.length > 0 && !selectedSizes[productId]) {
    alert('Por favor selecciona una talla antes de añadir al carrito.');
    return;
  }

  const chosenSize = selectedSizes[productId] || 'Única';
  const chosenQuantity = selectedQuantities[productId] || 1;
  const cartItemKey = `${productId}-${chosenSize}`;
  
  const existing = cart.find(item => item.cartKey === cartItemKey);
  const currentInCart = existing ? existing.quantity : 0;

  if (currentInCart + chosenQuantity > product.stock) {
    alert(`No puedes añadir más unidades. Superas el stock disponible (${product.stock}).`);
    return;
  }

  if (existing) {
    existing.quantity += chosenQuantity;
  } else {
    cart.push({
      cartKey: cartItemKey,
      id: product.id,
      name: product.name,
      price: product.price,
      size: chosenSize,
      quantity: chosenQuantity
    });
  }

  selectedQuantities[productId] = 1;
  updateCartUI();
  toggleCart();
}

function updateCartUI() {
  const container = document.getElementById('cart-items-container');
  const counter = document.getElementById('cart-counter');
  const totalAmountEl = document.getElementById('cart-total-amount');

  counter.textContent = cart.reduce((acc, item) => acc + item.quantity, 0);
  container.innerHTML = '';

  if (cart.length === 0) {
    container.innerHTML = `<p class="text-center text-gray-400 text-xs py-8">Tu carrito está vacío.</p>`;
    totalAmountEl.textContent = '$0.00';
    return;
  }

  let total = 0;
  cart.forEach((item, index) => {
    total += item.price * item.quantity;
    container.innerHTML += `
      <div class="flex justify-between items-center py-2">
        <div>
          <h4 class="font-bold text-xs">${item.name}</h4>
          <p class="text-[10px] text-gray-500">Talla: ${item.size} | Cantidad: ${item.quantity}</p>
          <span class="text-xs font-bold text-blue-600">$${(item.price * item.quantity).toFixed(2)}</span>
        </div>
        <button onclick="removeFromCart(${index})" class="text-red-500 hover:text-red-700 text-xs font-bold px-2">✕</button>
      </div>
    `;
  });

  totalAmountEl.textContent = `$${total.toFixed(2)}`;
}

function removeFromCart(index) {
  cart.splice(index, 1);
  updateCartUI();
}

async function submitOrder(event) {
  event.preventDefault();
  if (cart.length === 0) {
    alert('El carrito está vacío.');
    return;
  }

  const name = document.getElementById('cust-name').value;
  const phone = document.getElementById('cust-phone').value;
  const email = document.getElementById('cust-email').value;
  const address = document.getElementById('cust-address').value;
  
  const totalAmount = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  try {
    // 1. Obtener minutos de expiración de reserva
    let expirationMinutes = 30;
    const { data: settingData } = await supabaseClient
      .from('settings')
      .select('value')
      .eq('key', 'order_expiration_minutes')
      .single();

    if (settingData && settingData.value) {
      expirationMinutes = parseInt(settingData.value);
    }

    const expiresAt = new Date(Date.now() + expirationMinutes * 60000).toISOString();

    // 2. Insertar en la tabla 'orders'[cite: 6]
    const { data: orderData, error: orderError } = await supabaseClient
      .from('orders')
      .insert([{
        customer_name: name,
        customer_phone: phone,
        customer_email: email,
        shipping_address: address,
        total_amount: totalAmount,
        status: 'pendiente',
        expires_at: expiresAt
      }])
      .select()
      .single();

    if (orderError) throw orderError;

    // 3. Mapear e insertar en 'order_items'[cite: 6]
    const orderItemsToInsert = cart.map(item => ({
      order_id: orderData.id,
      product_id: item.id,
      quantity: item.quantity,
      unit_price: item.price
    }));

    const { error: itemsError } = await supabaseClient
      .from('order_items')
      .insert(orderItemsToInsert);

    if (itemsError) throw itemsError;

    alert('¡Pedido registrado con éxito! Tu orden está en estado PENDIENTE. Nos pondremos en contacto para coordinar el pago.');
    
    cart = [];
    updateCartUI();
    toggleCart();
    document.getElementById('checkout-form').reset();
    fetchPublicProducts();

  } catch (err) {
    console.error('Error al procesar la orden:', err);
    alert('Error al registrar el pedido: ' + (err.message || 'Error de conexión'));
  }
}
