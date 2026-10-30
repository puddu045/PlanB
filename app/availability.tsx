import React, { useEffect, useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { activeAvailability, matchesPlan } from '../src/domain';
import { useAction, useStore } from '../src/store';
import { Availability, Category } from '../src/types';
import {
  Button,
  C,
  Empty,
  Feedback,
  Field,
  Icon,
  Interests,
  PageHeading,
  Panel,
  PlanCard,
  Tag,
  styles,
  when,
} from '../src/components/ui';

function localParts(iso: string) {
  const date = new Date(iso);
  return {
    date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
    time: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
  };
}
function parseLocal(date: string, time: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time))
    throw new Error('Use YYYY-MM-DD for dates and HH:MM for times.');
  const parsed = new Date(`${date}T${time}:00`);
  if (
    !Number.isFinite(parsed.getTime()) ||
    localParts(parsed.toISOString()).date !== date ||
    localParts(parsed.toISOString()).time !== time
  )
    throw new Error('Enter a valid local date and time.');
  return parsed.toISOString();
}

export default function AvailabilityScreen() {
  const { userId } = useStore();
  return <AvailabilityForm key={userId || 'guest'} />;
}

function AvailabilityForm() {
  const { data, userId, act, repo } = useStore();
  const { busy, feedback, failed, run } = useAction();
  const { width } = useWindowDimensions();
  const [now, setNow] = useState(() => Date.now());
  const stored = data.availability.find((a) => a.userId === userId);
  const profile = data.profiles.find((p) => p.id === userId);
  const startDefault = localParts(stored?.startsAt || new Date(now + 15 * 60_000).toISOString());
  const endDefault = localParts(stored?.endsAt || new Date(now + 4 * 60 * 60_000).toISOString());
  const [startDate, setStartDate] = useState(startDefault.date);
  const [startTime, setStartTime] = useState(startDefault.time);
  const [endDate, setEndDate] = useState(endDefault.date);
  const [endTime, setEndTime] = useState(endDefault.time);
  const [area, setArea] = useState(stored?.area || profile?.area || 'Newcastle upon Tyne');
  const [interests, setInterests] = useState<Category[]>(
    stored?.interests || (profile?.interests.length ? profile.interests : ['Coffee', 'Walks']),
  );
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(interval);
  }, []);
  const active = stored && activeAvailability(stored, now);
  const matches = active
    ? data.plans
        .filter(
          (plan) =>
            plan.hostId !== userId &&
            matchesPlan(plan, data.requests, { availability: stored, spacesOnly: true }, now),
        )
        .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
    : [];
  async function save() {
    await run(async () => {
      if (!userId)
        throw new Error('Sign in and complete your adult profile before setting availability.');
      const startsAt = parseLocal(startDate.trim(), startTime.trim());
      const endsAt = parseLocal(endDate.trim(), endTime.trim());
      if (Date.parse(endsAt) <= Date.now()) throw new Error('Choose an end time in the future.');
      if (Date.parse(startsAt) >= Date.parse(endsAt))
        throw new Error('Your end time must be after your start time.');
      if (Date.parse(endsAt) - Date.parse(startsAt) > 7 * 24 * 60 * 60_000)
        throw new Error('Choose an availability window of seven days or less.');
      if (area.trim().length < 2 || area.trim().length > 100)
        throw new Error('Add an approximate area between 2 and 100 characters.');
      if (!interests.length) throw new Error('Choose at least one activity you would enjoy.');
      const input: Omit<Availability, 'userId'> = {
        startsAt,
        endsAt,
        area: area.trim(),
        interests,
      };
      await act((r) => r.saveAvailability(input));
      setNow(Date.now());
    }, 'Availability saved. Your matching plans are below.');
  }
  return (
    <View style={{ gap: 24 }}>
      <PageHeading
        eyebrow="A little room for spontaneity"
        title="I’m free"
        subtitle="Tell us when you have time. Find an open plan that fits your day."
      />
      <View
        style={{ flexDirection: width > 900 ? 'row' : 'column', gap: 24, alignItems: 'flex-start' }}
      >
        <Panel
          style={{ flex: width > 900 ? 1.5 : undefined, width: width > 900 ? undefined : '100%' }}
        >
          <View style={[styles.row, { marginBottom: 22 }]}>
            <View style={{ borderRadius: 14, backgroundColor: C.coralLight, padding: 12 }}>
              <Icon name="sunny-outline" color={C.coral} size={26} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.h2}>Make space for a good plan</Text>
              <Text style={styles.subtitle}>All times use your device’s local time zone.</Text>
            </View>
          </View>
          <Text style={styles.label}>Available from</Text>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Field
                label="Start date"
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
                maxLength={10}
                autoCapitalize="none"
                hint="YYYY-MM-DD"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="Start time"
                value={startTime}
                onChangeText={setStartTime}
                placeholder="HH:MM"
                maxLength={5}
                keyboardType="numbers-and-punctuation"
                hint="24-hour time"
              />
            </View>
          </View>
          <Text style={styles.label}>Until</Text>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Field
                label="End date"
                value={endDate}
                onChangeText={setEndDate}
                placeholder="YYYY-MM-DD"
                maxLength={10}
                autoCapitalize="none"
                hint="YYYY-MM-DD"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="End time"
                value={endTime}
                onChangeText={setEndTime}
                placeholder="HH:MM"
                maxLength={5}
                keyboardType="numbers-and-punctuation"
                hint="24-hour time"
              />
            </View>
          </View>
          <Field
            label="Approximate area"
            value={area}
            onChangeText={setArea}
            maxLength={100}
            placeholder="Newcastle upon Tyne"
            hint="Use a town or neighbourhood. We do not need your home address or live location."
          />
          <Text style={styles.label}>What are you in the mood for?</Text>
          <Interests value={interests} onChange={setInterests} />
          <Feedback text={feedback} error={failed} />
          <View style={{ marginTop: 24 }}>
            <Button
              title={busy ? 'Saving availability…' : 'Find matching plans'}
              icon="search-outline"
              onPress={() => {
                void save();
              }}
              disabled={busy || !userId}
            />
          </View>
          {!userId && (
            <View style={{ marginTop: 14 }}>
              <Button
                title="Go to profile to sign in"
                kind="secondary"
                onPress={() => router.push('/profile')}
              />
            </View>
          )}
        </Panel>
        <Panel
          style={{
            flex: width > 900 ? 1 : undefined,
            width: width > 900 ? undefined : '100%',
            backgroundColor: C.pale,
            gap: 16,
          }}
        >
          <Icon name="leaf-outline" color={C.green} size={28} />
          <Text style={styles.h2}>Free time, your way.</Text>
          <Text style={styles.subtitle}>
            Your availability is private. Matching uses your approximate area, time window and
            interests. We never broadcast your location.
          </Text>
          <Text style={styles.subtitle}>
            Your window expires automatically. You will still need to request a place and wait for
            the host to accept.
          </Text>
          {repo?.mode === 'demo' && <Tag tone="green">Local demo matching</Tag>}
          {stored && (
            <View style={{ borderTopWidth: 1, borderColor: '#CDDFD3', paddingTop: 16, gap: 10 }}>
              <Tag tone={active ? 'green' : 'default'}>
                {active ? 'Availability saved' : 'Availability expired'}
              </Tag>
              <Text style={{ color: C.ink, fontWeight: '600', lineHeight: 22 }}>
                {when(stored.startsAt)} → {when(stored.endsAt)}
              </Text>
              <Text style={styles.subtitle}>
                {stored.area} · {stored.interests.join(', ')}
              </Text>
              {!active && (
                <Text style={styles.subtitle}>Update your window to find fresh plans.</Text>
              )}
            </View>
          )}
        </Panel>
      </View>
      <View style={{ gap: 18 }}>
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <Text style={styles.h2}>Plans for your free time</Text>
          {active && (
            <Tag>
              {matches.length} {matches.length === 1 ? 'match' : 'matches'}
            </Tag>
          )}
        </View>
        {!active ? (
          <Empty
            title="A new plan starts with a little time"
            text="Save a current availability window to see plans that overlap with your time and match your interests and area."
          />
        ) : !matches.length ? (
          <Empty
            title="Nothing quite fits yet"
            text="Try a wider time window, another activity or a broader area. You can also open a plan of your own."
            action={
              <Button
                title="Save my plan"
                kind="secondary"
                onPress={() => router.push('/create')}
              />
            }
          />
        ) : (
          <View style={styles.wrap}>
            {matches.map((plan) => (
              <View
                key={plan.id}
                style={{ width: width > 1000 ? '31.8%' : width > 650 ? '48.7%' : '100%' }}
              >
                <PlanCard plan={plan} />
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
