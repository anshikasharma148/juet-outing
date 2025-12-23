# Network Setup Guide

## Quick Fix: Use ngrok (Easiest)

### Install ngrok:
```bash
# Download from https://ngrok.com/download
# Or install via snap:
sudo snap install ngrok
```

### Start ngrok tunnel:
```bash
ngrok http 5000
```

### Update mobile/src/config/api.js:
Replace the API_BASE_URL with the ngrok URL:
```javascript
export const API_BASE_URL = 'https://YOUR-NGROK-URL.ngrok.io/api';
export const SOCKET_URL = 'https://YOUR-NGROK-URL.ngrok.io';
```

**Note:** Free ngrok URLs change each time you restart. For production, use a paid ngrok account or deploy to a cloud service.

## Alternative: Connect Phone to Router WiFi

Even if your PC is on LAN, your phone can connect to the router's WiFi:
1. Find your router's WiFi name (SSID)
2. Connect phone to that WiFi
3. Phone should get IP like `192.168.0.x`
4. Test: Open `http://192.168.0.106:5000/api/health` in phone browser
5. If it works, the app will work too!

## Check Network Connectivity

From phone browser, test:
- `http://192.168.0.106:5000/api/health`

If you see `{"status":"OK","message":"Server is running"}`, network is working!

