import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
  FlatList,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getToken } from '@/lib/storage';
import { safeBack } from '@/lib/safe-back';
import { Button } from '@/components/Button';
import { colors, spacing } from '@/lib/theme';
import { settingsApi, busesApi, type BusSearchResult } from '@/lib/api';
import {
  IconArrowBack,
  IconBus,
  IconCalendar,
  IconLocation,
  IconClock,
  IconChevronDown,
  IconMinus,
  IconPlus,
  IconPhone,
} from '@/components/DashboardIcons';

type City = { id: string; name: string };

/** Format YYYY-MM-DD for API (unchanged). */
function toApiDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

/** Display date like Next.js / locale: e.g. "12 Feb 2025". */
function formatDisplayDate(isoDate: string): string {
  if (!isoDate) return '';
  const d = new Date(isoDate + 'T12:00:00');
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatTime24to12(time24: string): string {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
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
        <IconMinus color="#fff" size={20} />
      </TouchableOpacity>
      <Text style={styles.stepperValue}>{value}</Text>
      <TouchableOpacity
        style={[styles.stepperBtn, value >= max && styles.stepperBtnDisabled]}
        onPress={onIncrement}
        disabled={value >= max}
      >
        <IconPlus color="#fff" size={20} />
      </TouchableOpacity>
    </View>
  );
}

export default function BusBookingScreen() {
  const [cities, setCities] = useState<City[]>([]);
  const [loadingCities, setLoadingCities] = useState(true);
  const [travelDate, setTravelDate] = useState('');
  const [fromCityId, setFromCityId] = useState('');
  const [toCityId, setToCityId] = useState('');
  const [availableBuses, setAvailableBuses] = useState<BusSearchResult[]>([]);
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [numberOfTickets, setNumberOfTickets] = useState(1);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeBooking, setActiveBooking] = useState<Record<string, unknown> | null>(null);
  const [cityPickerFor, setCityPickerFor] = useState<'from' | 'to' | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerDate, setDatePickerDate] = useState(() => new Date());

  const fromCity = cities.find((c) => c.id === fromCityId);
  const toCity = cities.find((c) => c.id === toCityId);
  const selectedBus = availableBuses.find((b) => b.id === selectedBusId);
  const totalPrice = selectedBus ? selectedBus.price * numberOfTickets : 0;

  const today = new Date();
  const minDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const onDatePickerChange = (event: { type: string }, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'dismissed') {
      if (Platform.OS === 'ios') setShowDatePicker(false);
      return;
    }
    if (date) {
      setDatePickerDate(date);
      setTravelDate(toApiDate(date));
    }
  };

  const loadCities = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    try {
      setLoadingCities(true);
      const res = await settingsApi.cities(token);
      setCities(res.cities || []);
    } catch (_) {}
    setLoadingCities(false);
  }, []);

  const checkActiveBooking = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setActiveBooking(null);
      return;
    }
    try {
      const data = await busesApi.activeBooking(token);
      setActiveBooking((data as { booking?: unknown }).booking ?? null);
    } catch (_) {
      setActiveBooking(null);
    }
  }, []);

  useEffect(() => {
    loadCities();
    checkActiveBooking();
  }, [loadCities, checkActiveBooking]);

  useEffect(() => {
    const interval = setInterval(checkActiveBooking, 10000);
    return () => clearInterval(interval);
  }, [checkActiveBooking]);

  const handleSearch = async () => {
    if (!travelDate.trim()) {
      Alert.alert('Error', 'Please select a date');
      return;
    }
    if (!fromCityId || !toCityId) {
      Alert.alert('Error', 'Please select both from and to cities');
      return;
    }
    if (fromCityId === toCityId) {
      Alert.alert('Error', 'From and to cities must be different');
      return;
    }
    const token = await getToken();
    if (!token) {
      router.replace('/(auth)/login');
      return;
    }
    setIsSearching(true);
    try {
      const data = await busesApi.search(token, {
        fromCityId,
        toCityId,
        travelDate: travelDate.trim(),
      });
      const buses = data.buses || [];
      setAvailableBuses(buses);
      setSelectedBusId(null);
      setNumberOfTickets(1);
      if (buses.length === 0) {
        Alert.alert('No buses', 'No buses available for this route on the selected date.');
      }
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to search buses.');
      setAvailableBuses([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleBuyTickets = async () => {
    if (!selectedBusId || !selectedBus) {
      Alert.alert('Error', 'Please select a bus');
      return;
    }
    if (numberOfTickets < 1) {
      Alert.alert('Error', 'Please select at least 1 ticket');
      return;
    }
    if (numberOfTickets > selectedBus.availableSeats) {
      Alert.alert('Error', `Only ${selectedBus.availableSeats} seats available`);
      return;
    }
    const token = await getToken();
    if (!token) {
      router.replace('/(auth)/login');
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await busesApi.createBooking(token, {
        busScheduleId: selectedBusId,
        travelDate: travelDate.trim(),
        numberOfTickets,
      });
      if ((result as { error?: string }).error) {
        throw new Error((result as { error: string }).error);
      }
      const total = (result as { booking?: { totalPrice: number } }).booking?.totalPrice;
      Alert.alert('Success', `Booking created! Total: $${total != null ? total.toFixed(2) : totalPrice.toFixed(2)}`);
      setSelectedBusId(null);
      setNumberOfTickets(1);
      setAvailableBuses([]);
      setTravelDate('');
      setFromCityId('');
      setToCityId('');
      await checkActiveBooking();
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to create booking.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelBooking = () => {
    const bookingId = activeBooking?.id as string;
    if (!bookingId) return;
    Alert.alert(
      'Cancel booking',
      'Are you sure you want to cancel this bus booking?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, cancel',
          style: 'destructive',
          onPress: async () => {
            const token = await getToken();
            if (!token) return;
            try {
              await busesApi.cancelBooking(token, bookingId);
              setActiveBooking(null);
              Alert.alert('Cancelled', 'Booking cancelled successfully.');
            } catch (_) {
              Alert.alert('Error', 'Failed to cancel booking.');
            }
          },
        },
      ]
    );
  };

  const activeSchedule = activeBooking?.busSchedule as {
    departureTime?: string;
    arrivalTime?: string;
    station?: string;
    conductorPhone?: string;
    fromCity?: { name?: string };
    toCity?: { name?: string };
    busProvider?: { user?: { phone?: string } };
  } | undefined;
  const activeFromName = activeSchedule?.fromCity?.name ?? '—';
  const activeToName = activeSchedule?.toCity?.name ?? '—';
  const conductorPhone =
    activeSchedule?.conductorPhone ?? activeSchedule?.busProvider?.user?.phone ?? '';
  const activeTotalPrice = typeof activeBooking?.totalPrice === 'number' ? activeBooking.totalPrice : 0;
  const handleCallConductor = () => {
    if (!conductorPhone) return;
    Linking.openURL(`tel:${conductorPhone}`);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => safeBack('/dashboard')}>
          <IconArrowBack color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bus Booking</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Active booking card */}
        {activeBooking && (
          <View style={styles.activeCard}>
            <View style={styles.activeRow}>
              <View style={styles.activeIconWrap}>
                <IconBus color={colors.primary} size={24} />
              </View>
              <View style={styles.activeText}>
                <Text style={styles.activeTitle}>Active Booking</Text>
                <Text style={styles.activeRoute}>{activeFromName} → {activeToName}</Text>
              </View>
            </View>
            <Text style={styles.activeMeta}>
              {activeSchedule?.station ? `Pickup: ${activeSchedule.station}` : null}
              {activeSchedule?.departureTime
                ? ` • ${formatTime24to12(activeSchedule.departureTime)}`
                : ''}
            </Text>
            <Text style={styles.activeMeta}>
              Travel date: {formatDisplayDate(String(activeBooking.travelDate))} • {(activeBooking.numberOfTickets as number) ?? 1} ticket(s)
            </Text>
            {activeTotalPrice > 0 && (
              <Text style={styles.activeMeta}>Total: ${activeTotalPrice.toFixed(2)}</Text>
            )}
            <Text style={styles.activeStatus}>
              Status: {(activeBooking.status as string) === 'confirmed' ? 'Confirmed' : 'Pending'}
            </Text>
            {conductorPhone ? (
              <TouchableOpacity style={styles.callConductorBtn} onPress={handleCallConductor}>
                <IconPhone color="#fff" size={18} />
                <Text style={styles.callConductorBtnText}>Call Conductor</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelBooking}>
              <Text style={styles.cancelBtnText}>Cancel Booking</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Search Buses */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Search Buses</Text>
          <Text style={styles.label}>Travel Date</Text>
          <TouchableOpacity style={styles.inputWrap} onPress={() => setShowDatePicker(true)}>
            <View style={styles.inputIcon}>
              <IconCalendar color={colors.placeholder} size={20} />
            </View>
            <Text style={[styles.input, !travelDate && styles.placeholder]}>
              {travelDate ? formatDisplayDate(travelDate) : 'Select travel date'}
            </Text>
            <IconChevronDown color={colors.placeholder} size={20} />
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={travelDate ? new Date(travelDate + 'T12:00:00') : datePickerDate}
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
            <View style={styles.inputIcon}>
              <IconLocation color={colors.placeholder} size={20} />
            </View>
            <Text style={[styles.input, !fromCity && styles.placeholder]}>{fromCity?.name || 'Select from city'}</Text>
            <IconChevronDown color={colors.placeholder} size={20} />
          </TouchableOpacity>
          <Text style={[styles.label, { marginTop: spacing.md }]}>To City</Text>
          <TouchableOpacity style={styles.inputWrap} onPress={() => setCityPickerFor('to')}>
            <View style={styles.inputIcon}>
              <IconLocation color={colors.placeholder} size={20} />
            </View>
            <Text style={[styles.input, !toCity && styles.placeholder]}>{toCity?.name || 'Select to city'}</Text>
            <IconChevronDown color={colors.placeholder} size={20} />
          </TouchableOpacity>
          <Button
            title={isSearching ? 'Searching...' : 'Search Buses'}
            onPress={handleSearch}
            loading={isSearching}
            disabled={isSearching || loadingCities}
          />
        </View>

        {/* Available Buses */}
        {availableBuses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Available Buses</Text>
            {availableBuses.map((bus) => {
              const selected = selectedBusId === bus.id;
              return (
                <TouchableOpacity
                  key={bus.id}
                  style={[styles.busCard, selected && styles.busCardSelected]}
                  onPress={() => setSelectedBusId(bus.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.busCardLeft}>
                    <View style={[styles.busIconWrap, selected && styles.busIconWrapSelected]}>
                      <IconBus
                        color={selected ? colors.primary : 'rgba(255,255,255,0.8)'}
                        size={26}
                      />
                    </View>
                    <View>
                      <View style={styles.busTimeRow}>
                        <IconClock size={16} color="rgba(255,255,255,0.7)" />
                        <Text style={styles.busTime}>{formatTime24to12(bus.departureTime)}</Text>
                        {bus.arrivalTime && (
                          <>
                            <Text style={styles.busArrow}>→</Text>
                            <Text style={styles.busTimeArrival}>{formatTime24to12(bus.arrivalTime)}</Text>
                          </>
                        )}
                      </View>
                      <View style={styles.busStationRow}>
                        <IconLocation size={14} color="rgba(255,255,255,0.7)" />
                        <Text style={styles.busStation}>{bus.station}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.busCardRight}>
                    <Text style={styles.busPrice}>${bus.price}</Text>
                    <Text style={styles.busSeats}>{bus.availableSeats} seats left</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Select Number of Tickets */}
        {selectedBus && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Number of Tickets</Text>
            <View style={styles.stepperBlock}>
              <View>
                <Text style={styles.stepperLabel}>Number of Tickets</Text>
                <Text style={styles.stepperHint}>Price per ticket: ${selectedBus.price}</Text>
              </View>
              <Stepper
                value={numberOfTickets}
                onIncrement={() =>
                  setNumberOfTickets((n) => Math.min(n + 1, selectedBus.availableSeats))
                }
                onDecrement={() => setNumberOfTickets((n) => Math.max(n - 1, 1))}
                min={1}
                max={selectedBus.availableSeats}
              />
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Price:</Text>
              <Text style={styles.totalValue}>${totalPrice.toFixed(2)}</Text>
            </View>
            <Button
              title={isSubmitting ? 'Processing...' : 'Buy Tickets'}
              onPress={handleBuyTickets}
              loading={isSubmitting}
              disabled={isSubmitting}
            />
          </View>
        )}
      </ScrollView>

      {/* City picker modal */}
      <Modal
        visible={cityPickerFor !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setCityPickerFor(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCityPickerFor(null)}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity onPress={() => setCityPickerFor(null)} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>Done</Text>
            </TouchableOpacity>
            <FlatList
              data={cities}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.cityItem}
                  onPress={() => {
                    if (cityPickerFor === 'from') setFromCityId(item.id);
                    else setToCityId(item.id);
                    setCityPickerFor(null);
                  }}
                >
                  <Text style={styles.cityItemText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  activeCard: {
    backgroundColor: 'rgba(245, 191, 25, 0.1)',
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(245, 191, 25, 0.2)',
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  activeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(245, 191, 25, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  activeText: { flex: 1 },
  activeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  activeRoute: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  activeMeta: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  activeStatus: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
    marginTop: 4,
  },
  callConductorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.md,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.35)',
  },
  callConductorBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  cancelBtn: {
    marginTop: spacing.md,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    alignSelf: 'flex-start',
  },
  cancelBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  section: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  inputIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingLeft: 44,
    paddingRight: 12,
    color: '#fff',
    fontSize: 16,
  },
  datePickerDone: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-end',
    marginBottom: spacing.md,
  },
  datePickerDoneText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 16,
  },
  placeholder: {
    color: colors.placeholder,
  },
  busCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  busCardSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(245, 191, 25, 0.2)',
  },
  busCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  busIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  busIconWrapSelected: {
    backgroundColor: 'rgba(245, 191, 25, 0.3)',
  },
  busTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  busTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  busArrow: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  busTimeArrival: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  busStationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  busStation: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  busCardRight: {
    alignItems: 'flex-end',
  },
  busPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  busSeats: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  stepperBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  stepperLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  stepperHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepperBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperBtnDisabled: {
    opacity: 0.5,
  },
  stepperValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    minWidth: 32,
    textAlign: 'center',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: spacing.xl,
  },
  modalClose: {
    padding: spacing.md,
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  modalCloseText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 16,
  },
  cityItem: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  cityItemText: {
    color: '#fff',
    fontSize: 16,
  },
});
