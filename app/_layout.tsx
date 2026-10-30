import React from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Slot, router, usePathname } from 'expo-router';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { StoreProvider, useStore } from '../src/store';
import { Avatar, Button, C, Feedback, Icon, IconName, Loading, styles } from '../src/components/ui';

const navigation: {
  path: '/' | '/my-plans' | '/inbox' | '/profile';
  label: string;
  icon: IconName;
}[] = [
  { path: '/', label: 'Explore', icon: 'compass-outline' },
  { path: '/my-plans', label: 'My Plans', icon: 'calendar-outline' },
  { path: '/inbox', label: 'Inbox', icon: 'chatbubble-ellipses-outline' },
  { path: '/profile', label: 'Profile', icon: 'person-outline' },
];
function Shell() {
  const { width } = useWindowDimensions();
  const wide = width >= 800;
  const path = usePathname();
  const { repo, data, userId, loading, error, refresh } = useStore();
  const profile = data.profiles.find((p) => p.id === userId);
  const unread = data.notices.filter((n) => !n.read && n.userId === userId).length;
  const needsProfile = !loading && repo && (!userId || !profile?.adult);
  const links = navigation.map((n) => {
    const selected = path === n.path;
    return (
      <Pressable
        key={n.path}
        accessibilityRole="link"
        accessibilityLabel={n.label}
        accessibilityState={{ selected }}
        onPress={() => router.push(n.path)}
        style={({ pressed }) => ({
          alignItems: 'center',
          flexDirection: wide ? 'row' : 'column',
          gap: wide ? 8 : 4,
          paddingVertical: wide ? 12 : 9,
          paddingHorizontal: wide ? 17 : 9,
          borderRadius: 12,
          backgroundColor: selected && wide ? C.coralLight : 'transparent',
          opacity: pressed ? 0.65 : 1,
          flex: wide ? undefined : 1,
        })}
      >
        <Icon name={n.icon} size={wide ? 19 : 22} color={selected ? C.coral : C.muted} />
        <Text
          style={{
            fontSize: wide ? 13 : 10,
            color: selected ? C.coral : C.muted,
            fontWeight: selected ? '700' : '500',
          }}
        >
          {n.label}
          {n.path === '/inbox' && unread > 0 ? ` (${unread})` : ''}
        </Text>
      </Pressable>
    );
  });
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="dark" />
      <View style={{ borderBottomWidth: 1, borderBottomColor: C.line, backgroundColor: C.bg }}>
        <View
          style={{
            maxWidth: 1200,
            width: '100%',
            alignSelf: 'center',
            paddingHorizontal: wide ? 40 : 22,
            minHeight: wide ? 88 : 70,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="PlanB home"
            onPress={() => router.push('/')}
            style={styles.row}
          >
            <View
              style={{
                width: 34,
                height: 34,
                backgroundColor: C.coral,
                borderRadius: 11,
                justifyContent: 'center',
                alignItems: 'center',
                transform: [{ rotate: '-8deg' }],
              }}
            >
              <Icon name="arrow-redo" color="#fff" size={24} />
            </View>
            <Text style={{ fontSize: 27, fontWeight: '800', letterSpacing: -1.3, color: C.ink }}>
              Plan<Text style={{ color: C.coral }}>B</Text>
            </Text>
          </Pressable>
          {wide && <View style={styles.row}>{links}</View>}
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Your profile"
            onPress={() => router.push('/profile')}
          >
            <Avatar name={profile?.name || 'You'} small={!wide} />
          </Pressable>
        </View>
      </View>
      {repo?.mode === 'demo' && (
        <View style={{ backgroundColor: '#F1EDE4', paddingHorizontal: 20, paddingVertical: 9 }}>
          <Text style={{ textAlign: 'center', color: '#635340', fontSize: 11, lineHeight: 17 }}>
            <Text style={{ fontWeight: '800' }}>LOCAL DEMO</Text> · Fictional people & sample
            conversations · Changes saved on this device
            {wide ? ' · Switch demo person in Profile' : ''}
          </Text>
        </View>
      )}
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: wide ? 40 : 20,
          paddingTop: wide ? 38 : 26,
          paddingBottom: 44,
          maxWidth: 1200,
          width: '100%',
          alignSelf: 'center',
        }}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <Loading />
        ) : error ? (
          <View>
            <Feedback text={error} error />
            <Button title="Try again" onPress={() => void refresh()} />
          </View>
        ) : needsProfile && path !== '/profile' ? (
          <View style={[styles.card, { gap: 18 }]}>
            <Text style={styles.h2}>A little hello before your next plan.</Text>
            <Text style={styles.subtitle}>
              Sign in and complete your adult profile to join the community. PlanB is for people
              aged 18 and over.
            </Text>
            <Button title="Get started" onPress={() => router.push('/profile')} />
          </View>
        ) : (
          <Slot />
        )}
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: C.line,
            marginTop: 42,
            paddingTop: 22,
            gap: 6,
          }}
        >
          <Text style={{ color: C.ink, fontWeight: '600', fontSize: 12 }}>
            Good company. New possibilities.
          </Text>
          <Text style={{ color: C.muted, fontSize: 11, lineHeight: 17 }}>
            For adults 18+ · Meet at public venues · Friendship comes first
          </Text>
        </View>
      </ScrollView>
      {!wide && (
        <View
          style={{
            flexDirection: 'row',
            borderTopWidth: 1,
            borderTopColor: C.line,
            backgroundColor: C.paper,
          }}
        >
          {links}
        </View>
      )}
    </SafeAreaView>
  );
}
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <Shell />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
