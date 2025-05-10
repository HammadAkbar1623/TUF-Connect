# 🎓 TUF-Connect

**TUF-Connect** is a React Native-based social web app designed exclusively for university students to connect, collaborate, and communicate efficiently. Built with a JavaScript backend, the app ensures seamless real-time interaction and secure access control.

---

## 🚀 Features

### 🔐 Student Registration & Verification
- Only students with an **official university email** can register.
- An **OTP** is sent to the university email for verification.
- After successful verification, students complete their profile by adding:
  - 📸 Profile Picture  
  - 📝 Bio  
  - 🏷️ Hashtags (representing interests or topics)

---

### 🧵 Hashtag-Based Feed
- Posts are **filtered by hashtags** listed in student profiles.
- Example:  
  > A post like *"Anyone want to play football?"* with `#sports`  
  > will only appear to students who have `#sports` in their profile.
- Use the **universal hashtag `#connect`** to make announcements visible to all students.

---

### 🕒 Post Lifecycle
- Posts are **automatically deleted after 1 hour**.
- Students can also **manually delete** their posts earlier by **swiping left**.

---

### ✏️ Profile Management
Students can update their:
- Profile Picture  
- Name  
- Username  
- Hashtags  
- Password  
- Bio  

---

## 📦 Tech Stack
- **Frontend**: React Native  
- **Backend**: JavaScript (Node.js / Express)  
- **Authentication**: OTP-based Email Verification  
- **Database**: *( MongoDB )*

---

## 🛡️ Access Control
- Only students with a **verified university email** are granted access.
- **Hashtag-based filtering** ensures personalized and relevant content visibility.

---

## 📱 Use Cases
- 📅 Plan meetups or group activities (e.g., sports, study groups)
- 📢 Make campus-wide announcements using `#connect`
- 🤝 Discover and engage with students sharing similar interests
- 💬 Build a more interactive and connected university community

---

## 🙌 Contributing
Interested in contributing? Feel free to fork the repo and submit a pull request. For major changes, please open an issue first to discuss what you would like to change.

---

> * Make Tough Friends with TUF-Connect *

