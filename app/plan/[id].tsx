import React, { useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useStore, useAction } from '../../src/store';
import { availableSpaces, planStatus } from '../../src/domain';
import {
  Avatar,
  Button,
  C,
  Empty,
  Feedback,
  Field,
  Icon,
  PageHeading,
  Panel,
  Tag,
  categoryColors,
  categoryIcons,
  money,
  styles,
  when,
} from '../../src/components/ui';
import { Chat } from '../../src/components/chat';

export default function PlanDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, userId, repo, act } = useStore();
  const action = useAction();
  const [note, setNote] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [safety, setSafety] = useState(false);
  const [reason, setReason] = useState('');
  const [target, setTarget] = useState('');
  const [confirmBlock, setConfirmBlock] = useState(false);
  const wide = useWindowDimensions().width >= 900;
  const plan = data.plans.find((p) => p.id === id);
  if (!plan)
    return (
      <Empty
        title="This plan isn’t available"
        text="It may have been removed, or access may have changed after a block."
        action={<Button title="Explore plans" onPress={() => router.replace('/')} />}
      />
    );
  const host = data.profiles.find((p) => p.id === plan.hostId);
  const isHost = userId === plan.hostId;
  const request = data.requests.find((r) => r.planId === id && r.userId === userId);
  const member = isHost || request?.status === 'accepted';
  const status = planStatus(plan, data.requests);
  const pending = data.requests.filter((r) => r.planId === id && r.status === 'pending');
  const accepted = data.requests.filter((r) => r.planId === id && r.status === 'accepted');
  const spaces = availableSpaces(plan, data.requests);
  const reportTarget = target || (isHost ? '' : plan.hostId);
  const safetyPeople = data.profiles.filter(
    (p) =>
      p.id !== userId &&
      (p.id === plan.hostId ||
        accepted.some((r) => r.userId === p.id) ||
        (isHost && pending.some((r) => r.userId === p.id))),
  );
  return (
    <View>
      <Button
        title="Back to explore"
        kind="quiet"
        icon="arrow-back"
        onPress={() => router.replace('/')}
      />
      <View style={{ marginTop: 18, marginBottom: 24, flexDirection: 'row', gap: 8 }}>
        <Tag tone="coral">{plan.category}</Tag>
        <Tag tone={status === 'open' ? 'green' : 'default'}>{status}</Tag>
        {isHost && <Tag>Your plan</Tag>}
      </View>
      <PageHeading title={plan.title} subtitle={plan.area} />
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 24 }}>
        <View style={{ flex: wide ? 1.7 : undefined, flexShrink: 0 }}>
          <Panel>
            <View
              style={{
                backgroundColor: categoryColors[plan.category],
                minHeight: 150,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 25,
              }}
            >
              <Icon name={categoryIcons[plan.category]} size={75} />
            </View>
            <Text style={[styles.h2, { marginBottom: 12 }]}>A little about the plan</Text>
            <Text style={styles.subtitle}>{plan.description}</Text>
            {plan.details ? (
              <View style={{ marginTop: 20 }}>
                <Text style={styles.label}>Good to know</Text>
                <Text style={styles.subtitle}>{plan.details}</Text>
              </View>
            ) : null}
            <View style={{ marginTop: 24, gap: 15 }}>
              <View style={styles.row}>
                <Icon name="calendar-outline" color={C.coral} />
                <Text style={{ color: C.ink, flex: 1 }}>
                  {when(plan.startsAt, true)} · {plan.durationMinutes} minutes
                </Text>
              </View>
              <View style={styles.row}>
                <Icon name="location-outline" color={C.coral} />
                <Text style={{ color: C.ink, flex: 1 }}>
                  {member
                    ? plan.venue
                    : `Public venue in ${plan.area}. Exact meeting details unlock after acceptance.`}
                </Text>
              </View>
              <View style={styles.row}>
                <Icon name="wallet-outline" color={C.coral} />
                <Text style={{ color: C.ink }}>
                  {money(plan.cost)} {plan.cost > 0 ? 'per person' : 'to join'}
                  {plan.bookingHeld ? ' · Host holds a ticket or booking' : ''}
                </Text>
              </View>
              <View style={styles.row}>
                <Icon name="people-outline" color={C.coral} />
                <Text style={{ color: C.ink }}>
                  {accepted.length} accepted · {spaces} of {plan.capacity} guest spaces open
                </Text>
              </View>
            </View>
          </Panel>
          {isHost && (
            <Panel style={{ marginTop: 24 }}>
              <Text style={styles.h2}>Join requests</Text>
              <Text style={[styles.subtitle, { fontSize: 13, marginTop: 8, marginBottom: 20 }]}>
                A place is only confirmed when you accept. Keep it welcoming.
              </Text>
              {pending.length ? (
                pending.map((r) => {
                  const person = data.profiles.find((p) => p.id === r.userId);
                  return (
                    <View
                      key={r.id}
                      style={{
                        paddingVertical: 16,
                        borderTopWidth: 1,
                        borderTopColor: C.line,
                        gap: 12,
                      }}
                    >
                      <View style={styles.row}>
                        <Avatar name={person?.name || 'Member'} small />
                        <Text style={{ fontWeight: '700', color: C.ink }}>
                          {person?.name || 'Member'}
                        </Text>
                        <Tag>Pending</Tag>
                      </View>
                      <Text style={styles.subtitle}>
                        {r.message || 'Would love to join your plan.'}
                      </Text>
                      <View style={styles.wrap}>
                        <Button
                          title={`Accept ${person?.name || 'request'}`}
                          disabled={action.busy || status !== 'open'}
                          onPress={() =>
                            void action.run(
                              () => act((repo) => repo.resolveRequest(r.id, true)),
                              'Guest accepted. Their place is confirmed.',
                            )
                          }
                        />
                        <Button
                          title={`Decline ${person?.name || 'request'}`}
                          kind="secondary"
                          disabled={action.busy}
                          onPress={() =>
                            void action.run(
                              () => act((repo) => repo.resolveRequest(r.id, false)),
                              'Request declined.',
                            )
                          }
                        />
                      </View>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.subtitle}>
                  No pending requests. We’ll let you know when someone wants to join.
                </Text>
              )}
              {accepted.length > 0 && (
                <View style={{ gap: 12, marginTop: 20 }}>
                  <Text style={styles.label}>Confirmed guests</Text>
                  {accepted.map((r) => (
                    <Text key={r.id} style={{ color: C.ink }}>
                      ✓ {data.profiles.find((p) => p.id === r.userId)?.name || 'Member'}
                    </Text>
                  ))}
                </View>
              )}
            </Panel>
          )}
          {member && <Chat planId={id} />}
        </View>
        <View style={{ flex: wide ? 1 : undefined, flexShrink: 0, gap: 20 }}>
          <Panel>
            <Text style={[styles.label, { color: C.muted, letterSpacing: 1 }]}>YOUR HOST</Text>
            <View style={[styles.row, { marginVertical: 10 }]}>
              <Avatar name={host?.name || 'Host'} />
              <View style={{ flex: 1 }}>
                <Text style={styles.h2}>{host?.name || 'PlanB member'}</Text>
                <Text style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>
                  {host?.area || plan.area}
                </Text>
              </View>
            </View>
            <Text style={[styles.subtitle, { fontSize: 14 }]}>
              {host?.bio || 'Looking forward to some good company.'}
            </Text>
            {!!host?.interests.length && (
              <Text style={{ color: C.muted, fontSize: 12, marginTop: 14 }}>
                {host.interests.join(' · ')}
              </Text>
            )}
            {repo.mode === 'demo' && (
              <Text style={{ color: C.coral, fontSize: 11, marginTop: 16 }}>
                Fictional sample profile · No identity verification
              </Text>
            )}
          </Panel>
          <Panel>
            {isHost ? (
              <View style={{ gap: 12 }}>
                <Text style={styles.h2}>You’re hosting.</Text>
                <Text style={styles.subtitle}>Make sure everyone knows what to expect.</Text>
                {status !== 'cancelled' && status !== 'finished' && (
                  <>
                    <Button
                      title="Edit plan"
                      kind="secondary"
                      icon="create-outline"
                      onPress={() => router.push({ pathname: '/create', params: { id } })}
                    />
                    {confirmCancel ? (
                      <View style={{ gap: 8 }}>
                        <Text style={styles.subtitle}>
                          Cancel this plan? Guests will be notified, pending requests withdrawn and
                          chat made read-only.
                        </Text>
                        <Button
                          title="Yes, cancel plan"
                          kind="danger"
                          disabled={action.busy}
                          onPress={() =>
                            void action.run(
                              () => act((r) => r.cancelPlan(id)),
                              'Plan cancelled. Guests have been notified.',
                            )
                          }
                        />
                        <Button
                          title="Keep plan"
                          kind="quiet"
                          onPress={() => setConfirmCancel(false)}
                        />
                      </View>
                    ) : (
                      <Button
                        title="Cancel plan"
                        kind="quiet"
                        onPress={() => setConfirmCancel(true)}
                      />
                    )}
                  </>
                )}
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                <Text style={styles.h2}>
                  {request?.status === 'accepted'
                    ? 'You’re in.'
                    : request?.status === 'pending'
                      ? 'Request sent.'
                      : 'A space for you?'}
                </Text>
                <Text style={styles.subtitle}>
                  {request?.status === 'accepted'
                    ? 'Your place is confirmed. Say hello in the conversation.'
                    : request?.status === 'pending'
                      ? 'Your place isn’t confirmed yet. We’ll let you know when the host responds.'
                      : request?.status === 'declined'
                        ? 'The host declined this request. Another good plan is out there.'
                        : request?.status === 'withdrawn'
                          ? 'You left this plan. You can request a place again if it’s still open.'
                          : 'Send a short hello. The host will confirm whether you can join.'}
                </Text>
                {request && (request.status === 'pending' || request.status === 'accepted') ? (
                  <Button
                    title={request.status === 'pending' ? 'Withdraw request' : 'Leave plan'}
                    kind="secondary"
                    disabled={action.busy}
                    onPress={() =>
                      void action.run(() => act((r) => r.leavePlan(id)), 'You’ve left this plan.')
                    }
                  />
                ) : status === 'open' && request?.status !== 'declined' ? (
                  <>
                    <Field
                      label="A message to the host (optional)"
                      value={note}
                      onChangeText={setNote}
                      multiline
                      maxLength={500}
                      placeholder="A little hello…"
                    />
                    <Button
                      title={action.busy ? 'Sending…' : 'Request to join'}
                      disabled={action.busy}
                      icon="arrow-forward"
                      onPress={() =>
                        void action.run(
                          () => act((r) => r.requestJoin(id, note)),
                          'Request sent — wait for the host to confirm your place.',
                        )
                      }
                    />
                  </>
                ) : (
                  <Tag>
                    {status === 'full'
                      ? 'No spaces right now'
                      : status === 'cancelled'
                        ? 'Plan cancelled'
                        : status === 'finished'
                          ? 'Plan finished'
                          : 'Request declined'}
                  </Tag>
                )}
              </View>
            )}
            <Feedback text={action.feedback} error={action.failed} />
          </Panel>
          <View style={{ padding: 8, gap: 10 }}>
            <View style={styles.row}>
              <Icon name="shield-checkmark-outline" color={C.green} />
              <Text style={{ fontWeight: '700', color: C.ink, fontSize: 13 }}>
                A good time starts with feeling safe.
              </Text>
            </View>
            <Text style={{ color: C.muted, fontSize: 12, lineHeight: 19 }}>
              Meet in public. Share only what feels comfortable. Leave any plan at any time. No
              payments are handled here.
            </Text>
            <Button
              title={safety ? 'Close safety options' : 'Report or block someone'}
              kind="quiet"
              onPress={() => setSafety(!safety)}
            />
            {safety && (
              <View style={{ gap: 12 }}>
                <Text style={styles.label}>Choose a person</Text>
                <View style={styles.wrap}>
                  {safetyPeople.map((p) => (
                    <Button
                      key={p.id}
                      title={p.name}
                      kind={reportTarget === p.id ? 'primary' : 'secondary'}
                      onPress={() => {
                        setTarget(p.id);
                        setConfirmBlock(false);
                      }}
                    />
                  ))}
                </View>
                <Field
                  label="Reason for reporting"
                  value={reason}
                  onChangeText={setReason}
                  multiline
                  maxLength={2000}
                />
                <Button
                  title="Store report"
                  kind="secondary"
                  disabled={action.busy || !reportTarget || !reason.trim()}
                  onPress={() =>
                    void action.run(
                      () => act((r) => r.reportUser(reportTarget, id, reason.trim())),
                      repo.mode === 'demo'
                        ? 'Demo report saved locally. No real moderation team is monitoring it.'
                        : 'Report stored for review. PlanB needs an operational review process before public launch. For emergencies, contact local services.',
                    )
                  }
                />
                <Text style={{ fontSize: 12, color: C.muted, lineHeight: 19 }}>
                  Reports need a staffed review process before public launch. Blocking prevents new
                  requests and messages in both directions and ends shared memberships. If you are a
                  guest you leave shared plans; in your hosted plans the other person is removed.
                </Text>
                <Button
                  title={confirmBlock ? 'Confirm block' : 'Block selected person'}
                  kind="secondary"
                  disabled={action.busy || !reportTarget}
                  onPress={() => {
                    if (!confirmBlock) {
                      setConfirmBlock(true);
                      return;
                    }
                    void action.run(
                      () => act((r) => r.blockUser(reportTarget)),
                      'Person blocked. Shared memberships ended.',
                    );
                  }}
                />
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}
