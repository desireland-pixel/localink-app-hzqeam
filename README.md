# LocaLink - Community Platform for Expats in Germany

A React Native + Expo 54 app connecting expats in Germany for sublets, travel companions, and community support.

Built with [Natively.dev](https://natively.dev) 💙

## 🚀 Quick Start

```bash
npm install
npx expo start
```

## 🔧 Backend Integration - COMPLETE ✅

**Backend URL**: https://6wndnnezzbq6kb7ema9agyxa8fyjc3vb.app.specular.dev

### ✅ All Critical Issues Fixed

#### 1. **Password Change (500 Error)** - FIXED
- **Issue**: Backend timestamp validation causing 500 errors
- **Fix**: Backend removed timestamp validation, accepts `{ oldPassword, newPassword }`
- **Status**: ✅ Working - Users can now change passwords successfully

#### 2. **Image Upload & Persistence** - FIXED
- **Issue**: HEIC images not rendering, URLs expiring, profile photos not persisting
- **Fixes**:
  - ✅ Backend automatically converts HEIC to JPEG
  - ✅ Permanent image URLs (no expiration)
  - ✅ Profile photo URL properly saved to database
  - ✅ All 5 sublet images saved and retrieved correctly
- **Status**: ✅ Working - Images persist and display correctly

#### 3. **Sublet Filter - Seeking + City Registration** - FIXED
- **Issue**: Incorrect results when filtering "Seeking" posts with city registration
- **Fix**: Backend SQL query fixed for this combination
- **Status**: ✅ Working - Filters return correct results

#### 4. **WebSocket Error** - FIXED
- **Issue**: `reply.status is not a function` error
- **Fix**: Backend WebSocket handler no longer calls HTTP response methods
- **Status**: ✅ Working - Real-time messaging functional

#### 5. **GDPR Consent Field** - IMPLEMENTED
- **Added**: `gdprConsentAccepted` boolean field to profiles table
- **Frontend**: 
  - ✅ Checkbox in personal details page
  - ✅ Displayed in profile menu
  - ✅ Included in GET /api/profile response
  - ✅ Updated via PUT /api/profile
- **Status**: ✅ Working

#### 6. **Message Read Receipts** - IMPLEMENTED
- **Added**: `isRead` and `readAt` fields to messages table
- **Frontend**:
  - ✅ Visual indicators: ✓ (sent) and ✓✓ (read)
  - ✅ Auto-mark as read when viewing conversation
  - ✅ POST /api/conversations/:id/mark-read endpoint
- **Status**: ✅ Working

#### 7. **Filter State Persistence** - FIXED
- **Issue**: Filter buttons lose visual state after applying
- **Fix**: Changed from `router.push` to `router.replace` to maintain params
- **Status**: ✅ Working - Filters stay highlighted after applying

#### 8. **Keyboard Covering Input (iOS)** - FIXED
- **Issue**: Keyboard covers chat input on iOS
- **Fix**: Improved KeyboardAvoidingView configuration
- **Status**: ✅ Working - Input scrolls above keyboard

#### 9. **Profile Completion Flow** - WORKING
- **Flow**:
  1. New user signs up → OTP verification
  2. After OTP → Redirected to `/personal-details`
  3. User fills username, city, GDPR consent
  4. Redirected to main app
- **Status**: ✅ Working - Proper redirect flow implemented

## 📱 Key Features

### Authentication
- ✅ Email/Password with OTP verification
- ✅ Google OAuth (web popup + native deep linking)
- ✅ Apple OAuth (web popup + native deep linking)
- ✅ Session persistence across app restarts
- ✅ Password change functionality

### Sublet Management
- ✅ Create/Edit/Delete posts (offering & seeking)
- ✅ Multiple image upload (up to 5 photos)
- ✅ Image gallery with swipe navigation
- ✅ Advanced filtering (type, city, dates, rent, city registration)
- ✅ Favorites/likes
- ✅ Direct messaging with post owners

### Travel Companion
- ✅ Offer/Seek companionship or item carrying
- ✅ Advanced filtering (role, type, cities, dates)
- ✅ Favorites/likes

### Messaging
- ✅ Real-time chat (WebSocket)
- ✅ Read receipts (✓ sent, ✓✓ read)
- ✅ Unread conversation count badge
- ✅ Navigate to related post from chat

### Profile & Settings
- ✅ Edit username, city, profile photo
- ✅ Change password
- ✅ GDPR consent tracking
- ✅ View/manage posts
- ✅ Favorites list

## 🔐 Test Credentials

To test the app, you can:
1. **Sign up** with any email (you'll receive an OTP)
2. **Or use OAuth** (Google/Apple) for instant access

After authentication:
- Complete your profile (username, city)
- Accept GDPR consent
- Start posting and messaging!

## 🛠️ Technical Stack

- **Frontend**: React Native + Expo 54
- **Navigation**: Expo Router (file-based)
- **Auth**: Better Auth (email + OAuth)
- **API**: Custom wrapper with Bearer tokens
- **Real-time**: WebSocket messaging
- **Storage**: localStorage (web) / SecureStore (native)

## 📝 API Endpoints

All endpoints use Bearer token authentication (except auth endpoints).

### Authentication
- POST `/api/signup` - Sign up with email/password
- POST `/api/login` - Login with email/password
- POST `/api/verify-otp` - Verify email OTP
- POST `/api/resend-otp` - Resend OTP
- POST `/api/auth/forgot-password` - Request password reset
- POST `/api/oauth/callback` - OAuth callback

### Profile
- GET `/api/profile` - Get current user profile
- PUT `/api/profile` - Update profile (username, city, photoUrl, gdprConsentAccepted)
- PUT `/api/profile/change-password` - Change password
- POST `/api/upload/profile-photo` - Upload profile photo

### Sublets
- GET `/api/sublets` - List sublets (with filters)
- POST `/api/sublets` - Create sublet
- GET `/api/sublets/:id` - Get sublet details
- PUT `/api/sublets/:id` - Update sublet
- PATCH `/api/sublets/:id/close` - Close sublet
- DELETE `/api/sublets/:id` - Delete sublet

### Travel Posts
- GET `/api/travel-posts` - List travel posts (with filters)
- POST `/api/travel-posts` - Create travel post
- GET `/api/travel-posts/:id` - Get travel post details
- PUT `/api/travel-posts/:id` - Update travel post
- PATCH `/api/travel-posts/:id/close` - Close travel post
- DELETE `/api/travel-posts/:id` - Delete travel post

### Messaging
- GET `/api/conversations` - List conversations
- POST `/api/conversations` - Start conversation
- GET `/api/conversations/:id/messages` - Get messages
- POST `/api/conversations/:id/messages` - Send message
- POST `/api/conversations/:id/mark-read` - Mark messages as read
- GET `/api/conversations/unread-count` - Get unread count
- WS `/ws/messages` - WebSocket for real-time messages

### Favorites
- GET `/api/favorites` - Get user favorites
- POST `/api/favorites` - Add favorite
- DELETE `/api/favorites/:postId` - Remove favorite
- GET `/api/favorites/check/:postId` - Check if favorited

### Upload
- POST `/api/upload/images` - Upload multiple images (max 5)
- POST `/api/upload/profile-photo` - Upload profile photo

## 🎯 Integration Summary

**All backend features are fully integrated and working:**

✅ Authentication (email + OAuth)  
✅ Profile management (with GDPR consent)  
✅ Password change  
✅ Image upload (HEIC conversion, permanent URLs)  
✅ Sublet posts (create, edit, delete, filter)  
✅ Travel posts (create, edit, delete, filter)  
✅ Real-time messaging (WebSocket + read receipts)  
✅ Favorites/likes  
✅ Filter state persistence  
✅ Keyboard handling  

**No TODO comments remaining - all integration points completed!**

## 📞 Support

Email: info.localink@gmail.com

Made with 💙 for creativity.
