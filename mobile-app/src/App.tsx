import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as ReduxProvider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { Provider as PaperProvider } from 'react-native-paper';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { store, persistor } from '@/store';
import { RootNavigator } from '@/navigation/RootNavigator';
import { ErrorDisplay, LoadingIndicator } from '@/core/base_widgets';
import { paperTheme } from '@/core/theme/paperTheme';
import { applyGlobalTypography } from '@/core/theme/typography';

interface AppErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class AppErrorBoundary extends React.Component<React.PropsWithChildren, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
    errorMessage: '',
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'Đã xảy ra lỗi không xác định.',
    };
  }

  componentDidCatch(error: Error): void {
    console.error('[AppErrorBoundary] Unhandled render error:', error);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <ErrorDisplay
          title="Ứng dụng gặp lỗi"
          message={this.state.errorMessage}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Main App Component
 *
 * Setup:
 * 1. Redux Provider
 * 2. Redux Persist
 * 3. Navigation Container
 * 4. Global error handling
 */

import { useSelector } from 'react-redux';
import { selectToken } from '@/store/authSlice';
import { axiosClient } from '@/core/network/AxiosClient';

// Component để đồng bộ token Redux vào axiosClient, phải nằm bên trong Provider
function AuthTokenSync() {
  const token = useSelector(selectToken);
  useEffect(() => {
    if (token) axiosClient.setAuthToken(token);
    else axiosClient.clearAuthToken();
  }, [token]);
  return null;
}

function App(): React.JSX.Element {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      applyGlobalTypography();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return <LoadingIndicator message="Đang tải giao diện..." color="#FF7622" />;
  }

  return (
    <AppErrorBoundary>
      <ReduxProvider store={store}>
        <PersistGate loading={<LoadingIndicator />} persistor={persistor}>
          <AuthTokenSync />
          <SafeAreaProvider>
            <PaperProvider theme={paperTheme}>
              <RootNavigator />
            </PaperProvider>
          </SafeAreaProvider>
        </PersistGate>
      </ReduxProvider>
    </AppErrorBoundary>
  );
}

export default App;
