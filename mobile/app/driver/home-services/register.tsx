import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { router } from 'expo-router';
import { safeBack } from '@/lib/safe-back';
import { IconArrowBack, IconWrench, IconDocument, IconCloudUpload, IconCheckmarkCircle } from '@/components/DashboardIcons';
import * as ImagePicker from 'expo-image-picker';
import { getToken } from '@/lib/storage';
import { setUserMode } from '@/lib/storage';
import { colors, spacing } from '@/lib/theme';
import { driverHomeServicesApi, servicesApi } from '@/lib/api';
import { compressImageToDataUrl } from '@/lib/image-utils';

const MAX_INPUT_MB = 10;

type Service = { id: string; name: string; iconName?: string; isActive?: boolean };

export default function DriverHomeServicesRegisterScreen() {
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [nationalIdPreviewUri, setNationalIdPreviewUri] = useState<string | null>(null);
  const [nationalIdDataUrl, setNationalIdDataUrl] = useState<string | null>(null);
  const [selfiePreviewUri, setSelfiePreviewUri] = useState<string | null>(null);
  const [selfieDataUrl, setSelfieDataUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);

  const loadServices = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    setLoadingServices(true);
    try {
      const data = await servicesApi.list(token);
      const list = (data.services || []) as Service[];
      setServices(list.filter((s) => s.isActive !== false));
    } catch (_) {
      setServices([]);
    } finally {
      setLoadingServices(false);
    }
  }, []);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const pickAndCompress = async (
    setPreviewUri: (uri: string | null) => void,
    setDataUrl: (url: string | null) => void
  ): Promise<boolean> => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow photo access to upload ID and selfie.');
        return false;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
      const uri = result.canceled ? null : (result.assets?.[0]?.uri ?? (result as unknown as { uri?: string }).uri);
      if (!uri) return false;

      setPreviewUri(uri);
      setDataUrl(null);
      setProcessingImage(true);
      try {
        const dataUrl = await compressImageToDataUrl(uri, MAX_INPUT_MB * 1024 * 1024);
        if (!dataUrl) {
          Alert.alert(
            'Image too large',
            `Could not compress image under ${MAX_INPUT_MB}MB. Try a smaller or lower-resolution photo.`
          );
          setPreviewUri(null);
          return false;
        }
        setDataUrl(dataUrl);
        return true;
      } finally {
        setProcessingImage(false);
      }
    } catch (e) {
      setProcessingImage(false);
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to select or process image. Please try again.');
      return false;
    }
  };

  const toggleService = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!nationalIdDataUrl) {
      Alert.alert('Error', 'Please upload your National ID');
      return;
    }
    if (!selfieDataUrl) {
      Alert.alert('Error', 'Please upload a recent selfie');
      return;
    }
    if (selectedIds.length === 0) {
      Alert.alert('Error', 'Please select at least one service you want to provide');
      return;
    }
    const token = await getToken();
    if (!token) {
      router.replace('/(auth)/login');
      return;
    }
    setSubmitting(true);
    try {
      await driverHomeServicesApi.register(token, {
        nationalIdUrl: nationalIdDataUrl,
        selfieUrl: selfieDataUrl,
        serviceIds: selectedIds,
      });
      await setUserMode('home-services');
      Alert.alert('Success', 'Registration submitted! Waiting for verification...');
      router.replace('/driver/home-services/dashboard');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to register. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => safeBack('/become-provider')}>
          <IconArrowBack color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Register as Service Provider</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            {/* Home Service Provider intro */}
            <View style={styles.introRow}>
              <View style={styles.introIconWrap}>
                <IconWrench color={colors.primary} size={28} />
              </View>
              <View>
                <Text style={styles.introTitle}>Home Service Provider</Text>
                <Text style={styles.introSub}>Complete your registration to start providing services</Text>
              </View>
            </View>

            {/* National ID Photo */}
            <Text style={styles.label}>National ID Photo *</Text>
            <TouchableOpacity
              style={styles.uploadZone}
              onPress={() => pickAndCompress(setNationalIdPreviewUri, setNationalIdDataUrl)}
              disabled={submitting || processingImage}
            >
              {(nationalIdPreviewUri || nationalIdDataUrl) ? (
                <View style={styles.previewWrap}>
                  <Image source={{ uri: (nationalIdPreviewUri || nationalIdDataUrl) ?? undefined }} style={styles.previewImage} resizeMode="cover" />
                  <Text style={styles.uploadZoneText}>{processingImage ? 'Processing...' : 'Change National ID Photo'}</Text>
                </View>
              ) : (
                <>
                  {processingImage ? <ActivityIndicator size="small" color={colors.primary} /> : <IconCloudUpload color="rgba(255,255,255,0.5)" size={32} />}
                  <Text style={styles.uploadZoneText}>Upload National ID Photo</Text>
                </>
              )}
            </TouchableOpacity>
            <Text style={styles.maxSize}>Max size: 10MB (auto-compressed)</Text>

            {/* Recent Selfie */}
            <Text style={[styles.label, { marginTop: spacing.lg }]}>Recent Selfie *</Text>
            <Text style={styles.hint}>
              Please upload a recent clear photo of yourself. The person in the selfie must match the person on your National ID.
            </Text>
            <TouchableOpacity
              style={styles.uploadZone}
              onPress={() => pickAndCompress(setSelfiePreviewUri, setSelfieDataUrl)}
              disabled={submitting || processingImage}
            >
              {(selfiePreviewUri || selfieDataUrl) ? (
                <View style={styles.previewWrap}>
                  <Image source={{ uri: (selfiePreviewUri || selfieDataUrl) ?? undefined }} style={styles.previewImage} resizeMode="cover" />
                  <Text style={styles.uploadZoneText}>{processingImage ? 'Processing...' : 'Change Selfie'}</Text>
                </View>
              ) : (
                <>
                  {processingImage ? <ActivityIndicator size="small" color={colors.primary} /> : <IconCloudUpload color="rgba(255,255,255,0.5)" size={32} />}
                  <Text style={styles.uploadZoneText}>Upload Recent Selfie</Text>
                </>
              )}
            </TouchableOpacity>
            <Text style={styles.maxSize}>Max size: 10MB (auto-compressed)</Text>

            {/* Select Services */}
            <Text style={[styles.label, { marginTop: spacing.lg }]}>
              Select Services You Provide * (Select one or more)
            </Text>
            {loadingServices ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Loading services...</Text>
              </View>
            ) : (
              <View style={styles.servicesGrid}>
                {services.map((service) => {
                  const selected = selectedIds.includes(service.id);
                  return (
                    <TouchableOpacity
                      key={service.id}
                      style={[styles.serviceCard, selected && styles.serviceCardSelected]}
                      onPress={() => toggleService(service.id)}
                      activeOpacity={0.8}
                    >
                      {selected && (
                        <IconCheckmarkCircle color={colors.primary} size={18} style={styles.serviceCheck} />
                      )}
                      <Text style={[styles.serviceName, selected && styles.serviceNameSelected]} numberOfLines={2}>
                        {service.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Note */}
            <View style={styles.noteCard}>
              <Text style={styles.noteText}>
                <Text style={styles.noteBold}>Note:</Text> Your documents will be reviewed by our admin team. Verification may take a few hours. You'll be able to start accepting service requests once verified.
              </Text>
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[
                styles.submitBtn,
                (submitting || loadingServices || selectedIds.length === 0) && styles.submitBtnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={submitting || loadingServices || selectedIds.length === 0}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <>
                  <IconDocument color={colors.background} size={22} />
                  <Text style={styles.submitBtnText}>Submit Registration</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
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
  card: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  introRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  introIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(245, 191, 25, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  introTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  introSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  uploadZone: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  uploadZoneText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 8,
  },
  previewWrap: { width: '100%', alignItems: 'center' },
  previewImage: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    resizeMode: 'contain',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  maxSize: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 8,
  },
  hint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 8,
    lineHeight: 18,
  },
  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  serviceCard: {
    width: '48%',
    minWidth: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  serviceCardSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(245, 191, 25, 0.2)',
  },
  serviceCheck: {
    marginRight: 6,
  },
  serviceName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },
  serviceNameSelected: {
    color: '#fff',
  },
  noteCard: {
    backgroundColor: 'rgba(250, 204, 21, 0.1)',
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.2)',
  },
  noteText: {
    fontSize: 14,
    color: '#facc15',
    lineHeight: 22,
  },
  noteBold: { fontWeight: '700' },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: {
    color: colors.background,
    fontWeight: '600',
    fontSize: 16,
  },
});
