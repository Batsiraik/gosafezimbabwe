import { useState } from 'react';
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
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { router } from 'expo-router';
import { safeBack } from '@/lib/safe-back';
import { IconArrowBack, IconCar, IconDocument, IconCloudUpload, IconWarning } from '@/components/DashboardIcons';
import * as ImagePicker from 'expo-image-picker';
import { getToken } from '@/lib/storage';
import { setUserMode } from '@/lib/storage';
import { colors, spacing } from '@/lib/theme';
import { driverTaxiApi } from '@/lib/api';
import { compressImageToDataUrl } from '@/lib/image-utils';

const MAX_INPUT_MB = 10;

export default function DriverTaxiRegisterScreen() {
  const [licenseNumber, setLicenseNumber] = useState('');
  const [carRegistration, setCarRegistration] = useState('');
  const [licensePreviewUri, setLicensePreviewUri] = useState<string | null>(null);
  const [licenseDataUrl, setLicenseDataUrl] = useState<string | null>(null);
  const [carPreviewUri, setCarPreviewUri] = useState<string | null>(null);
  const [carPictureDataUrl, setCarPictureDataUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);

  const pickAndCompress = async (
    setPreviewUri: (uri: string | null) => void,
    setDataUrl: (url: string | null) => void
  ): Promise<boolean> => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow photo access to upload license and car images.');
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

  const handleSubmit = async () => {
    if (!licenseNumber.trim()) {
      Alert.alert('Error', 'Please enter your driver license number');
      return;
    }
    if (!carRegistration.trim()) {
      Alert.alert('Error', 'Please enter your car registration number');
      return;
    }
    if (!licenseDataUrl) {
      Alert.alert('Error', 'Please upload your driver license');
      return;
    }
    if (!carPictureDataUrl) {
      Alert.alert('Error', 'Please upload a picture of your car showing the registration number');
      return;
    }
    const token = await getToken();
    if (!token) {
      router.replace('/(auth)/login');
      return;
    }
    setSubmitting(true);
    try {
      await driverTaxiApi.register(token, {
        licenseNumber: licenseNumber.trim(),
        carRegistration: carRegistration.trim().toUpperCase(),
        licenseUrl: licenseDataUrl,
        carPictureUrl: carPictureDataUrl,
      });
      await setUserMode('taxi');
      Alert.alert('Success', 'Registration submitted! Your documents are under review.');
      router.replace('/driver/taxi/dashboard');
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
        <Text style={styles.headerTitle}>Register as a Driver</Text>
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
          {/* Verification Required */}
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              <Text style={styles.infoBold}>Verification Required:</Text> Please provide your driver's license and car registration details. Your documents will be reviewed by our admin team before you can start accepting rides.
            </Text>
          </View>

          {/* Driver License Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Driver License Information</Text>
            <Text style={styles.label}>License Number</Text>
            <View style={styles.inputWrap}>
              <IconDocument color={colors.placeholder} size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={licenseNumber}
                onChangeText={setLicenseNumber}
                placeholder="Enter your driver license number"
                placeholderTextColor={colors.placeholder}
                editable={!submitting}
              />
            </View>
            <Text style={[styles.label, { marginTop: spacing.md }]}>Driver License Photo</Text>
            <View style={styles.uploadRow}>
              <View style={styles.previewBox}>
                {(licensePreviewUri || licenseDataUrl) ? (
                  <Image source={{ uri: (licensePreviewUri || licenseDataUrl) ?? undefined }} style={styles.previewImage} resizeMode="cover" />
                ) : (
                  <IconDocument color="rgba(255,255,255,0.5)" size={32} />
                )}
              </View>
              <View style={styles.uploadRight}>
                <TouchableOpacity
                  style={styles.uploadBtn}
                  onPress={() => pickAndCompress(setLicensePreviewUri, setLicenseDataUrl)}
                  disabled={submitting || processingImage}
                >
                  {processingImage ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <IconCloudUpload color="#fff" size={20} />
                  )}
                  <Text style={styles.uploadBtnText}>
                    {licenseDataUrl ? 'Change License' : 'Upload License'}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.maxSize}>Max size: 10MB (auto-compressed)</Text>
              </View>
            </View>
          </View>

          {/* Car Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Car Information</Text>
            <Text style={styles.label}>Car Registration Number</Text>
            <View style={styles.inputWrap}>
              <IconCar color={colors.placeholder} size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={carRegistration}
                onChangeText={(t) => setCarRegistration(t.toUpperCase())}
                placeholder="Enter car registration number"
                placeholderTextColor={colors.placeholder}
                editable={!submitting}
                autoCapitalize="characters"
              />
            </View>
            <Text style={[styles.label, { marginTop: spacing.md }]}>
              Car Picture (showing registration number clearly)
            </Text>
            <View style={styles.warningBox}>
              <IconWarning color="#facc15" size={20} />
              <Text style={styles.warningText}>
                Important: The car picture must clearly show the registration number plate
              </Text>
            </View>
            <View style={styles.uploadRow}>
              <View style={styles.previewBox}>
                {(carPreviewUri || carPictureDataUrl) ? (
                  <Image source={{ uri: (carPreviewUri || carPictureDataUrl) ?? undefined }} style={styles.previewImage} resizeMode="cover" />
                ) : (
                  <IconCar color="rgba(255,255,255,0.5)" size={32} />
                )}
              </View>
              <View style={styles.uploadRight}>
                <TouchableOpacity
                  style={styles.uploadBtn}
                  onPress={() => pickAndCompress(setCarPreviewUri, setCarPictureDataUrl)}
                  disabled={submitting || processingImage}
                >
                  {processingImage ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <IconCloudUpload color="#fff" size={20} />
                  )}
                  <Text style={styles.uploadBtnText}>
                    {carPictureDataUrl ? 'Change Picture' : 'Upload Car Picture'}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.maxSize}>Max size: 10MB (auto-compressed)</Text>
              </View>
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <Text style={styles.submitBtnText}>Submit for Verification</Text>
            )}
          </TouchableOpacity>
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
  infoCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.3)',
  },
  infoText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 22,
  },
  infoBold: { fontWeight: '700', color: '#fff' },
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
  },
  inputIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingLeft: 44,
    paddingRight: spacing.md,
    color: '#fff',
    fontSize: 16,
  },
  uploadRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginTop: 8,
  },
  previewBox: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  uploadRight: { flex: 1 },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  uploadBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  maxSize: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 8,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: 'rgba(250, 204, 21, 0.1)',
    borderRadius: 12,
    padding: spacing.sm,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.2)',
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#facc15',
  },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: {
    color: colors.background,
    fontWeight: '600',
    fontSize: 16,
  },
});
