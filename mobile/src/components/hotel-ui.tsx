import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type RefreshControlProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const colors = {
  ink: '#173042', muted: '#647586', teal: '#087D78', tealDark: '#075F5B',
  background: '#F4F7F6', surface: '#FFFFFF', border: '#DCE6E4',
  danger: '#B84242', soft: '#E7F4F1', gold: '#D2A54E',
};

export function Screen({ children, refreshControl }: { children: ReactNode; refreshControl?: React.ReactElement<RefreshControlProps> }) {
  return <SafeAreaView style={styles.root} edges={['bottom']}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" refreshControl={refreshControl}>
      {children}
    </ScrollView>
  </SafeAreaView>;
}

export function Title({ children, subtitle }: { children: ReactNode; subtitle?: string }) {
  return <View style={styles.titleBlock}><Text style={styles.title}>{children}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}</View>;
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function Label({ children }: { children: ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function Body({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  return <Text style={[styles.body, muted && styles.muted]}>{children}</Text>;
}

export function Input({ label, value, onChangeText, multiline, keyboardType, placeholder, secureTextEntry, maxLength, autoCapitalize }: {
  label: string; value: string; onChangeText: (value: string) => void; multiline?: boolean;
  keyboardType?: 'default' | 'number-pad' | 'numeric'; placeholder?: string;
  secureTextEntry?: boolean; maxLength?: number; autoCapitalize?: 'none' | 'sentences' | 'words';
}) {
  return <View style={styles.inputWrap}><Label>{label}</Label><TextInput
    style={[styles.input, multiline && styles.multiline]}
    value={value} onChangeText={onChangeText} placeholder={placeholder}
    placeholderTextColor="#8C9AA5" multiline={multiline} keyboardType={keyboardType}
    secureTextEntry={secureTextEntry} maxLength={maxLength} autoCapitalize={autoCapitalize ?? 'sentences'}
  /></View>;
}

export function Button({ title, onPress, kind = 'primary', disabled = false }: {
  title: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'danger'; disabled?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title}
    disabled={disabled} onPress={onPress} style={({ pressed }) => [
      styles.button, kind === 'secondary' && styles.secondaryButton,
      kind === 'danger' && styles.dangerButton, disabled && styles.disabled,
      pressed && styles.pressed,
    ]}>
    <Text style={[styles.buttonText, kind === 'secondary' && styles.secondaryText]}>{title}</Text>
  </Pressable>;
}

export function Row({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

export function Feedback({ message, error = false }: { message: string | null; error?: boolean }) {
  if (!message) return null;
  return <View style={[styles.feedback, error && styles.errorFeedback]}><Text style={[styles.body, error && styles.errorText]}>{message}</Text></View>;
}

export function Loading({ label = 'Cargando…' }: { label?: string }) {
  return <View style={styles.loading}><ActivityIndicator color={colors.teal} /><Text style={styles.muted}>{label}</Text></View>;
}

export function Chip({ text }: { text: string }) {
  return <View style={styles.chip}><Text style={styles.chipText}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 18, paddingBottom: 42, gap: 14, maxWidth: 760, width: '100%', alignSelf: 'center' },
  titleBlock: { gap: 4, marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', color: colors.ink, letterSpacing: -.5 },
  subtitle: { fontSize: 14, color: colors.muted, lineHeight: 21 },
  card: { padding: 17, backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, gap: 10 },
  label: { fontSize: 13, fontWeight: '700', color: colors.ink },
  body: { fontSize: 15, color: colors.ink, lineHeight: 22 },
  muted: { color: colors.muted },
  inputWrap: { gap: 6 },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    borderRadius: 12, paddingHorizontal: 13, color: colors.ink, fontSize: 16 },
  multiline: { minHeight: 100, textAlignVertical: 'top', paddingTop: 12 },
  button: { minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 12,
    backgroundColor: colors.teal, paddingHorizontal: 14, paddingVertical: 10, flexGrow: 1 },
  secondaryButton: { backgroundColor: colors.soft },
  dangerButton: { backgroundColor: colors.danger },
  disabled: { opacity: .48 }, pressed: { opacity: .8 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  secondaryText: { color: colors.tealDark },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  feedback: { padding: 12, borderRadius: 12, backgroundColor: colors.soft },
  errorFeedback: { backgroundColor: '#FCECEC' }, errorText: { color: colors.danger },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 20 },
  chip: { alignSelf: 'flex-start', backgroundColor: colors.soft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  chipText: { fontSize: 12, fontWeight: '700', color: colors.tealDark },
});
