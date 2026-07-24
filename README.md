# SoulSync 🧠💙

SoulSync is a web-based mental health and wellness platform designed to help users track their mood, complete self-assessments, chat with a support assistant, and unwind through relaxing mini-games. It includes a user-facing site as well as an admin dashboard for oversight and management.

## ✨ Features

- **User Authentication** — Login and signup pages for new and returning users
- **Dashboard** — A personalized home for users to view their progress and activity
- **Mental Health Assessment** — Guided self-assessment flow with results summary
- **AI Chat Support** — An embedded conversational assistant (via SupportAI widget) for users to talk through how they're feeling
- **Mental Health Resources** — Curated content and information page
- **Relaxation Mini-Games**
  - 🫧 Bubble Pop Game
  - 🎨 Drawing Game
  - 💧 Water Sort Game
- **Admin Panel** — Separate admin login and dashboard for managing the platform
- **Game Home Page** — Central hub to access all available mini-games

## 🗂️ Project Structure

```
SoulSync Semester Project/
├── public/
│   ├── Css/                     # Stylesheets
│   ├── Html/
│   │   ├── Admin_dashboard.html
│   │   ├── admin_login.html
│   │   ├── assessment.html
│   │   ├── bot_2.html           # AI chat assistant
│   │   ├── bubble_pop_game.html
│   │   ├── dashboard.html
│   │   ├── drawing_game.html
│   │   ├── game_home_page.html
│   │   ├── login.html
│   │   ├── mentalhealth.html
│   │   ├── result.html
│   │   ├── signup.html
│   │   ├── test.html
│   │   ├── Water_sort_game.html
│   │   └── resources/
│   ├── Javascript/               # Client-side scripts
│   └── media/                    # Images, icons, and other assets
│
└── soulsync-backend/
    |---Final.sql
    ├── node_modules/
    ├── routes/
    │   └── admin_routes.js       # Admin API routes
    ├── server.js                 # Backend entry point
    ├── package.json
    ├── package-lock.json
    └── .env                      # Environment variables 
```

## 🛠️ Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js (Express)
- **Database:** MSSQL
- **Chat Integration:** SupportAI embeddable widget

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) installed on your machine

### Installation

1. Clone or download the repository.
2. Navigate to the backend folder and install dependencies:
   ```bash
   cd soulsync-backend
   npm install
   ```
3. Create a `.env` file in `soulsync-backend/` with the required environment variables (e.g. database connection string, port, API keys).
4. Start the backend server:
   ```bash
   node server.js
   ```
5. Open the frontend by launching any file in `public/Html/` (e.g. `login.html` or `game_home_page.html`) in your browser, or serve the `public` folder through a local server.

## 💬 Chat Assistant

The support chat (`bot_2.html`) dynamically loads an embeddable widget script and docks it into the in-page chat screen once available:

```javascript
function loadWidget() {
    const script = document.createElement('script');
    script.src = 'https://widget.supportai.com/.js';
    script.async = true;
    script.onload = () => waitForWidget(0);
    document.head.appendChild(script);
}
```

Once loaded, the widget UI is repositioned into the app's chat container so it feels like a native part of the SoulSync experience.

## 🔐 Admin Access

Admins can log in via `admin_login.html` and manage the platform through `Admin_dashboard.html`, which is powered by the backend's `admin_routes.js`.


## 📄 License

This project was created as part of a semester project. 
