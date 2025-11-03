# FCM Price Notifications API Documentation

## 🚀 New API Endpoints

### **FCM Token Management**

#### **Register FCM Token**
```bash
POST /fcm/register-token
Content-Type: application/json

{
  "token": "fcm_device_token_here",
  "device_type": "android",  // or "ios"
  "device_name": "My Phone"  // optional
}
```

**Response:**
```json
{
  "status": "success",
  "message": "FCM token registered successfully",
  "data": {
    "token_id": "uuid-here",
    "device_type": "android",
    "device_name": "My Phone",
    "created_at": "2024-01-17T10:30:00.000Z"
  }
}
```

#### **Get User FCM Tokens**
```bash
GET /fcm/tokens
```

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "token_id": "uuid-here",
      "device_type": "android",
      "device_name": "My Phone",
      "created_at": "2024-01-17T10:30:00.000Z",
      "last_used": "2024-01-17T10:30:00.000Z"
    }
  ],
  "count": 1
}
```

#### **Update FCM Token**
```bash
PUT /fcm/tokens/:tokenId
Content-Type: application/json

{
  "device_name": "Updated Device Name",
  "is_active": true
}
```

#### **Remove FCM Token**
```bash
DELETE /fcm/tokens/:tokenId
```

---

### **Price Target Management**

#### **Create Price Target**
```bash
POST /targets
Content-Type: application/json

{
  "ticker": "AAPL",
  "target_price": 150.00,
  "alert_type": "above",  // or "below"
  "is_active": true       // optional, defaults to true
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Price target created successfully",
  "data": {
    "target_id": "uuid-here",
    "ticker": "AAPL",
    "target_price": 150.00,
    "alert_type": "above",
    "is_active": true,
    "created_at": "2024-01-17T10:30:00.000Z"
  }
}
```

#### **Get All Price Targets**
```bash
GET /targets
```

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "target_id": "uuid-here",
      "ticker": "AAPL",
      "target_price": 150.00,
      "alert_type": "above",
      "is_active": true,
      "created_at": "2024-01-17T10:30:00.000Z",
      "last_updated": "2024-01-17T10:30:00.000Z",
      "triggered": false,
      "triggered_at": null,
      "current_price": 145.25
    }
  ],
  "count": 1
}
```

#### **Get Specific Price Target**
```bash
GET /targets/:id
```

#### **Update Price Target**
```bash
PUT /targets/:id
Content-Type: application/json

{
  "target_price": 155.00,
  "alert_type": "below",
  "is_active": false
}
```

#### **Delete Price Target**
```bash
DELETE /targets/:id
```

---

### **Notification History**

#### **Get Notification History**
```bash
GET /notifications?limit=50
```

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "notification-id",
      "target_id": "target-uuid",
      "ticker": "AAPL",
      "target_price": 150.00,
      "current_price": 150.25,
      "alert_type": "above",
      "sent_at": "2024-01-17T10:30:00.000Z",
      "status": "sent"
    }
  ],
  "count": 1
}
```

#### **Get Specific Notification**
```bash
GET /notifications/:id
```

---

---

### **WebSocket Status**

#### **Get WebSocket Connection Status**
```bash
GET /websocket/status
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "isConnected": true,
    "subscribedTickers": ["AAPL", "MSFT", "GOOG"],
    "cachedPrices": 3,
    "reconnectAttempts": 0
  }
}
```

#### **Get Current Cached Prices**
```bash
GET /websocket/prices
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "AAPL": {
      "symbol": "AAPL",
      "price": 150.25,
      "volume": 1234567,
      "timestamp": 1703123456,
      "date_time_utc": "2023-12-21T10:30:56Z",
      "last_updated": "2024-01-17T10:30:00.000Z"
    }
  },
  "count": 1
}
```

---

## 🔧 **Setup Requirements**

### **1. Environment Variables**
Add to your `.env` file:
```bash
# WebSocket Price Feed Configuration
WEBSOCKET_PRICE_URL=ws://risepython.infomanav.in:6003/ws/price
```

### **2. Firebase Console Setup**
1. Enable **Cloud Messaging** in Firebase Console
2. Ensure your service account key has FCM permissions
3. Update Firestore security rules for new collections

### **3. WebSocket Price Feed**
- **No API key required** - Direct WebSocket connection
- **Real-time prices** - Updates every few seconds
- **Automatic reconnection** - Handles connection drops

---

## 📊 **Database Collections**

### **FCM Tokens**
```
fcm_tokens/
├── user123/
    └── tokens/
        ├── {tokenId}/
            ├── token: "fcm_token"
            ├── device_type: "android"
            ├── device_name: "My Phone"
            ├── is_active: true
            ├── created_at: timestamp
            └── last_used: timestamp
```

### **Price Targets**
```
price_targets/
├── user123/
    └── targets/
        ├── {targetId}/
            ├── ticker: "AAPL"
            ├── target_price: 150.00
            ├── alert_type: "above"
            ├── is_active: true
            ├── triggered: false
            ├── current_price: 145.25
            ├── created_at: timestamp
            └── last_updated: timestamp
```

### **Notification History**
```
notification_history/
├── user123/
    └── notifications/
        ├── {notificationId}/
            ├── target_id: "target-uuid"
            ├── ticker: "AAPL"
            ├── target_price: 150.00
            ├── current_price: 150.25
            ├── alert_type: "above"
            ├── sent_at: timestamp
            └── status: "sent"
```

---

## 🎯 **How It Works**

1. **WebSocket Connection** - Connects to real-time price feed
2. **Register FCM Token** - Flutter app registers device token
3. **Set Price Target** - User sets target price for stock
4. **Auto Subscribe** - System automatically subscribes to ticker
5. **Real-time Monitoring** - WebSocket provides live price updates
6. **Target Hit Detection** - Service checks targets every 5 minutes
7. **FCM Notification** - When target hit, notification sent
8. **History Tracking** - All notifications logged

---

## 🚀 **Testing the System**

### **1. Register FCM Token**
```bash
curl -X POST http://localhost:3000/fcm/register-token \
  -H "Content-Type: application/json" \
  -d '{
    "token": "test_fcm_token_123",
    "device_type": "android",
    "device_name": "Test Device"
  }'
```

### **2. Set Price Target**
```bash
curl -X POST http://localhost:3000/targets \
  -H "Content-Type: application/json" \
  -d '{
    "ticker": "AAPL",
    "target_price": 150.00,
    "alert_type": "above"
  }'
```

### **3. Check Targets**
```bash
curl http://localhost:3000/targets
```

### **4. Check WebSocket Status**
```bash
curl http://localhost:3000/websocket/status
```

### **5. Check Current Prices**
```bash
curl http://localhost:3000/websocket/prices
```

---

## ⚠️ **Important Notes**

1. **WebSocket Connection** - Automatically connects and reconnects
2. **Real-time Prices** - Updates every few seconds via WebSocket
3. **Target Monitoring** - Checks targets every 5 minutes
4. **FCM Tokens** - Must be registered before setting targets
5. **Target Limits** - One active target per ticker per user
6. **Auto Subscription** - Automatically subscribes to new tickers
7. **Price Caching** - Prices cached for immediate access
8. **Connection Status** - Monitor via `/websocket/status` endpoint

---

## 🔄 **Next Steps**

1. **Enable FCM in Firebase Console**
2. **Test WebSocket connection**
3. **Test API endpoints**
4. **Integrate with Flutter app**
5. **Monitor price targets**

The system is now ready for testing with real-time WebSocket price feed! 🎉
