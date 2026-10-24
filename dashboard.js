const SUPABASE_URL = 'https://hfsmxrfvlygudusoyuij.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_KwPDclPcrmdzcS4xclcbZA_Y4ZAcDKu';
const supabaseAdmin = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let productsList = [];
let ordersList = [];

document.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await supabaseAdmin.auth.getSession();
  if (!session) { window.location.href = 'index.html'; return; }
  fetchAdminProducts();
  fetchAdminOrders();
  fetchSettings();
});

function switchTab(tabName) {
  document.getElementById('section-products').classList.add('hidden');
  document.getElementById('section-orders').classList.add('hidden');
  document.getElementById('section-settings').classList.add('hidden');

  document.getElementById(`section-${tabName}`).classList.remove('hidden');
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
      <div class="bg-white border rounded-xl overflow-hidden shadow-sm flex flex-col justify-between p-3">
        <div>
          <img src="${img}" class="w-full h-36 object-cover rounded-lg mb-2">
          <span class="text-[10px] font-bold uppercase bg-blue-50 text-blue-600 px-2 py-0.5 rounded">${product.product_type || 'standard'}</span>
          <h3 class="font-bold text-sm mt-1">${product.name}</h3>
          <p class="text-xs text-gray-500 mb-2">Stock: <b>${product.stock}</b></p>
          <span class="font-extrabold text-blue-600">$${product.price.toFixed(2)}</span>
        </div>
        <div class="flex gap-2 mt-3">
          <button onclick="editProduct('${product.id}')" class="w-1/2 bg-gray-100 py-1.5 rounded text-xs font-medium">Editar</button>
          <button onclick="deleteProduct('${product.id}')" class="w-1/2 bg-red-50 text-red-600 py-1.5 rounded text-xs font-medium">Eliminar</button>
        </div>
      </div>
    `;
  });
}

function openProductModal() {
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
  const type = document.getElementById('prod-type').value;
  const sizesRaw = document.getElementById('prod-sizes').value;
  const sizes = sizesRaw ? sizesRaw.split(',').map(s => s.trim()) : [];
  
  const fabricsRaw = document.getElementById('prod-fabrics').value;
  const fabrics = fabricsRaw ? fabricsRaw.split(',').map(f => f.trim()) : [];
  
  const collarsRaw = document.getElementById('prod-collars').value;
  const collars = collarsRaw ? collarsRaw.split(',').map(c => c.trim()) : [];

  const allowCustomText = document.getElementById('prod-custom-text').checked;
  const description = document.getElementById('prod-desc').value;
  const imageFile = document.getElementById('prod-image-file').files[0];

  let imageUrl = null;
  if (imageFile) {
    const fileName = `${Date.now()}_${imageFile.name}`;
    const { error: uploadError } = await supabaseAdmin.storage.from('products').upload(fileName, imageFile);
    if (!uploadError) {
      const { data: publicUrlData } = supabaseAdmin.storage.from('products').getPublicUrl(fileName);
      imageUrl = publicUrlData.publicUrl;
    }
  }

  const customFields = { fabrics, collars, allow_custom_text: allowCustomText };

  const productData = { 
    name, 
    price, 
    stock, 
    product_type: type, 
    sizes, 
    custom_fields: customFields, 
    description 
  };
  
  if (imageUrl) { productData.main_image = imageUrl; productData.images = [imageUrl]; }

  if (id) {
    await supabaseAdmin.from('products').update(productData).eq('id', id);
  } else {
    await supabaseAdmin.from('products').insert([productData]);
  }

  closeProductModal();
  fetchAdminProducts();
}

async function editProduct(id) {
  const product = productsList.find(p => p.id === id);
  if (!product) return;
  document.getElementById('prod-id').value = product.id;
  document.getElementById('prod-type').value = product.product_type || 'standard';
  document.getElementById('prod-name').value = product.name;
  document.getElementById('prod-price').value = product.price;
  document.getElementById('prod-stock').value = product.stock;
  document.getElementById('prod-sizes').value = product.sizes ? product.sizes.join(', ') : '';
  
  const cFields = product.custom_fields || {};
  document.getElementById('prod-fabrics').value = cFields.fabrics ? cFields.fabrics.join(', ') : '';
  document.getElementById('prod-collars').value = cFields.collars ? cFields.collars.join(', ') : '';
  document.getElementById('prod-custom-text').checked = !!cFields.allow_custom_text;
  document.getElementById('prod-desc').value = product.description || '';
  
  document.getElementById('product-modal').classList.remove('hidden');
}

async function deleteProduct(id) {
  if (!confirm('¿Eliminar producto?')) return;
  await supabaseAdmin.from('products').delete().eq('id', id);
  fetchAdminProducts();
}

async function fetchAdminOrders() {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select(`*, order_items ( quantity, unit_price, selected_options, attachment_url, products ( name ) )`)
    .order('created_at', { ascending: false });

  if (error) { console.error(error); return; }
  ordersList = data;
  renderOrders(ordersList);
}

function renderOrders(items) {
  const tbody = document.getElementById('orders-table-body');
  tbody.innerHTML = '';

  items.forEach(order => {
    const itemsSummary = order.order_items && order.order_items.length > 0
      ? order.order_items.map(i => {
          const opts = i.selected_options ? JSON.stringify(i.selected_options) : '';
          const artLink = i.attachment_url ? ` <a href="${i.attachment_url}" target="_blank" class="text-blue-600 underline">[Arte]</a>` : '';
          return `<b>${i.products?.name || 'Item'}</b> (x${i.quantity}) ${opts} ${artLink}`;
        }).join('<br>')
      : 'Sin detalle';

    const proofLink = order.payment_proof_url 
      ? `<br><a href="${order.payment_proof_url}" target="_blank" class="text-blue-600 underline font-bold text-xs bg-blue-50 px-1.5 py-0.5 rounded inline-block mt-1">📄 Ver Comprobante</a>` 
      : `<br><span class="text-gray-400 text-xs">Sin comprobante</span>`;

    let actionButtonHtml = '';
    const currentStatus = (order.status || 'pendiente').toLowerCase();

    if (currentStatus === 'pendiente' || currentStatus === 'pago_rechazado') {
      actionButtonHtml = `
        <div class="flex flex-col gap-1.5">
          <button onclick="updateOrderStatus('${order.id}', 'pedido_aprobado')" class="bg-yellow-600 text-white px-2.5 py-1.5 rounded text-xs font-bold hover:bg-yellow-700 transition">Aprobar Pedido</button>
        </div>
      `;
    } else if (currentStatus === 'pedido_aprobado') {
      actionButtonHtml = `
        <div class="flex flex-col gap-1.5">
          <button onclick="updateOrderStatus('${order.id}', 'pago_aprobado')" class="bg-blue-600 text-white px-2.5 py-1.5 rounded text-xs font-bold hover:bg-blue-700 transition">Aprobar Pago</button>
          <button onclick="updateOrderStatus('${order.id}', 'pago_rechazado')" class="bg-red-500 text-white px-2.5 py-1.5 rounded text-xs font-bold hover:bg-red-600 transition">Rechazar Pago</button>
        </div>
      `;
    } else if (currentStatus === 'pago_aprobado') {
      actionButtonHtml = `
        <div class="flex flex-col gap-1.5">
          <button onclick="updateOrderStatus('${order.id}', 'enviado')" class="bg-purple-600 text-white px-2.5 py-1.5 rounded text-xs font-bold hover:bg-purple-700 transition">Aprobar Envío</button>
        </div>
      `;
    } else {
      actionButtonHtml = `<span class="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md">Completado ✅</span>`;
    }

    tbody.innerHTML += `
      <tr class="hover:bg-gray-50 border-b">
        <td class="p-3 font-bold">${order.customer_name}</td>
        <td class="p-3 text-xs">${order.customer_phone}<br>${order.shipping_address}</td>
        <td class="p-3 text-xs">${itemsSummary}</td>
        <td class="p-3 text-xs">
          <b>Método:</b> ${order.payment_method || 'N/A'}<br>
          <b>Ref:</b> ${order.payment_reference || 'S/N'}
          ${proofLink}
        </td>
        <td class="p-3 font-bold text-blue-600">$${order.total_amount.toFixed(2)}</td>
        <td class="p-3 text-xs uppercase font-bold text-gray-700">
          <span class="bg-gray-100 px-2.5 py-1 rounded-md">${order.status}</span>
        </td>
        <td class="p-3">
          ${actionButtonHtml}
        </td>
      </tr>
    `;
  });
}

async function updateOrderStatus(orderId, newStatus) {
  const { error } = await supabaseAdmin.from('orders').update({ status: newStatus }).eq('id', orderId);
  if (error) {
    alert('Error al actualizar el estado: ' + error.message);
    return;
  }
  fetchAdminOrders();
}

function filterOrdersByDate() {}
function resetDateFilter() { renderOrders(ordersList); }
async function fetchSettings() {}
async function saveSettings() {}
async function logout() {
  await supabaseAdmin.auth.signOut();
  window.location.href = 'index.html';
}
