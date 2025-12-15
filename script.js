/* =========================================
   SCRIPT.JS - FUNCIONALIDAD COMPLETA
   ========================================= */

// Si estás en local usa 'http://localhost:3000/api'
// Si ya subiste a Render, usa solo '/api'
const API_URL = '/api'; 

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbym_A90tIE6Cu7f4U1oGO3Q79mqFvhjV9TBEpHdnERNxbNLDEyXHmtdK9jPFQoh5gcU/exec'; 
const STRIPE_LINK_BASE = 'https://buy.stripe.com/test_dRmeVf8Pi3RHdXhgSO2Ji00'; 

let carrito = [];
let productos = []; 
let cuponAplicado = null; 

document.addEventListener('DOMContentLoaded', () => {
    cargarProductosDesdeBD();
    cargarCuponesInicio();
    
    // Verificar si es Admin
    if (localStorage.getItem('role') === 'admin') {
        const btn = document.getElementById('btn-admin');
        if(btn) btn.style.display = 'inline-flex';
    }
});

// --- NAVEGACIÓN (MENÚ Y SECCIONES) ---
function showSection(id) {
    // 1. Ocultar todas las secciones
    document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
    // 2. Mostrar la seleccionada
    const section = document.getElementById(id);
    if(section) {
        section.classList.add('active');
        window.scrollTo(0, 0); // Subir al inicio de la página
    }
}

function toggleCart() {
    document.getElementById('cart-sidebar').classList.toggle('open');
}

function logout() {
    localStorage.removeItem('role');
    window.location.href = 'login.html';
}

// --- CARGA DE DATOS ---
async function cargarProductosDesdeBD() {
    try {
        const res = await fetch(API_URL + '/products');
        productos = await res.json();
        renderizarProductos();
    } catch (error) { console.error("Error productos:", error); }
}

async function cargarCuponesInicio() {
    try {
        const container = document.querySelector('.coupon-container');
        if(!container) return;
        const res = await fetch(API_URL + '/coupons');
        const cupones = await res.json();
        container.innerHTML = '';
        cupones.forEach(c => {
            let desc = c.tipo === 'porcentaje' ? `${c.descuento}% OFF` : `$${c.descuento} MXN OFF`;
            container.innerHTML += `
                <div class="coupon-card" onclick="copiarCupon('${c.codigo}')">
                    <small>Copiar:</small><br><strong>${c.codigo}</strong><br><small>${desc}</small>
                </div>`;
        });
    } catch (e) { console.error(e); }
}

function renderizarProductos() {
    const promo = document.getElementById('promos-container');
    const menu = document.getElementById('menu-container');
    if(promo) promo.innerHTML = '';
    if(menu) menu.innerHTML = '';

    productos.forEach(p => {
        const id = p._id || p.id; 
        const html = `
            <div class="product-card">
                <div class="product-img" style="background-image: url('${p.img}');"></div>
                <div class="product-info">
                    <div class="product-title">${p.nombre}</div>
                    <div class="product-desc">${p.desc}</div>
                    <div class="product-price">$${p.precio}</div>
                    <button class="btn-add" onclick="agregarAlCarrito('${id}')">Agregar</button>
                </div>
            </div>`;
        
        // Si es promo va al inicio, si no va al menú
        if (p.categoria === 'promocion' && promo) promo.innerHTML += html;
        if (menu) menu.innerHTML += html; // En menú completo mostramos TODOS
    });
}

// --- CARRITO ---
function agregarAlCarrito(id) {
    const p = productos.find(x => (x._id === id) || (x.id == id));
    if (p) { 
        carrito.push(p); 
        actualizarCarritoUI(); 
        document.getElementById('cart-sidebar').classList.add('open'); 
    }
}

function removerDelCarrito(i) { 
    carrito.splice(i, 1); 
    actualizarCarritoUI(); 
}

// --- CUPONES Y PEDIDOS ---
async function aplicarCupon() {
    const codigo = document.getElementById('coupon-input').value.toUpperCase().trim();
    if (!codigo) return alert("Escribe un código");

    try {
        const res = await fetch(API_URL + `/coupons/validate/${codigo}`);
        if (res.status === 404) { alert("Cupón no válido"); cuponAplicado = null; } 
        else { cuponAplicado = await res.json(); alert(`¡Descuento aplicado!`); }
        actualizarCarritoUI();
    } catch (e) { alert("Error validando cupón"); }
}

function copiarCupon(c) { navigator.clipboard.writeText(c); alert('Copiado: ' + c); }

function actualizarCarritoUI() {
    const div = document.getElementById('cart-items');
    div.innerHTML = '';
    let subtotal = 0;
    carrito.forEach((p, i) => {
        subtotal += parseFloat(p.precio);
        div.innerHTML += `
            <div class="cart-item">
                <div><strong>${p.nombre}</strong><br><small>$${p.precio}</small></div>
                <i class="fas fa-trash btn-remove" onclick="removerDelCarrito(${i})"></i>
            </div>`;
    });

    let total = subtotal;
    if (cuponAplicado) {
        if (cuponAplicado.tipo === 'porcentaje') total -= (subtotal * (cuponAplicado.descuento / 100));
        else total -= cuponAplicado.descuento;
        if(total < 0) total = 0;
    }

    document.getElementById('cart-total-price').innerText = `$${total.toFixed(2)}`;
    document.getElementById('cart-count').innerText = carrito.length;
}

function realizarPedidoWhatsApp() {
    const n = document.getElementById('cliente-nombre').value;
    const t = document.getElementById('cliente-tel').value;
    const d = document.getElementById('cliente-dir').value;
    
    if (!n || !t || !d || carrito.length === 0) return alert("Faltan datos o productos");

    let msg = `Hola, soy ${n}. Pido:\n`;
    carrito.forEach(p => msg += `- ${p.nombre}\n`);
    msg += `Total: ${document.getElementById('cart-total-price').innerText}\n`;
    msg += `Dirección: ${d}`;
    
    // Guardar en Google Sheets (Opcional)
    enviarPedido(n, t, d, msg);

    window.open(`https://wa.me/526771050056?text=${encodeURIComponent(msg)}`, '_blank');
}

function enviarPedido(n, t, d, msg) {
    fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST', mode: 'no-cors', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: n, telefono: t, direccion: d, pedido: msg, total: "WhatsApp" })
    });
}
