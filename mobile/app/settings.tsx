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
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { safeBack } from '@/lib/safe-back';
import {
  IconArrowBack,
  IconSettings,
  IconPerson,
  IconCall,
  IconBriefcase,
  IconDocument,
  IconCloudUpload,
  IconCheckmarkCircle,
  IconCloseCircle,
  IconWarning,
  IconTrash,
  IconGrid,
  IconCamera,
} from '@/components/DashboardIcons';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { getToken, setUser, clearAuth, clearAllAppStorage } from '@/lib/storage';
import { colors, spacing } from '@/lib/theme';
import { settingsApi } from '@/lib/api';

const MAX_FILE_BYTES = 5 * 1024 * 1024;

/** Compress image from URI to JPEG data URL under 5MB. Accepts any image format. */
async function compressImageToDataUrl(uri: string): Promise<string | null> {
  const attempts: Array<{ width: number; compress: number }> = [
    { width: 1200, compress: 0.8 },
    { width: 1000, compress: 0.6 },
    { width: 800, compress: 0.5 },
    { width: 600, compress: 0.4 },
  ];
  for (const { width, compress } of attempts) {
    try {
      const result = await manipulateAsync(
        uri,
        [{ resize: { width } }],
        { compress, format: SaveFormat.JPEG, base64: true }
      );
      if (!result.base64) continue;
      const sizeBytes = (result.base64.length * 3) / 4;
      if (sizeBytes <= MAX_FILE_BYTES) {
        return `data:image/jpeg;base64,${result.base64}`;
      }
    } catch (_) {
      continue;
    }
  }
  return null;
}

type UserData = {
  id?: string;
  fullName?: string;
  phone?: string;
  profilePictureUrl?: string | null;
  idDocumentUrl?: string | null;
  isVerified?: boolean;
};

export default function SettingsScreen() {
  const [user, setUserState] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [profilePreviewUri, setProfilePreviewUri] = useState<string | null>(null);
  const [idPreviewUri, setIdPreviewUri] = useState<string | null>(null);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingId, setUploadingId] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePhone, setDeletePhone] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const loadUser = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      router.replace('/(auth)/login');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await settingsApi.userMe(token);
      const u = (data.user || null) as UserData | null;
      setUserState(u);
      if (u) await setUser(u as unknown as Record<string, unknown>);
    } catch (_) {
      setUserState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const pickAndUploadProfile = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow photo access to upload profile picture.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      const uri = result.canceled ? null : (result.assets?.[0]?.uri ?? (result as unknown as { uri?: string }).uri);
      if (!uri) return;

      setProfilePreviewUri(uri);
      const token = await getToken();
      if (!token) {
        router.replace('/(auth)/login');
        return;
      }
      setUploadingProfile(true);
      try {
        const dataUrl = await compressImageToDataUrl(uri);
        if (!dataUrl) {
          Alert.alert('Image too large', 'Could not compress image under 5MB. Try a smaller or lower-resolution photo.');
          setProfilePreviewUri(null);
          return;
        }
        const data = await settingsApi.uploadProfile(token, { profilePictureUrl: dataUrl });
        if (data.user) {
          setUserState(data.user as UserData);
          await setUser(data.user);
          setProfilePreviewUri(null);
          Alert.alert('Success', 'Profile picture uploaded successfully!');
        }
      } catch (e: unknown) {
        Alert.alert('Error', e instanceof Error ? e.message : 'Failed to upload profile picture');
      } finally {
        setUploadingProfile(false);
      }
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to select or process image. Please try again.');
    }
  };

  const pickAndUploadId = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow photo access to upload ID document.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
      const uri = result.canceled ? null : (result.assets?.[0]?.uri ?? (result as unknown as { uri?: string }).uri);
      if (!uri) return;

      setIdPreviewUri(uri);
      const token = await getToken();
      if (!token) {
        router.replace('/(auth)/login');
        return;
      }
      setUploadingId(true);
      try {
        const dataUrl = await compressImageToDataUrl(uri);
        if (!dataUrl) {
          Alert.alert('Image too large', 'Could not compress image under 5MB. Try a smaller or lower-resolution photo.');
          setIdPreviewUri(null);
          return;
        }
        const data = await settingsApi.uploadId(token, { idDocumentUrl: dataUrl });
        if (data.user) {
          setUserState(data.user as UserData);
          await setUser(data.user);
          setIdPreviewUri(null);
          Alert.alert('Success', 'ID document uploaded successfully!');
        }
      } catch (e: unknown) {
        Alert.alert('Error', e instanceof Error ? e.message : 'Failed to upload ID document');
      } finally {
        setUploadingId(false);
      }
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to select or process image. Please try again.');
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: async () => {
        await clearAuth();
        router.replace('/(auth)/login');
      } },
    ]);
  };

  const handleBecomeProvider = () => {
    router.push('/become-provider');
  };

  const handleDeleteAccount = async () => {
    if (!deletePhone.trim()) {
      Alert.alert('Error', 'Please enter your phone number to confirm.');
      return;
    }
    const token = await getToken();
    if (!token) {
      router.replace('/(auth)/login');
      return;
    }
    setIsDeleting(true);
    try {
      await settingsApi.deleteAccount(token, { confirmPhone: deletePhone.trim() });
      await clearAuth();
      Alert.alert('Account deleted', 'Your account has been deleted.');
      router.replace('/(auth)/login');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to delete account. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => safeBack('/dashboard')}>
          <IconArrowBack color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <TouchableOpacity style={styles.dashboardBtn} onPress={() => router.push('/dashboard')}>
          <IconGrid color={colors.background} size={22} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Account Information */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <View style={styles.cardIconWrap}>
              <IconSettings color={colors.primary} size={24} />
            </View>
            <Text style={styles.cardTitle}>Account Information</Text>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <IconPerson color="rgba(255,255,255,0.7)" size={22} />
            </View>
            <View>
              <Text style={styles.infoLabel}>Full Name</Text>
              <Text style={styles.infoValue}>{user.fullName ?? '—'}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <IconCall color="rgba(255,255,255,0.7)" size={22} />
            </View>
            <View>
              <Text style={styles.infoLabel}>Phone Number</Text>
              <Text style={styles.infoValue}>{user.phone ?? '—'}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.accountFooter}>
            <View style={styles.verifiedRow}>
              <View style={styles.greenDot} />
              <Text style={styles.verifiedText}>Phone Verified</Text>
            </View>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.logoutBtn, { marginTop: 8 }]}
              onPress={() => {
                Alert.alert(
                  'Free up space',
                  'This will sign you out and clear all app data (saved login, preferences). Use this if you see "storage full" errors. You can sign in again after.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Clear data', style: 'destructive', onPress: async () => {
                      await clearAllAppStorage();
                      router.replace('/(auth)/login');
                    } },
                  ]
                );
              }}
            >
              <Text style={[styles.logoutText, { fontSize: 13 }]}>Free up space (clear app data)</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.becomeProviderBtn} onPress={handleBecomeProvider}>
            <IconBriefcase color={colors.background} size={22} />
            <Text style={styles.becomeProviderText}>Become a Service Provider</Text>
          </TouchableOpacity>
        </View>

        {/* Identity Verification */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <View style={styles.cardIconWrap}>
              <IconDocument color={colors.primary} size={24} />
            </View>
            <Text style={styles.cardTitle}>Identity Verification</Text>
          </View>
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>Important Note</Text>
            <Text style={styles.warningBody}>
              The person in your profile picture must match the person on your ID document. If they don't match, we cannot verify your identity.
            </Text>
          </View>
          <Text style={styles.uploadLabel}>Profile Picture</Text>
          <View style={styles.uploadRow}>
            <View style={styles.previewBox}>
              {(profilePreviewUri || user.profilePictureUrl) ? (
                <Image source={{ uri: (profilePreviewUri || user.profilePictureUrl) ?? undefined }} style={styles.previewImage} resizeMode="cover" />
              ) : (
                <IconCamera color="rgba(255,255,255,0.5)" size={32} />
              )}
            </View>
            <View style={styles.uploadRight}>
              <TouchableOpacity
                style={styles.uploadBtn}
                onPress={pickAndUploadProfile}
                disabled={uploadingProfile}
              >
                {uploadingProfile ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <IconCloudUpload color="#fff" size={20} />
                )}
                <Text style={styles.uploadBtnText}>
                  {uploadingProfile ? 'Uploading...' : user.profilePictureUrl ? 'Change Picture' : 'Upload Picture'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.maxSize}>Max size: 5MB. Large images are compressed automatically.</Text>
            </View>
          </View>
          <Text style={[styles.uploadLabel, { marginTop: spacing.lg }]}>ID Document</Text>
          <View style={styles.uploadRow}>
            <View style={styles.previewBox}>
              {(idPreviewUri || user.idDocumentUrl) ? (
                <Image source={{ uri: (idPreviewUri || user.idDocumentUrl) ?? undefined }} style={styles.previewImage} resizeMode="cover" />
              ) : (
                <IconDocument color="rgba(255,255,255,0.5)" size={32} />
              )}
            </View>
            <View style={styles.uploadRight}>
              <TouchableOpacity
                style={styles.uploadBtn}
                onPress={pickAndUploadId}
                disabled={uploadingId}
              >
                {uploadingId ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <IconCloudUpload color="#fff" size={20} />
                )}
                <Text style={styles.uploadBtnText}>
                  {uploadingId ? 'Uploading...' : user.idDocumentUrl ? 'Change ID' : 'Upload ID Document'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.maxSize}>Max size: 5MB. Large images are compressed automatically.</Text>
            </View>
          </View>
          <View style={[styles.divider, { marginTop: spacing.lg }]} />
          <View style={styles.verificationRow}>
            {user.isVerified ? (
              <>
                <IconCheckmarkCircle color="#4ade80" size={26} />
                <View>
                  <Text style={styles.verifiedGreen}>Identity Verified</Text>
                  <Text style={styles.verifiedSub}>Your identity has been verified by our admin</Text>
                </View>
              </>
            ) : (
              <>
                <IconCloseCircle color={colors.primary} size={26} />
                <View>
                  <Text style={styles.pendingText}>Pending Verification</Text>
                  <Text style={styles.verifiedSub}>
                    {user.idDocumentUrl && user.profilePictureUrl ? 'Waiting for admin review' : 'Please upload your ID and profile picture'}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Delete Account */}
        <View style={styles.deleteCard}>
          <View style={styles.cardTitleRow}>
            <View style={styles.deleteIconWrap}>
              <IconTrash color="#f87171" size={24} />
            </View>
            <Text style={styles.cardTitle}>Delete Account</Text>
          </View>
          <View style={styles.deleteWarningBox}>
            <IconWarning color="#f87171" size={22} />
            <View style={styles.deleteWarningText}>
              <Text style={styles.deleteWarningTitle}>Warning: This action cannot be undone</Text>
              <Text style={styles.deleteWarningBody}>
                Deleting your account will permanently remove all your data including bookings, requests, and verification status. This action is irreversible.
              </Text>
            </View>
          </View>
          {!showDeleteConfirm ? (
            <TouchableOpacity style={styles.deleteBtn} onPress={() => setShowDeleteConfirm(true)}>
              <Text style={styles.deleteBtnText}>Delete My Account</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.deleteConfirmBlock}>
              <Text style={styles.deleteConfirmLabel}>Enter your phone number to confirm deletion</Text>
              <View style={styles.inputWrap}>
                <View style={styles.inputIcon}>
                  <IconCall color="rgba(255,255,255,0.5)" size={20} />
                </View>
                <TextInput
                  style={styles.input}
                  value={deletePhone}
                  onChangeText={setDeletePhone}
                  placeholder="Enter your phone number"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  keyboardType="phone-pad"
                />
              </View>
              <Text style={styles.deleteHint}>Enter your registered phone number: {user.phone}</Text>
              <View style={styles.deleteConfirmActions}>
                <TouchableOpacity
                  style={styles.cancelConfirmBtn}
                  onPress={() => {
                    setShowDeleteConfirm(false);
                    setDeletePhone('');
                  }}
                >
                  <Text style={styles.cancelConfirmText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmDeleteBtn, (!deletePhone.trim() || isDeleting) && styles.confirmDeleteBtnDisabled]}
                  onPress={handleDeleteAccount}
                  disabled={!deletePhone.trim() || isDeleting}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <IconTrash color="#fff" size={18} />
                      <Text style={styles.confirmDeleteText}>Confirm Delete</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.7)',
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  dashboardBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 191, 25, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  infoIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  infoLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: spacing.md,
  },
  accountFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  greenDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4ade80',
  },
  verifiedText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#4ade80',
  },
  logoutBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  logoutText: {
    color: '#f87171',
    fontWeight: '600',
    fontSize: 15,
  },
  becomeProviderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
  },
  becomeProviderText: {
    color: colors.background,
    fontWeight: '600',
    fontSize: 16,
  },
  warningBox: {
    backgroundColor: 'rgba(245, 191, 25, 0.1)',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(245, 191, 25, 0.2)',
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#facc15',
    marginBottom: 4,
  },
  warningBody: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
  },
  uploadLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
  },
  uploadRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
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
  verificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  verifiedGreen: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4ade80',
  },
  pendingText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  verifiedSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  deleteCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 20,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  deleteIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  deleteWarningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  deleteWarningText: { flex: 1 },
  deleteWarningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f87171',
    marginBottom: 4,
  },
  deleteWarningBody: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
  },
  deleteBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    alignItems: 'center',
  },
  deleteBtnText: {
    color: '#f87171',
    fontWeight: '600',
    fontSize: 16,
  },
  deleteConfirmBlock: {
    marginTop: 0,
  },
  deleteConfirmLabel: {
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
    marginBottom: 8,
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
  deleteHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: spacing.md,
  },
  deleteConfirmActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelConfirmBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
  },
  cancelConfirmText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  confirmDeleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    borderRadius: 12,
  },
  confirmDeleteBtnDisabled: {
    opacity: 0.5,
  },
  confirmDeleteText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
