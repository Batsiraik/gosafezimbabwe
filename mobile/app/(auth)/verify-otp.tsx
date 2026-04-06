import { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { router } from 'expo-router';
import { AuthScreen } from '@/components/AuthScreen';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { authApi } from '@/lib/api';
import { getTempPhone, removeTempPhone, setToken, setUser } from '@/lib/storage';
import { useEffect } from 'react';

export default function VerifyOtpScreen() {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState<string | null>(null);

  useEffect(() => {
    getTempPhone().then(setPhone);
  }, []);

  const handleVerify = async () => {
    if (!phone) {
      Alert.alert('Error', 'Phone number not found. Please register again.');
      router.replace('/(auth)/register');
      return;
    }
    if (!otp.trim()) {
      Alert.alert('Error', 'Enter the 6-digit code');
      return;
    }
    setLoading(true);
    try {
      const data = await authApi.verifyOtp({ phone, otp: otp.trim() });
      await setToken(data.token);
      await setUser(data.user);
      await removeTempPhone();
      router.replace('/dashboard');
    } catch (e: unknown) {
      Alert.alert('Verification failed', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen title="Verify OTP" subtitle="Enter the 6-digit code sent to your phone" footer={
      <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center' }}>
        Didn't receive the code? Resend
      </Text>
    }>
      <Input
        label="OTP Code"
        placeholder="123456"
        value={otp}
        onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
        maxLength={6}
        keyboardType="number-pad"
        style={{ textAlign: 'center', fontSize: 22, letterSpacing: 8 }}
        editable={!loading}
      />
      <Button title={loading ? 'Verifying...' : 'Verify OTP'} onPress={handleVerify} loading={loading} />
    </AuthScreen>
  );
}
