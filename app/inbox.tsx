import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useStore, useAction } from '../src/store';
import {
  Button,
  C,
  Empty,
  Feedback,
  Icon,
  PageHeading,
  Panel,
  Tag,
  styles,
  when,
} from '../src/components/ui';
export default function Inbox() {
  const { data, userId, repo, act, refresh } = useStore();
  const action = useAction();
  const notices = data.notices
    .filter((n) => n.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const conversations = data.plans.filter(
    (p) =>
      p.hostId === userId ||
      data.requests.some(
        (r) => r.planId === p.id && r.userId === userId && r.status === 'accepted',
      ),
  );
  return (
    <View>
      <PageHeading
        eyebrow="A hello goes a long way"
        title="Your inbox."
        subtitle={
          repo.mode === 'demo'
            ? 'Sample conversations and local demo notifications. No real messages are sent.'
            : 'Plan conversations and updates. Refreshes every 15 seconds.'
        }
      />
      <View style={[styles.wrap, { marginBottom: 20 }]}>
        <Button
          title="Refresh inbox"
          kind="secondary"
          icon="refresh-outline"
          onPress={() => void action.run(refresh)}
        />
        <Button
          title="Mark updates read"
          kind="quiet"
          disabled={action.busy || !notices.some((n) => !n.read)}
          onPress={() => void action.run(() => act((r) => r.markNoticesRead()))}
        />
      </View>
      <Feedback text={action.feedback} error={action.failed} />
      <Panel>
        <Text style={[styles.h2, { marginBottom: 20 }]}>Plan conversations</Text>
        {conversations.length ? (
          conversations.map((p) => (
            <Pressable
              key={p.id}
              accessibilityRole="link"
              accessibilityLabel={`Chat: ${p.title}`}
              onPress={() => router.push(`/plan/${p.id}`)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                borderTopWidth: 1,
                borderTopColor: C.line,
                paddingVertical: 18,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <View style={{ padding: 12, backgroundColor: C.coralLight, borderRadius: 14 }}>
                <Icon name="chatbubbles-outline" color={C.coral} />
              </View>
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={{ color: C.ink, fontSize: 15, fontWeight: '700' }}>{p.title}</Text>
                <Text numberOfLines={1} style={{ color: C.muted, fontSize: 13 }}>
                  {data.messages.filter((m) => m.planId === p.id).at(-1)?.body ||
                    'Say hello to your group'}
                </Text>
              </View>
              <Icon name="chevron-forward" size={17} />
            </Pressable>
          ))
        ) : (
          <Empty
            title="Start with a plan"
            text="Your group conversation appears when you host a plan or your request is accepted."
          />
        )}
      </Panel>
      <View style={{ marginTop: 28 }}>
        <Text style={[styles.h2, { marginBottom: 18 }]}>Your updates</Text>
        {notices.length ? (
          notices.map((n) => (
            <Pressable
              key={n.id}
              accessibilityRole="button"
              accessibilityLabel={n.text}
              onPress={() => {
                if (n.planId) router.push(`/plan/${n.planId}`);
              }}
              style={({ pressed }) => [
                styles.card,
                { marginBottom: 12, gap: 10, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              {!n.read && <Tag tone="coral">New update</Tag>}
              <Text style={{ color: C.ink, fontSize: 14, lineHeight: 21 }}>{n.text}</Text>
              <Text style={{ color: C.muted, fontSize: 11 }}>{when(n.createdAt)}</Text>
            </Pressable>
          ))
        ) : (
          <Text style={styles.subtitle}>
            All quiet for now. You’ll hear here when a request or plan changes.
          </Text>
        )}
      </View>
    </View>
  );
}
