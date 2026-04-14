import { Redirect } from 'expo-router';

// This screen is never shown — the tab bar button navigates directly to /transaction/add
export default function AddButtonPlaceholder() {
  return <Redirect href="/transaction/add" />;
}
