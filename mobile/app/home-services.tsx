import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { getToken } from '@/lib/storage';
import { safeBack } from '@/lib/safe-back';
import { Button } from '@/components/Button';
import { colors, spacing } from '@/lib/theme';
import { servicesApi, type ServiceBid } from '@/lib/api';
import { getServiceIcon } from '@/lib/service-icons';
import {
  IconArrowBack,
  IconSearch,
  IconLocation,
  IconDollar,
  IconCheck,
  IconPhone,
  IconStar,
} from '@/components/DashboardIcons';

type Service = { id: string; name: string; iconName?: string };
type ActiveRequest = {
  id: string;
  serviceId: string;
  jobDescription: string;
  budget: number;
  location: string;
  status: string;
  createdAt: string;
  service: Service;
  provider?: { id: string; userId: string; fullName: string; phone: string };
  price?: number;
};

const defaultJobPrefix = (name: string) =>
  `I am looking for a ${name.toLowerCase()} to `;

export default function HomeServicesScreen() {
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [location, setLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeRequest, setActiveRequest] = useState<ActiveRequest | null>(null);
  const [showActiveModal, setShowActiveModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [completedDismissed, setCompletedDismissed] = useState(false);
  const [bids, setBids] = useState<ServiceBid[]>([]);
  const [loadingBids, setLoadingBids] = useState(false);
  const [acceptingBidId, setAcceptingBidId] = useState<string | null>(null);
  const [searchDots, setSearchDots] = useState('');
  const [hasRated, setHasRated] = useState(false);
  const [checkingRating, setCheckingRating] = useState(false);
  const [ratingStars, setRatingStars] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const shouldScrollToFormRef = useRef(false);

  const selectedService = selectedServiceId
    ? services.find((s) => s.id === selectedServiceId)
    : null;

  const loadServices = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    try {
      setLoadingServices(true);
      const res = await servicesApi.list(token);
      setServices(res.services || []);
    } catch (_) {
      setServices([]);
    } finally {
      setLoadingServices(false);
    }
  }, []);

  const checkActiveRequest = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setActiveRequest(null);
      return;
    }
    try {
      const data = await servicesApi.active(token);
      const req = (data as { request?: ActiveRequest & { provider?: unknown; price?: number } }).request ?? null;
      setActiveRequest(req || null);
    } catch (_) {
      setActiveRequest(null);
    }
  }, []);

  useEffect(() => {
    loadServices();
    checkActiveRequest();
  }, [loadServices, checkActiveRequest]);

  // Poll active request every 5s
  useEffect(() => {
    const interval = setInterval(checkActiveRequest, 5000);
    return () => clearInterval(interval);
  }, [checkActiveRequest]);

  // Search dots animation
  useEffect(() => {
    if (activeRequest?.status === 'searching') {
      const t = setInterval(() => setSearchDots((p) => (p.length >= 3 ? '' : p + '.')), 500);
      return () => clearInterval(t);
    }
  }, [activeRequest?.status]);

  // When not completed, show modal again
  useEffect(() => {
    if (activeRequest && activeRequest.status !== 'completed') setCompletedDismissed(false);
  }, [activeRequest]);

  // Reset rating state when active request id changes
  useEffect(() => {
    if (!activeRequest?.id) {
      setHasRated(false);
      setRatingStars(0);
      setReviewText('');
    }
  }, [activeRequest?.id]);

  // Rate check when completed
  useEffect(() => {
    if (!activeRequest || activeRequest.status !== 'completed' || !activeRequest.provider) {
      setCheckingRating(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setCheckingRating(true);
      try {
        const token = await getToken();
        if (!token || cancelled) return;
        const data = await servicesApi.rateCheck(token, activeRequest.id);
        if (!cancelled) setHasRated(data.hasRated ?? false);
      } catch {
        if (!cancelled) setHasRated(false);
      } finally {
        if (!cancelled) setCheckingRating(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeRequest?.id, activeRequest?.status, activeRequest?.provider]);

  const fetchBids = useCallback(async (requestId: string) => {
    const token = await getToken();
    if (!token) return;
    setLoadingBids(true);
    try {
      const data = await servicesApi.bids(token, requestId);
      setBids(data.bids ?? []);
    } catch {
      setBids([]);
    } finally {
      setLoadingBids(false);
    }
  }, []);

  useEffect(() => {
    if (activeRequest?.status === 'bid_received' && activeRequest.id) {
      fetchBids(activeRequest.id);
      const t = setInterval(() => fetchBids(activeRequest.id), 10000);
      return () => clearInterval(t);
    }
    setBids([]);
  }, [activeRequest?.id, activeRequest?.status, fetchBids]);

  const handleAcceptBid = useCallback(async (bidId: string) => {
    const token = await getToken();
    if (!token) return;
    setAcceptingBidId(bidId);
    try {
      await servicesApi.acceptBid(token, bidId);
      await checkActiveRequest();
      Alert.alert('Provider selected', 'They will contact you soon.');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to accept');
    } finally {
      setAcceptingBidId(null);
    }
  }, [checkActiveRequest]);

  const handleCallProvider = useCallback((phone: string) => {
    Linking.openURL(`tel:${phone.replace(/\D/g, '')}`).catch(() => Alert.alert('Error', 'Could not open phone'));
  }, []);

  // Prefill job description when service is selected
  useEffect(() => {
    if (selectedService) {
      setJobDescription(defaultJobPrefix(selectedService.name));
    } else {
      setJobDescription('');
    }
  }, [selectedServiceId, selectedService?.name]);

  // When user selects a service, mark that we should scroll to the form once it's laid out
  useEffect(() => {
    if (selectedServiceId && !activeRequest) {
      shouldScrollToFormRef.current = true;
    }
  }, [selectedServiceId, activeRequest]);

  const handleSubmit = async () => {
    if (!selectedServiceId || !jobDescription.trim()) {
      Alert.alert('Error', 'Select a service and complete the job description.');
      return;
    }
    const budgetNum = parseFloat(budget.replace(/[^0-9.]/g, ''));
    if (isNaN(budgetNum) || budgetNum <= 0) {
      Alert.alert('Error', 'Enter a valid budget amount.');
      return;
    }
    if (!location.trim()) {
      Alert.alert('Error', 'Enter your location.');
      return;
    }

    const token = await getToken();
    if (!token) {
      router.replace('/(auth)/login');
      return;
    }
    setSubmitting(true);
    try {
      await servicesApi.create(token, {
        serviceId: selectedServiceId,
        jobDescription: jobDescription.trim(),
        budget: budgetNum,
        location: location.trim(),
      });
      await checkActiveRequest();
      setSelectedServiceId(null);
      setJobDescription('');
      setBudget('');
      setLocation('');
      Alert.alert('Success', 'Request submitted! We will find you a verified professional.');
    } catch (e: unknown) {
      Alert.alert(
        'Error',
        e instanceof Error ? e.message : 'Failed to submit request. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = () => {
    if (!activeRequest) return;
    Alert.alert(
      'Cancel request',
      'Are you sure you want to cancel this service request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, cancel',
          style: 'destructive',
          onPress: async () => {
            const token = await getToken();
            if (!token) return;
            setCancelling(true);
            try {
              await servicesApi.cancel(token, activeRequest.id);
              setActiveRequest(null);
              setShowActiveModal(false);
              Alert.alert('Cancelled', 'Service request cancelled.');
            } catch (e: unknown) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Failed to cancel request.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  const jobIsDefault =
    selectedService &&
    jobDescription.trim() === defaultJobPrefix(selectedService.name);
  const canSubmit =
    !activeRequest &&
    selectedServiceId &&
    jobDescription.trim() &&
    !jobIsDefault &&
    budget.replace(/[^0-9.]/g, '') &&
    parseFloat(budget.replace(/[^0-9.]/g, '')) > 0 &&
    location.trim();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => safeBack('/dashboard')}>
          <IconArrowBack color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Business & Home Services</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Active request card */}
          {activeRequest && (
        <View style={styles.activeCard}>
              <View style={styles.activeRow}>
                <View style={styles.activeIconWrap}>
                  <IconSearch size={22} color={colors.primary} />
                </View>
                <View style={styles.activeText}>
                  <Text style={styles.activeTitle}>Active Service Request</Text>
                  <Text style={styles.activeSub}>{activeRequest.service?.name ?? 'Service'}</Text>
                </View>
        </View>
              <Text style={styles.activeMeta}>
                Requested {new Date(activeRequest.createdAt).toLocaleDateString()}
              </Text>
              <Text style={styles.activeMeta}>Budget: ${activeRequest.budget.toLocaleString()}</Text>
              <Text style={styles.activeMeta}>Location: {activeRequest.location}</Text>
              <Text style={styles.activeStatus}>
                {activeRequest.status === 'searching' && 'Searching for service providers...'}
                {activeRequest.status === 'pending' && 'Waiting for service provider to accept'}
                {activeRequest.status === 'accepted' && 'Service provider is on the way'}
                {activeRequest.status === 'in_progress' && 'Service in progress'}
              </Text>
              <View style={styles.activeActions}>
                <TouchableOpacity
                  style={styles.viewDetailsBtn}
                  onPress={() => setShowActiveModal(true)}
                >
                  <Text style={styles.viewDetailsBtnText}>View matches & details</Text>
                </TouchableOpacity>
                {activeRequest.status !== 'cancelled' && activeRequest.status !== 'completed' && (
                  <TouchableOpacity
                    style={styles.cancelSearchBtn}
                    onPress={handleCancelRequest}
                    disabled={cancelling}
                  >
                    {cancelling ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.cancelSearchBtnText}>Cancel Search</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Active Service Request modal – same as web: searching → bids → accept → provider → completed → rate */}
          <Modal
            visible={!!activeRequest && !(completedDismissed && activeRequest?.status === 'completed')}
            transparent
            animationType="fade"
            onRequestClose={() => {}}
          >
            <Pressable style={styles.activeModalBackdrop}>
              <Pressable style={styles.activeModalCard} onPress={(e) => e.stopPropagation()}>
                <ScrollView style={styles.activeModalScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  {activeRequest && (
                    <>
                  <Text style={styles.activeModalTitle}>Active Service Request</Text>
                  <TouchableOpacity style={styles.activeModalBackToDashboardBtn} onPress={() => safeBack('/dashboard')} activeOpacity={0.8}>
                    <Text style={styles.activeModalBackToDashboardText}>Back to dashboard</Text>
                    <Text style={styles.activeModalBackToDashboardSub}>Search continues in background</Text>
                  </TouchableOpacity>

                  {activeRequest.status === 'searching' && (
                    <View style={styles.activeModalSearching}>
                      <View style={styles.activeModalSearchIconWrap}>
                        <IconSearch color={colors.primary} size={40} />
                      </View>
                      <Text style={styles.activeModalSearchText}>Searching for providers{searchDots}</Text>
                      <Text style={styles.activeModalSearchSub}>Finding verified professionals</Text>
                    </View>
                  )}

                  {activeRequest.status === 'bid_received' && (
                    <View style={styles.activeModalBidsSection}>
                      <Text style={styles.activeModalBidsTitle}>Providers have placed bids</Text>
                      {loadingBids ? (
                        <View style={styles.activeModalBidsLoading}>
                          <ActivityIndicator size="small" color={colors.primary} />
                          <Text style={styles.activeModalBidsLoadingText}>Loading bids...</Text>
                        </View>
                      ) : bids.length === 0 ? (
                        <View style={styles.activeModalBidsEmpty}>
                          <Text style={styles.activeModalBidsEmptyText}>No bids yet</Text>
                          <Text style={styles.activeModalBidsEmptySub}>Providers are reviewing your request...</Text>
                        </View>
                      ) : (
                        <View style={styles.activeModalBidsList}>
                          {bids.map((bid) => (
                            <View key={bid.id} style={styles.activeModalBidCard}>
                              <View style={styles.activeModalBidRow}>
                                <View>
                                  <Text style={styles.activeModalBidName}>{bid.serviceProvider.user.fullName}</Text>
                                  {bid.serviceProvider.averageRating != null && bid.serviceProvider.averageRating > 0 && (
                                    <Text style={styles.activeModalBidRating}>★ {bid.serviceProvider.averageRating.toFixed(1)}{bid.serviceProvider.totalRatings ? ` (${bid.serviceProvider.totalRatings})` : ''}</Text>
                                  )}
                                </View>
                                <View style={styles.activeModalBidPriceWrap}>
                                  <Text style={styles.activeModalBidPrice}>${bid.bidPrice.toFixed(2)}</Text>
                                  <Text style={styles.activeModalBidPriceLabel}>Bid</Text>
                                </View>
                              </View>
                              <View style={styles.activeModalBidActions}>
                                <TouchableOpacity style={styles.activeModalBidCallBtn} onPress={() => handleCallProvider(bid.serviceProvider.user.phone)}>
                                  <IconPhone size={18} color="#fff" />
                                  <Text style={styles.activeModalBidCallText}>Call</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={[styles.activeModalBidAcceptBtn, (acceptingBidId === bid.id || acceptingBidId !== null) && styles.activeModalBidAcceptBtnDisabled]}
                                  onPress={() => handleAcceptBid(bid.id)}
                                  disabled={acceptingBidId === bid.id || acceptingBidId !== null}
                                >
                                  {acceptingBidId === bid.id ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                  ) : (
                                    <>
                                      <IconCheck size={18} color="#fff" />
                                      <Text style={styles.activeModalBidAcceptText}>Accept</Text>
                                    </>
                                  )}
                                </TouchableOpacity>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  )}

                  {(activeRequest.status === 'accepted' || activeRequest.status === 'in_progress') && activeRequest.provider && (
                    <View style={styles.activeModalProviderSection}>
                      <Text style={styles.activeModalProviderTitle}>Your provider</Text>
                      <View style={styles.activeModalProviderCard}>
                        <Text style={styles.activeModalProviderName}>{activeRequest.provider.fullName}</Text>
                        <Text style={styles.activeModalProviderPrice}>Agreed: ${Number(activeRequest.price ?? activeRequest.budget ?? 0).toFixed(2)}</Text>
                        <TouchableOpacity style={styles.activeModalProviderCallBtn} onPress={() => handleCallProvider(activeRequest.provider!.phone)}>
                          <IconPhone size={20} color="#fff" />
                          <Text style={styles.activeModalProviderCallText}>Call provider</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {activeRequest.status === 'completed' && (
                    <View style={styles.activeModalCompletedWrap}>
                      <IconCheck size={48} color="#22c55e" />
                      <Text style={styles.activeModalCompletedText}>Service completed</Text>
                      {checkingRating ? (
                        <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: spacing.md }} />
                      ) : !hasRated ? (
                        <>
                          <Text style={styles.rateLabel}>Rate your provider</Text>
                          <View style={styles.rateStarsRow}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <TouchableOpacity key={star} onPress={() => setRatingStars(star)} style={styles.rateStarBtn} activeOpacity={0.8}>
                                <IconStar size={36} color={star <= ratingStars ? '#eab308' : 'rgba(255,255,255,0.3)'} />
                              </TouchableOpacity>
                            ))}
                          </View>
                          <TextInput
                            style={styles.rateReviewInput}
                            placeholder="Review (optional)"
                            placeholderTextColor="rgba(255,255,255,0.5)"
                            value={reviewText}
                            onChangeText={setReviewText}
                            maxLength={500}
                            multiline
                            numberOfLines={3}
                          />
                          <TouchableOpacity
                            style={[styles.rateSubmitBtn, (submittingRating || ratingStars === 0) && styles.rateSubmitBtnDisabled]}
                            onPress={async () => {
                              if (ratingStars === 0 || submittingRating || !activeRequest.provider) return;
                              const token = await getToken();
                              if (!token) return;
                              setSubmittingRating(true);
                              try {
                                await servicesApi.submitRating(token, {
                                  serviceRequestId: activeRequest.id,
                                  rateeId: activeRequest.provider.userId,
                                  raterType: 'customer',
                                  rateeType: 'provider',
                                  rating: ratingStars,
                                  review: reviewText.trim() || null,
                                });
                                setHasRated(true);
                              } catch (e: unknown) {
                                Alert.alert('Error', e instanceof Error ? e.message : 'Failed to submit rating');
                              } finally {
                                setSubmittingRating(false);
                              }
                            }}
                            disabled={submittingRating || ratingStars === 0}
                          >
                            {submittingRating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.rateSubmitBtnText}>Submit rating</Text>}
                          </TouchableOpacity>
                        </>
                      ) : (
                        <TouchableOpacity style={styles.activeModalDoneBtn} onPress={() => { setCompletedDismissed(true); checkActiveRequest(); }}>
                          <Text style={styles.activeModalDoneBtnText}>Done</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  <View style={styles.activeModalDetails}>
                    <View style={styles.activeModalDetailRow}>
                      <Text style={styles.activeModalDetailLabel}>Service</Text>
                      <Text style={styles.activeModalDetailValue}>{activeRequest.service?.name ?? '—'}</Text>
                    </View>
                    <View style={styles.activeModalDetailRow}>
                      <Text style={styles.activeModalDetailLabel}>Job description</Text>
                      <Text style={styles.activeModalDetailValue} numberOfLines={3}>{activeRequest.jobDescription}</Text>
                    </View>
                    <View style={styles.activeModalDetailRow}>
                      <Text style={styles.activeModalDetailLabel}>Budget / Price</Text>
                      <Text style={styles.activeModalDetailValue}>${Number(activeRequest.price ?? activeRequest.budget ?? 0).toLocaleString()}</Text>
                    </View>
                    <View style={styles.activeModalDetailRow}>
                      <Text style={styles.activeModalDetailLabel}>Location</Text>
                      <Text style={styles.activeModalDetailValue}>{activeRequest.location}</Text>
                    </View>
                  </View>

                  {activeRequest.status !== 'cancelled' && activeRequest.status !== 'completed' && (
                    <TouchableOpacity style={[styles.activeModalCancelBtn, cancelling && styles.activeModalCancelBtnDisabled]} onPress={handleCancelRequest} disabled={cancelling}>
                      {cancelling ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.activeModalCancelBtnText}>Cancel request</Text>}
                    </TouchableOpacity>
                  )}
                    </>
                  )}
                </ScrollView>
              </Pressable>
            </Pressable>
          </Modal>

          {!activeRequest && (
            <>
              {/* Select Service */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Select Service</Text>
                {loadingServices ? (
                  <View style={styles.loadingWrap}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.loadingText}>Loading services...</Text>
                  </View>
                ) : services.length === 0 ? (
                  <Text style={styles.mutedText}>No services available at the moment.</Text>
                ) : (
                  <View style={styles.grid}>
                    {services.map((service) => {
                      const selected = selectedServiceId === service.id;
                      return (
                        <TouchableOpacity
                          key={service.id}
                          style={[styles.serviceCard, selected && styles.serviceCardSelected]}
                          onPress={() => setSelectedServiceId(service.id)}
                          activeOpacity={0.8}
                        >
                          <View style={[styles.serviceIconWrap, selected && styles.serviceIconWrapSelected]}>
                            {getServiceIcon(
                              service.iconName,
                              26,
                              selected ? colors.primary : 'rgba(255,255,255,0.8)'
                            )}
                          </View>
                          <Text style={styles.serviceName}>
                            {service.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Job Description – scroll into view when service is selected */}
              {selectedService && (
                <View
                  onLayout={(e) => {
                    if (shouldScrollToFormRef.current && scrollRef.current) {
                      const y = e.nativeEvent.layout.y;
                      scrollRef.current.scrollTo({ y: Math.max(0, y - 24), animated: true });
                      shouldScrollToFormRef.current = false;
                    }
                  }}
                >
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Job Description</Text>
                    <TextInput
                      style={styles.textArea}
                      value={jobDescription}
                      onChangeText={setJobDescription}
                      placeholder="Describe what you need..."
                      placeholderTextColor={colors.placeholder}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                    <Text style={styles.hint}>
                      Complete the sentence above to describe your job requirements
                    </Text>
                  </View>
                </View>
              )}

              {/* Budget */}
              {selectedService && !jobIsDefault && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Budget</Text>
                  <View style={styles.inputWrap}>
                    <View style={styles.inputIcon}>
                      <IconDollar size={20} color={colors.placeholder} />
                    </View>
                    <TextInput
                      style={styles.input}
                      value={budget}
                      onChangeText={(t) => setBudget(t.replace(/[^0-9]/g, ''))}
                      placeholder="Enter your budget (e.g., 100)"
                      placeholderTextColor={colors.placeholder}
                      keyboardType="number-pad"
                    />
                  </View>
                  {budget ? (
                    <Text style={styles.hint}>
                      Budget: ${parseFloat(budget || '0').toLocaleString()}
                    </Text>
                  ) : null}
                </View>
              )}

              {/* Location */}
              {selectedService && !jobIsDefault && budget && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Location</Text>
                  <View style={styles.inputWrap}>
                    <View style={styles.inputIcon}>
                      <IconLocation size={20} color={colors.placeholder} />
                    </View>
                    <TextInput
                      style={styles.input}
                      value={location}
                      onChangeText={setLocation}
                      placeholder="Enter your location"
                      placeholderTextColor={colors.placeholder}
                    />
                  </View>
                </View>
              )}

              {/* Info + Submit */}
              {canSubmit && (
                <>
                  <View style={styles.infoCard}>
                    <Text style={styles.infoText}>
                      <Text style={styles.infoBold}>Great!</Text> We will find you a verified
                      professional to do the job for you at your own home. Our professionals are
                      background-checked and experienced.
                    </Text>
                  </View>
                  <Button
                    title={submitting ? 'Submitting...' : 'Submit Request'}
                    onPress={handleSubmit}
                    loading={submitting}
                    disabled={submitting}
                  />
                </>
              )}
        </>
      )}
    </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
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
  scroll: {
    flex: 1,
  },
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
    width: 40,
    height: 40,
    borderRadius: 20,
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
  activeSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
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
  activeActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  viewDetailsBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  viewDetailsBtnText: {
    color: colors.background,
    fontWeight: '600',
    fontSize: 15,
  },
  cancelSearchBtn: {
    flex: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  cancelSearchBtnText: {
    color: '#f87171',
    fontWeight: '600',
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  modalCloseText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 16,
  },
  modalRow: {
    marginBottom: spacing.md,
  },
  modalLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
  },
  modalValue: {
    fontSize: 15,
    color: '#fff',
    lineHeight: 22,
  },
  modalCancelBtn: {
    marginTop: spacing.lg,
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  modalCancelBtnText: {
    color: '#f87171',
    fontWeight: '600',
    fontSize: 16,
  },
  activeModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  activeModalCard: {
    backgroundColor: 'rgba(120, 90, 12, 0.98)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    maxWidth: '100%',
    maxHeight: '90%',
    width: 400,
  },
  activeModalScroll: { maxHeight: '100%', padding: spacing.lg },
  activeModalTitle: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: spacing.sm },
  activeModalBackToDashboardBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 10,
    marginBottom: spacing.lg,
  },
  activeModalBackToDashboardText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  activeModalBackToDashboardSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  activeModalSearching: { alignItems: 'center', paddingVertical: spacing.xl, marginBottom: spacing.md },
  activeModalSearchIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(245, 191, 25, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  activeModalSearchText: { fontSize: 16, fontWeight: '600', color: colors.primary },
  activeModalSearchSub: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  activeModalBidsSection: { marginBottom: spacing.lg },
  activeModalBidsTitle: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: spacing.md },
  activeModalBidsLoading: { alignItems: 'center', paddingVertical: spacing.lg, gap: 8 },
  activeModalBidsLoadingText: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  activeModalBidsEmpty: { alignItems: 'center', paddingVertical: spacing.xl, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12 },
  activeModalBidsEmptyText: { fontSize: 16, color: 'rgba(255,255,255,0.7)' },
  activeModalBidsEmptySub: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  activeModalBidsList: { gap: 12 },
  activeModalBidCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  activeModalBidRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  activeModalBidName: { fontSize: 16, fontWeight: '600', color: '#fff' },
  activeModalBidRating: { fontSize: 12, color: '#eab308', marginTop: 2 },
  activeModalBidPriceWrap: { alignItems: 'flex-end' },
  activeModalBidPrice: { fontSize: 20, fontWeight: '700', color: colors.primary },
  activeModalBidPriceLabel: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  activeModalBidActions: { flexDirection: 'row', gap: 12, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  activeModalBidCallBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)' },
  activeModalBidCallText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  activeModalBidAcceptBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.primary },
  activeModalBidAcceptBtnDisabled: { opacity: 0.6 },
  activeModalBidAcceptText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  activeModalProviderSection: { marginBottom: spacing.lg },
  activeModalProviderTitle: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: spacing.sm },
  activeModalProviderCard: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  activeModalProviderName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  activeModalProviderPrice: { fontSize: 14, color: colors.primary, fontWeight: '600', marginTop: 4 },
  activeModalProviderCallBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: spacing.md, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.primary },
  activeModalProviderCallText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  activeModalCompletedWrap: { alignItems: 'center', paddingVertical: spacing.lg, marginBottom: spacing.sm },
  activeModalCompletedText: { fontSize: 18, fontWeight: '700', color: '#22c55e', marginTop: 8 },
  activeModalDoneBtn: { marginTop: spacing.md, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, backgroundColor: colors.primary, alignSelf: 'center' },
  activeModalDoneBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  rateLabel: { fontSize: 16, color: 'rgba(255,255,255,0.9)', marginTop: spacing.md, marginBottom: 8 },
  rateStarsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: spacing.md },
  rateStarBtn: { padding: 4 },
  rateReviewInput: { width: '100%', minHeight: 72, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#fff', marginBottom: spacing.md, textAlignVertical: 'top' as const },
  rateSubmitBtn: { marginTop: 4, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, backgroundColor: colors.primary, alignSelf: 'center', minWidth: 140, alignItems: 'center' },
  rateSubmitBtnDisabled: { opacity: 0.6 },
  rateSubmitBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  activeModalDetails: { marginTop: spacing.sm, marginBottom: spacing.md },
  activeModalDetailRow: { marginBottom: spacing.sm },
  activeModalDetailLabel: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 2 },
  activeModalDetailValue: { fontSize: 14, color: '#fff' },
  activeModalCancelBtn: { backgroundColor: 'rgba(239, 68, 68, 0.25)', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: spacing.sm },
  activeModalCancelBtnDisabled: { opacity: 0.7 },
  activeModalCancelBtnText: { fontSize: 16, fontWeight: '600', color: '#fca5a5' },
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
  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  mutedText: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  serviceCard: {
    width: '47%',
    minWidth: '47%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
  },
  serviceCardSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(245, 191, 25, 0.2)',
  },
  serviceIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  serviceIconWrapSelected: {
    backgroundColor: 'rgba(245, 191, 25, 0.2)',
  },
  serviceName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  textArea: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: '#fff',
    fontSize: 16,
    minHeight: 100,
  },
  hint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
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
    paddingRight: spacing.md,
    color: '#fff',
    fontSize: 16,
  },
  infoCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.3)',
  },
  infoText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
  },
  infoBold: {
    fontWeight: '700',
    color: '#fff',
  },
});
