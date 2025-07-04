import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { Sequelize, DataTypes, Model } from 'sequelize';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import SequelizeStore from 'connect-session-sequelize';
import http from 'http'; // --- WEBSOCKET ADDITION ---
import { WebSocketServer } from 'ws'; // --- WEBSOCKET ADDITION ---

const app = express();
const PORT = process.env.PORT || 3000;
const __dirname = path.resolve();

// --- WEBSOCKET ADDITION: Create HTTP server and WebSocket server ---
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// This Set will store all active admin connections
const connectedAdmins = new Set();

// Function to broadcast a message to all connected admins
const broadcast = (message) => {
  const data = JSON.stringify(message);
  for (const client of connectedAdmins) {
    // Check if the connection is still open before sending
    if (client.readyState === client.OPEN) {
      client.send(data);
    }
  }
};

// --- WEBSOCKET ADDITION: Manage WebSocket connections ---
wss.on('connection', (ws, req) => {
  // Only handle connections to the specific admin path from your React app
  if (req.url === '/ws/admin') {
    connectedAdmins.add(ws);

    // Optional: Implement a heartbeat to keep the connection alive and detect dead ones.
    // Your React client code already handles reconnection, but this is good practice for the server.
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('close', () => {
      connectedAdmins.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  } else {
    // If the connection request is for a different path, terminate it.
    ws.terminate();
  }
});

// --- WEBSOCKET ADDITION: Heartbeat to clean up dead connections ---
// This interval will ping every client every 30 seconds.
// If a client doesn't respond with a "pong", it will be terminated.
const heartbeatInterval = setInterval(() => {
  for (const ws of connectedAdmins) {
    if (ws.isAlive === false) {

      return ws.terminate();
    }
    ws.isAlive = false; // Set to false, will be flipped to true if a pong is received
    ws.ping();
  }
}, 30000);


// --- 1. SECURITY MIDDLEWARE ---
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

const loginLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 5,
  message: 'Too many login attempts, please try again after 30 minutes',
});

// --- 2. DATABASE & SESSION STORE ---
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    logging: false
  }
);

const MySessionStore = SequelizeStore(session.Store);
const sessionStore = new MySessionStore({
  db: sequelize,
});

app.use(session({
  name: 'portal.sid',
  secret: process.env.SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 8, // 8 hours
    sameSite: 'lax'
  },
}));

class Invoice extends Model {}

Invoice.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  originalFilename: { type: DataTypes.STRING, allowNull: false },
  savedFilename: { type: DataTypes.STRING, allowNull: false },
  fileSize: { type: DataTypes.INTEGER, allowNull: false },
  ipAddress: { type: DataTypes.STRING },
}, {
  sequelize,
  modelName: 'Invoice',
  timestamps: true // This automatically adds createdAt and updatedAt
});

// --- 3. FILE STORAGE ---
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);
app.use('/files', express.static(UPLOADS_DIR));
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    // Allowing only PDFs as per the original request context
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF is allowed.'), false);
    }
  }
});


// --- 4. AUTHENTICATION & API ROUTES ---
const apiRouter = express.Router();

const checkAuth = (req, res, next) => {
  if (req.session.isAdmin) {
    next();
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
};

apiRouter.post('/login', loginLimiter, [
  body('password').notEmpty().withMessage('Password cannot be empty')
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { password } = req.body;
    const storedHash = process.env.ADMIN_PASSWORD_HASH;

    if (!storedHash) {
      console.error("FATAL: ADMIN_PASSWORD_HASH is not configured in .env file.");
      return res.status(500).json({ message: "Server configuration error." });
    }

    const isMatch = await bcrypt.compare(password, storedHash);

    if (isMatch) {
      req.session.isAdmin = true;
      req.session.save(err => {
        if (err) return next(err);
        res.status(200).json({ message: 'Login successful' });
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    next(error);
  }
});

apiRouter.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ message: 'Could not log out.' });
    res.clearCookie('portal.sid');
    res.status(200).json({ message: 'Logout successful' });
  });
});

apiRouter.get('/auth-status', (req, res) => {
  res.status(200).json({ isLoggedIn: !!req.session.isAdmin });
});

apiRouter.post('/upload', checkAuth, upload.single('file'), async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file was uploaded.' });
  }
  try {
    const invoice = await Invoice.create({
      originalFilename: req.file.originalname,
      savedFilename: req.file.filename,
      fileSize: req.file.size,
      ipAddress: req.ip
    });

    // --- WEBSOCKET ADDITION: Broadcast the new upload to all connected clients ---
    
    broadcast({
      type: 'NEW_UPLOAD',
      invoice: invoice.toJSON() // Use .toJSON() to get a clean object from the Sequelize instance
    });

    res.status(201).json({ message: 'File uploaded successfully', data: invoice });
  } catch (error) {
    next(error);
  }
});

apiRouter.get('/invoices', checkAuth, async (req, res, next) => {
  try {
    const invoices = await Invoice.findAll({ order: [['createdAt', 'DESC']] });
    res.status(200).json(invoices);
  } catch (error) {
    next(error);
  }
});

app.use('/api', apiRouter);

// --- 5. CENTRALIZED ERROR HANDLER ---
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong on the server.' });
});


//DELETE ACTION
apiRouter.delete('/invoices/:id', checkAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findByPk(id);

    if (!invoice) {
      return res.status(404).json({ message: 'File not found.' });
    }

    // 1. Delete the physical file from the server
    const filePath = path.join(UPLOADS_DIR, invoice.savedFilename);
    fs.unlink(filePath, async (err) => {
      if (err) {
        // Log the error but still proceed to delete the DB record
        console.error("Failed to delete physical file:", err);
      }

      // 2. Delete the record from the database
      await invoice.destroy();

      // 3. Broadcast the deletion to all connected admins
      broadcast({
        type: 'UPLOAD_DELETED',
        invoiceId: parseInt(id) // Ensure ID is a number
      });

      res.status(200).json({ message: 'File deleted successfully.' });
    });

  } catch (error) {
    next(error);
  }
});

// --- 6. START THE SERVER ---
sessionStore.sync();
sequelize.sync().then(() => {
  console.log("✅ Database synchronized.");
  // --- WEBSOCKET ADDITION: Use the http server (which includes the Express app) to listen ---
  server.listen(PORT, () => {
    console.log(`✅ Server with WebSocket is running on port`);
  });
}).catch(error => {
  console.error("❌ Failed to synchronize database:", error);
});