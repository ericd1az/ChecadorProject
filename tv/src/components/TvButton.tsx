import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

export function TvButton({ title, onPress, disabled = false }: { title: string; onPress: () => void; disabled?: boolean }) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      focusable={!disabled}
      disabled={disabled}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      style={[styles.button, focused && styles.focused, disabled && styles.disabled]}
    >
      <Text style={[styles.text, focused && styles.focusedText]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignSelf: 'flex-start', backgroundColor: '#214A38', borderColor: '#214A38', borderWidth: 3,
    borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12, marginTop: 16 },
  focused: { backgroundColor: '#B66B4F', borderColor: '#B66B4F', transform: [{ scale: 1.06 }] },
  disabled: { opacity: 0.5 },
  text: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  focusedText: { color: '#FFFFFF' },
});
