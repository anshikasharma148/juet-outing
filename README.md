# JUET Outing Coordination App

A React Native mobile application with Node.js/Express backend to help college girls coordinate outings in groups of 3, with automatic matching, real-time messaging, location tracking, and push notifications.

## Features

### Core Features
- **User Authentication**: Sign up with phone OTP verification, login/logout
- **Outing Request System**: Create, browse, and manage outing requests
- **Group Matching**: Automatic and manual matching to form groups of 3
- **Real-time Messaging**: In-app chat for matched groups
- **Location Tracking**: Gate check-in/check-out with location verification
- **Push Notifications**: Notifications for matches, messages, and reminders
- **Outing History**: View past outings and statistics

### Additional Features
- Smart time validation (Mon-Fri: 5-7 PM, Sat: 1-7 PM, Sun: 10 AM-7 PM)
- Filter requests by year, semester, and time
- User statistics and frequent partners
- Emergency contact management
- Profile management

## Project Structure

```
outing/
├── backend/              # Node.js/Express API
│   ├── src/
│   │   ├── routes/      # API routes
│   │   ├── models/      # MongoDB models
│   │   ├── controllers/ # Business logic
│   │   ├── middleware/  # Auth, validation
│   │   ├── services/    # External services (SMS, push)
│   │   └── utils/       # Helpers
│   └── package.json
├── mobile/              # React Native app
│   ├── src/
│   │   ├── screens/     # App screens
│   │   ├── components/ # Reusable components
│   │   ├── navigation/ # Navigation setup
│   │   ├── services/   # API services
│   │   ├── context/    # State management
│   │   └── utils/      # Helper functions
│   └── package.json
└── README.md
```

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or MongoDB Atlas)
- Expo CLI (`npm install -g expo-cli`)
- Twilio account (for SMS OTP - optional)
- Firebase account (for push notifications - optional)

## Backend Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Variables

Create a `.env` file in the `backend` directory:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/juet-outing
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRE=7d
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number
FIREBASE_SERVICE_ACCOUNT=path-to-firebase-service-account.json
GATE_LATITUDE=28.123456
GATE_LONGITUDE=77.123456
GATE_RADIUS=100
```

**Note**: 
- For local development, you can skip Twilio and Firebase setup. OTPs and notifications will be logged to console.
- Update `GATE_LATITUDE` and `GATE_LONGITUDE` with your actual gate coordinates.

### 3. Start MongoDB

If using local MongoDB:
```bash
mongod
```

Or use MongoDB Atlas and update `MONGODB_URI` in `.env`.

### 4. Run the Server

```bash
# Development mode (with nodemon)
npm run dev

# Production mode
npm start
```

The server will run on `http://localhost:5000`

## Mobile App Setup

### 1. Install Dependencies

```bash
cd mobile
npm install
```

### 2. Configure API URL

Update `mobile/src/config/api.js` with your backend URL:

```javascript
export const API_BASE_URL = __DEV__ 
  ? 'http://YOUR_LOCAL_IP:5000/api'  // Use your local IP for physical device
  : 'https://your-backend-url.com/api';
```

**Important**: For physical devices, use your computer's local IP address instead of `localhost`.

### 3. Start the App

```bash
# Start Expo
npm start

# Or run on specific platform
npm run android
npm run ios
```

### 4. Run on Device

- Install Expo Go app on your phone
- Scan the QR code from the terminal
- Or use Android Studio/iOS Simulator

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/auth/resend-otp` - Resend OTP
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile
- `PUT /api/users/push-token` - Update push token
- `GET /api/users/history` - Get outing history
- `GET /api/users/statistics` - Get user statistics

### Outings
- `POST /api/outings` - Create outing request
- `GET /api/outings` - Get all requests
- `GET /api/outings/my-requests` - Get user's requests
- `GET /api/outings/:id` - Get single request
- `PUT /api/outings/:id/cancel` - Cancel request

### Matching
- `POST /api/matching/join/:requestId` - Join a request
- `GET /api/matching/suggestions` - Get matching suggestions
- `POST /api/matching/auto-match` - Auto-match users
- `GET /api/matching/active-group` - Get active group

### Messages
- `GET /api/messages/:groupId` - Get messages
- `POST /api/messages` - Send message

### Location
- `POST /api/location/checkin` - Check in at gate
- `POST /api/location/checkout` - Check out
- `GET /api/location/gate-status/:groupId` - Get gate status

## Database Models

### User
- name, email, year, semester, phone, password
- verified, phoneVerified, pushToken
- emergencyContact, createdAt, lastActive

### OutingRequest
- userId, date, time, status
- preferences, members, createdAt, expiresAt

### Group
- requestId, members (3 users), status
- outingDate, outingTime, createdAt, completedAt

### Message
- groupId, senderId, text, timestamp

### Location
- userId, groupId, latitude, longitude
- type (checkin/checkout), verified, timestamp

## Matching Algorithm

1. Find requests with similar timing (±30 minutes)
2. Filter by preferences if set (year, semester)
3. Prioritize requests with fewer members
4. Match based on first-come-first-served
5. Notify all matched users when group is formed

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Input validation and sanitization
- Rate limiting (can be added)
- Location data encryption
- Privacy controls for location sharing

## Deployment

### Backend
- Deploy to Heroku, Railway, Render, or similar
- Set environment variables in hosting platform
- Use MongoDB Atlas for database

### Mobile
- Build APK/IPA using Expo:
  ```bash
  expo build:android
  expo build:ios
  ```
- Or use EAS Build:
  ```bash
  eas build --platform android
  eas build --platform ios
  ```

## Troubleshooting

### Backend Issues
- Ensure MongoDB is running
- Check environment variables are set correctly
- Verify port 5000 is not in use

### Mobile Issues
- Use local IP instead of localhost for physical devices
- Ensure backend is accessible from device
- Check Expo Go app is updated

### OTP Not Received
- Check Twilio credentials (if configured)
- Check console logs for OTP (in development)
- Verify phone number format

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

ISC

## Support

For issues and questions, please open an issue on GitHub.

## Future Enhancements

- [ ] Admin dashboard for guards
- [ ] Rating system for group members
- [ ] Advanced filtering options
- [ ] Group chat improvements
- [ ] Offline mode support
- [ ] Dark mode
- [ ] Multi-language support


