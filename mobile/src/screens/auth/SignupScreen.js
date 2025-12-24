import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextInput, Button, Text, Snackbar } from 'react-native-paper';
import { authAPI } from '../../services/api';

const SignupScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    year: '',
    semester: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSignup = async () => {
    if (!formData.name || !formData.email || !formData.phone || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    // Validate year and semester
    if (!formData.year || formData.year < 1 || formData.year > 4) {
      setError('Please enter a valid year (1-4)');
      return;
    }

    if (!formData.semester || formData.semester < 1 || formData.semester > 8) {
      setError('Please enter a valid semester (1-8)');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authAPI.register(formData);
      navigation.navigate('OTP', { userId: response.data.userId });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text variant="headlineMedium" style={styles.title}>
            Create Account
          </Text>

          <TextInput
            label="Name"
            value={formData.name}
            onChangeText={(value) => handleChange('name', value)}
            mode="outlined"
            style={styles.input}
          />

          <TextInput
            label="College Email"
            value={formData.email}
            onChangeText={(value) => handleChange('email', value)}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />

          <View style={styles.row}>
            <View style={[styles.halfWidth]}>
              <TextInput
                label="Year"
                value={formData.year === '' ? '' : formData.year.toString()}
                onChangeText={(value) => {
                  // Allow empty string or valid numbers 1-4
                  if (value === '') {
                    handleChange('year', '');
                  } else {
                    const year = parseInt(value);
                    if (!isNaN(year) && year >= 1 && year <= 4) {
                      handleChange('year', year);
                    }
                  }
                }}
                mode="outlined"
                keyboardType="number-pad"
                style={styles.input}
              />
            </View>

            <View style={[styles.halfWidth]}>
              <TextInput
                label="Semester"
                value={formData.semester === '' ? '' : formData.semester.toString()}
                onChangeText={(value) => {
                  // Allow empty string or valid numbers 1-8
                  if (value === '') {
                    handleChange('semester', '');
                  } else {
                    const sem = parseInt(value);
                    if (!isNaN(sem) && sem >= 1 && sem <= 8) {
                      handleChange('semester', sem);
                    }
                  }
                }}
                mode="outlined"
                keyboardType="number-pad"
                style={styles.input}
              />
            </View>
          </View>

          <TextInput
            label="Phone Number"
            value={formData.phone}
            onChangeText={(value) => handleChange('phone', value)}
            mode="outlined"
            keyboardType="phone-pad"
            style={styles.input}
          />

          <TextInput
            label="Password"
            value={formData.password}
            onChangeText={(value) => handleChange('password', value)}
            mode="outlined"
            secureTextEntry
            style={styles.input}
          />

          <TextInput
            label="Confirm Password"
            value={formData.confirmPassword}
            onChangeText={(value) => handleChange('confirmPassword', value)}
            mode="outlined"
            secureTextEntry
            style={styles.input}
          />

          <Button
            mode="contained"
            onPress={handleSignup}
            loading={loading}
            style={styles.button}
          >
            Sign Up
          </Button>

          <Button
            mode="text"
            onPress={() => navigation.navigate('Login')}
            style={styles.linkButton}
          >
            Already have an account? Login
          </Button>
        </View>
      </ScrollView>

      <Snackbar
        visible={!!error}
        onDismiss={() => setError('')}
        duration={3000}
      >
        {error}
      </Snackbar>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  content: {
    width: '100%',
  },
  title: {
    textAlign: 'center',
    marginBottom: 30,
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 15,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  label: {
    marginBottom: 5,
    fontSize: 12,
    color: '#666',
  },
  pickerButton: {
    justifyContent: 'flex-start',
  },
  button: {
    marginTop: 10,
    paddingVertical: 5,
  },
  linkButton: {
    marginTop: 15,
  },
});

export default SignupScreen;

