// api/index.js - For Vercel Serverless Functions (No Multer)
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// In-memory database (since Vercel doesn't support file system)
let medicines = [
    { id: "M001", name: "Amoxicillin", brand: "GlaxoSmithKline", price: 12.50, image: "https://picsum.photos/seed/amoxicillin/80/80", description: "Antibiotic for bacterial infections", stock: 150, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: "M002", name: "Cetirizine", brand: "Zyrtec", price: 8.20, image: "https://picsum.photos/seed/cetirizine/80/80", description: "Antihistamine for allergies", stock: 200, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: "M003", name: "Metformin", brand: "Merck", price: 15.75, image: "https://picsum.photos/seed/metformin/80/80", description: "Diabetes medication", stock: 120, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: "M004", name: "Omeprazole", brand: "AstraZeneca", price: 22.30, image: "https://picsum.photos/seed/omeprazole/80/80", description: "Proton pump inhibitor", stock: 80, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: "M005", name: "Paracetamol", brand: "Tylenol", price: 5.90, image: "https://picsum.photos/seed/paracetamol/80/80", description: "Pain reliever and fever reducer", stock: 300, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
];

let customers = [];
let orders = [];

// ---------- Medicine Routes ----------
app.get('/api/medicines', (req, res) => {
    try {
        res.json(medicines);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/medicines/:id', (req, res) => {
    try {
        const medicine = medicines.find(m => m.id === req.params.id);
        if (medicine) {
            res.json(medicine);
        } else {
            res.status(404).json({ error: 'Medicine not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/medicines', (req, res) => {
    try {
        console.log('📝 Adding new medicine:', req.body);
        
        // Handle image from URL or use default
        let imageUrl = req.body.image || req.body.imageUrl || 'https://picsum.photos/seed/default/80/80';
        
        const newMedicine = {
            id: req.body.id || `M${String(medicines.length + 1).padStart(3, '0')}`,
            name: req.body.name,
            brand: req.body.brand,
            price: parseFloat(req.body.price),
            image: imageUrl,
            description: req.body.description || '',
            stock: parseInt(req.body.stock) || 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        if (!newMedicine.name || !newMedicine.brand || isNaN(newMedicine.price)) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        if (medicines.some(m => m.id === newMedicine.id)) {
            return res.status(400).json({ error: 'ID already exists' });
        }
        
        medicines.push(newMedicine);
        console.log('✅ Medicine saved:', newMedicine);
        res.status(201).json(newMedicine);
    } catch (error) {
        console.error('❌ Error in POST /api/medicines:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

app.put('/api/medicines/:id', (req, res) => {
    try {
        console.log('📝 Updating medicine:', req.params.id);
        
        const index = medicines.findIndex(m => m.id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ error: 'Medicine not found' });
        }
        
        // Handle image update
        let imageUrl = medicines[index].image;
        if (req.body.image || req.body.imageUrl) {
            imageUrl = req.body.image || req.body.imageUrl;
        }
        
        medicines[index] = {
            ...medicines[index],
            name: req.body.name || medicines[index].name,
            brand: req.body.brand || medicines[index].brand,
            price: req.body.price !== undefined ? parseFloat(req.body.price) : medicines[index].price,
            image: imageUrl,
            description: req.body.description !== undefined ? req.body.description : medicines[index].description,
            stock: req.body.stock !== undefined ? parseInt(req.body.stock) : medicines[index].stock,
            updatedAt: new Date().toISOString()
        };
        
        console.log('✅ Medicine updated:', medicines[index]);
        res.json(medicines[index]);
    } catch (error) {
        console.error('❌ Error in PUT /api/medicines/:id:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/medicines/:id', (req, res) => {
    try {
        const filtered = medicines.filter(m => m.id !== req.params.id);
        if (filtered.length === medicines.length) {
            return res.status(404).json({ error: 'Medicine not found' });
        }
        medicines = filtered;
        res.json({ message: 'Medicine deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ---------- Customer Routes ----------
app.get('/api/customers', (req, res) => {
    try {
        res.json(customers);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/customers/:id', (req, res) => {
    try {
        const customer = customers.find(c => c.id === req.params.id);
        if (customer) {
            res.json(customer);
        } else {
            res.status(404).json({ error: 'Customer not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/customers', (req, res) => {
    try {
        console.log('📝 Creating new customer:', req.body);
        
        const existing = customers.find(c => c.mobile === req.body.mobile);
        if (existing) {
            console.log('👤 Customer already exists:', existing);
            return res.status(200).json(existing);
        }
        
        const newCustomer = {
            id: `C${String(customers.length + 1).padStart(3, '0')}`,
            name: req.body.name,
            mobile: req.body.mobile,
            email: req.body.email || '',
            address: req.body.address || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        customers.push(newCustomer);
        console.log('✅ Customer created:', newCustomer);
        res.status(201).json(newCustomer);
    } catch (error) {
        console.error('❌ Error in POST /api/customers:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/customers/:id', (req, res) => {
    try {
        console.log('📝 Updating customer:', req.params.id);
        
        const index = customers.findIndex(c => c.id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        
        customers[index] = {
            ...customers[index],
            name: req.body.name || customers[index].name,
            mobile: req.body.mobile || customers[index].mobile,
            email: req.body.email !== undefined ? req.body.email : customers[index].email,
            address: req.body.address !== undefined ? req.body.address : customers[index].address,
            updatedAt: new Date().toISOString()
        };
        
        console.log('✅ Customer updated:', customers[index]);
        res.json(customers[index]);
    } catch (error) {
        console.error('❌ Error in PUT /api/customers/:id:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/customers/:id', (req, res) => {
    try {
        const filtered = customers.filter(c => c.id !== req.params.id);
        if (filtered.length === customers.length) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        customers = filtered;
        res.json({ message: 'Customer deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ---------- Order Routes ----------
app.get('/api/orders', (req, res) => {
    try {
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/orders', (req, res) => {
    try {
        console.log('📝 Creating new order:', req.body);
        
        const newOrder = {
            id: `ORD${String(orders.length + 1).padStart(4, '0')}`,
            orderId: req.body.orderId || `ORD-${Date.now().toString().slice(-8)}`,
            customerId: req.body.customerId,
            items: req.body.items || [],
            total: parseFloat(req.body.total) || 0,
            date: req.body.date || new Date().toISOString(),
            createdAt: new Date().toISOString()
        };
        
        if (!newOrder.customerId || !newOrder.items.length) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        orders.push(newOrder);
        console.log('✅ Order created:', newOrder);
        res.status(201).json(newOrder);
    } catch (error) {
        console.error('❌ Error in POST /api/orders:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/orders/:id', (req, res) => {
    try {
        const filtered = orders.filter(o => o.id !== req.params.id);
        if (filtered.length === orders.length) {
            return res.status(404).json({ error: 'Order not found' });
        }
        orders = filtered;
        res.json({ message: 'Order deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ---------- Statistics Route ----------
app.get('/api/stats', (req, res) => {
    try {
        res.json({
            totalMedicines: medicines.length,
            totalCustomers: customers.length,
            totalOrders: orders.length,
            totalStock: medicines.reduce((sum, m) => sum + (m.stock || 0), 0),
            totalRevenue: orders.reduce((sum, o) => sum + o.total, 0)
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ---------- Serve Frontend ----------
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Export for Vercel
module.exports = app;