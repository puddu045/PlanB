import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { useStore } from '../src/store';
import { Button, Chip, Empty, PageHeading, PlanCard, styles } from '../src/components/ui';
export default function MyPlans() {
  const { data, userId } = useStore();
  const [tab, setTab] = useState<'Hosted' | 'Pending' | 'Confirmed'>('Hosted');
  const plans = data.plans
    .filter((p) =>
      tab === 'Hosted'
        ? p.hostId === userId
        : data.requests.some(
            (r) =>
              r.planId === p.id &&
              r.userId === userId &&
              r.status === (tab === 'Pending' ? 'pending' : 'accepted'),
          ),
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const history = data.requests.filter(
    (r) => r.userId === userId && ['declined', 'withdrawn'].includes(r.status),
  );
  return (
    <View>
      <PageHeading
        eyebrow="Your little calendar of possibilities"
        title="My plans."
        subtitle="The ones you’re hosting, the ones you’ve asked to join, and the ones to look forward to."
      />
      <View style={[styles.wrap, { marginBottom: 25 }]}>
        {(['Hosted', 'Pending', 'Confirmed'] as const).map((t) => (
          <Chip key={t} label={t} selected={tab === t} onPress={() => setTab(t)} />
        ))}
        <Button
          title="Create a plan"
          kind="quiet"
          icon="add-outline"
          onPress={() => router.push('/create')}
        />
      </View>
      {tab === 'Pending' && (
        <Text style={[styles.subtitle, { fontSize: 13, marginBottom: 20 }]}>
          Requests are not confirmed places. Wait for the host to accept before joining.
        </Text>
      )}
      {plans.length ? (
        <View style={{ gap: 20 }}>
          {plans.map((p) => (
            <View key={p.id} style={{ maxWidth: 640 }}>
              <PlanCard plan={p} />
            </View>
          ))}
        </View>
      ) : (
        <Empty
          title={
            tab === 'Hosted'
              ? 'Your next plan starts here'
              : tab === 'Pending'
                ? 'Nothing waiting in the wings'
                : 'Good company is out there'
          }
          text={
            tab === 'Hosted'
              ? 'Have an idea or a spare space? Open up your plan to someone new.'
              : 'Explore an activity you enjoy and send a friendly hello.'
          }
          action={
            <Button
              title={tab === 'Hosted' ? 'Save my plan' : 'Explore plans'}
              onPress={() => router.push(tab === 'Hosted' ? '/create' : '/')}
            />
          }
        />
      )}
      {history.length > 0 && (
        <View style={{ marginTop: 30 }}>
          <Text style={styles.h2}>Past requests</Text>
          {history.map((r) => (
            <View key={r.id} style={{ marginTop: 10 }}>
              <Button
                kind="quiet"
                title={`${data.plans.find((p) => p.id === r.planId)?.title || 'Unavailable plan'} · ${r.status}`}
                onPress={() => router.push(`/plan/${r.planId}`)}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
