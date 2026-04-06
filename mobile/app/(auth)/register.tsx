import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { AuthScreen } from '@/components/AuthScreen';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { authApi } from '@/lib/api';
import { setToken, setUser } from '@/lib/storage';

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName.trim() || !phone.trim() || !password.trim()) {
      Alert.alert('Error', 'All fields are required');
      return;
    }
    setLoading(true);
    try {
      const data = await authApi.register({ fullName: fullName.trim(), phone: phone.trim(), password });
      await setToken(data.token);
      await setUser(data.user);
      router.replace('/dashboard');
    } catch (e: unknown) {
      Alert.alert('Registration failed', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AuthScreen title="Create Account" subtitle="Join GO SAFE today" footer={
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
            Already have an account?{' '}
            <Text style={{ color: 'rgb(245, 191, 25)', fontWeight: '600' }} onPress={() => router.replace('/(auth)/login')}>Sign in</Text>
          </Text>
        </View>
      }>
        <Input label="Full Name" placeholder="John Doe" value={fullName} onChangeText={setFullName} editable={!loading} />
        <Input label="Phone Number" placeholder="0771234567" value={phone} onChangeText={setPhone} keyboardType="phone-pad" editable={!loading} />
        <Input label="Password" placeholder="Create a password" value={password} onChangeText={setPassword} secureTextEntry editable={!loading} />
        <Button title={loading ? 'Creating Account...' : 'Create Account'} onPress={handleRegister} loading={loading} />
      </AuthScreen>
    </KeyboardAvoidingView>
  );
}
