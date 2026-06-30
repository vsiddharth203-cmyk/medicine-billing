const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('📁 Created uploads directory');
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'medicine-' + uniqueSuffix + ext);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed (JPG, PNG, GIF, WebP)'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { 
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: fileFilter
});

// Paths to JSON databases
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'medicines.json');
const CUSTOMER_DB_PATH = path.join(DATA_DIR, 'customers.json');
const ORDER_DB_PATH = path.join(DATA_DIR, 'orders.json');

// Helper functions
function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

function readJSON(filePath, defaultData = []) {
    try {
        if (!fs.existsSync(filePath)) return defaultData;
        const data = fs.readFileSync(filePath, 'utf8');
        return data.trim() ? JSON.parse(data) : defaultData;
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error);
        return defaultData;
    }
}

function writeJSON(filePath, data) {
    try {
        ensureDataDir();
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`Error writing ${filePath}:`, error);
        return false;
    }
}

function getMedicines() { return readJSON(DB_PATH); }
function saveMedicines(data) { return writeJSON(DB_PATH, data); }
function getCustomers() { return readJSON(CUSTOMER_DB_PATH); }
function saveCustomers(data) { return writeJSON(CUSTOMER_DB_PATH, data); }
function getOrders() { return readJSON(ORDER_DB_PATH); }
function saveOrders(data) { return writeJSON(ORDER_DB_PATH, data); }

// Initialize databases
function initializeDatabases() {
    ensureDataDir();

    let medicines = getMedicines();
    if (medicines.length === 0) {
        medicines = [
            { id: "M001", name: "Amoxicillin", brand: "GlaxoSmithKline", price: 12.50, image: "https://res.cloudinary.com/dnrzantvj/image/upload/v1782759072/Amoxicillin_on95t1.png", description: "Antibiotic for bacterial infections", stock: 150, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
            { id: "M002", name: "Cetirizine", brand: "Zyrtec", price: 8.20, image: "https://res.cloudinary.com/dnrzantvj/image/upload/v1782760524/Cetirizine_ep4cvl.png", description: "Antihistamine for allergies", stock: 200, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
            { id: "M003", name: "Metformin", brand: "Merck", price: 15.75, image: "https://res.cloudinary.com/dnrzantvj/image/upload/v1782760792/Metformin_ztklac.png", description: "Diabetes medication", stock: 120, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
            { id: "M004", name: "Omeprazole", brand: "AstraZeneca", price: 22.30, image: "https://res.cloudinary.com/dnrzantvj/image/upload/v1782762038/Omeprazole_2_pmmqtx.png", description: "Proton pump inhibitor", stock: 80, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
            { id: "M005", name: "Paracetamol", brand: "Tylenol", price: 5.90, image: "https://res.cloudinary.com/dnrzantvj/image/upload/v1782761817/Paracetamol_xpuazk.png", description: "Pain reliever and fever reducer", stock: 300, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
        ];
        saveMedicines(medicines);
        console.log('✅ Medicines database initialized');
    }

    if (readJSON(CUSTOMER_DB_PATH).length === 0) {
        saveCustomers([]);
        console.log('✅ Customers database initialized');
    }

    if (readJSON(ORDER_DB_PATH).length === 0) {
        saveOrders([]);
        console.log('✅ Orders database initialized');
    }
}

initializeDatabases();

// ---------- Medicine Routes with Image Upload ----------
app.get('/api/medicines', (req, res) => {
    try {
        const medicines = getMedicines();
        res.json(medicines);
    } catch (error) {
        console.error('Error in GET /api/medicines:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/medicines/:id', (req, res) => {
    try {
        const medicines = getMedicines();
        const medicine = medicines.find(m => m.id === req.params.id);
        if (medicine) {
            res.json(medicine);
        } else {
            res.status(404).json({ error: 'Medicine not found' });
        }
    } catch (error) {
        console.error('Error in GET /api/medicines/:id:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/medicines', upload.single('image'), (req, res) => {
    try {
        console.log('📝 Adding new medicine');
        console.log('Body:', req.body);
        console.log('File:', req.file);
        
        const medicines = getMedicines();
        
        let imageUrl = null;
        
        if (req.file) {
            imageUrl = '/uploads/' + req.file.filename;
            console.log('✅ Image uploaded successfully:', imageUrl);
        } else if (req.body.imageUrl && req.body.imageUrl.trim()) {
            imageUrl = req.body.imageUrl.trim();
            console.log('✅ Image URL provided:', imageUrl);
        } else if (req.body.existingImage) {
            imageUrl = req.body.existingImage;
            console.log('✅ Existing image kept:', imageUrl);
        }

        const newMedicine = {
            id: req.body.id || `M${String(medicines.length + 1).padStart(3, '0')}`,
            name: req.body.name,
            brand: req.body.brand,
            price: parseFloat(req.body.price),
            image: imageUrl || 'https://picsum.photos/seed/default/80/80',
            description: req.body.description || '',
            stock: parseInt(req.body.stock) || 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        if (!newMedicine.name || !newMedicine.brand || isNaN(newMedicine.price)) {
            if (req.file) {
                try { fs.unlinkSync(req.file.path); } catch (err) {}
            }
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        if (medicines.some(m => m.id === newMedicine.id)) {
            if (req.file) {
                try { fs.unlinkSync(req.file.path); } catch (err) {}
            }
            return res.status(400).json({ error: 'ID already exists' });
        }
        
        medicines.push(newMedicine);
        if (saveMedicines(medicines)) {
            console.log('✅ Medicine saved successfully:', newMedicine);
            res.status(201).json(newMedicine);
        } else {
            if (req.file) {
                try { fs.unlinkSync(req.file.path); } catch (err) {}
            }
            res.status(500).json({ error: 'Failed to save medicine' });
        }
    } catch (error) {
        console.error('❌ Error in POST /api/medicines:', error);
        if (req.file && fs.existsSync(req.file.path)) {
            try { fs.unlinkSync(req.file.path); } catch (err) {}
        }
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

app.put('/api/medicines/:id', upload.single('image'), (req, res) => {
    try {
        console.log('📝 Updating medicine:', req.params.id);
        console.log('Body:', req.body);
        console.log('File:', req.file);
        
        const medicines = getMedicines();
        const index = medicines.findIndex(m => m.id === req.params.id);
        if (index === -1) {
            if (req.file) {
                try { fs.unlinkSync(req.file.path); } catch (err) {}
            }
            return res.status(404).json({ error: 'Medicine not found' });
        }
        
        let imageUrl = medicines[index].image;
        
        if (req.file) {
            if (imageUrl && imageUrl.startsWith('/uploads/')) {
                const oldImagePath = path.join(__dirname, imageUrl);
                if (fs.existsSync(oldImagePath)) {
                    try { 
                        fs.unlinkSync(oldImagePath); 
                        console.log('🗑️ Deleted old image:', oldImagePath);
                    } catch (err) {
                        console.log('Error deleting old image:', err);
                    }
                }
            }
            imageUrl = '/uploads/' + req.file.filename;
            console.log('✅ New image uploaded:', imageUrl);
        } else if (req.body.imageUrl && req.body.imageUrl.trim()) {
            if (imageUrl && imageUrl.startsWith('/uploads/')) {
                const oldImagePath = path.join(__dirname, imageUrl);
                if (fs.existsSync(oldImagePath)) {
                    try { 
                        fs.unlinkSync(oldImagePath); 
                        console.log('🗑️ Deleted old image:', oldImagePath);
                    } catch (err) {
                        console.log('Error deleting old image:', err);
                    }
                }
            }
            imageUrl = req.body.imageUrl.trim();
            console.log('✅ New image URL provided:', imageUrl);
        } else if (req.body.existingImage) {
            imageUrl = req.body.existingImage;
            console.log('✅ Existing image kept:', imageUrl);
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
        
        if (saveMedicines(medicines)) {
            console.log('✅ Medicine updated successfully');
            res.json(medicines[index]);
        } else {
            if (req.file) {
                try { fs.unlinkSync(req.file.path); } catch (err) {}
            }
            res.status(500).json({ error: 'Failed to update medicine' });
        }
    } catch (error) {
        console.error('❌ Error in PUT /api/medicines/:id:', error);
        if (req.file && fs.existsSync(req.file.path)) {
            try { fs.unlinkSync(req.file.path); } catch (err) {}
        }
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

app.delete('/api/medicines/:id', (req, res) => {
    try {
        const medicines = getMedicines();
        const index = medicines.findIndex(m => m.id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ error: 'Medicine not found' });
        }
        
        const imagePath = medicines[index].image;
        if (imagePath && imagePath.startsWith('/uploads/')) {
            const fullPath = path.join(__dirname, imagePath);
            if (fs.existsSync(fullPath)) {
                try { 
                    fs.unlinkSync(fullPath); 
                    console.log('🗑️ Deleted image:', fullPath);
                } catch (err) {
                    console.log('Error deleting image:', err);
                }
            }
        }
        
        const filtered = medicines.filter(m => m.id !== req.params.id);
        if (saveMedicines(filtered)) {
            res.json({ message: 'Medicine deleted successfully' });
        } else {
            res.status(500).json({ error: 'Failed to delete medicine' });
        }
    } catch (error) {
        console.error('Error in DELETE /api/medicines/:id:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ---------- Customer Routes ----------
app.get('/api/customers', (req, res) => {
    try {
        const customers = getCustomers();
        res.json(customers);
    } catch (error) {
        console.error('Error in GET /api/customers:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/customers/:id', (req, res) => {
    try {
        const customers = getCustomers();
        const customer = customers.find(c => c.id === req.params.id);
        if (customer) {
            res.json(customer);
        } else {
            res.status(404).json({ error: 'Customer not found' });
        }
    } catch (error) {
        console.error('Error in GET /api/customers/:id:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/customers', (req, res) => {
    try {
        console.log('📝 Creating new customer:', req.body);
        const customers = getCustomers();
        
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
        if (saveCustomers(customers)) {
            console.log('✅ Customer created:', newCustomer);
            res.status(201).json(newCustomer);
        } else {
            res.status(500).json({ error: 'Failed to save customer' });
        }
    } catch (error) {
        console.error('Error in POST /api/customers:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/customers/:id', (req, res) => {
    try {
        console.log('📝 Updating customer:', req.params.id);
        console.log('Body:', req.body);
        
        const customers = getCustomers();
        const index = customers.findIndex(c => c.id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        
        if (req.body.mobile && req.body.mobile !== customers[index].mobile) {
            const existing = customers.find(c => c.mobile === req.body.mobile && c.id !== req.params.id);
            if (existing) {
                return res.status(400).json({ error: 'Mobile number already exists for another customer' });
            }
        }
        
        customers[index] = {
            ...customers[index],
            name: req.body.name || customers[index].name,
            mobile: req.body.mobile || customers[index].mobile,
            email: req.body.email !== undefined ? req.body.email : customers[index].email,
            address: req.body.address !== undefined ? req.body.address : customers[index].address,
            updatedAt: new Date().toISOString()
        };
        
        if (saveCustomers(customers)) {
            console.log('✅ Customer updated:', customers[index]);
            res.json(customers[index]);
        } else {
            res.status(500).json({ error: 'Failed to update customer' });
        }
    } catch (error) {
        console.error('Error in PUT /api/customers/:id:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/customers/:id', (req, res) => {
    try {
        const customers = getCustomers();
        const filtered = customers.filter(c => c.id !== req.params.id);
        if (filtered.length === customers.length) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        if (saveCustomers(filtered)) {
            res.json({ message: 'Customer deleted successfully' });
        } else {
            res.status(500).json({ error: 'Failed to delete customer' });
        }
    } catch (error) {
        console.error('Error in DELETE /api/customers/:id:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ---------- Order Routes ----------
app.get('/api/orders', (req, res) => {
    try {
        const orders = getOrders();
        res.json(orders);
    } catch (error) {
        console.error('Error in GET /api/orders:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/orders', (req, res) => {
    try {
        console.log('📝 Creating new order:', req.body);
        const orders = getOrders();
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
        if (saveOrders(orders)) {
            console.log('✅ Order created:', newOrder);
            res.status(201).json(newOrder);
        } else {
            res.status(500).json({ error: 'Failed to save order' });
        }
    } catch (error) {
        console.error('Error in POST /api/orders:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/orders/:id', (req, res) => {
    try {
        const orders = getOrders();
        const filtered = orders.filter(o => o.id !== req.params.id);
        if (filtered.length === orders.length) {
            return res.status(404).json({ error: 'Order not found' });
        }
        if (saveOrders(filtered)) {
            res.json({ message: 'Order deleted successfully' });
        } else {
            res.status(500).json({ error: 'Failed to delete order' });
        }
    } catch (error) {
        console.error('Error in DELETE /api/orders/:id:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ---------- Statistics Route ----------
app.get('/api/stats', (req, res) => {
    try {
        const medicines = getMedicines();
        const customers = getCustomers();
        const orders = getOrders();
        
        res.json({
            totalMedicines: medicines.length,
            totalCustomers: customers.length,
            totalOrders: orders.length,
            totalStock: medicines.reduce((sum, m) => sum + (m.stock || 0), 0),
            totalRevenue: orders.reduce((sum, o) => sum + o.total, 0)
        });
    } catch (error) {
        console.error('Error in GET /api/stats:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ---------- Serve Frontend ----------
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---------- Error Handling ----------
app.use((err, req, res, next) => {
    console.error('❌ Unhandled error:', err);
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: 'Multer error: ' + err.message });
    }
    res.status(500).json({ error: 'Internal server error' });
});

// ---------- Start Server ----------
app.listen(PORT, () => {
    console.log(`\n🚀 MediCare Server running on http://localhost:${PORT}`);
    console.log(`📦 Data directory: ${DATA_DIR}`);
    console.log(`📁 Uploads directory: ${uploadDir}`);
    console.log(`\n✅ Features:`);
    console.log(`   - Upload images from system`);
    console.log(`   - Enter image URLs`);
    console.log(`   - Customer management`);
    console.log(`   - Order tracking`);
    console.log(`   - Print invoices\n`);
});