# 🚌 BusFare Tracker

A full-stack MERN application that tracks private bus ticket prices and notifies users when prices drop.

## ✨ Features

- **Track bus fares** — Enter source, destination, date, and email to start monitoring
- **Automated price checking** — Cron job scrapes AbhiBus every 30 minutes
- **Price drop alerts** — Instant email notifications via Resend API
- **Price history charts** — Visualize fare trends over time with Chart.js
- **JWT Authentication** — Secure signup/login with token-based auth
- **Stop/Delete tracking** — Full control over your tracked routes
- **Manual price check** — Trigger an instant price scan on any route

## 🧱 Tech Stack

| Layer         | Technology                        |
|---------------|-----------------------------------|
| Frontend      | React 18 + Vite + Tailwind CSS    |
| Backend       | Node.js + Express                 |
| Database      | MongoDB + Mongoose                |
| Scraping      | Puppeteer                         |
| Scheduler     | node-cron                         |
| Email         | Resend API                        |
| Charts        | Chart.js + react-chartjs-2        |
| Auth          | JWT + bcryptjs                    |

## 📁 Project Structure

```
BusFare-Tracker/
├── client/                    # React Frontend
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx     # Navigation bar
│   │   │   ├── TrackForm.jsx  # Route tracking form
│   │   │   ├── TrackCard.jsx  # Tracked route card
│   │   │   └── PriceChart.jsx # Price history chart modal
│   │   ├── context/
│   │   │   └── AuthContext.jsx # Auth state management
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx  # Main dashboard
│   │   │   ├── Login.jsx      # Login page
│   │   │   └── Register.jsx   # Registration page
│   │   ├── api.js             # Axios API client
│   │   ├── App.jsx            # Root component
│   │   ├── main.jsx           # Entry point
│   │   └── index.css          # Tailwind + custom styles
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
│
├── server/                    # Express Backend
│   ├── src/
│   │   ├── models/
│   │   │   ├── User.js        # User schema
│   │   │   ├── Track.js       # Tracking schema
│   │   │   └── PriceHistory.js # Price history schema
│   │   ├── routes/
│   │   │   ├── authRoutes.js  # Auth endpoints
│   │   │   └── trackRoutes.js # Track CRUD endpoints
│   │   ├── services/
│   │   │   ├── scraperService.js # Puppeteer scraper
│   │   │   ├── emailService.js   # Resend notifications
│   │   │   └── cronService.js    # Scheduled jobs
│   │   ├── middleware/
│   │   │   └── auth.js        # JWT middleware
│   │   ├── utils/
│   │   │   └── logger.js      # Winston logger
│   │   └── index.js           # Server entry point
│   ├── .env
│   ├── .env.example
│   └── package.json
│
├── .gitignore
└── README.md
```

## 🚀 Run Locally

### Prerequisites

- **Node.js** v18+
- **MongoDB** running locally (or MongoDB Atlas URI)

### 1. Clone & Setup

```bash
cd Bus
```

### 2. Configure Environment

Edit `server/.env` with your values:

```env
MONGODB_URI=mongodb://localhost:27017/busfare-tracker
JWT_SECRET=your_secret_key
RESEND_API_KEY=re_your_resend_key
RESEND_FROM_EMAIL=onboarding@resend.dev
```

### 3. Start Backend

```bash
cd server
npm install      # already done
npm run dev      # starts on port 5000
```

### 4. Start Frontend

```bash
cd client
npm install      # already done
npm run dev      # starts on port 5173
```

### 5. Open Browser

Visit **http://localhost:5173**

## 📡 API Endpoints

| Method | Endpoint                   | Description               |
|--------|----------------------------|---------------------------|
| POST   | `/api/auth/register`       | Register new user         |
| POST   | `/api/auth/login`          | Login & get JWT token     |
| GET    | `/api/auth/me`             | Get current user profile  |
| POST   | `/api/track`               | Create tracking request   |
| GET    | `/api/tracks`              | List all tracked routes   |
| GET    | `/api/tracks/:id`          | Get single track          |
| PATCH  | `/api/tracks/:id/stop`     | Stop tracking             |
| DELETE | `/api/tracks/:id`          | Delete track + history    |
| GET    | `/api/tracks/:id/history`  | Get price history         |
| POST   | `/api/tracks/:id/check`    | Manual price check        |
| GET    | `/api/health`              | Health check              |

## 🚢 Deployment

### Backend → Render

1. Push to GitHub
2. Create new **Web Service** on [render.com](https://render.com)
3. Set root directory to `server`
4. Build command: `npm install`
5. Start command: `npm start`
6. Add environment variables from `.env`

### Frontend → Vercel

1. Import repo on [vercel.com](https://vercel.com)
2. Set root directory to `client`
3. Add env variable: `VITE_API_URL=https://your-render-url.onrender.com/api`
4. Deploy

## 📝 License

MIT
