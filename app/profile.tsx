import React, { useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import {
  Avatar,
  Button,
  C,
  Check,
  Chip,
  Feedback,
  Field,
  Icon,
  Interests,
  PageHeading,
  Panel,
  Tag,
  styles,
} from '../src/components/ui';
import { useAction, useStore } from '../src/store';
import { Category } from '../src/types';

const demoPeople = [
  { id: 'demo-alex', name: 'Alex', role: 'Explore & join' },
  { id: 'demo-maya', name: 'Maya', role: 'Host a plan' },
  { id: 'demo-jamie', name: 'Jamie', role: 'Another perspective' },
];

export default function ProfileScreen() {
  const { userId } = useStore();
  return <ProfileForm key={userId || 'guest'} />;
}

function ProfileForm() {
  const { repo, data, userId, act } = useStore();
  const profile = data.profiles.find((p) => p.id === userId);
  const { width } = useWindowDimensions();
  const wide = width >= 850;
  const action = useAction();
  const authAction = useAction();
  const [name, setName] = useState(profile?.name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [area, setArea] = useState(profile?.area || 'Newcastle upon Tyne');
  const [interests, setInterests] = useState<Category[]>(profile?.interests || []);
  const [adult, setAdult] = useState(profile?.adult || false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  const saveProfile = () =>
    action.run(
      async () => {
        if (name.trim().length < 2 || name.trim().length > 60)
          throw new Error('Use a name between 2 and 60 characters.');
        if (!adult)
          throw new Error('PlanB is for adults aged 18 and over. Please confirm your eligibility.');
        if (!area.trim() || area.trim().length > 100)
          throw new Error('Add an approximate area, using 100 characters or fewer.');
        if (bio.trim().length > 500) throw new Error('Keep your bio to 500 characters or fewer.');
        if (!interests.length) throw new Error('Choose at least one activity you enjoy.');
        await act((r) =>
          r.saveProfile({
            name: name.trim(),
            bio: bio.trim(),
            area: area.trim(),
            interests,
            adult,
          }),
        );
      },
      repo?.mode === 'demo'
        ? 'Sample profile saved on this device.'
        : 'Your profile is saved. You’re ready to make a plan.',
    );

  const submitAuth = () =>
    authAction.run(
      async () => {
        const cleanEmail = email.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail))
          throw new Error('Enter a valid email address.');
        if (password.length < 8) throw new Error('Use a password with at least 8 characters.');
        const id = await act((r) =>
          authMode === 'signin' ? r.signIn(cleanEmail, password) : r.signUp(cleanEmail, password),
        );
        setPassword('');
        if (!id && authMode === 'signup') return;
        if (!id) throw new Error('Sign-in did not create a session. Try again.');
      },
      authMode === 'signup'
        ? 'Account requested. If email confirmation is enabled, check your inbox and confirm your address, then sign in here.'
        : 'You’re signed in.',
    );

  if (!repo)
    return <Feedback text="Set your app mode and restart Expo to load your profile." error />;

  if (repo.mode === 'supabase' && !userId)
    return (
      <View style={{ maxWidth: 540, width: '100%', alignSelf: 'center' }}>
        <PageHeading
          eyebrow="Good company starts here"
          title={authMode === 'signin' ? 'Welcome to PlanB.' : 'Make room for a new plan.'}
          subtitle="Meet people through things you already love. Friendship and shared activities, for adults 18+."
        />
        <Panel>
          <View style={[styles.wrap, { marginBottom: 24 }]}>
            <Chip
              label="Sign in"
              selected={authMode === 'signin'}
              onPress={() => {
                setAuthMode('signin');
                authAction.clear();
              }}
            />
            <Chip
              label="Create account"
              selected={authMode === 'signup'}
              onPress={() => {
                setAuthMode('signup');
                authAction.clear();
              }}
            />
          </View>
          <Field
            label="Email address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            placeholder="you@example.com"
            hint="Your email stays private and is never shown on your profile."
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
            textContentType={authMode === 'signup' ? 'newPassword' : 'password'}
            placeholder="At least 8 characters"
            onSubmitEditing={() => {
              void submitAuth();
            }}
          />
          <Feedback text={authAction.feedback} error={authAction.failed} />
          <Button
            title={
              authAction.busy
                ? 'Please wait…'
                : authMode === 'signin'
                  ? 'Sign in'
                  : 'Create account'
            }
            disabled={authAction.busy}
            onPress={() => {
              void submitAuth();
            }}
            icon="arrow-forward"
          />
          <Text style={[styles.subtitle, { fontSize: 12, marginTop: 18 }]}>
            After signing in, complete your profile and confirm you’re aged 18 or over before
            joining or hosting.
          </Text>
        </Panel>
      </View>
    );

  const blocked = data.blocks.filter((b) => b.blockerId === userId);
  return (
    <View>
      <PageHeading
        eyebrow="Your little corner"
        title="More you. Better plans."
        subtitle="A few things about you make it easier to find your kind of company."
      />
      {repo.mode === 'demo' && (
        <Panel style={{ backgroundColor: C.blue, marginBottom: 24, borderColor: '#D4DFEB' }}>
          <View style={[styles.row, { alignItems: 'flex-start', marginBottom: 14 }]}>
            <Icon name="flask-outline" color={C.ink} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { marginBottom: 5 }]}>Local demo · fictional people</Text>
              <Text style={[styles.subtitle, { fontSize: 13 }]}>
                Switch roles to try requesting a place, accepting it as the host, and chatting. This
                is a local simulation, with no real sign-in, identity checks or messages to other
                people.
              </Text>
            </View>
          </View>
          <View style={styles.wrap}>
            {demoPeople.map((person) => (
              <Chip
                key={person.id}
                label={`${person.name} · ${person.role}`}
                selected={userId === person.id}
                onPress={() => {
                  void action.run(async () => {
                    await act(async (r) => {
                      if (!r.switchDemoUser) throw new Error('Demo switching is unavailable.');
                      await r.switchDemoUser(person.id);
                    });
                  }, `Now viewing the local demo as ${person.name}.`);
                }}
              />
            ))}
          </View>
        </Panel>
      )}
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 24, alignItems: 'flex-start' }}>
        <Panel style={{ flex: wide ? 1 : undefined, width: '100%' }}>
          <View style={[styles.row, { marginBottom: 24 }]}>
            <Avatar name={name || 'You'} />
            <View style={{ flex: 1 }}>
              <Text style={styles.h2}>{profile ? 'Your profile' : 'Let’s start with you'}</Text>
              <Text style={[styles.subtitle, { fontSize: 13 }]}>
                {repo.mode === 'demo'
                  ? 'Sample profile · saved on this device'
                  : 'A friendly introduction, at your pace'}
              </Text>
            </View>
          </View>
          <Field
            label="Name"
            value={name}
            onChangeText={setName}
            maxLength={60}
            autoComplete="given-name"
            placeholder="What should people call you?"
          />
          <Field
            label="A little about you"
            value={bio}
            onChangeText={setBio}
            multiline
            maxLength={500}
            placeholder="A coffee enthusiast, a weekend walker…"
            hint={`${bio.length}/500 characters. Please leave contact details and private addresses out.`}
          />
          <Field
            label="Approximate area"
            value={area}
            onChangeText={setArea}
            maxLength={100}
            placeholder="For example, Newcastle upon Tyne"
            hint="A town or neighbourhood is plenty. We don’t show a live location or exact home address."
          />
          <Text style={styles.label}>Things you enjoy</Text>
          <Interests value={interests} onChange={setInterests} />
          <View style={{ marginTop: 18 }}>
            <Check label="I confirm I am aged 18 or over." value={adult} onChange={setAdult} />
          </View>
          <Text style={[styles.subtitle, { fontSize: 12 }]}>
            This is a self-declaration, not verified identity or age verification.
          </Text>
          <Feedback text={action.feedback} error={action.failed} />
          <View style={{ marginTop: 20 }}>
            <Button
              title={action.busy ? 'Saving…' : 'Save profile'}
              disabled={action.busy}
              onPress={() => {
                void saveProfile();
              }}
              icon="checkmark"
            />
          </View>
          {repo.mode === 'supabase' && (
            <View style={{ marginTop: 16 }}>
              <Button
                title="Sign out"
                kind="quiet"
                icon="log-out-outline"
                disabled={action.busy}
                onPress={() => {
                  void action.run(() => act((r) => r.signOut()), 'Signed out.');
                }}
              />
            </View>
          )}
        </Panel>
        <View style={{ width: wide ? 300 : '100%', gap: 20 }}>
          <Panel style={{ backgroundColor: C.pale }}>
            <Icon name="heart-outline" color={C.green} size={28} />
            <Text style={[styles.h2, { marginTop: 12, fontSize: 20 }]}>
              Good plans. Good boundaries.
            </Text>
            <Text style={[styles.subtitle, { marginTop: 10, fontSize: 13 }]}>
              PlanB is for friendship and activities. Choose public meeting places, share only what
              feels comfortable, and respect a “no”. You can leave a plan at any time.
            </Text>
          </Panel>
          <Panel>
            <View style={[styles.row, { marginBottom: 12 }]}>
              <Icon name="shield-checkmark-outline" />
              <Text style={styles.label}>Privacy & safety</Text>
            </View>
            <Text style={[styles.subtitle, { fontSize: 13 }]}>
              Only accepted participants and hosts can see meeting details and plan chat. Your email
              address stays private.
            </Text>
            <Text style={[styles.subtitle, { fontSize: 13, marginTop: 12 }]}>
              Reporting and blocking are available on plan details. Reports are stored for review;
              an operational moderation process is required before public launch. In demo mode they
              stay on this device and are not sent to anyone.
            </Text>
          </Panel>
          <Panel>
            <View style={[styles.row, { marginBottom: 12 }]}>
              <Icon name="hand-left-outline" />
              <Text style={[styles.label, { marginBottom: 0 }]}>Blocked people</Text>
              <Tag>{blocked.length}</Tag>
            </View>
            {blocked.length ? (
              blocked.map((block) => (
                <View
                  key={block.blockedId}
                  style={{ paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.line }}
                >
                  <Text style={{ color: C.ink, fontSize: 14, fontWeight: '600' }}>
                    {data.profiles.find((p) => p.id === block.blockedId)?.name || 'PlanB member'}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={[styles.subtitle, { fontSize: 13 }]}>You haven’t blocked anyone.</Text>
            )}
            <Text style={[styles.subtitle, { fontSize: 12, marginTop: 12 }]}>
              Blocking prevents new requests or messages between you. Membership is removed from
              shared plans so you no longer share a chat. Historical messages are retained.
              Unblocking is not available in this first version.
            </Text>
          </Panel>
        </View>
      </View>
    </View>
  );
}
