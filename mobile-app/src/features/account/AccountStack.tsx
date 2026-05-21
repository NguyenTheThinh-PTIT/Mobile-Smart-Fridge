import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { AccountScreen } from './AccountScreen';
import { HouseholdManagementScreen } from './HouseholdManagementScreen';
import { InviteMemberScreen } from './InviteMemberScreen';
import { ProfileSettingsScreen } from './ProfileSettingsScreen';
import { NotificationsScreen } from './NotificationsScreen';
import { HelpScreen } from './HelpScreen';
import { ReportSummaryScreen } from './ReportSummaryScreen';
import { ReportCookingHistoryScreen } from './ReportCookingHistoryScreen';
import { ReportFoodListScreen } from './ReportFoodListScreen';
import { ReportInsightsScreen } from './ReportInsightsScreen';
import { FavoriteRecipesScreen } from './FavoriteRecipesScreen';
import { RecipeManagementScreen } from './RecipeManagementScreen';
import { RecipeFormScreen } from './RecipeFormScreen';
import { RecipeIngredientEditorScreen } from './RecipeIngredientEditorScreen';
import { HouseholdProvider } from './HouseholdContext';

const Stack = createStackNavigator();

export const AccountStack: React.FC = () => {
  return (
    <HouseholdProvider>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="AccountHome">
        <Stack.Screen name="AccountHome" component={AccountScreen} />
        <Stack.Screen name="ProfileSettings" component={ProfileSettingsScreen} />
        <Stack.Screen name="HouseholdManagement" component={HouseholdManagementScreen} />
        <Stack.Screen name="FavoriteRecipes" component={FavoriteRecipesScreen} />
        <Stack.Screen name="InviteMember" component={InviteMemberScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="Help" component={HelpScreen} />
        <Stack.Screen name="ReportSummary" component={ReportSummaryScreen} />
        <Stack.Screen name="ReportInsights" component={ReportInsightsScreen} />
        <Stack.Screen name="ReportCookingHistory" component={ReportCookingHistoryScreen} />
        <Stack.Screen name="ReportFoodList" component={ReportFoodListScreen} />
        <Stack.Screen name="RecipeManagement" component={RecipeManagementScreen} />
        <Stack.Screen name="RecipeForm" component={RecipeFormScreen} />
        <Stack.Screen name="RecipeIngredientEditor" component={RecipeIngredientEditorScreen} />
      </Stack.Navigator>
    </HouseholdProvider>
  );
};
