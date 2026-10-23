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
            <p class="text-xs text-gray-500 mb-2">Stock: <b>${product.stock}</b> | Tallas: ${product.sizes ? product.sizes.join(', ') : 'N/A'}</p>
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
  const colorsRaw = document.getElementById('prod-colors').value;
  const colors = colorsRaw ? colorsRaw.split(',').map(c => c.trim()) : [];
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

  const productData = { name, price, stock, gender, sort_order: sortOrder, sizes, colors, description };
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
  document.getElementById('prod-colors').value = product.colors ? product.colors.join(', ') : '';
  document.getElementById('prod-desc').value = product.description || '';
  document.getElementById('product-modal').classList.remove('hidden');
}

async function deleteProduct(id) {
  if (!confirm('¿Estás seguro de eliminar este producto?')) return;
  const { error } = await supabaseAdmin.from('products').delete().eq('id', id);
  if (error) {
    if (error.code === '23503') {
      alert('No se puede eliminar porque tiene historial de ventas. Te sugerimos poner el Stock en 0.');
    } else {
      alert('Error al eliminar: ' + error.message);
    }
  }
  fetchAdminProducts();
}

async function fetchAdminOrders() {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select(`*, order_items ( quantity, unit_price, products ( name ) )`)
    .order('created_at', { ascending: false });

  if (error) { console.error('Error cargando órdenes:', error); return; }
  ordersList = data;
  renderOrders(ordersList);
}

function renderOrders(items) {
  const tbody = document.getElementById('orders-table-body');
  tbody.innerHTML = '';
  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-gray-500">No se encontraron pedidos.</td></tr>`;
    return;
  }

  const now = new Date();

  items.forEach(order => {
    let status = order.status;
    if (status === 'pendiente' && order.expires_at) {
      if (now > new Date(order.expires_at)) {
        status = 'cancelado';
      }
    }

    let statusBadge = '';
    if (status === 'pendiente') {
      statusBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">1. Pendiente</span>`;
    } else if (status === 'pagado') {
      statusBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">2. Pagado</span>`;
    } else if (status === 'enviado') {
      statusBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">3. Enviado 🚚</span>`;
    } else if (status === 'cancelado') {
      statusBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">Expirado / Cancelado</span>`;
    } else if (status === 'rechazado') {
      statusBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">Pago Rechazado</span>`;
    }

    let actionButtons = '';
    if (status === 'pendiente') {
      actionButtons = `
        <div class="flex gap-1">
          <button onclick="updateOrderStatus('${order.id}', 'pagado')" class="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded text-xs font-medium transition">
            Confirmar Pago
          </button>
          <button onclick="updateOrderStatus('${order.id}', 'rechazado')" class="bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded text-xs font-medium transition" title="Rechazar pago">
            Rechazar
          </button>
          <button onclick="updateOrderStatus('${order.id}', 'cancelado')" class="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs font-medium transition" title="Cancelar pedido">
            ✕
          </button>
        </div>`;
    } else if (status === 'pagado') {
      actionButtons = `
        <button onclick="updateOrderStatus('${order.id}', 'enviado')" class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-medium transition">
          Confirmar Envío
        </button>`;
    } else {
      actionButtons = `<span class="text-xs text-gray-400 font-medium">Sin acciones</span>`;
    }

    const itemsSummary = order.order_items && order.order_items.length > 0
      ? order.order_items.map(i => `${i.products?.name || 'Producto'} (x${i.quantity})`).join(', ')
      : 'Sin detalle';

    let paymentInfoHtml = `
      <p class="text-xs font-bold text-gray-800">${order.payment_method || 'N/A'}</p>
      <p class="text-[11px] font-mono text-gray-600">Ref: ${order.payment_reference || 'S/N'}</p>
    `;
    if (order.payment_proof_url) {
      paymentInfoHtml += `<a href="${order.payment_proof_url}" target="_blank" class="text-[10px] text-blue-600 underline font-semibold">Ver Comprobante 📄</a>`;
    }

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
        <td class="p-3 text-xs text-gray-700 max-w-xs truncate" title="${itemsSummary}">${itemsSummary}</td>
        <td class="p-3">${paymentInfoHtml}</td>
        <td class="p-3 font-bold text-blue-600">$${order.total_amount.toFixed(2)}</td>
        <td class="p-3">${statusBadge}</td>
        <td class="p-3 whitespace-nowrap">${actionButtons}</td>
      </tr>
    `;
  });
}

async function updateOrderStatus(orderId, newStatus) {
  let confirmMsg = '';
  if (newStatus === 'pagado') confirmMsg = '¿Confirmas el pago? Esto descontará el stock del inventario.';
  else if (newStatus === 'enviado') confirmMsg = '¿Confirmas que el paquete fue despachado?';
  else if (newStatus === 'rechazado') confirmMsg = '¿Deseas rechazar este pago para que el cliente reenvíe el comprobante?';
  else if (newStatus === 'cancelado') confirmMsg = '¿Deseas cancelar este pedido?';

  if (!confirm(confirmMsg)) return;

  try {
    if (newStatus === 'pagado') {
      const { data: orderItems, error: itemsError } = await supabaseAdmin
        .from('order_items')
        .select('product_id, quantity')
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;

      for (const item of orderItems) {
        const { data: prodData, error: prodError } = await supabaseAdmin
          .from('products')
          .select('stock')
          .eq('id', item.product_id)
          .single();

        if (prodError) throw prodError;

        const newStock = Math.max(0, prodData.stock - item.quantity);
        await supabaseAdmin.from('products').update({ stock: newStock }).eq('id', item.product_id);
      }
    }

    const { error: statusError } = await supabaseAdmin
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (statusError) throw statusError;

    alert(`¡Pedido actualizado a "${newStatus.toUpperCase()}"!`);
    fetchAdminOrders();

  } catch (err) {
    console.error('Error al actualizar estado:', err);
    alert('Error al procesar la acción: ' + (err.message || 'Error'));
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

async function fetchSettings() {
  const { data } = await supabaseAdmin.from('settings').select('value').eq('key', 'order_expiration_minutes').single();
  if (data) document.getElementById('setting-expiration').value = data.value;
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
