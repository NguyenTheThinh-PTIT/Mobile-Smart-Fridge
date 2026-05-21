# React Native - Fridge AI Mobile App

This is a React Native conversion of the original Flutter-based Fridge AI mobile application.

## Migration Summary

### What Changed
- **Framework**: Flutter → React Native
- **Language**: Dart → TypeScript/JavaScript
- **State Management**: Riverpod → Redux
- **HTTP Client**: Dio → Axios
- **Dependency Injection**: Get_it → Redux + Context API
- **Build System**: Gradle → React Native CLI

### Project Structure

```
src/
├── core/                    # Core utilities
│   ├── error/              # Exception handling
│   │   ├── AppException.ts # Exception classes
│   │   └── ExceptionHandler.ts
│   ├── network/            # HTTP client
│   │   └── AxiosClient.ts
│   ├── retry/              # Retry logic with exponential backoff
│   │   ├── RetryConfig.ts
│   │   └── RetryInterceptor.ts
│   ├── base_widgets/       # Reusable components
│   │   ├── SafeAreaWrapper.tsx
│   │   ├── LoadingIndicator.tsx
│   │   ├── ErrorDisplay.tsx
│   │   └── Button.tsx
│   └── utils/              # Utility functions
├── store/                  # Redux state management
│   ├── authSlice.ts       # Auth state
│   ├── index.ts           # Store configuration
│   └── hooks.ts           # Custom hooks
├── features/               # Feature modules
│   ├── auth/              # Authentication feature
│   ├── inventory/         # Inventory management
│   ├── planner/           # Meal planning
│   └── social/            # Social features
├── navigation/             # Navigation setup
│   └── RootNavigator.tsx
└── App.tsx                # Main app component
```

## Key Features Migrated

### ✅ Error Handling System
- Comprehensive exception hierarchy (NetworkException, AuthException, ValidationException, etc.)
- Automatic error classification and handling
- Debug logging support

### ✅ Network Client with Auto-Retry
- Axios-based HTTP client with singleton pattern
- Automatic retry with exponential backoff (2s, 4s, 8s)
- Retries on 5xx errors and timeouts
- Request/Response logging in debug mode

### ✅ State Management
- Redux with Redux Toolkit
- Persistent storage using redux-persist
- Auth state slice with user management
- Type-safe selectors and hooks

### ✅ Base Widgets
- SafeAreaWrapper - Safe area handling
- LoadingIndicator - Loading spinner
- ErrorDisplay - Error messages with retry
- Button - Customizable button component

### ✅ Navigation
- React Navigation with Stack and Bottom Tab navigators
- Auth and App stacks with conditional navigation
- Feature-based screen organization

## Setup and Installation

### Prerequisites
- Node.js 16+ and npm/yarn
- React Native CLI
- For iOS: Xcode and CocoaPods
- For Android: Android Studio and SDK

### Installation

```bash
# Install dependencies
npm install
# or
yarn install

# Install pod dependencies (iOS)
cd ios && pod install && cd ..

# Start React Native development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

## API Configuration

Update the base URL in [src/core/network/AxiosClient.ts](src/core/network/AxiosClient.ts#L37):

```typescript
const baseURL = 'http://your-api-url:port/api/v1';
```

## Environment Variables

Create `.env` file in project root:

```env
REACT_APP_API_URL=http://localhost:8080/api/v1
REACT_APP_API_TIMEOUT=10000
```

## Debugging

### Redux DevTools
The app supports Redux DevTools for state debugging:

```bash
npm run dev:redux
```

### Network Requests
HTTP requests are logged automatically in development:

```javascript
// Check console for logs like:
// [HTTP Request] GET /api/users
// [HTTP Response] 200 /api/users
```

## TODO - Features to Implement

### Auth Module
- [ ] LoginScreen - Implement login form
- [ ] SignupScreen - Implement registration
- [ ] ForgotPasswordScreen - Password recovery
- [ ] ProfileScreen - User profile management
- [ ] Auth API integration

### Inventory Module
- [ ] Add/Edit/Delete items
- [ ] Item filtering and search
- [ ] Image upload
- [ ] Barcode scanning
- [ ] Expiry date tracking

### Planner Module
- [ ] Meal planning interface
- [ ] Recipe suggestions
- [ ] Shopping list generation
- [ ] Meal calendar view
- [ ] Nutritional info

### Social Module
- [ ] Recipe sharing
- [ ] User profiles
- [ ] Comments and likes
- [ ] Messaging
- [ ] Friend system

### Core Improvements
- [ ] Add vector icons (react-native-vector-icons)
- [ ] Implement push notifications
- [ ] Add offline support with local caching
- [ ] Implement proper form validation
- [ ] Add animations and transitions
- [ ] Dark mode support
- [ ] Multi-language support

## Testing

```bash
# Run tests
npm test

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage
```

## Linting and Formatting

```bash
# Lint check
npm run lint

# Lint fix
npm run lint -- --fix

# Format code
npm run format

# Type check
npm run type-check
```

## Deployment

### Android
```bash
# Build release APK
cd android && ./gradlew assembleRelease
```

### iOS
```bash
# Build release package
cd ios && xcodebuild -scheme FridgeAIApp -configuration Release
```

## Performance Considerations

1. **Image Optimization**: Use react-native-fast-image for efficient image loading
2. **List Performance**: Implement FlatList with proper key props
3. **State Management**: Redux Toolkit automatically optimizes selectors
4. **Code Splitting**: Use lazy loading for feature modules
5. **Bundle Size**: Monitor with metro bundler

## Troubleshooting

### Metro Bundler Issues
```bash
# Clear cache and restart
npm start -- --reset-cache
```

### Android Build Issues
```bash
# Clean Android build
cd android && ./gradlew clean
```

### Pod Issues (iOS)
```bash
# Reinstall pods
cd ios && pod deintegrate && pod install
```

## Migration Notes

**From Flutter to React Native:**

| Flutter | React Native |
|---------|--------------|
| Stateless/Stateful Widgets | Functional Components |
| Riverpod (state management) | Redux + Redux Toolkit |
| Dio (HTTP client) | Axios |
| GetIt (service locator) | Redux + Custom Hooks |
| FutureBuilder | useEffect/Loading state |
| Navigator 2.0 | React Navigation |
| Theme support | StyleSheet + Context |

## Resources

- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [React Navigation](https://reactnavigation.org/docs/getting-started)
- [Redux Toolkit](https://redux-toolkit.js.org/introduction/getting-started)
- [Axios Documentation](https://axios-http.com/docs/intro)
- [TypeScript in React Native](https://reactnative.dev/docs/typescript)

## Support

For bugs and feature requests, open an issue in the repository.

## License

This project is part of the Fridge AI Backend system.
