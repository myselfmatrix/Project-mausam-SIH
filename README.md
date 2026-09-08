# 🌤️ Mausam - Personalized Weather Dashboard

Smart India Hackathon (SIH) Project for the Ministry of Earth Sciences

## Overview

Mausam is a personalized weather application that adapts to different user types:
- 🏥 Health-Conscious Users
- 🏃 Outdoor Fitness Enthusiasts  
- 🏖️ Beachgoers & Surfers
- ✈️ Travelers
- 👨‍👩‍👧 Parents & Families
- 🌱 Agriculture & Gardeners
- 🚗 Commuters
- 🎉 Event Planners

## Project Structure

```
mausam-sih/
├── frontend/        # React web application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── App.jsx
│   └── package.json
├── backend/         # Express API server
│   ├── routes/
│   ├── models/
│   ├── controllers/
│   ├── middleware/
│   └── index.js
└── README.md
```

## Setup Instructions

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
npm start
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## API Endpoints

- `GET /api/health` - Server health check
- `GET /api` - API documentation
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `GET /api/weather/:location` - Weather data
- `GET /api/users/profile` - User profile
- `PUT /api/users/preferences` - Update preferences

## Tech Stack

- **Frontend:** React 19, Vite, CSS3
- **Backend:** Express.js, Node.js
- **Database:** MongoDB (to be integrated)
- **APIs:** OpenWeatherMap, IMD API

## Running the Application

1. Start backend: `npm start` (in backend folder)
2. Start frontend: `npm run dev` (in frontend folder)
3. Open: http://localhost:5173

## Next Steps

- [ ] Implement authentication system
- [ ] Integrate MongoDB database
- [ ] Connect to weather APIs
- [ ] Build persona-specific dashboards
- [ ] Add user preferences management
- [ ] Implement real-time alerts

---
Made with ❤️ for Smart India Hackathon
