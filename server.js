const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// --- TU BASE DE DATOS (NO TOCAR) ---
const MONGO_URI = 'mongodb+srv://admin:pollo123@cluster0.ktgslfw.mongodb.net/?appName=Cluster0'; 

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Base de Datos Conectada'))
    .catch(err => console.error('❌ Error DB:', err));

// --- MODELOS ---
const Product = mongoose.model('Product', new mongoose.Schema({
    nombre: String, precio: Number, categoria: String, desc: String, img: String
}));

const Coupon = mongoose.model('Coupon', new mongoose.Schema({
    codigo: String, descuento: Number, tipo: String 
}));

// --- RUTAS API ---
app.get('/api/products', async (req, res) => res.json(await Product.find()));
app.post('/api/products', async (req, res) => { await new Product(req.body).save(); res.json({msg:"OK"}); });
app.delete('/api/products/:id', async (req, res) => { await Product.findByIdAndDelete(req.params.id); res.json({msg:"OK"}); });

app.get('/api/coupons', async (req, res) => res.json(await Coupon.find()));
app.post('/api/coupons', async (req, res) => { await new Coupon(req.body).save(); res.json({msg:"OK"}); });
app.delete('/api/coupons/:id', async (req, res) => { await Coupon.findByIdAndDelete(req.params.id); res.json({msg:"OK"}); });

app.get('/api/coupons/validate/:codigo', async (req, res) => {
    const cupon = await Coupon.findOne({ codigo: req.params.codigo });
    if(cupon) res.json(cupon);
    else res.status(404).json({ error: "No existe" });
});

app.listen(PORT, () => console.log(`🚀 Servidor listo en http://localhost:${PORT}`));