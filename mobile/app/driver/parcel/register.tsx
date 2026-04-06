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
import { IconArrowBack, IconBicycle, IconDocument, IconCloudUpload } from '@/components/DashboardIcons';
import * as ImagePicker from 'expo-image-picker';
import { getToken } from '@/lib/storage';
import { setUserMode } from '@/lib/storage';
import { colors, spacing } from '@/lib/theme';
import { driverParcelApi } from '@/lib/api';
import { compressImageToDataUrl } from '@/lib/image-utils';

const MAX_INPUT_MB = 10;

export default function DriverParcelRegisterScreen() {
  const [licenseNumber, setLicenseNumber] = useState('');
  const [bikeRegistration, setBikeRegistration] = useState('');
  const [licensePreviewUri, setLicensePreviewUri] = useState<string | null>(null);
  const [licenseDataUrl, setLicenseDataUrl] = useState<string | null>(null);
  const [bikePreviewUri, setBikePreviewUri] = useState<string | null>(null);
  const [bikePictureDataUrl, setBikePictureDataUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);

  const pickAndCompress = async (
    setPreviewUri: (uri: string | null) => void,
    setDataUrl: (url: string | null) => void
  ): Promise<boolean> => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow photo access to upload license and bike images.');
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
      Alert.alert('Error', 'Please enter your license number');
      return;
    }
    if (!licenseDataUrl) {
      Alert.alert('Error', 'Please upload your license photo');
      return;
    }
    if (!bikeRegistration.trim()) {
      Alert.alert('Error', 'Please enter your bike registration number');
      return;
    }
    if (!bikePictureDataUrl) {
      Alert.alert('Error', 'Please upload a picture of your bike showing the registration number clearly');
      return;
    }
    const token = await getToken();
    if (!token) {
      router.replace('/(auth)/login');
      return;
    }
    setSubmitting(true);
    try {
      await driverParcelApi.register(token, {
        licenseNumber: licenseNumber.trim(),
        licenseUrl: licenseDataUrl,
        bikeRegistration: bikeRegistration.trim().toUpperCase(),
        bikePictureUrl: bikePictureDataUrl,
      });
      await setUserMode('parcel');
      Alert.alert('Success', 'Registration submitted! Waiting for verification...');
      router.replace('/driver/parcel/dashboard');
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
        <Text style={styles.headerTitle}>Register as Parcel Driver</Text>
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
          {/* Main card */}
          <View style={styles.card}>
            {/* Motorbike Parcel Delivery */}
            <View style={styles.motorbikeRow}>
              <View style={styles.motorbikeIconWrap}>
                <IconBicycle color={colors.primary} size={28} />
              </View>
              <View>
                <Text style={styles.motorbikeTitle}>Motorbike Parcel Delivery</Text>
                <Text style={styles.motorbikeSub}>Complete your registration to start delivering parcels</Text>
              </View>
            </View>

            {/* Driver's License Number */}
            <Text style={styles.label}>Driver's License Number *</Text>
            <TextInput
              style={styles.input}
              value={licenseNumber}
              onChangeText={setLicenseNumber}
              placeholder="Enter your license number"
              placeholderTextColor={colors.placeholder}
              editable={!submitting}
            />

            {/* License Photo */}
            <Text style={[styles.label, { marginTop: spacing.md }]}>License Photo *</Text>
            <TouchableOpacity
              style={styles.uploadZone}
              onPress={() => pickAndCompress(setLicensePreviewUri, setLicenseDataUrl)}
              disabled={submitting || processingImage}
            >
              {(licensePreviewUri || licenseDataUrl) ? (
                <View style={styles.previewWrap}>
                  <Image source={{ uri: (licensePreviewUri || licenseDataUrl) ?? undefined }} style={styles.previewImage} resizeMode="cover" />
                  <Text style={styles.uploadZoneText}>{processingImage ? 'Processing...' : 'Change License Photo'}</Text>
                </View>
              ) : (
                <>
                  {processingImage ? <ActivityIndicator size="small" color={colors.primary} /> : <IconCloudUpload color="rgba(255,255,255,0.5)" size={32} />}
                  <Text style={styles.uploadZoneText}>Upload License Photo</Text>
                </>
              )}
            </TouchableOpacity>
            <Text style={styles.maxSize}>Max size: 10MB (auto-compressed)</Text>

            {/* Bike Registration Number */}
            <Text style={[styles.label, { marginTop: spacing.lg }]}>Bike Registration Number *</Text>
            <TextInput
              style={styles.input}
              value={bikeRegistration}
              onChangeText={(t) => setBikeRegistration(t.toUpperCase())}
              placeholder="Enter your bike registration number"
              placeholderTextColor={colors.placeholder}
              editable={!submitting}
              autoCapitalize="characters"
            />

            {/* Bike Picture */}
            <Text style={[styles.label, { marginTop: spacing.md }]}>
              Bike Picture (Showing Registration Number) *
            </Text>
            <Text style={styles.hint}>
              Please upload a clear picture of your bike showing the registration number plate clearly visible
            </Text>
            <TouchableOpacity
              style={styles.uploadZone}
              onPress={() => pickAndCompress(setBikePreviewUri, setBikePictureDataUrl)}
              disabled={submitting || processingImage}
            >
              {(bikePreviewUri || bikePictureDataUrl) ? (
                <View style={styles.previewWrap}>
                  <Image source={{ uri: (bikePreviewUri || bikePictureDataUrl) ?? undefined }} style={styles.previewImage} resizeMode="cover" />
                  <Text style={styles.uploadZoneText}>{processingImage ? 'Processing...' : 'Change Bike Picture'}</Text>
                </View>
              ) : (
                <>
                  {processingImage ? <ActivityIndicator size="small" color={colors.primary} /> : <IconCloudUpload color="rgba(255,255,255,0.5)" size={32} />}
                  <Text style={styles.uploadZoneText}>Upload Bike Picture</Text>
                </>
              )}
            </TouchableOpacity>
            <Text style={styles.maxSize}>Max size: 10MB (auto-compressed)</Text>

            {/* Note */}
            <View style={styles.noteCard}>
              <Text style={styles.noteText}>
                <Text style={styles.noteBold}>Note:</Text> Your documents will be reviewed by our admin team. Verification may take a few hours. You'll be able to start accepting parcel delivery requests once verified.
              </Text>
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
  motorbikeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  motorbikeIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(245, 191, 25, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  motorbikeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  motorbikeSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    color: '#fff',
    fontSize: 16,
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
  previewWrap: {
    width: '100%',
    alignItems: 'center',
  },
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
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: {
    color: colors.background,
    fontWeight: '600',
    fontSize: 16,
  },
});
