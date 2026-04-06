import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Platform,
  Modal,
  FlatList,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getToken } from '@/lib/storage';
import { safeBack } from '@/lib/safe-back';
import { colors, spacing } from '@/lib/theme';
import { settingsApi, cityToCityApi } from '@/lib/api';
import {
  IconArrowBack,
  IconSearch,
  IconCalendar,
  IconLocation,
  IconChevronDown,
  IconMinus,
  IconPlus,
  IconCar,
  IconPerson,
  IconWarning,
  IconBriefcase,
  IconCheck,
  IconPhone,
} from '@/components/DashboardIcons';

type UserType = 'has-car' | 'needs-car' | null;
type City = { id: string; name: string };

function toApiDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function formatDisplayDate(isoDate: string): string {
  if (!isoDate) return '';
  const d = new Date(isoDate + 'T12:00:00');
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function Stepper({
  value,
  onIncrement,
  onDecrement,
  min,
  max,
}: {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  min: number;
  max: number;
}) {
  return (
    <View style={styles.stepperRow}>
      <TouchableOpacity
        style={[styles.stepperBtn, value <= min && styles.stepperBtnDisabled]}
        onPress={onDecrement}
        disabled={value <= min}
      >
        <IconMinus color="#fff" size={22} />
      </TouchableOpacity>
      <Text style={styles.stepperValue}>{value}</Text>
      <TouchableOpacity
        style={[styles.stepperBtn, value >= max && styles.stepperBtnDisabled]}
        onPress={onIncrement}
        disabled={value >= max}
      >
        <IconPlus color="#fff" size={22} />
      </TouchableOpacity>
    </View>
  );
}

export default function CityToCityScreen() {
  const [userType, setUserType] = useState<UserType>(null);
  const [travelDate, setTravelDate] = useState('');
  const [fromCityId, setFromCityId] = useState('');
  const [toCityId, setToCityId] = useState('');
  const [cities, setCities] = useState<City[]>([]);
  const [loadingCities, setLoadingCities] = useState(true);
  const [numberOfSeats, setNumberOfSeats] = useState(1);
  const [maxBags, setMaxBags] = useState(0);
  const [pricePerPassenger, setPricePerPassenger] = useState('');
  const [neededSeats, setNeededSeats] = useState(1);
  const [userBags, setUserBags] = useState(0);
  const [willingToPay, setWillingToPay] = useState('');
  const [note, setNote] = useState('');
  const [activeRequest, setActiveRequest] = useState<Record<string, unknown> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [loadingVerification, setLoadingVerification] = useState(true);
  const [cityPickerFor, setCityPickerFor] = useState<'from' | 'to' | null>(null);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matches, setMatches] = useState<unknown[]>([]);
  const [matchedDrivers, setMatchedDrivers] = useState<unknown[]>([]);
  const [matchedPassengers, setMatchedPassengers] = useState<unknown[]>([]);
  const [matchingId, setMatchingId] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const today = new Date();
  const minDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const onDatePickerChange = (event: { type: string }, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'dismissed') {
      if (Platform.OS === 'ios') setShowDatePicker(false);
      return;
    }
    if (date) setTravelDate(toApiDate(date));
  };

  const loadCities = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    try {
      const res = await settingsApi.cities(token);
      setCities(res.cities || []);
    } catch (_) {}
    setLoadingCities(false);
  }, []);

  const checkActive = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setActiveRequest(null);
      setMatchedDrivers([]);
      setMatchedPassengers([]);
      return;
    }
    try {
      const res = await cityToCityApi.active(token);
      if (res.expired) {
        setActiveRequest(null);
        setMatches([]);
        setMatchedDrivers([]);
        setMatchedPassengers([]);
        setShowMatchModal(false);
        return;
      }
      const req = res.activeRequest || null;
      setActiveRequest(req);
      if (req && (req as Record<string, unknown>).userType === 'has-car') {
        const passengers = (req as Record<string, unknown>).matchedPassengers as unknown[] | undefined;
        setMatchedPassengers(Array.isArray(passengers) ? passengers : []);
      } else {
        setMatchedPassengers([]);
      }
    } catch (_) {
      setActiveRequest(null);
      setMatchedDrivers([]);
      setMatchedPassengers([]);
    }
  }, []);

  const checkMatchedDrivers = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    try {
      const res = await cityToCityApi.matched(token);
      const list = Array.isArray(res.matches) ? res.matches : [];
      setMatchedDrivers(list);
      if (list.length > 0) setShowMatchModal(true);
    } catch (_) {
      setMatchedDrivers([]);
    }
  }, []);

  const fetchSearch = useCallback(async () => {
    const token = await getToken();
    if (!token || !activeRequest || (activeRequest as Record<string, unknown>).userType !== 'has-car') return;
    try {
      const res = await cityToCityApi.search(token);
      if (res.expired) {
        setActiveRequest(null);
        setMatches([]);
        setMatchedPassengers([]);
        setShowMatchModal(false);
        Alert.alert('Expired', 'Your request has expired.');
        return;
      }
      setMatches(res.matches || []);
      await checkActive();
    } catch (_) {}
  }, [activeRequest, checkActive]);

  const checkVerification = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setLoadingVerification(false);
      return;
    }
    try {
      const data = await settingsApi.userMe(token) as { user?: { isVerified?: boolean } };
      setIsVerified(!!data?.user?.isVerified);
    } catch (_) {}
    setLoadingVerification(false);
  }, []);

  useEffect(() => {
    loadCities();
    checkActive();
    checkVerification();
  }, [loadCities, checkActive, checkVerification]);

  // Polling: needs-car poll matched every 10s; has-car poll search every 10s
  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (!activeRequest) return;
    const ut = (activeRequest as Record<string, unknown>).userType as string | undefined;
    if (ut === 'needs-car') {
      checkMatchedDrivers();
      pollRef.current = setInterval(checkMatchedDrivers, 10000);
    } else if (ut === 'has-car') {
      fetchSearch();
      pollRef.current = setInterval(fetchSearch, 10000);
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [activeRequest, checkMatchedDrivers, fetchSearch]);

  // When screen gains focus (e.g. user tapped "Ride Share Match!" notification), refetch active and matched so modal can show
  useFocusEffect(
    useCallback(() => {
      (async () => {
        await checkActive();
        await checkMatchedDrivers();
      })();
      return () => {};
    }, [checkActive, checkMatchedDrivers])
  );
  useEffect(() => {
    if (!activeRequest) return;
    if ((activeRequest as Record<string, unknown>).userType === 'needs-car' && matchedDrivers.length > 0) {
      setShowMatchModal(true);
    }
  }, [activeRequest, matchedDrivers.length]);

  const handleMatch = useCallback(async (matchRequestId: string) => {
    const token = await getToken();
    if (!token) return;
    if (!activeRequest || (activeRequest as Record<string, unknown>).userType !== 'has-car') {
      Alert.alert('Error', 'Only drivers can accept matches.');
      return;
    }
    setMatchingId(matchRequestId);
    try {
      await cityToCityApi.match(token, { matchRequestId });
      await checkActive();
      const res = await cityToCityApi.search(token);
      setMatches(res.matches || []);
      Alert.alert('Matched', 'Passenger accepted. They will be notified.');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to accept match');
    } finally {
      setMatchingId(null);
    }
  }, [activeRequest, checkActive]);

  const handleCall = useCallback((phone: string) => {
    Linking.openURL(`tel:${phone.replace(/\D/g, '')}`).catch(() => Alert.alert('Error', 'Could not open phone'));
  }, []);

  const fromCity = cities.find((c) => c.id === fromCityId);
  const toCity = cities.find((c) => c.id === toCityId);
  const activeFromName = activeRequest?.fromCity
    ? (activeRequest.fromCity as { name?: string }).name
    : cities.find((c) => c.id === activeRequest?.fromCityId as string)?.name ?? 'N/A';
  const activeToName = activeRequest?.toCity
    ? (activeRequest.toCity as { name?: string }).name
    : cities.find((c) => c.id === activeRequest?.toCityId as string)?.name ?? 'N/A';

  const handleSendRequest = async () => {
    if (!userType || !travelDate.trim() || !fromCityId || !toCityId) {
      Alert.alert('Error', 'Select travel date and both cities.');
      return;
    }
    if (fromCityId === toCityId) {
      Alert.alert('Error', 'From and to cities must be different.');
      return;
    }
    if (userType === 'has-car') {
      const price = parseFloat(pricePerPassenger);
      if (!pricePerPassenger.trim() || isNaN(price) || price <= 0) {
        Alert.alert('Error', 'Enter price per passenger.');
        return;
      }
    } else {
      const pay = parseFloat(willingToPay);
      if (!willingToPay.trim() || isNaN(pay) || pay <= 0) {
        Alert.alert('Error', 'Enter how much you are willing to pay.');
        return;
      }
    }
    if (!isVerified) {
      Alert.alert('Verification required', 'Please verify your identity in Settings to use City to City.');
      return;
    }

    const token = await getToken();
    if (!token) {
      router.replace('/(auth)/login');
      return;
    }

    setIsSubmitting(true);
    try {
      // Match Next.js payload exactly for same backend
      const body: Record<string, unknown> = {
        userType,
        travelDate: travelDate.trim(),
        fromCityId,
        toCityId,
        note: note.trim() || undefined,
      };
      if (userType === 'has-car') {
        body.numberOfSeats = numberOfSeats;
        body.maxBags = maxBags;
        body.pricePerPassenger = parseFloat(pricePerPassenger);
      } else {
        body.neededSeats = neededSeats;
        body.userBags = userBags;
        body.willingToPay = parseFloat(willingToPay);
      }
      await cityToCityApi.create(token, body);
      await checkActive();
      Alert.alert('Success', 'Request created! Searching for matches...');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to create request';
      Alert.alert('Error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!activeRequest?.id) return;
    const token = await getToken();
    if (!token) return;
    try {
      await cityToCityApi.cancel(token, activeRequest.id as string);
      setActiveRequest(null);
      setShowMatchModal(false);
      Alert.alert('Done', 'Request cancelled.');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to cancel');
    }
  };

  const openMatchModal = async () => {
    const token = await getToken();
    if (!token) return;
    try {
      if ((activeRequest as Record<string, unknown>)?.userType === 'needs-car') {
        const res = await cityToCityApi.matched(token);
        setMatchedDrivers(res.matches || []);
      } else {
        const res = await cityToCityApi.search(token);
        if (res.expired) {
          setActiveRequest(null);
          Alert.alert('Expired', 'Your request has expired.');
          return;
        }
        setMatches(res.matches || []);
      }
      setShowMatchModal(true);
    } catch (_) {
      setShowMatchModal(true);
    }
  };

  const canSend = userType && travelDate.trim() && fromCityId && toCityId &&
    (userType === 'has-car' ? pricePerPassenger.trim() && parseFloat(pricePerPassenger) > 0 : willingToPay.trim() && parseFloat(willingToPay) > 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => safeBack('/dashboard')}>
          <IconArrowBack color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>City to City / Ride Share</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Verification warning */}
        {!loadingVerification && isVerified === false && (
          <View style={styles.verificationCard}>
            <IconWarning size={24} color="#f87171" />
            <View style={styles.verificationText}>
              <Text style={styles.verificationTitle}>Identity Verification Required</Text>
              <Text style={styles.verificationSub}>Verify your identity in Settings to use City to City.</Text>
              <TouchableOpacity style={styles.verificationBtn} onPress={() => router.push('/settings')}>
                <Text style={styles.verificationBtnText}>Verify in Settings</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Active request */}
        {activeRequest && (
          <View style={styles.activeCard}>
            <View style={styles.activeHeader}>
              <IconSearch size={24} color={colors.primary} />
              <View>
                <Text style={styles.activeTitle}>Active Ride Share Request</Text>
                <Text style={styles.activeRoute}>{activeFromName} → {activeToName}</Text>
              </View>
            </View>
            <Text style={styles.activeDate}>
              {formatDisplayDate(String(activeRequest.travelDate))}
            </Text>
            {activeRequest.userType === 'has-car' && (
              <Text style={styles.activeMeta}>
                Looking for {String(activeRequest.numberOfSeats || 1)} passenger(s) • ${Number(activeRequest.pricePerPassenger || 0).toFixed(2)} per passenger
              </Text>
            )}
            {activeRequest.userType === 'needs-car' && (
              <Text style={styles.activeMeta}>Willing to pay: ${Number(activeRequest.willingToPay || 0).toFixed(2)}</Text>
            )}
            <View style={styles.activeActions}>
              <TouchableOpacity style={styles.viewMatchesBtn} onPress={openMatchModal}>
                <Text style={styles.viewMatchesText}>View Matches</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelRequest}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* I want to... */}
        {!activeRequest && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>I want to...</Text>
              <TouchableOpacity
                style={[styles.optionCard, userType === 'has-car' && styles.optionCardSelected]}
                onPress={() => setUserType('has-car')}
              >
                <IconCar size={40} color={userType === 'has-car' ? colors.primary : 'rgba(255,255,255,0.7)'} />
                <Text style={styles.optionTitle}>I have a car</Text>
                <Text style={styles.optionSub}>Looking to share ride and costs with passengers</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.optionCard, userType === 'needs-car' && styles.optionCardSelected]}
                onPress={() => setUserType('needs-car')}
              >
                <IconPerson size={40} color={userType === 'needs-car' ? colors.primary : 'rgba(255,255,255,0.7)'} />
                <Text style={styles.optionTitle}>I need a ride</Text>
                <Text style={styles.optionSub}>Looking to join someone's ride and share costs</Text>
              </TouchableOpacity>
            </View>

            {/* Travel Details */}
            {userType && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Travel Details</Text>
                <Text style={styles.label}>Travel Date</Text>
                <TouchableOpacity style={styles.inputWrap} onPress={() => setShowDatePicker(true)}>
                  <View style={styles.inputIconWrap}>
                    <IconCalendar size={20} color="rgba(255,255,255,0.5)" />
                  </View>
                  <Text style={[styles.input, !travelDate && styles.placeholder]}>
                    {travelDate ? formatDisplayDate(travelDate) : 'Select travel date'}
                  </Text>
                  <IconChevronDown size={20} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={travelDate ? new Date(travelDate + 'T12:00:00') : minDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    minimumDate={minDate}
                    onChange={onDatePickerChange}
                  />
                )}
                {Platform.OS === 'ios' && showDatePicker && (
                  <TouchableOpacity style={styles.datePickerDone} onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.datePickerDoneText}>Done</Text>
                  </TouchableOpacity>
                )}
                <Text style={[styles.label, { marginTop: spacing.md }]}>From City</Text>
                <TouchableOpacity style={styles.inputWrap} onPress={() => setCityPickerFor('from')}>
                  <View style={styles.inputIconWrap}>
                    <IconLocation size={20} color="rgba(255,255,255,0.5)" />
                  </View>
                  <Text style={[styles.input, !fromCity && styles.placeholder]}>{fromCity?.name || 'Select from city'}</Text>
                  <IconChevronDown size={20} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>
                <Text style={[styles.label, { marginTop: spacing.md }]}>To City</Text>
                <TouchableOpacity style={styles.inputWrap} onPress={() => setCityPickerFor('to')}>
                  <View style={styles.inputIconWrap}>
                    <IconLocation size={20} color="rgba(255,255,255,0.5)" />
                  </View>
                  <Text style={[styles.input, !toCity && styles.placeholder]}>{toCity?.name || 'Select to city'}</Text>
                  <IconChevronDown size={20} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>
              </View>
            )}

            {/* Note */}
            {userType && travelDate && fromCityId && toCityId && (
              <View style={styles.noteCard}>
                <Text style={styles.noteText}>
                  <Text style={styles.noteBold}>Note:</Text> We'll help you find verified riders to share your journey with.
                  {userType === 'has-car' && pricePerPassenger && parseFloat(pricePerPassenger) > 0 && (
                    <> Price per passenger: <Text style={styles.noteHighlight}>${parseFloat(pricePerPassenger).toFixed(2)}</Text></>
                  )}
                  {userType === 'needs-car' && willingToPay && parseFloat(willingToPay) > 0 && (
                    <> You're willing to pay: <Text style={styles.noteHighlight}>${parseFloat(willingToPay).toFixed(2)}</Text></>
                  )}
                </Text>
              </View>
            )}

            {/* Ride Details (has-car) */}
            {!activeRequest && userType === 'has-car' && travelDate && fromCityId && toCityId && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Ride Details</Text>
                <View style={styles.stepperBlock}>
                  <View style={styles.stepperLabelCol}>
                    <View style={styles.stepperLabelRow}>
                      <IconPerson size={20} color="rgba(255,255,255,0.7)" />
                      <View style={styles.stepperTextCol}>
                        <Text style={styles.stepperLabel}>Number of Passengers</Text>
                        <Text style={styles.stepperHint}>How many passengers do you want?</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.stepperControls}>
                    <Stepper value={numberOfSeats} onIncrement={() => setNumberOfSeats((s) => Math.min(s + 1, 8))} onDecrement={() => setNumberOfSeats((s) => Math.max(s - 1, 1))} min={1} max={8} />
                  </View>
                </View>
                <Text style={styles.label}>Price Per Passenger ($)</Text>
                <TextInput
                  style={styles.inputFull}
                  value={pricePerPassenger}
                  placeholder="Enter price per passenger"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  keyboardType="decimal-pad"
                  onChangeText={setPricePerPassenger}
                />
                <Text style={styles.hint}>How much do you want each passenger to pay?</Text>
                <View style={[styles.stepperBlock, { marginTop: spacing.md }]}>
                  <View style={styles.stepperLabelCol}>
                    <View style={styles.stepperLabelRow}>
                      <IconBriefcase size={20} color="rgba(255,255,255,0.7)" />
                      <View style={styles.stepperTextCol}>
                        <Text style={styles.stepperLabel}>Max Luggage/Bags</Text>
                        <Text style={styles.stepperHint}>How many bags can you accommodate?</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.stepperControls}>
                    <Stepper value={maxBags} onIncrement={() => setMaxBags((b) => Math.min(b + 1, 10))} onDecrement={() => setMaxBags((b) => Math.max(b - 1, 0))} min={0} max={10} />
                  </View>
                </View>
                <Text style={[styles.label, { marginTop: spacing.md }]}>Additional Notes (Optional)</Text>
                <TextInput
                  style={[styles.inputFull, styles.textArea]}
                  value={note}
                  placeholder="e.g., I want to be dropped at the city center, flexible on time..."
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  multiline
                  numberOfLines={3}
                  onChangeText={setNote}
                />
              </View>
            )}

            {/* Your Requirements (needs-car) */}
            {!activeRequest && userType === 'needs-car' && travelDate && fromCityId && toCityId && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Your Requirements</Text>
                <View style={styles.stepperBlock}>
                  <View style={styles.stepperLabelCol}>
                    <View style={styles.stepperLabelRow}>
                      <IconPerson size={20} color="rgba(255,255,255,0.7)" />
                      <View style={styles.stepperTextCol}>
                        <Text style={styles.stepperLabel}>Seats Needed</Text>
                        <Text style={styles.stepperHint}>How many people are traveling?</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.stepperControls}>
                    <Stepper value={neededSeats} onIncrement={() => setNeededSeats((s) => Math.min(s + 1, 8))} onDecrement={() => setNeededSeats((s) => Math.max(s - 1, 1))} min={1} max={8} />
                  </View>
                </View>
                <View style={[styles.stepperBlock, { marginTop: spacing.md }]}>
                  <View style={styles.stepperLabelCol}>
                    <View style={styles.stepperLabelRow}>
                      <IconBriefcase size={20} color="rgba(255,255,255,0.7)" />
                      <View style={styles.stepperTextCol}>
                        <Text style={styles.stepperLabel}>Your Bags</Text>
                        <Text style={styles.stepperHint}>How many bags are you bringing?</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.stepperControls}>
                    <Stepper value={userBags} onIncrement={() => setUserBags((b) => Math.min(b + 1, 10))} onDecrement={() => setUserBags((b) => Math.max(b - 1, 0))} min={0} max={10} />
                  </View>
                </View>
                <Text style={[styles.label, { marginTop: spacing.md }]}>How Much Are You Willing to Pay? ($)</Text>
                <TextInput
                  style={styles.inputFull}
                  value={willingToPay}
                  placeholder="Enter amount you're willing to pay"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  keyboardType="decimal-pad"
                  onChangeText={setWillingToPay}
                />
                <Text style={styles.hint}>How much are you willing to pay for the ride?</Text>
                <Text style={[styles.label, { marginTop: spacing.md }]}>Additional Notes (Optional)</Text>
                <TextInput
                  style={[styles.inputFull, styles.textArea]}
                  value={note}
                  placeholder="e.g., I need to be picked up at the bus station, flexible on time..."
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  multiline
                  numberOfLines={3}
                  onChangeText={setNote}
                />
              </View>
            )}

            {/* Send Request */}
            {userType && travelDate && fromCityId && toCityId && (
              <TouchableOpacity
                style={[styles.sendBtn, (!canSend || isSubmitting || !isVerified) && styles.sendBtnDisabled]}
                onPress={handleSendRequest}
                disabled={!canSend || isSubmitting || !isVerified}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.sendBtnText}>
                    {!isVerified ? 'Verify Identity to Continue' : 'Send Request'}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>

      {/* City picker modal */}
      <Modal visible={cityPickerFor !== null} transparent animationType="slide">
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setCityPickerFor(null)}>
          <View style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>{cityPickerFor === 'from' ? 'From City' : 'To City'}</Text>
            {loadingCities ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
            ) : (
              <FlatList
                data={cities}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.pickerItem}
                    onPress={() => {
                      if (cityPickerFor === 'from') setFromCityId(item.id);
                      else setToCityId(item.id);
                      setCityPickerFor(null);
                    }}
                  >
                    <Text style={styles.pickerItemText}>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Matches modal – same as web: needs-car sees matched drivers (Call); has-car sees potential matches (Accept) + matched passengers (Call) */}
      <Modal visible={showMatchModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.matchCard}>
            <Text style={styles.matchCardTitle}>
              {(activeRequest as Record<string, unknown>)?.userType === 'needs-car'
                ? (matchedDrivers.length > 0 ? 'Matched Drivers' : 'Matches')
                : (matchedPassengers.length > 0 ? 'My Matched Passengers' : 'Find Your Match')}
            </Text>
            <Text style={styles.matchCardRoute}>{activeFromName} → {activeToName}</Text>

            {(activeRequest as Record<string, unknown>)?.userType === 'needs-car' && (
              <>
                {matchedDrivers.length === 0 ? (
                  <Text style={styles.matchEmpty}>No drivers have accepted yet. We'll notify you when someone matches.</Text>
                ) : (
                  <ScrollView style={styles.matchScroll} showsVerticalScrollIndicator={false}>
                    {matchedDrivers.map((m: unknown) => {
                      const d = m as Record<string, unknown>;
                      const driver = (d?.driver as Record<string, unknown>) || {};
                      const fromName = (d?.fromCity as Record<string, unknown>)?.name ?? 'N/A';
                      const toName = (d?.toCity as Record<string, unknown>)?.name ?? 'N/A';
                      return (
                        <View key={String(d?.id)} style={styles.matchItem}>
                          <Text style={styles.matchItemName}>{String(driver?.fullName ?? '')}</Text>
                          <Text style={styles.matchItemRoute}>{fromName} → {toName}</Text>
                          {d?.pricePerPassenger != null && (
                            <Text style={styles.matchItemPrice}>${Number(d.pricePerPassenger).toFixed(2)} per passenger</Text>
                          )}
                          <TouchableOpacity style={styles.matchCallBtn} onPress={() => handleCall(String(driver?.phone ?? ''))}>
                            <IconPhone size={18} color="#fff" />
                            <Text style={styles.matchCallText}>Call Driver</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </ScrollView>
                )}
              </>
            )}

            {(activeRequest as Record<string, unknown>)?.userType === 'has-car' && (
              <>
                {matchedPassengers.length > 0 && (
                  <View style={styles.matchSection}>
                    <Text style={styles.matchSectionTitle}>Matched passengers</Text>
                    {matchedPassengers.map((p: unknown) => {
                      const u = (p as Record<string, unknown>)?.user as Record<string, unknown>;
                      if (!u) return null;
                      return (
                        <View key={String((p as Record<string, unknown>)?.id)} style={styles.matchItem}>
                          <Text style={styles.matchItemName}>{String(u?.fullName ?? '')}</Text>
                          <TouchableOpacity style={styles.matchCallBtn} onPress={() => handleCall(String(u?.phone ?? ''))}>
                            <IconPhone size={18} color="#fff" />
                            <Text style={styles.matchCallText}>Call</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                )}
                <View style={styles.matchSection}>
                  <Text style={styles.matchSectionTitle}>Potential matches</Text>
                  {matches.length === 0 && matchedPassengers.length === 0 ? (
                    <Text style={styles.matchEmpty}>No new matches yet. We'll notify you when we find someone.</Text>
                  ) : matches.length === 0 ? (
                    <Text style={styles.matchEmpty}>No more potential passengers at the moment.</Text>
                  ) : (
                    matches.map((m: unknown) => {
                      const r = m as Record<string, unknown>;
                      const user = (r?.user as Record<string, unknown>) || {};
                      const matchRequestId = r?.id as string;
                      const isMatching = matchingId === matchRequestId;
                      return (
                        <View key={matchRequestId} style={styles.matchItem}>
                          <Text style={styles.matchItemName}>{String(user?.fullName ?? '')}</Text>
                          {r?.willingToPay != null && (
                            <Text style={styles.matchItemPrice}>Willing to pay: ${Number(r.willingToPay).toFixed(2)}</Text>
                          )}
                          <TouchableOpacity
                            style={[styles.matchAcceptBtn, isMatching && styles.matchAcceptBtnDisabled]}
                            onPress={() => handleMatch(matchRequestId)}
                            disabled={isMatching}
                          >
                            {isMatching ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <>
                                <IconCheck size={18} color="#fff" />
                                <Text style={styles.matchAcceptText}>Accept</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                      );
                    })
                  )}
                </View>
              </>
            )}

            <TouchableOpacity style={styles.matchCloseBtn} onPress={() => setShowMatchModal(false)}>
              <Text style={styles.matchCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'ios' ? 56 : 48,
    paddingBottom: spacing.md,
    backgroundColor: 'rgba(120, 90, 12, 0.98)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  verificationCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  verificationText: { flex: 1, marginLeft: spacing.md },
  verificationTitle: { fontSize: 16, fontWeight: '600', color: '#f87171', marginBottom: 4 },
  verificationSub: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginBottom: spacing.md },
  verificationBtn: { backgroundColor: '#ef4444', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, alignSelf: 'flex-start' },
  verificationBtnText: { color: '#fff', fontWeight: '600' },
  activeCard: {
    backgroundColor: 'rgba(245, 191, 25, 0.1)',
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(245, 191, 25, 0.2)',
  },
  activeHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  activeTitle: { fontSize: 16, fontWeight: '600', color: '#fff' },
  activeRoute: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  activeDate: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  activeMeta: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: spacing.md },
  activeActions: { flexDirection: 'row', gap: 12 },
  viewMatchesBtn: { flex: 1, backgroundColor: 'rgba(59, 130, 246, 0.3)', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  viewMatchesText: { color: '#93c5fd', fontWeight: '600' },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 20, backgroundColor: 'rgba(239, 68, 68, 0.3)', borderRadius: 12 },
  cancelBtnText: { color: '#fca5a5', fontWeight: '600' },
  section: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: spacing.md },
  optionCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
  },
  optionCardSelected: { borderColor: colors.primary, backgroundColor: 'rgba(245, 191, 25, 0.2)' },
  optionTitle: { fontSize: 16, fontWeight: '600', color: '#fff', marginTop: 8 },
  optionSub: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 4, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.7)', marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    marginBottom: spacing.md,
    paddingRight: 12,
  },
  inputIconWrap: {
    width: 44,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: { flex: 1, paddingVertical: 12, fontSize: 16, color: '#fff' },
  datePickerDone: { paddingVertical: 10, paddingHorizontal: 16, alignSelf: 'flex-end', marginBottom: spacing.md },
  datePickerDoneText: { color: colors.primary, fontWeight: '600', fontSize: 16 },
  placeholder: { color: 'rgba(255,255,255,0.5)' },
  inputFull: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#fff',
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  hint: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  noteCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  noteText: { fontSize: 14, color: 'rgba(255,255,255,0.9)' },
  noteBold: { fontWeight: '700', color: '#fff' },
  noteHighlight: { fontWeight: '600', color: colors.primary },
  stepperBlock: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  stepperLabelCol: { flex: 1 },
  stepperLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepperTextCol: { flex: 1 },
  stepperLabel: { fontSize: 16, fontWeight: '500', color: '#fff' },
  stepperHint: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  stepperControls: { marginLeft: spacing.md },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepperBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperBtnDisabled: { opacity: 0.5 },
  stepperValue: { fontSize: 20, fontWeight: '700', color: '#fff', minWidth: 28, textAlign: 'center' },
  sendBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.6 },
  sendBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  pickerCard: { backgroundColor: '#1f2937', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%', padding: spacing.lg },
  pickerTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: spacing.md },
  pickerItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  pickerItemText: { fontSize: 16, color: '#fff' },
  matchCard: { backgroundColor: '#1f2937', margin: spacing.lg, borderRadius: 20, padding: spacing.xl, maxHeight: '85%' },
  matchCardTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 4 },
  matchCardRoute: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: spacing.md },
  matchScroll: { maxHeight: 280, marginBottom: spacing.md },
  matchSection: { marginBottom: spacing.lg },
  matchSectionTitle: { fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.9)', marginBottom: spacing.sm },
  matchItem: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  matchItemName: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 4 },
  matchItemRoute: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 2 },
  matchItemPrice: { fontSize: 13, color: colors.primary, marginBottom: 8 },
  matchCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  matchCallText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  matchAcceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  matchAcceptBtnDisabled: { opacity: 0.7 },
  matchAcceptText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  matchEmpty: { color: 'rgba(255,255,255,0.7)', marginBottom: spacing.lg, fontSize: 14 },
  matchCloseBtn: { backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: spacing.sm },
  matchCloseText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
