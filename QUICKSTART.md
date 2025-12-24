# Quick Start Guide

## Quick Setup (5 minutes)

### Backend

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Create `.env` file:**
   ```bash
   cp .env.example .env
   # Edit .env and set at least:
   # - MONGODB_URI (use MongoDB Atlas or local MongoDB)
   # - JWT_SECRET (any random string)
   ```

3. **Start MongoDB** (if using local):
   ```bash
   mongod
   ```

4. **Start server:**
   ```bash
   npm run dev
   ```

### Mobile App

1. **Install dependencies:**
   ```bash
   cd mobile
   npm install
   ```

2. **Update API URL:**
   - Edit `mobile/src/config/api.js`
   - For physical device: Use your computer's IP address
   - Find IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)

3. **Start Expo:**
   ```bash
   npm start
   ```

4. **Run on device:**
   - Install Expo Go app
   - Scan QR code
   - Or press `a` for Android / `i` for iOS simulator

## Testing the App

1. **Sign Up:**
   - Create account with your details
   - Enter OTP (check console logs if Twilio not configured)

2. **Create Outing Request:**
   - Go to Dashboard
   - Tap "Create Request"
   - Select date and time (within allowed hours)

3. **Browse & Join:**
   - Go to Browse tab
   - See available requests
   - Tap "Join" or use "Auto Match"

4. **Chat:**
   - Once group is formed, go to Chat tab
   - Send messages to coordinate

5. **Check In:**
   - When at gate, go to Active Outing
   - Tap "Check In at Gate"

## Common Issues

**Backend not connecting:**
- Check MongoDB is running
- Verify `.env` file exists and has correct values

**Mobile app can't connect to backend:**
- Use IP address instead of localhost
- Check both devices on same network
- Verify backend is running

**OTP not received:**
- Check console logs (OTP is logged if Twilio not configured)
- Verify phone number format

## Next Steps

- Configure Twilio for SMS (optional)
- Configure Firebase for push notifications (optional)
- Update gate coordinates in `.env`
- Deploy backend to cloud
- Build mobile app for distribution


