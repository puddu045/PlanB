import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useStore, useAction } from '../store';
import { canChat } from '../domain';
import { Avatar, Button, C, Feedback, Field, styles } from './ui';

export function Chat({ planId }: { planId: string }) {
  const { data, userId, repo, act } = useStore();
  const action = useAction();
  const [body, setBody] = useState('');
  const messages = data.messages
    .filter((m) => m.planId === planId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const allowed = !!userId && canChat(data, planId, userId);
  return (
    <View style={[styles.card, { marginTop: 24 }]}>
      <Text style={styles.h2}>Plan conversation</Text>
      <Text style={[styles.subtitle, { fontSize: 12, marginTop: 7, marginBottom: 20 }]}>
        {repo.mode === 'demo'
          ? 'SAMPLE CONVERSATION · Local demo messages, not real people.'
          : 'Only the host and accepted guests can read this chat. Updates refresh every 15 seconds.'}
      </Text>
      {messages.length === 0 && (
        <Text style={[styles.subtitle, { paddingVertical: 18 }]}>
          A hello is a good place to start. Confirm the meeting details together.
        </Text>
      )}
      {messages.map((m) => {
        const sender = data.profiles.find((p) => p.id === m.userId);
        return (
          <View
            key={m.id}
            style={{
              flexDirection: 'row',
              gap: 10,
              marginBottom: 18,
              alignSelf: m.userId === userId ? 'flex-end' : 'flex-start',
              maxWidth: '95%',
            }}
          >
            <Avatar name={sender?.name || 'Member'} small />
            <View
              style={{
                backgroundColor: m.userId === userId ? C.coralLight : C.bg,
                padding: 14,
                borderRadius: 14,
                flexShrink: 1,
              }}
            >
              <Text style={{ color: C.ink, fontSize: 11, fontWeight: '700', marginBottom: 6 }}>
                {sender?.name || 'Member'} ·{' '}
                {new Date(m.createdAt).toLocaleTimeString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
              <Text style={{ color: C.ink, fontSize: 14, lineHeight: 21 }}>{m.body}</Text>
            </View>
          </View>
        );
      })}
      {allowed ? (
        <View style={{ marginTop: 10 }}>
          <Field
            label="Message to the group"
            value={body}
            onChangeText={setBody}
            placeholder="Say hello or ask about the plan…"
            multiline
            maxLength={2000}
          />
          <Feedback text={action.feedback} error={action.failed} />
          <Button
            title={action.busy ? 'Sending…' : 'Send message'}
            icon="send-outline"
            disabled={action.busy || !body.trim()}
            onPress={() =>
              void action.run(async () => {
                await act((r) => r.sendMessage(planId, body.trim()));
                setBody('');
              }, 'Message sent.')
            }
          />
        </View>
      ) : (
        <Text style={[styles.subtitle, { fontSize: 13 }]}>
          This plan is closed. The conversation is read-only for remaining members.
        </Text>
      )}
    </View>
  );
}
