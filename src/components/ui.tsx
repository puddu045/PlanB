import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Plan, Category, categories } from '../types';
import { availableSpaces, planStatus } from '../domain';
import { useStore } from '../store';

export const C = {
  bg: '#FAF8F4',
  paper: '#FFFFFF',
  ink: '#192D3D',
  muted: '#586774',
  coral: '#C74532',
  coralLight: '#FCE9E1',
  line: '#E6E5E0',
  green: '#28705B',
  pale: '#EDF4ED',
  blue: '#E8EFF7',
};
export const styles = StyleSheet.create({
  title: { fontSize: 34, fontWeight: '800', letterSpacing: -1.3, color: C.ink },
  subtitle: { fontSize: 15, lineHeight: 23, color: C.muted },
  h2: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5, color: C.ink },
  label: { fontSize: 13, fontWeight: '700', color: C.ink, marginBottom: 8 },
  card: {
    padding: 24,
    borderRadius: 22,
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.line,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#CAD0D2',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: C.ink,
    backgroundColor: C.paper,
    fontSize: 15,
    minHeight: 48,
  },
});
export type IconName = React.ComponentProps<typeof Ionicons>['name'];
export function Icon({
  name,
  size = 20,
  color = C.ink,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return <Ionicons name={name} size={size} color={color} />;
}
export function Button({
  title,
  onPress,
  kind = 'primary',
  disabled = false,
  icon,
  testID,
}: {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'quiet' | 'danger';
  disabled?: boolean;
  icon?: IconName;
  testID?: string;
}) {
  const primary = kind === 'primary' || kind === 'danger';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 46,
        paddingVertical: 11,
        paddingHorizontal: 18,
        borderRadius: 12,
        backgroundColor: primary ? C.coral : kind === 'secondary' ? C.bg : 'transparent',
        borderWidth: kind === 'secondary' ? 1 : 0,
        borderColor: C.line,
        opacity: disabled ? 0.45 : pressed ? 0.72 : 1,
      })}
    >
      {icon && <Icon name={icon} size={18} color={primary ? '#fff' : C.ink} />}
      <Text style={{ color: primary ? '#fff' : C.ink, fontSize: 14, fontWeight: '700' }}>
        {title}
      </Text>
    </Pressable>
  );
}
export function Field({
  label,
  hint,
  ...props
}: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={{ gap: 0, marginBottom: 18 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#7A858C"
        {...props}
        style={[
          styles.input,
          props.multiline && { minHeight: 100, textAlignVertical: 'top' },
          props.style,
        ]}
      />
      {hint && (
        <Text style={{ fontSize: 12, lineHeight: 18, color: C.muted, marginTop: 6 }}>{hint}</Text>
      )}
    </View>
  );
}
export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        borderRadius: 24,
        minHeight: 42,
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderWidth: 1,
        borderColor: selected ? C.ink : C.line,
        backgroundColor: selected ? C.ink : C.paper,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {icon && <Icon name={icon} size={17} color={selected ? '#fff' : C.ink} />}
      <Text style={{ color: selected ? '#fff' : C.ink, fontWeight: '600', fontSize: 13 }}>
        {label}
      </Text>
    </Pressable>
  );
}
export function Check({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={[styles.row, { paddingVertical: 12, alignItems: 'flex-start' }]}
    >
      <Icon
        name={value ? 'checkbox' : 'square-outline'}
        color={value ? C.coral : C.muted}
        size={24}
      />
      <Text style={{ flex: 1, color: C.ink, fontSize: 14, lineHeight: 22 }}>{label}</Text>
    </Pressable>
  );
}
export function Feedback({ text, error = false }: { text: string; error?: boolean }) {
  if (!text) return null;
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        backgroundColor: error ? '#FCE9E1' : C.pale,
        padding: 14,
        borderRadius: 12,
        marginVertical: 12,
      }}
    >
      <Text style={{ color: error ? '#922F20' : C.green, fontSize: 14, lineHeight: 21 }}>
        {text}
      </Text>
    </View>
  );
}
export function Empty({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={[styles.card, { alignItems: 'center', paddingVertical: 40, gap: 12 }]}>
      <Icon name="sunny-outline" size={32} color={C.coral} />
      <Text style={styles.h2}>{title}</Text>
      <Text style={[styles.subtitle, { textAlign: 'center', maxWidth: 420 }]}>{text}</Text>
      {action}
    </View>
  );
}
export function Loading() {
  return (
    <View style={{ padding: 70, alignItems: 'center', gap: 16 }}>
      <ActivityIndicator color={C.coral} />
      <Text style={styles.subtitle}>Getting your plans together…</Text>
    </View>
  );
}
export function Tag({
  children,
  tone = 'default',
}: {
  children: React.ReactNode;
  tone?: 'default' | 'coral' | 'green';
}) {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 7,
        backgroundColor: tone === 'coral' ? C.coralLight : tone === 'green' ? C.pale : '#F0F2F3',
      }}
    >
      <Text
        style={{
          color: tone === 'coral' ? C.coral : tone === 'green' ? C.green : C.muted,
          fontSize: 11,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 0.6,
        }}
      >
        {children}
      </Text>
    </View>
  );
}
export const categoryIcons: Record<Category, IconName> = {
  Coffee: 'cafe-outline',
  Food: 'restaurant-outline',
  Cinema: 'film-outline',
  Sports: 'tennisball-outline',
  Walks: 'leaf-outline',
  Events: 'ticket-outline',
};
export const categoryColors: Record<Category, string> = {
  Coffee: '#F4E6D6',
  Food: '#F8E3DD',
  Cinema: '#E7E4F2',
  Sports: '#E2EDDD',
  Walks: '#DDECE8',
  Events: '#E4EAF3',
};
export function Interests({
  value,
  onChange,
}: {
  value: Category[];
  onChange: (v: Category[]) => void;
}) {
  return (
    <View style={styles.wrap}>
      {categories.map((c) => (
        <Chip
          key={c}
          label={c}
          icon={categoryIcons[c]}
          selected={value.includes(c)}
          onPress={() => onChange(value.includes(c) ? value.filter((x) => x !== c) : [...value, c])}
        />
      ))}
    </View>
  );
}
export function when(iso: string, detailed = false) {
  const date = new Date(iso);
  return date.toLocaleString('en-GB', {
    weekday: detailed ? 'long' : 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
export function money(cost: number) {
  return cost === 0 ? 'Free' : `£${cost.toFixed(cost % 1 ? 2 : 0)}`;
}
export function PlanCard({ plan }: { plan: Plan }) {
  const { data } = useStore();
  const host = data.profiles.find((p) => p.id === plan.hostId);
  const spaces = availableSpaces(plan, data.requests);
  const status = planStatus(plan, data.requests);
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${plan.title}, ${when(plan.startsAt)}, ${money(plan.cost)}, ${spaces} spaces`}
      onPress={() => router.push(`/plan/${plan.id}`)}
      style={({ pressed }) => [
        styles.card,
        { padding: 0, flex: 1, minWidth: 260, opacity: pressed ? 0.85 : 1, overflow: 'hidden' },
      ]}
    >
      <View
        style={{
          height: 122,
          backgroundColor: categoryColors[plan.category],
          padding: 20,
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        <View
          style={{
            alignSelf: 'flex-start',
            backgroundColor: '#FFFFFFC9',
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 8,
          }}
        >
          <Text style={{ fontSize: 11, color: C.ink, fontWeight: '700', letterSpacing: 0.7 }}>
            {plan.category.toUpperCase()}
          </Text>
        </View>
        <View
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            width: 82,
            height: 82,
            backgroundColor: '#FFFFFF60',
            borderRadius: 41,
            transform: [{ rotate: '-12deg' }],
          }}
        >
          <Icon name={categoryIcons[plan.category]} size={46} color={C.ink} />
        </View>
      </View>
      <View style={{ padding: 21, gap: 11 }}>
        <Text style={{ color: C.coral, fontSize: 12, fontWeight: '700' }}>
          {when(plan.startsAt)}
        </Text>
        <Text
          style={{ color: C.ink, fontWeight: '700', fontSize: 19, letterSpacing: -0.4 }}
          numberOfLines={2}
        >
          {plan.title}
        </Text>
        <View style={styles.row}>
          <Icon name="location-outline" size={15} color={C.muted} />
          <Text style={{ color: C.muted, fontSize: 13 }}>{plan.area}</Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            borderBottomWidth: 1,
            borderBottomColor: C.line,
            paddingBottom: 16,
            paddingTop: 3,
          }}
        >
          <Text style={{ fontWeight: '700', color: C.ink, fontSize: 14 }}>
            {money(plan.cost)}
            <Text style={{ fontWeight: '400', color: C.muted }}>
              {plan.cost > 0 ? ' / person' : ' to join'}
            </Text>
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: status === 'open' ? C.green : C.muted,
              fontWeight: '600',
            }}
          >
            {status === 'open'
              ? `${spaces} ${spaces === 1 ? 'space' : 'spaces'} open`
              : status[0]!.toUpperCase() + status.slice(1)}
          </Text>
        </View>
        <View style={styles.row}>
          <Avatar name={host?.name || 'Host'} small />
          <Text style={{ color: C.muted, fontSize: 12 }}>
            Hosted by{' '}
            <Text style={{ color: C.ink, fontWeight: '600' }}>
              {host?.name || 'a PlanB member'}
            </Text>
          </Text>
          <View style={{ marginLeft: 'auto' }}>
            <Icon name="arrow-forward" size={18} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}
export function Avatar({ name, small = false }: { name: string; small?: boolean }) {
  return (
    <View
      style={{
        width: small ? 28 : 50,
        height: small ? 28 : 50,
        borderRadius: 25,
        backgroundColor: '#EAE8E2',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text style={{ fontSize: small ? 12 : 20, color: C.ink, fontWeight: '700' }}>
        {name.substring(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}
export function PageHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={{ gap: 8, marginBottom: 28 }}>
      {eyebrow && (
        <Text style={{ color: C.coral, fontSize: 11, fontWeight: '800', letterSpacing: 1.8 }}>
          {eyebrow.toUpperCase()}
        </Text>
      )}
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}
export function Panel({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}
