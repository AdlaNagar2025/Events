# 🎊 EventProject - Integrated Event Management System

A full-stack web application designed to connect event organizers with service providers (wedding halls, cheifs) in a seamless and organized manner.

## ✅ Project Progress (Implemented Features)

### 🔑 Authentication & Access Control
* **Registration & Login:** A comprehensive system supporting multiple roles (Admin, Provider, Customer).
* **Session Management:** Secured user sessions using `express-session`.
* **Logout:** Safe logout functionality that destroys the session.

### 🏢 Provider Dashboard
* **Profile Setup:** Integrated interface for business data entry (Business Name, City, Specialty).
* **Image Gallery:** * Support for uploading up to 5 images.
    * File size validation system (Max 2MB per image).
    * Automatic assignment of the first image as the "Main Image."
* **Availability Calendar:** * Integrated `FullCalendar` library.
    * Capability to select available dates and time slots for customers and save them to the database.

### 🛡️ Admin Panel
* View and manage all registered users in the system.
* Monitor all available services and their categories.

## 🛠️ Tech Stack

* **Frontend:** React.js, Axios, FullCalendar.
* **Backend:** Node.js, Express.js, Multer (for file uploads).
* **Database:** MySQL / MariaDB.
* **Security:** Custom Middlewares for permission auditing (`isConnected`, `isProvider`, `isActive`).

## 📂 Project Structure
* `back_end/`: Contains the server logic, middlewares, and database queries.
* `front_end/`: Contains the user interface and React components.

## 🚀 Getting Started
1. **Clone the repository.**
2. **Install dependencies:** Run `npm install` in both the `back_end` and `front_end` folders.
3. **Environment Setup:** Create a `.env` file in the `back_end` and configure your database credentials.
4. **Run the application:** Use `npm start` to launch both the server and the client.