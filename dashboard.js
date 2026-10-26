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
});

function switchTab(tabName) {
  document.getElementById('section-products').classList.add('hidden');
  document.getElementById('section-orders').classList.add('hidden');
  document.getElementById(`section-${tabName}`).classList.remove('hidden');
}

async function fetchAdminProducts() {
  const { data, error } = await supabaseAdmin.from('products').select('*').order('sort_order', { ascending: true });
  if (error) { console.error(error); return; }
  productsList = data || [];
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
          <span class="text-[10px] font-bold uppercase bg-blue-50 text-blue-600 px-2 py-0.5 rounded">${product.product_type}</span>
          <h3 class="font-bold text-sm mt-1">${product.name}</h3>
          <p class="text-xs text-gray-500 mb-1">Stock: <b>${product.stock}</b> | Pos: <b>${product.sort_order || 0}</b></p>
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
  document.getElementById('prod-image-file').value = ''; // Resetear selector de archivo
  document.getElementById('product-modal').classList.remove('hidden');
}

function closeProductModal() { 
  document.getElementById('product-modal').classList.add('hidden'); 
}

async function editProduct(id) {
  const p = productsList.find(item => item.id === id);
  if (!p) return;

  // Reseteamos el formulario antes de cargar los datos
  document.getElementById('product-form').reset();
  document.getElementById('prod-image-file').value = '';

  document.getElementById('prod-id').value = p.id;
  document.getElementById('prod-type').value = p.product_type || 'standard';
  document.getElementById('prod-gender').value = p.gender || 'damas';
  document.getElementById('prod-name').value = p.name;
  document.getElementById('prod-price').value = p.price;
  document.getElementById('prod-stock').value = p.stock;
  document.getElementById('prod-sort').value = p.sort_order || 0;
  document.getElementById('prod-sizes').value = p.sizes ? p.sizes.join(', ') : '';
  document.getElementById('prod-fabrics').value = p.custom_fields?.fabrics ? p.custom_fields.fabrics.join(', ') : '';
  document.getElementById('prod-collars').value = p.custom_fields?.collars ? p.custom_fields.collars.join(', ') : '';
  document.getElementById('prod-custom-text').checked = !!p.custom_fields?.allow_custom_text;
  document.getElementById('prod-desc').value = p.description || '';

  document.getElementById('product-modal').classList.remove('hidden');
}

async function saveProduct(event) {
  event.preventDefault();
  const id = document.getElementById('prod-id').value;
  const name = document.getElementById('prod-name').value;
  const price = parseFloat(document.getElementById('prod-price').value);
  const stock = parseInt(document.getElementById('prod-stock').value);
  const sortOrder = parseInt(document.getElementById('prod-sort').value) || 0;
  const type = document.getElementById('prod-type').value;
  const gender = document.getElementById('prod-gender').value;
  const sizes = document.getElementById('prod-sizes').value.split(',').map(s => s.trim()).filter(Boolean);
  const fabrics = document.getElementById('prod-fabrics').value.split(',').map(f => f.trim()).filter(Boolean);
  const collars = document.getElementById('prod-collars').value.split(',').map(c => c.trim()).filter(Boolean);
  const allowCustomText = document.getElementById('prod-custom-text').checked;
  const description = document.getElementById('prod-desc').value;
  
  const imageFileInput = document.getElementById('prod-image-file');
  const imageFile = imageFileInput.files[0];

  let imageUrl = null;

  // 1. Si el usuario subió una NUEVA imagen en el formulario
  if (imageFile) {
    const fileName = `${Date.now()}_${imageFile.name}`;
    const { error: uploadError } = await supabaseAdmin.storage.from('products').upload(fileName, imageFile);
    if (!uploadError) {
      const { data: urlData } = supabaseAdmin.storage.from('products').getPublicUrl(fileName);
      imageUrl = urlData.publicUrl;
    } else {
      alert('Error al subir la nueva imagen: ' + uploadError.message);
      return;
    }
  } 
  // 2. Si no subió una nueva imagen y estamos EDITANDO, conservamos la imagen anterior
  else if (id) {
    const existingProduct = productsList.find(item => item.id === id);
    if (existingProduct) {
      imageUrl = existingProduct.main_image || (existingProduct.images && existingProduct.images[0]) || null;
    }
  }

  const customFields = { fabrics, collars, allow_custom_text: allowCustomText };
  const productData = { 
    name, 
    price, 
    stock, 
    sort_order: sortOrder, 
    product_type: type, 
    gender, 
    sizes, 
    custom_fields: customFields, 
    description 
  };

  // Asignamos la imagen (ya sea la nueva o la conservada previa)
  if (imageUrl) { 
    productData.main_image = imageUrl; 
    productData.images = [imageUrl]; 
  }

  let result = id 
    ? await supabaseAdmin.from('products').update(productData).eq('id', id) 
    : await supabaseAdmin.from('products').insert([productData]);

  if (result.error) { 
    alert('Error al guardar producto: ' + result.error.message); 
    return; 
  }

  // Limpiamos el selector de archivo para que no recuerde la última imagen en la siguiente edición
  imageFileInput.value = '';

  closeProductModal();
  fetchAdminProducts();
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
  ordersList = data || [];
  renderOrders(ordersList);
}

function renderOrders(items) {
  const tbody = document.getElementById('orders-table-body');
  tbody.innerHTML = '';

  items.forEach(order => {
    const itemsSummary = order.order_items?.map(i => `<b>${i.products?.name || 'Item'}</b> (x${i.quantity})`).join('<br>') || 'Sin detalle';
    const proofLink = order.payment_proof_url ? `<br><a href="${order.payment_proof_url}" target="_blank" class="text-blue-600 underline font-bold text-xs">[Ver Comprobante]</a>` : '';

    let actionButtonHtml = '';
    const status = (order.status || 'pendiente').toLowerCase();

    if (status === 'pendiente' || status === 'pago_rechazado') {
      actionButtonHtml = `<button onclick="updateOrderStatus('${order.id}', 'pedido_aprobado')" class="bg-yellow-600 text-white px-2 py-1 rounded text-xs font-bold">Aprobar Pedido</button>`;
    } else if (status === 'pedido_aprobado') {
      actionButtonHtml = `
        <div class="flex flex-col gap-1">
          <button onclick="updateOrderStatus('${order.id}', 'pago_aprobado')" class="bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold">Aprobar Pago</button>
          <button onclick="updateOrderStatus('${order.id}', 'pago_rechazado')" class="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">Rechazar Pago</button>
        </div>
      `;
    } else if (status === 'pago_aprobado') {
      actionButtonHtml = `<button onclick="updateOrderStatus('${order.id}', 'enviado')" class="bg-purple-600 text-white px-2 py-1 rounded text-xs font-bold">Aprobar Envío</button>`;
    } else {
      actionButtonHtml = `<span class="text-xs font-bold text-green-600">Completado ✅</span>`;
    }

    tbody.innerHTML += `
      <tr class="hover:bg-gray-50 border-b">
        <td class="p-3 font-bold">${order.customer_name}</td>
        <td class="p-3 text-xs">${order.customer_phone}<br>${order.shipping_address}</td>
        <td class="p-3 text-xs">${itemsSummary}</td>
        <td class="p-3 text-xs"><b>${order.payment_method || 'N/A'}</b><br>Ref: ${order.payment_reference || 'S/N'}${proofLink}</td>
        <td class="p-3 font-bold text-blue-600">$${order.total_amount.toFixed(2)}</td>
        <td class="p-3 text-xs uppercase font-bold text-gray-700"><span class="bg-gray-100 px-2.5 py-1 rounded-md">${order.status}</span></td>
        <td class="p-3">${actionButtonHtml}</td>
      </tr>
    `;
  });
}

async function updateOrderStatus(orderId, newStatus) {
  const { error } = await supabaseAdmin.from('orders').update({ status: newStatus }).eq('id', orderId);
  if (error) { alert('Error: ' + error.message); return; }
  fetchAdminOrders();
}

async function logout() {
  await supabaseAdmin.auth.signOut();
  window.location.href = 'index.html';
}
