import React, { useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useStore, useAction } from '../src/store';
import {
  Button,
  C,
  Check,
  Chip,
  Field,
  Feedback,
  PageHeading,
  categoryIcons,
  styles,
} from '../src/components/ui';
import { Category, categories, PlanInput } from '../src/types';
import { validatePlan } from '../src/domain';

function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export default function CreatePlan() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { userId } = useStore();
  return <PlanForm key={`${id || 'new'}-${userId}`} />;
}
function PlanForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data, userId, act } = useStore();
  const action = useAction();
  const editing = data.plans.find((p) => p.id === id);
  const wide = useWindowDimensions().width >= 800;
  const [date] = useState(() =>
    editing ? new Date(editing.startsAt) : new Date(Date.now() + 86400000),
  );
  const [title, setTitle] = useState(editing?.title || '');
  const [category, setCategory] = useState<Category>(editing?.category || 'Coffee');
  const [day, setDay] = useState(localDate(date));
  const [time, setTime] = useState(
    editing
      ? `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
      : '18:00',
  );
  const [duration, setDuration] = useState(String(editing?.durationMinutes || 90));
  const [venue, setVenue] = useState(editing?.venue || '');
  const [area, setArea] = useState(editing?.area || 'Newcastle upon Tyne');
  const [description, setDescription] = useState(editing?.description || '');
  const [capacity, setCapacity] = useState(String(editing?.capacity || 2));
  const [free, setFree] = useState(!editing?.cost);
  const [cost, setCost] = useState(String(editing?.cost || ''));
  const [booking, setBooking] = useState(editing?.bookingHeld || false);
  const [details, setDetails] = useState(editing?.details || '');
  if (id && (!editing || editing.hostId !== userId))
    return <Feedback error text="Only the host can edit this plan." />;
  async function save() {
    const ok = await action.run(async () => {
      const starts = new Date(`${day}T${time}:00`);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) ||
        !Number.isFinite(starts.getTime()) ||
        localDate(starts) !== day
      )
        throw new Error('Enter a real date as YYYY-MM-DD and a time as HH:MM.');
      if (!free && !cost.trim()) throw new Error('Enter the cost per person, or choose free.');
      const input: PlanInput = {
        title: title.trim(),
        category,
        startsAt: starts.toISOString(),
        durationMinutes: Number(duration),
        venue: venue.trim(),
        area: area.trim(),
        description: description.trim(),
        capacity: Number(capacity),
        cost: free ? 0 : Number(cost),
        bookingHeld: booking,
        details: details.trim(),
      };
      validatePlan(input);
      const planId = await act((r) => r.savePlan(input, id));
      router.replace(`/plan/${planId}`);
    });
    return ok;
  }
  return (
    <View style={{ maxWidth: 780, width: '100%', alignSelf: 'center' }}>
      <Button
        title="Back to plans"
        kind="quiet"
        icon="arrow-back"
        onPress={() => router.replace('/')}
      />
      <View style={{ marginTop: 18 }}>
        <PageHeading
          eyebrow="Good plans deserve good company"
          title={editing ? 'Make it your plan.' : 'Save my plan.'}
          subtitle="Open up a space. Someone’s next good day might start here."
        />
      </View>
      <View style={[styles.card, { padding: wide ? 32 : 22 }]}>
        <Text style={[styles.h2, { marginBottom: 24 }]}>The plan</Text>
        <Field
          label="Plan title"
          placeholder="e.g. A coffee and an Ouseburn wander"
          value={title}
          onChangeText={setTitle}
          maxLength={100}
        />
        <Text style={styles.label}>Activity</Text>
        <View style={[styles.wrap, { marginBottom: 24 }]}>
          {categories.map((c) => (
            <Chip
              key={c}
              label={c}
              selected={category === c}
              icon={categoryIcons[c]}
              onPress={() => setCategory(c)}
            />
          ))}
        </View>
        <View style={{ flexDirection: wide ? 'row' : 'column', gap: 16 }}>
          <View style={{ flex: 1 }}>
            <Field
              label="Date (YYYY-MM-DD)"
              value={day}
              onChangeText={setDay}
              placeholder="2026-11-01"
              hint="Use a future date."
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Start time (HH:MM)"
              value={time}
              onChangeText={setTime}
              placeholder="18:00"
              hint="Your device’s local time, 24-hour clock."
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Duration (minutes)"
              value={duration}
              onChangeText={setDuration}
              keyboardType="number-pad"
            />
          </View>
        </View>
        <Field
          label="Public meeting venue"
          placeholder="e.g. Café entrance, public venue"
          value={venue}
          onChangeText={setVenue}
          maxLength={180}
          hint="Choose a public venue. The exact meeting venue is shared with you and accepted guests."
        />
        <Field
          label="Approximate area"
          value={area}
          onChangeText={setArea}
          maxLength={100}
          hint="Shown publicly. Never use a home address."
        />
        <Field
          label="What’s the plan?"
          value={description}
          onChangeText={setDescription}
          placeholder="A little about the activity and who might enjoy it…"
          multiline
          maxLength={2000}
        />
        <View style={{ borderTopWidth: 1, borderTopColor: C.line, paddingTop: 24, marginTop: 6 }}>
          <Text style={[styles.h2, { marginBottom: 20 }]}>A few useful details</Text>
          <Field
            label="Guest spaces (excluding you)"
            value={capacity}
            onChangeText={setCapacity}
            keyboardType="number-pad"
            hint="1–20 guests. Requests need your acceptance."
          />
          <Check label="Free to join" value={free} onChange={setFree} />
          {!free && (
            <Field
              label="Cost per person (£ GBP)"
              value={cost}
              onChangeText={setCost}
              keyboardType="decimal-pad"
              placeholder="e.g. 8.50"
              hint="PlanB does not process payments or resell tickets."
            />
          )}
          <Check label="I already hold a ticket or booking" value={booking} onChange={setBooking} />
          <Field
            label="Anything else? (optional)"
            value={details}
            onChangeText={setDetails}
            multiline
            maxLength={1000}
            placeholder="e.g. Beginner-friendly badminton. Bring a racket."
          />
          <Text style={[styles.subtitle, { fontSize: 12, marginBottom: 18 }]}>
            Keep private contact details out of public descriptions. PlanB is for adults 18+ and
            friendship-led activities.
          </Text>
          <Feedback text={action.feedback} error={action.failed} />
          <Button
            title={action.busy ? 'Saving…' : editing ? 'Save changes' : 'Open my plan'}
            icon="arrow-forward"
            disabled={action.busy}
            onPress={() => void save()}
          />
        </View>
      </View>
    </View>
  );
}
