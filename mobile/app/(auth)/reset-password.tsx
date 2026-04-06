import { useState } from 'react';
import { View, Text, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { AuthScreen } from '@/components/AuthScreen';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { authApi } from '@/lib/api';
import { getTempPhone, removeTempPhone } from '@/lib/storage';
import { useEffect } from 'react';

export default function ResetPasswordScreen() {
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState<string | null>(null);

  useEffect(() => {
    getTempPhone().then(setPhone);
  }, []);

  const handleSubmit = async () => {
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (!phone) {
      Alert.alert('Error', 'Phone number not found. Please try again.');
      router.replace('/(auth)/forgot-password');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword({ phone, otp, newPassword });
      await removeTempPhone();
      Alert.alert('Success', 'Password reset successfully!', [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]);
    } catch (e: unknown) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AuthScreen title="Reset Password" subtitle="Enter OTP and new password" footer={
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
            Remember your password?{' '}
            <Text style={{ color: 'rgb(245, 191, 25)', fontWeight: '600' }} onPress={() => router.replace('/(auth)/login')}>Sign in</Text>
          </Text>
        </View>
      }>
        <Input label="OTP Code" placeholder="123456" value={otp} onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))} maxLength={6} keyboardType="number-pad" style={{ textAlign: 'center', fontSize: 22, letterSpacing: 8 }} editable={!loading} />
        <Input label="New Password" placeholder="Enter new password" value={newPassword} onChangeText={setNewPassword} secureTextEntry editable={!loading} />
        <Input label="Confirm Password" placeholder="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry editable={!loading} />
        <Button title={loading ? 'Resetting Password...' : 'Reset Password'} onPress={handleSubmit} loading={loading} />
      </AuthScreen>
    </KeyboardAvoidingView>
  );
}
