const SUPABASE_URL = 'https://hfsmxrfvlygudusoyuij.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_KwPDclPcrmdzcS4xclcbZA_Y4ZAcDKu';
const supabaseAdmin = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let productsList = [];
let ordersList = [];

document.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await supabaseAdmin.auth.getSession();
  if (!session) {
    window.location.href = 'index.html';
    return;
  }

  fetchAdminProducts();
  fetchAdminOrders();
  fetchSettings();
});

function switchTab(tabName) {
  document.getElementById('section-products').classList.add('hidden');
  document.getElementById('section-orders').classList.add('hidden');
  document.getElementById('section-settings').classList.add('hidden');

  document.getElementById('tab-products-btn').className = 'px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-200 transition';
  document.getElementById('tab-orders-btn').className = 'px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-200 transition';
  document.getElementById('tab-settings-btn').className = 'px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-200 transition';

  document.getElementById(`section-${tabName}`).classList.remove('hidden');
  document.getElementById(`tab-${tabName}-btn`).className = 'px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-900 text-white transition';
}

async function fetchAdminProducts() {
  const { data, error } = await supabaseAdmin.from('products').select('*').order('sort_order', { ascending: true });
  if (error) { console.error(error); return; }
  productsList = data;
  renderAdminProducts(productsList);
}

function renderAdminProducts(items) {
  const grid = document.getElementById('admin-products-grid');
  grid.innerHTML = '';
  items.forEach(product => {
    const img = product.main_image || (product.images && product.images[0]) || 'https://via.placeholder.com/300';
    grid.innerHTML += `
      <div class="bg-white border rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
        <div>
          <img src="${img}" class="w-full h-40 object-cover">
          <div class="p-4">
            <h3 class="font-bold text-sm mb-1">${product.name}</h3>
            <p class="text-xs text-gray-500 mb-2">Stock: <b>${product.stock}</b> | Orden: ${product.sort_order}</p>
            <span class="font-extrabold text-blue-600">$${product.price.toFixed(2)}</span>
          </div>
        </div>
        <div class="p-4 pt-0 flex gap-2">
          <button onclick="editProduct('${product.id}')" class="w-1/2 bg-gray-100 py-1.5 rounded text-xs font-medium hover:bg-gray-200">Editar</button>
          <button onclick="deleteProduct('${product.id}')" class="w-1/2 bg-red-50 text-red-600 py-1.5 rounded text-xs font-medium hover:bg-red-100">Eliminar</button>
        </div>
      </div>
    `;
  });
}

function openProductModal() {
  document.getElementById('modal-title').textContent = 'Nuevo Producto';
  document.getElementById('product-form').reset();
  document.getElementById('prod-id').value = '';
  document.getElementById('product-modal').classList.remove('hidden');
}

function closeProductModal() {
  document.getElementById('product-modal').classList.add('hidden');
}

async function saveProduct(event) {
  event.preventDefault();
  const id = document.getElementById('prod-id').value;
  const name = document.getElementById('prod-name').value;
  const price = parseFloat(document.getElementById('prod-price').value);
  const stock = parseInt(document.getElementById('prod-stock').value);
  const gender = document.getElementById('prod-gender').value;
  const sortOrder = parseInt(document.getElementById('prod-sort').value) || 0;
  const sizesRaw = document.getElementById('prod-sizes').value;
  const sizes = sizesRaw ? sizesRaw.split(',').map(s => s.trim()) : [];
  const description = document.getElementById('prod-desc').value;
  const imageFile = document.getElementById('prod-image-file').files[0];

  let imageUrl = null;
  if (imageFile) {
    const fileName = `${Date.now()}_${imageFile.name}`;
    const { error: uploadError } = await supabaseAdmin.storage.from('products').upload(fileName, imageFile);
    if (uploadError) { alert('Error al subir la imagen: ' + uploadError.message); return; }
    const { data: publicUrlData } = supabaseAdmin.storage.from('products').getPublicUrl(fileName);
    imageUrl = publicUrlData.publicUrl;
  }

  const productData = { name, price, stock, gender, sort_order: sortOrder, sizes, description };
  if (imageUrl) { productData.main_image = imageUrl; productData.images = [imageUrl]; }

  if (id) {
    const { error } = await supabaseAdmin.from('products').update(productData).eq('id', id);
    if (error) alert('Error al actualizar: ' + error.message);
  } else {
    const { error } = await supabaseAdmin.from('products').insert([productData]);
    if (error) alert('Error al crear: ' + error.message);
  }

  closeProductModal();
  fetchAdminProducts();
}

async function editProduct(id) {
  const product = productsList.find(p => p.id === id);
  if (!product) return;
  document.getElementById('modal-title').textContent = 'Editar Producto';
  document.getElementById('prod-id').value = product.id;
  document.getElementById('prod-name').value = product.name;
  document.getElementById('prod-price').value = product.price;
  document.getElementById('prod-stock').value = product.stock;
  document.getElementById('prod-gender').value = product.gender;
  document.getElementById('prod-sort').value = product.sort_order;
  document.getElementById('prod-sizes').value = product.sizes ? product.sizes.join(', ') : '';
  document.getElementById('prod-desc').value = product.description || '';
  document.getElementById('product-modal').classList.remove('hidden');
}

async function deleteProduct(id) {
  if (!confirm('¿Estás seguro de eliminar este producto?')) return;
  const { error } = await supabaseAdmin.from('products').delete().eq('id', id);
  if (error) alert('Error al eliminar: ' + error.message);
  fetchAdminProducts();
}

async function fetchAdminOrders() {
  // Consulta relacional trayendo 'order_items' y el nombre del producto[cite: 6]
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select(`
      *,
      order_items (
        quantity,
        unit_price,
        products ( name )
      )
    `)
    .order('created_at', { ascending: false });

  if (error) { console.error('Error cargando órdenes:', error); return; }
  ordersList = data;
  renderOrders(ordersList);
}

function renderOrders(items) {
  const tbody = document.getElementById('orders-table-body');
  tbody.innerHTML = '';
  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-gray-500">No se encontraron pedidos.</td></tr>`;
    return;
  }

  items.forEach(order => {
    const dateFormatted = new Date(order.created_at).toLocaleString();

    let statusBadge = '';
    if (order.status === 'pendiente') {
      statusBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">1. Pendiente</span>`;
    } else if (order.status === 'pagado') {
      statusBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">2. Pagado</span>`;
    } else if (order.status === 'enviado') {
      statusBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">3. Enviado 🚚</span>`;
    } else {
      statusBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">${order.status}</span>`;
    }

    let actionButtons = '';
    if (order.status === 'pendiente') {
      actionButtons = `
        <button onclick="updateOrderStatus('${order.id}', 'pagado')" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium transition">
          Confirmar Pago
        </button>`;
    } else if (order.status === 'pagado') {
      actionButtons = `
        <button onclick="updateOrderStatus('${order.id}', 'enviado')" class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-medium transition">
          Confirmar Envío
        </button>`;
    } else if (order.status === 'enviado') {
      actionButtons = `<span class="text-xs text-gray-400 font-medium">Completado</span>`;
    }

    const itemsSummary = order.order_items && order.order_items.length > 0
      ? order.order_items.map(i => `${i.products?.name || 'Producto'} (x${i.quantity})`).join(', ')
      : 'Sin detalle';

    tbody.innerHTML += `
      <tr class="hover:bg-gray-50 border-b">
        <td class="p-3">
          <p class="font-bold text-gray-900">${order.customer_name}</p>
          <p class="text-xs text-gray-500">${order.customer_email || 'Sin correo'}</p>
        </td>
        <td class="p-3">
          <p class="text-xs font-medium">${order.customer_phone}</p>
          <p class="text-xs text-gray-500 truncate max-w-xs">${order.shipping_address}</p>
        </td>
        <td class="p-3 text-xs text-gray-700 max-w-xs truncate" title="${itemsSummary}">
          ${itemsSummary}
        </td>
        <td class="p-3 font-bold text-blue-600">$${order.total_amount.toFixed(2)}</td>
        <td class="p-3">${statusBadge}</td>
        <td class="p-3 whitespace-nowrap">${actionButtons}</td>
      </tr>
    `;
  });
}

async function updateOrderStatus(orderId, newStatus) {
  const confirmMsg = newStatus === 'pagado' 
    ? '¿Confirmas que se ha recibido el pago de este pedido?' 
    : '¿Confirmas que este pedido ha sido despachado?';

  if (!confirm(confirmMsg)) return;

  const { error } = await supabaseAdmin
    .from('orders')
    .update({ status: newStatus })
    .eq('id', orderId);

  if (error) {
    alert('Error al actualizar el estado: ' + error.message);
  } else {
    fetchAdminOrders();
  }
}

function filterOrdersByDate() {
  const startStr = document.getElementById('filter-date-start').value;
  const endStr = document.getElementById('filter-date-end').value;
  if (!startStr || !endStr) { alert('Selecciona fecha de inicio y fin.'); return; }
  const startDate = new Date(startStr); startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(endStr); endDate.setHours(23, 59, 59, 999);
  const filtered = ordersList.filter(order => {
    const orderDate = new Date(order.created_at);
    return orderDate >= startDate && orderDate <= endDate;
  });
  renderOrders(filtered);
}

function resetDateFilter() {
  document.getElementById('filter-date-start').value = '';
  document.getElementById('filter-date-end').value = '';
  renderOrders(ordersList);
}

function quickDateFilter(rangeType) {
  const now = new Date();
  let start = new Date(); let end = new Date();
  if (rangeType === 'today') {
    start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999);
  } else if (rangeType === 'week') {
    start.setDate(now.getDate() - 7); start.setHours(0, 0, 0, 0);
  } else if (rangeType === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  }
  const filtered = ordersList.filter(order => {
    const orderDate = new Date(order.created_at);
    return orderDate >= start && orderDate <= end;
  });
  renderOrders(filtered);
}

async function fetchSettings() {
  const { data } = await supabaseAdmin.from('settings').select('value').eq('key', 'order_expiration_minutes').single();
  if (data) { document.getElementById('setting-expiration').value = data.value; }
}

async function saveSettings() {
  const val = parseInt(document.getElementById('setting-expiration').value);
  if (isNaN(val) || val <= 0) { alert('Introduce un número válido.'); return; }
  const { error } = await supabaseAdmin.from('settings').upsert({ key: 'order_expiration_minutes', value: val, updated_at: new Date() });
  if (error) alert('Error: ' + error.message);
  else alert('¡Ajustes actualizados correctamente!');
}

async function logout() {
  await supabaseAdmin.auth.signOut();
  window.location.href = 'index.html';
}
