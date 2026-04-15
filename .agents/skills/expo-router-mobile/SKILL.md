---
name: expo-router-mobile
description: UI patterns, store orchestration, and mobile edge cases for this Expo app.
---

# Expo Router Mobile

Use this skill for all frontend work in `frontend/app/`, `frontend/components/`, and `frontend/store/`.

## 🏗 Component Patterns

### Composition over Props
Prefer nesting components to create flexible layouts.
```tsx
<SoftCard>
  <SoftText variant="h1">{title}</SoftText>
  <TransactionList items={items} />
</SoftCard>
```

### Store-First Orchestration
Screens should be thin. Move API calls and complex logic to `frontend/store/app-store.ts`.
```tsx
// PASS: Screen just reads state and triggers actions
const { transactions, addTransaction } = useStore();
```

## 📱 Mobile Edge Cases

### SafeArea Handling
Ensure content doesn't overlap with notches or home indicators.
- Use `SafeAreaView` from `react-native-safe-area-context`.
- Use `useSafeAreaInsets()` for custom header offsets.

### Keyboard Complexity
- Use `KeyboardAvoidingView` on forms.
- Ensure the "Submit" buttons are visible when the keyboard is active.
- Use `ScrollView` with `keyboardShouldPersistTaps="handled"`.

### Navigation & Back Behavior
- Handle the Android physical back button using `BackHandler` if custom modal logic is present.
- Use Expo Router's `<Link>` or `router.push()` for navigation.

## 🧪 Verification

1. **Static Analysis**: Run `npm run frontend:check` from the root.
2. **UI Check**: Verify on both iOS and Android if possible. 
3. **Contrast**: Ensure text is readable against the current theme (light/dark).

