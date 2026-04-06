import { useState } from 'react';
import { View, Text, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Fragment } from 'react';
import { router } from 'expo-router';
import { AuthScreen } from '@/components/AuthScreen';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { authApi } from '@/lib/api';
import { setToken, setUser } from '@/lib/storage';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!phone.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter phone and password');
      return;
    }
    setLoading(true);
    try {
      const data = await authApi.login({ phone: phone.trim(), password });
      await setToken(data.token);
      await setUser(data.user);
      router.replace('/dashboard');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e ?? 'Please try again.');
      const isStorageFull = /SQLITE_FULL|disk is full|database or disk is full/i.test(msg);
      if (isStorageFull) {
        Alert.alert(
          'Storage full',
          'Your device has run out of storage, so the app cannot save your login. Free up space (delete photos, apps, or clear GO SAFE app data in Settings), then try again.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Login failed', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AuthScreen
        title="Welcome Back"
        subtitle="Sign in to your GO SAFE account"
        footer={
          <View>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center', marginBottom: 8 }} onPress={() => router.push('/(auth)/forgot-password')}>
              Forgot your password?
            </Text>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
                Don't have an account?{' '}
                <Text style={{ color: 'rgb(245, 191, 25)', fontWeight: '600' }} onPress={() => router.push('/(auth)/register')}>Sign up</Text>
              </Text>
            </View>
          </View>
        }
      >
        <Input label="Phone Number" placeholder="0771234567" value={phone} onChangeText={setPhone} keyboardType="phone-pad" editable={!loading} />
        <Input label="Password" placeholder="Enter your password" value={password} onChangeText={setPassword} secureTextEntry editable={!loading} />
        <Button title={loading ? 'Signing In...' : 'Sign In'} onPress={handleLogin} loading={loading} />
      </AuthScreen>
    </KeyboardAvoidingView>
  );
}
