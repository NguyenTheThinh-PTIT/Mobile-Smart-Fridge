import React from 'react';
import {
  NavigationContainer,
  NavigationState,
  PartialState,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Portal } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { authActions, selectIsLoggedIn, selectPostLoginRedirect, selectToken } from '@/store/authSlice';
import { axiosClient } from '@/core/network/AxiosClient';
import { useResponsive } from '@/core/theme/responsive';
import { LoginScreen } from '@/features/auth/LoginScreen';
import { JoinHouseholdScreen } from '@/features/auth/JoinHouseholdScreen';
import { SignUpScreen } from '@/features/auth/SignUpScreen';
import { ForgotPasswordScreen } from '@/features/auth/ForgotPasswordScreen';
import { OtpVerificationScreen } from '@/features/auth/OtpVerificationScreen';
import { ResetPasswordScreen } from '@/features/auth/ResetPasswordScreen';
import { InventoryStack } from '@/features/inventory/InventoryStack';
import { HomeScreen } from '@/features/home/HomeScreen';
import { PlannerScreen } from '@/features/planner/PlannerScreen';
import { MealPlanPendingScreen } from '@/features/planner/MealPlanPendingScreen';
import { MealPlanRecipeSearchScreen } from '@/features/planner/MealPlanRecipeSearchScreen';
import { RecipesScreen } from '@/features/recipes/RecipesScreen';
import { RecipeDetailScreen } from '@/features/recipes/RecipeDetailScreen';
import { RecipesByTagScreen } from '@/features/recipes/RecipesByTagScreen';
import { ShoppingPendingScreen } from '@/features/recipes/ShoppingPendingScreen';
import { RecipeStepByStepScreen } from '@/features/recipes/RecipeStepByStepScreen';
import { RecipeConsumptionConfirmScreen } from '@/features/recipes/RecipeConsumptionConfirmScreen';
import { NotificationsScreen } from '@/features/account/NotificationsScreen';
import { AccountStack } from '@/features/account/AccountStack';
import { ChatScreen } from '@/features/chat/ChatScreen';
import { FloatingChatButton } from '@/components/FloatingChatButton';
import { HouseholdProvider } from '@/features/account/HouseholdContext';
import { InventoryProvider } from '@/features/inventory/InventoryContext';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const navigationRef = createNavigationContainerRef();

const CHAT_VISIBLE_ROUTES = new Set([

  'Home',
  'Inventory',
  'FoodInventory',
  'FoodDetail',
  'ActivityHistory',
  'Planner',
]);

const getDeepestRouteName = (
  state?: NavigationState | PartialState<NavigationState>
): string | undefined => {
  if (!state || !state.routes || state.routes.length === 0) {
    return undefined;
  }

  const route = state.routes[state.index ?? 0] as any;
  if (route?.state) {
    return getDeepestRouteName(route.state);
  }
  return route?.name;
};

const createStyles = (scale: (size: number) => number) =>
  StyleSheet.create({
    addFoodButtonWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: scale(-28),
      width: scale(88),
    },
    addFoodButton: {
      width: scale(58),
      height: scale(58),
      borderRadius: scale(29),
      backgroundColor: '#F97316',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#F97316',
      shadowOffset: { width: 0, height: scale(8) },
      shadowOpacity: 0.3,
      shadowRadius: scale(12),
      elevation: scale(7),
    },
    addFoodLabel: {
      marginTop: scale(6),
      fontSize: scale(11),
      fontWeight: '700',
      color: '#F97316',
    },
  });

/**
 * Auth Stack Navigator
 */
const AuthStack: React.FC = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen 
      name="JoinHousehold" 
      component={JoinHouseholdScreen}
      options={{ presentation: 'modal', animationEnabled: true }}
    />
    <Stack.Screen name="SignUp" component={SignUpScreen} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
    <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
  </Stack.Navigator>
);

/**
 * App Stack Navigator (Bottom Tab)
 */
const AppTab: React.FC = () => {
  const { scale } = useResponsive();
  const insets = useSafeAreaInsets();
  const styles = React.useMemo(() => createStyles(scale), [scale]);
  const androidFallbackInset = Math.max(2, Math.round(scale(4)));
  const tabBarBottomInset =
    Platform.OS === 'android'
      ? (insets.bottom > 0 ? insets.bottom : androidFallbackInset)
      : Math.max(insets.bottom, scale(10));

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#F97316',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarLabelStyle: {
          fontSize: scale(11),
          fontWeight: '700',
        },
        tabBarStyle: {
          height: scale(58) + tabBarBottomInset,
          paddingBottom: tabBarBottomInset,
          paddingTop: scale(8),
          borderTopColor: '#E2E8F0',
        },
      }}
    >
    <Tab.Screen
      name="Home"
      component={HomeScreen}
      options={{
        title: 'Trang chủ',
        tabBarLabel: 'Trang chủ',
        tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} />,
      }}
    />
    <Tab.Screen
      name="Inventory"
      component={InventoryStack}
      listeners={({ navigation }) => ({
        tabPress: (event) => {
          event.preventDefault();
          navigation.navigate('Inventory', { screen: 'FoodInventory' });
        },
      })}
      options={{
        title: 'Kho hàng',
        tabBarLabel: 'Kho hàng',
        tabBarIcon: ({ color, size }) => <Ionicons name="cube-outline" color={color} size={size} />,
      }}
    />
    <Tab.Screen
      name="AddFoodAction"
      component={View}
      options={({ navigation }) => ({
        title: 'Thêm',
        tabBarLabel: '',
        tabBarIcon: () => null,
        tabBarButton: () => (
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.addFoodButtonWrap}
            onPress={() => navigation.navigate('Inventory', { screen: 'FoodForm', params: { mode: 'add' } })}
          >
            <View style={styles.addFoodButton}>
              <Ionicons name="add" size={scale(28)} color="#FFF" />
            </View>
          </TouchableOpacity>
        ),
      })}
    />
    <Tab.Screen
      name="Recipes"
      component={RecipesScreen}
      options={{
        title: 'Công thức',
        tabBarLabel: 'Công thức',
        tabBarIcon: ({ color, size }) => <Ionicons name="book-outline" color={color} size={size} />,
      }}
    />
    <Tab.Screen
      name="NotificationsCenter"
      component={NotificationsScreen}
      options={{
        title: 'Thông báo',
        tabBarButton: () => null,
      }}
    />
    <Tab.Screen
      name="RecipesByTag"
      component={RecipesByTagScreen}
      options={{
        title: 'Món theo tag',
        tabBarButton: () => null,
      }}
    />
    <Tab.Screen
      name="Planner"
      component={PlannerScreen}
      options={{
        title: 'Lịch nấu',
        tabBarButton: () => null,
      }}
    />
    <Tab.Screen
      name="MealPlanPending"
      component={MealPlanPendingScreen}
      options={{
        title: 'Chi tiết lịch',
        tabBarButton: () => null,
      }}
    />
    <Tab.Screen
      name="MealPlanRecipeSearch"
      component={MealPlanRecipeSearchScreen}
      options={{
        title: 'Tìm món',
        tabBarButton: () => null,
      }}
    />
    <Tab.Screen
      name="Account"
      component={AccountStack}
      listeners={({ navigation }) => ({
        tabPress: (event) => {
          event.preventDefault();
          navigation.navigate('Account', { screen: 'AccountHome' });
        },
      })}
      options={{
        title: 'Tài khoản',
        tabBarLabel: 'Tài khoản',
        tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} />,
      }}
    />
  </Tab.Navigator>
);
};

const AppStack: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MainTabs" component={AppTab} />
    <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} />
    <Stack.Screen name="RecipeStepByStep" component={RecipeStepByStepScreen} />
    <Stack.Screen name="RecipeConsumptionConfirm" component={RecipeConsumptionConfirmScreen} />
    <Stack.Screen name="ShoppingPending" component={ShoppingPendingScreen} />
    <Stack.Screen name="Chat" component={ChatScreen} />
  </Stack.Navigator>
);

/**
 * Root Navigator
 */
export const RootNavigator: React.FC = () => {
  const dispatch = useAppDispatch();
  const isLoggedIn = useAppSelector(selectIsLoggedIn);
  const token = useAppSelector(selectToken);
  const postLoginRedirect = useAppSelector(selectPostLoginRedirect);
  const [activeRoute, setActiveRoute] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    if (token) {
      axiosClient.setAuthToken(token);
      return;
    }

    axiosClient.clearAuthToken();
  }, [token]);

  React.useEffect(() => {
    if (!isLoggedIn || !postLoginRedirect || !navigationRef.isReady()) {
      return;
    }

    const timer = setTimeout(() => {
try {
        const targetTab = postLoginRedirect.tab === 'HomeTab' ? 'Home' : postLoginRedirect.tab;
        const validTabs = ['Home', 'Inventory', 'Recipes', 'Account'] as const;
        if (!validTabs.includes(targetTab as any)) {
          console.warn(`Invalid post-login tab: ${targetTab}, falling back to Home`);
          navigationRef.navigate('MainTabs' as any, { screen: 'Home' } as any);
          dispatch(authActions.clearPostLoginRedirect());
          return;
        }

(navigationRef.navigate('MainTabs' as any, {
          screen: targetTab as any,
          params: postLoginRedirect.screen
            ? {
                screen: postLoginRedirect.screen as any,
                params: postLoginRedirect.params,
              }
            : postLoginRedirect.params,
        } as any));
      } catch (error) {
        console.error('Post login navigation failed:', error);
        navigationRef.navigate('MainTabs' as any, { screen: 'Home' } as any);
      }

      dispatch(authActions.clearPostLoginRedirect());
    }, 0);

    return () => clearTimeout(timer);
  }, [isLoggedIn, postLoginRedirect, dispatch]);

  const shouldShowFloatingChat =
    isLoggedIn && activeRoute !== 'Chat' && CHAT_VISIBLE_ROUTES.has(activeRoute ?? '');

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <View style={{ flex: 1 }}>
        <NavigationContainer
          ref={navigationRef}
          onReady={() => {
            setActiveRoute(navigationRef.getCurrentRoute()?.name);
          }}
          onStateChange={(state) => {
            setActiveRoute(getDeepestRouteName(state));
          }}
        >
          {isLoggedIn ? (
            <HouseholdProvider>
              <InventoryProvider>
                <AppStack />
              </InventoryProvider>
            </HouseholdProvider>
          ) : (
            <AuthStack />
          )}
        </NavigationContainer>

        <Portal>
          <FloatingChatButton
            visible={shouldShowFloatingChat}
            onPress={() => {
              if (navigationRef.isReady()) {
                navigationRef.navigate('Chat' as never);
              }
            }}
          />
        </Portal>
      </View>
    </SafeAreaView>
  );
};
