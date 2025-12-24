import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextInput, Button, Text, Snackbar } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../services/api';
import { useNavigation } from '@react-navigation/native';

const EditProfileScreen = () => {
  const { user, updateUser } = useAuth();
  const navigation = useNavigation();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    year: user?.year?.toString() || '',
    semester: user?.semester?.toString() || '',
    emergencyContact: {
      name: user?.emergencyContact?.name || '',
      phone: user?.emergencyContact?.phone || '',
    },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (field, value) => {
    if (field === 'emergencyName') {
      setFormData({
        ...formData,
        emergencyContact: { ...formData.emergencyContact, name: value },
      });
    } else if (field === 'emergencyPhone') {
      setFormData({
        ...formData,
        emergencyContact: { ...formData.emergencyContact, phone: value },
      });
    } else {
      setFormData({ ...formData, [field]: value });
    }
  };

  const handleSave = async () => {
    if (!formData.name) {
      setError('Name is required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const updateData = {
        name: formData.name,
        year: parseInt(formData.year) || user.year,
        semester: parseInt(formData.semester) || user.semester,
        emergencyContact: formData.emergencyContact,
      };

      const response = await userAPI.updateProfile(updateData);
      updateUser(response.data.user);
      setSuccess('Profile updated successfully!');
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text variant="titleLarge" style={styles.title}>
            Edit Profile
          </Text>

          <TextInput
            label="Name"
            value={formData.name}
            onChangeText={(value) => handleChange('name', value)}
            mode="outlined"
            style={styles.input}
          />

          <TextInput
            label="Year"
            value={formData.year}
            onChangeText={(value) => {
              const year = parseInt(value) || '';
              if (year === '' || (year >= 1 && year <= 4)) {
                handleChange('year', value);
              }
            }}
            mode="outlined"
            keyboardType="number-pad"
            style={styles.input}
          />

          <TextInput
            label="Semester"
            value={formData.semester}
            onChangeText={(value) => {
              const sem = parseInt(value) || '';
              if (sem === '' || (sem >= 1 && sem <= 8)) {
                handleChange('semester', value);
              }
            }}
            mode="outlined"
            keyboardType="number-pad"
            style={styles.input}
          />

          <Text variant="titleMedium" style={styles.sectionTitle}>
            Emergency Contact
          </Text>

          <TextInput
            label="Contact Name"
            value={formData.emergencyContact.name}
            onChangeText={(value) => handleChange('emergencyName', value)}
            mode="outlined"
            style={styles.input}
          />

          <TextInput
            label="Contact Phone"
            value={formData.emergencyContact.phone}
            onChangeText={(value) => handleChange('emergencyPhone', value)}
            mode="outlined"
            keyboardType="phone-pad"
            style={styles.input}
          />

          <Button
            mode="contained"
            onPress={handleSave}
            loading={loading}
            style={styles.button}
          >
            Save Changes
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

      <Snackbar
        visible={!!success}
        onDismiss={() => setSuccess('')}
        duration={2000}
        style={{ backgroundColor: '#4caf50' }}
      >
        {success}
      </Snackbar>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    marginBottom: 30,
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 15,
  },
  sectionTitle: {
    marginTop: 10,
    marginBottom: 15,
    fontWeight: 'bold',
  },
  button: {
    marginTop: 20,
    paddingVertical: 5,
  },
});

export default EditProfileScreen;

