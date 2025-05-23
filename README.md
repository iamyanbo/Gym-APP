# 💪 Hypertrophy App

**Your Personal Coach for Smarter Muscle Growth**  
_A sleek mobile-first hypertrophy tracker built with React Native & Expo._

> ⚙️ This app was developed with the collaborative assistance of **AI tools** to accelerate iteration, design intelligent workout structures, and streamline the user interface.

---

## 🚀 Features

- 📆 **Structured Plans (2–6 days/week)**  
  Options like Full Body, Upper/Lower Split, Bro Split, and Push/Pull/Legs.

- 🔁 **Auto Progression & Cycle Tracking**  
  Automatically detects completed days and advances training cycles.

- ✏️ **Flexible Plan Editor**  
  Insert, remove, or rename days and exercises. Build your own plan from scratch.

- 📊 **Workout Stats Dashboard**  
  Track progress over time for **sets**, **reps**, and **weight** with smooth, scrollable line charts.

- 🔍 **Exercise Search & Save**  
  Reusable and searchable exercise library. Add new entries or delete unused ones.

- 🧠 **Last Cycle Comparison**  
  Instantly compare your current vs. last cycle stats during each session.

---

## 📦 Project Structure

```bash
├── App.tsx
├── plans.json
├── exercises.txt
├── src/
│   ├── EditPlan.tsx
│   ├── ProfilePage.tsx
│   ├── TextOverride.tsx
│   ├── ThemeContext.tsx
│   ├── WorkoutCalendar.tsx
│   ├── WorkoutContext.tsx
│   ├── WorkoutDayViewer.tsx
│   ├── WorkoutPage.tsx
│   ├── WorkoutPlanViewer.tsx
│   ├── WorkoutStats.tsx
```

---

## 📱 Getting Started (Local)

1. **Clone the project:**

```bash
git clone https://github.com/yourusername/hypertrophy-app
cd hypertrophy-app
```

2. **Install dependencies:**

```bash
npm install
```

3. **Run it locally with Expo:**

```bash
npm start
```

Use Expo Go on your phone, or run the Android/iOS emulator to preview the app.

---

## 📦 Releases

Prefer a ready-to-use APK?  
Head over to the [**Releases**](https://github.com/yourusername/hypertrophy-app/releases) tab for the latest prebuilt APK you can sideload on Android.

> 🧑‍💻 **What about iOS?**  
Currently, there is **no iOS release** available for direct installation.  
This is because Apple requires developers to enroll in the **Apple Developer Program**, which costs **$99 USD per year** in order to distribute apps on the App Store or even sideload on personal devices via TestFlight.  
As a result, this app is **Android-only for now**, unless you're building from source.

---

## 🐞 Issues

While the app is functional and used daily, it is still evolving.  
Here are known or potential issues you may encounter:

- ❗ Inputs may not yet restrict special characters fully
- ⚠️ ScrollView behavior can differ across devices (esp. Android tablets)
- 🔁 Edge cases around cycle tracking and rapid switching between plans need more testing

Please report bugs, crashes, or strange behavior via GitHub Issues.

---

## 📝 TODO

Here are some planned and suggested improvements (May or may not get to implement):

- [x] 🎨 Improve UI
- [ ] ☁️ Cloud sync via Firebase or Dropbox
- [ ] 🎥 Add animated exercise previews
- [x] 🌙 Dark mode toggle
- [x] 📅 Calendar-based workout history view
- [ ] 📤 Export stats to CSV or PDF
- [ ] 🔔 Add reminders for training days
- [x] 🟦 Add App icon
- [ ] 🧾 Add Type Definitions for better maintainability and refactoring

---

## 📄 License

**Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)**  
You may remix, adapt, and build upon this project **non-commercially**, as long as you credit the original author.  
You **may not use this app or its codebase for commercial purposes**.

🔗 [Read the full license](https://creativecommons.org/licenses/by-nc/4.0/)

---

## 🧠 Author

**Yanbo Cheng**  
[github.com/iamyanbo](https://github.com/iamyanbo)

_“Train smart. Track smarter.”_
