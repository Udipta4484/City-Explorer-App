# City Explorer Web Application 🗺

A feature-rich, full-stack web application designed to help users explore cities around the world. Get real-time weather, local time, and discover top tourist attractions. Includes user authentication and the ability to save your favorite spots!

### ✨ [Live Demo Link](https://city-explorer-app.vercel.app/) ✨

---

## 📸 Screenshots

<table>
  <tr>
    <td align="center"><strong>Frontend Interface</strong></td>
    <td align="center"><strong>Backend API (Swagger UI)</strong></td>
  </tr>
  <tr>
    <td><img src="https://raw.githubusercontent.com/Udipta4484/City-Explorer-App/main/screenshots/frontend.png" alt="City Explorer Frontend Screenshot"></td>
    <td><img src="https://raw.githubusercontent.com/Udipta4484/City-Explorer-App/main/screenshots/backend-api.png" alt="City Explorer Backend API Screenshot"></td>
  </tr>
</table>

*(Note: You will need to create a screenshots folder in your repository and add your images with the names frontend.png and backend-api.png for them to display correctly.)*

---

## 🚀 Features

* *Dynamic City Search*: Find any city in the world.
* *Real-time Data*: Instantly fetches and displays:
    * Current Weather (with dynamic icons)
    * Local Time and Timezone
    * A curated list of Top Tourist Attractions
* *User Authentication*: Secure user registration and login system using JWT.
* *Personalized Favorites*:
    * Save your favorite attractions to your personal account.
    * Remove favorites with a single click.
    * Favorites are automatically highlighted when you search for a city.
    * Favorites list updates in real-time without needing a page refresh.
* *Responsive Design*: A clean, modern, and professional UI that works on all screen sizes.
* *RESTful API*: A well-documented backend API with interactive Swagger UI.

---

## 💻 Tech Stack

This project is built with a modern, decoupled architecture.

* *Frontend*:
    * HTML5
    * Tailwind CSS
    * Vanilla JavaScript (ES6 Modules)
    * [Lucide Icons](https://lucide.dev/)

* *Backend*:
    * FastAPI (Python)
    * SQLAlchemy (ORM)
    * Passlib (for password hashing)
    * Python-JOSE (for JWT)

* *Database*:
    * PostgreSQL

* *Deployment*:
    * *Frontend*: Vercel
    * *Backend & Database*: Render

---

## 🛠 Local Setup & Installation

To run this project on your local machine, follow these steps:

### Prerequisites

* Python 3.10+
* PostgreSQL installed and running.
* An IDE like VS Code.

### 1. Clone the Repository

bash
git clone [https://github.com/Udipta4484/City-Explorer-App.git](https://github.com/Udipta4484/City-Explorer-App.git)
cd City-Explorer-App


### 2. Backend Setup

bash
# Navigate to the backend directory
cd backend

# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install the required packages
pip install -r requirements.txt

# Create a .env file (copy from .env.example) and add your API keys and DB URL
# DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE_NAME
# OPENWEATHER_API_KEY=...
# OPENTRIPMAP_API_KEY=... (Your Geoapify Key)
# TIMEZONEDB_API_KEY=...
# SECRET_KEY=...

# Create the database tables
python create_db.py

# Run the backend server
uvicorn main:app --reload


### 3. Frontend Setup

bash
# Open a new terminal and navigate to the frontend directory
cd frontend

# Run the live server
python -m http.server 3000


Open your browser and navigate to http://localhost:3000 to see the application running.

---

## 👤 Author

* *Udipta Mohanty*
* *Email*: [udipta.mohanty15@gmail.com](mailto:udipta.mohanty15@gmail.com)
* *GitHub*: [@Udipta4484](https://github.com/Udipta4484)

&copy; 2025 Udipta Mohanty. All Rights Reserved.
