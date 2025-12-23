import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { TextInput, Button, Text, Snackbar } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { outingAPI } from '../services/api';
import { useNavigation } from '@react-navigation/native';

const CreateRequestScreen = () => {
  const navigation = useNavigation();
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleCreate = async () => {
    const timeString = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await outingAPI.createRequest({
        date: date.toISOString(),
        time: timeString,
      });
      setSuccess('Outing request created successfully!');
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text variant="titleLarge" style={styles.title}>
          Create Outing Request
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Date</Text>
          <Button
            mode="outlined"
            onPress={() => setShowDatePicker(true)}
            style={styles.pickerButton}
          >
            {formatDate(date)}
          </Button>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (selectedDate) setDate(selectedDate);
              }}
              minimumDate={new Date()}
            />
          )}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Time</Text>
          <Button
            mode="outlined"
            onPress={() => setShowTimePicker(true)}
            style={styles.pickerButton}
          >
            {formatTime(time)}
          </Button>
          {showTimePicker && (
            <DateTimePicker
              value={time}
              mode="time"
              display="default"
              onChange={(event, selectedTime) => {
                setShowTimePicker(Platform.OS === 'ios');
                if (selectedTime) setTime(selectedTime);
              }}
            />
          )}
        </View>

        <Text variant="bodySmall" style={styles.infoText}>
          • Mon-Fri: 5 PM - 7 PM{'\n'}
          • Saturday: 1 PM - 7 PM{'\n'}
          • Sunday: 10 AM - 7 PM
        </Text>

        <Button
          mode="contained"
          onPress={handleCreate}
          loading={loading}
          style={styles.button}
        >
          Create Request
        </Button>
      </View>

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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
  },
  title: {
    marginBottom: 30,
    fontWeight: 'bold',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  pickerButton: {
    justifyContent: 'flex-start',
  },
  infoText: {
    marginTop: 10,
    marginBottom: 20,
    color: '#666',
    lineHeight: 20,
  },
  button: {
    marginTop: 20,
    paddingVertical: 5,
  },
});

export default CreateRequestScreen;

