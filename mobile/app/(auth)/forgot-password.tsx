import { useState } from 'react';
import { View, Text, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { AuthScreen } from '@/components/AuthScreen';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { authApi } from '@/lib/api';
import { setTempPhone } from '@/lib/storage';

export default function ForgotPasswordScreen() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!phone.trim()) {
      Alert.alert('Error', 'Enter your phone number');
      return;
    }
    setLoading(true);
    try {
      await authApi.forgotPassword({ phone: phone.trim() });
      await setTempPhone(phone.trim());
      router.replace('/(auth)/reset-password');
    } catch (e: unknown) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AuthScreen title="Forgot Password" subtitle="Enter your phone number to reset password" footer={
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
            Remember your password?{' '}
            <Text style={{ color: 'rgb(245, 191, 25)', fontWeight: '600' }} onPress={() => router.replace('/(auth)/login')}>Sign in</Text>
          </Text>
        </View>
      }>
        <Input label="Phone Number" placeholder="0771234567" value={phone} onChangeText={setPhone} keyboardType="phone-pad" editable={!loading} />
        <Button title={loading ? 'Sending OTP...' : 'Send OTP'} onPress={handleSubmit} loading={loading} />
      </AuthScreen>
    </KeyboardAvoidingView>
  );
}
