import React, { useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useStore } from '../src/store';
import {
  C,
  Button,
  Chip,
  Check,
  Empty,
  Field,
  Icon,
  IconName,
  PlanCard,
  categoryIcons,
  styles,
} from '../src/components/ui';
import { Category, categories } from '../src/types';
import { matchesPlan } from '../src/domain';

export default function Explore() {
  const { data, userId } = useStore();
  const { width } = useWindowDimensions();
  const wide = width >= 800;
  const [activity, setActivity] = useState<Category | 'All'>('All');
  const [day, setDay] = useState('');
  const [area, setArea] = useState('');
  const [budget, setBudget] = useState('');
  const [spaces, setSpaces] = useState(true);
  const [filters, setFilters] = useState(false);
  const name = data.profiles.find((p) => p.id === userId)?.name.split(' ')[0] || 'there';
  const dateValid =
    !day ||
    ['today', 'tomorrow'].includes(day) ||
    (/^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(Date.parse(day)));
  const budgetValid = !budget || (Number.isFinite(Number(budget)) && Number(budget) >= 0);
  const plans = data.plans
    .filter(
      (p) =>
        dateValid &&
        budgetValid &&
        matchesPlan(p, data.requests, {
          activity,
          date: day || undefined,
          area,
          maxCost: budget === '' ? undefined : Number(budget),
          spacesOnly: spaces,
        }),
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const actions: {
    title: string;
    text: string;
    icon: IconName;
    path?: '/create' | '/availability';
  }[] = [
    {
      title: 'Save my plan',
      text: 'A spare seat? Open it up.',
      icon: 'add-circle-outline',
      path: '/create',
    },
    { title: 'Find another plan', text: 'Something good is still on.', icon: 'compass-outline' },
    {
      title: 'I’m free',
      text: 'Make room for a little spontaneity.',
      icon: 'sunny-outline',
      path: '/availability',
    },
  ];
  return (
    <View>
      <View
        style={{
          flexDirection: wide ? 'row' : 'column',
          backgroundColor: '#F4E8DA',
          borderRadius: 26,
          padding: wide ? 38 : 26,
          marginBottom: 26,
          overflow: 'hidden',
        }}
      >
        <View style={{ flex: 1, gap: 14 }}>
          <Text style={{ color: C.coral, fontSize: 11, fontWeight: '800', letterSpacing: 2 }}>
            A CHANGE OF PLANS. A NEW POSSIBILITY.
          </Text>
          <Text
            accessibilityRole="header"
            style={{
              color: C.ink,
              fontWeight: '800',
              fontSize: wide ? 46 : 34,
              letterSpacing: -1.7,
              lineHeight: wide ? 51 : 40,
            }}
          >
            Plans changed?{'\n'}Find your next one.
          </Text>
          <Text style={{ color: '#52606A', fontSize: 15, lineHeight: 24, maxWidth: 420 }}>
            Hey {name}. Your day still has possibilities. Find a good plan — and some good company.
          </Text>
          <View style={[styles.row, { marginTop: 6 }]}>
            <View style={{ backgroundColor: '#fff9', borderRadius: 20, padding: 8 }}>
              <Icon name="location-outline" size={16} />
            </View>
            <Text style={{ fontSize: 12, fontWeight: '600', color: C.ink }}>
              {data.profiles.find((p) => p.id === userId)?.area === 'Newcastle upon Tyne'
                ? 'Newcastle upon Tyne & Gateshead'
                : data.profiles.find((p) => p.id === userId)?.area || 'Find your area'}
            </Text>
          </View>
        </View>
        {wide && (
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{ width: 240, justifyContent: 'center', alignItems: 'center' }}
          >
            <View
              style={{
                width: 187,
                height: 187,
                borderRadius: 100,
                borderWidth: 1,
                borderColor: '#CCBDA9',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  width: 130,
                  height: 130,
                  borderRadius: 65,
                  backgroundColor: '#EBC7AB',
                  left: -25,
                  top: 10,
                }}
              />
              <View
                style={{
                  width: 124,
                  height: 145,
                  borderRadius: 23,
                  backgroundColor: C.ink,
                  transform: [{ rotate: '12deg' }],
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Icon name="sunny-outline" color="#FFD6A3" size={50} />
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>
                  STILL A GOOD DAY
                </Text>
              </View>
              <View
                style={{
                  position: 'absolute',
                  backgroundColor: C.coral,
                  width: 57,
                  height: 57,
                  borderRadius: 30,
                  bottom: -4,
                  right: -7,
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: [{ rotate: '-12deg' }],
                }}
              >
                <Icon name="arrow-up" size={32} color="#fff" />
              </View>
            </View>
          </View>
        )}
      </View>
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 14, marginBottom: 36 }}>
        {actions.map((a, i) => (
          <Pressable
            key={a.title}
            accessibilityRole="link"
            accessibilityLabel={a.title}
            onPress={() => (a.path ? router.push(a.path) : setFilters(true))}
            style={({ pressed }) => [
              styles.card,
              {
                flex: 1,
                padding: 21,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                backgroundColor: i === 0 ? C.ink : C.paper,
                borderColor: i === 0 ? C.ink : C.line,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <View
              style={{
                backgroundColor: i === 0 ? '#FFFFFF15' : C.coralLight,
                borderRadius: 12,
                padding: 10,
              }}
            >
              <Icon name={a.icon} color={i === 0 ? '#FFD3C4' : C.coral} size={25} />
            </View>
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={{ fontSize: 16, color: i === 0 ? '#fff' : C.ink, fontWeight: '700' }}>
                {a.title}
              </Text>
              <Text style={{ fontSize: 11, color: i === 0 ? '#CDD4DA' : C.muted }}>{a.text}</Text>
            </View>
            <Icon name="arrow-forward" color={i === 0 ? '#fff' : C.muted} size={18} />
          </Pressable>
        ))}
      </View>
      <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 8 }]}>
        <Text accessibilityRole="header" style={styles.h2}>
          Your next good plan
        </Text>
        <Button
          title={filters ? 'Hide filters' : 'Filters'}
          kind="secondary"
          icon="options-outline"
          onPress={() => setFilters(!filters)}
        />
      </View>
      <Text style={[styles.subtitle, { fontSize: 13, marginBottom: 20 }]}>
        Open plans, welcoming people. Pick what feels like you.
      </Text>
      <View style={[styles.wrap, { marginBottom: 22 }]}>
        <Chip label="All plans" selected={activity === 'All'} onPress={() => setActivity('All')} />
        {categories.map((c) => (
          <Chip
            key={c}
            label={c}
            icon={categoryIcons[c]}
            selected={activity === c}
            onPress={() => setActivity(c)}
          />
        ))}
      </View>
      {filters && (
        <View style={[styles.card, { marginBottom: 24, gap: 12 }]}>
          <View style={styles.wrap}>
            <Chip label="Any date" selected={!day} onPress={() => setDay('')} />
            <Chip label="Today" selected={day === 'today'} onPress={() => setDay('today')} />
            <Chip
              label="Tomorrow"
              selected={day === 'tomorrow'}
              onPress={() => setDay('tomorrow')}
            />
          </View>
          <View style={{ flexDirection: wide ? 'row' : 'column', gap: 16 }}>
            <View style={{ flex: 1 }}>
              <Field
                label="Selected date (YYYY-MM-DD)"
                placeholder="YYYY-MM-DD"
                value={['today', 'tomorrow'].includes(day) ? '' : day}
                onChangeText={setDay}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="Approximate area"
                placeholder="e.g. Ouseburn"
                value={area}
                onChangeText={setArea}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="Maximum cost (£ per person)"
                keyboardType="decimal-pad"
                placeholder="Any budget"
                value={budget}
                onChangeText={setBudget}
              />
            </View>
          </View>
          <View style={styles.wrap}>
            <Chip
              label="Free plans"
              selected={budget === '0'}
              onPress={() => setBudget(budget === '0' ? '' : '0')}
            />
            <Check label="Only plans with spaces" value={spaces} onChange={setSpaces} />
            <Button
              title="Reset filters"
              kind="quiet"
              onPress={() => {
                setDay('');
                setArea('');
                setBudget('');
                setActivity('All');
                setSpaces(true);
              }}
            />
          </View>
          {(!dateValid || !budgetValid) && (
            <Text accessibilityLiveRegion="polite" style={{ color: C.coral }}>
              Enter a valid date and a non-negative budget.
            </Text>
          )}
        </View>
      )}
      <Text style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
        {plans.length} {plans.length === 1 ? 'plan' : 'plans'} to look forward to · Approximate
        areas, no location tracking
      </Text>
      {plans.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20 }}>
          {plans.map((p) => (
            <View
              key={p.id}
              style={{
                width: wide ? '31.9%' : width >= 600 ? '48%' : '100%',
                flexGrow: 1,
                maxWidth: wide ? '33.33%' : undefined,
              }}
            >
              <PlanCard plan={p} />
            </View>
          ))}
        </View>
      ) : (
        <Empty
          title="A little room for a new plan"
          text="Try a different date or budget, or open up a plan of your own."
          action={<Button title="Create a plan" onPress={() => router.push('/create')} />}
        />
      )}
    </View>
  );
}
