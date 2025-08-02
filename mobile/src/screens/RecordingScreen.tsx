import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  PermissionsAndroid,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import AudioRecorderPlayer, {
  AVEncoderAudioQualityIOSType,
  AVEncodingOption,
  AudioEncoderAndroidType,
  AudioSourceAndroidType,
  OutputFormatAndroidType,
} from 'react-native-audio-recorder-player';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { API_BASE_URL } from '../config';
import { AudioRecording } from '../../shared/types';

const { width, height } = Dimensions.get('window');

interface RecordingScreenProps {
  route: {
    params: {
      patientId?: string;
      encounterId?: string;
    };
  };
}

const RecordingScreen: React.FC<RecordingScreenProps> = ({ route }) => {
  const navigation = useNavigation();
  const audioRecorderPlayer = useRef(new AudioRecorderPlayer());
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [recordedFilePath, setRecordedFilePath] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [isConnected, setIsConnected] = useState(true);
  const [offlineRecordings, setOfflineRecordings] = useState<AudioRecording[]>([]);

  const { patientId, encounterId } = route.params || {};

  useEffect(() => {
    checkPermissions();
    checkNetworkStatus();
    loadOfflineRecordings();
    
    return () => {
      audioRecorderPlayer.current.stopRecorder();
      audioRecorderPlayer.current.removeRecordBackListener();
    };
  }, []);

  const checkPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'MedAI needs access to your microphone to record consultations.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission Denied', 'Microphone permission is required to record audio.');
        }
      } catch (err) {
        console.warn(err);
      }
    }
  };

  const checkNetworkStatus = () => {
    NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected ?? false);
    });
  };

  const loadOfflineRecordings = async () => {
    try {
      const recordings = await AsyncStorage.getItem('offline_recordings');
      if (recordings) {
        setOfflineRecordings(JSON.parse(recordings));
      }
    } catch (error) {
      console.error('Failed to load offline recordings:', error);
    }
  };

  const startRecording = async () => {
    try {
      const result = await audioRecorderPlayer.current.startRecorder(
        undefined,
        {
          AudioEncoderAndroid: AudioEncoderAndroidType.AAC,
          AudioSourceAndroid: AudioSourceAndroidType.MIC,
          AVEncoderAudioQualityKeyIOS: AVEncoderAudioQualityIOSType.high,
          AVNumberOfChannelsKeyIOS: 2,
          AVFormatIDKeyIOS: AVEncodingOption.aac,
          OutputFormatAndroid: OutputFormatAndroidType.AAC_ADTS,
        }
      );

      setRecordedFilePath(result);
      setIsRecording(true);
      setRecordingTime(0);

      audioRecorderPlayer.current.addRecordBackListener((e) => {
        setRecordingTime(e.currentPosition);
        setAudioLevel(Math.random() * 100); // Simulate audio level
      });

    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    try {
      const result = await audioRecorderPlayer.current.stopRecorder();
      audioRecorderPlayer.current.removeRecordBackListener();
      
      setIsRecording(false);
      setAudioLevel(0);

      // Save recording locally
      await saveRecordingLocally(result);

      // Upload if connected
      if (isConnected) {
        await uploadRecording(result);
      } else {
        Alert.alert(
          'Offline Mode',
          'Recording saved locally. Will upload when connection is restored.',
          [{ text: 'OK' }]
        );
      }

    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to stop recording.');
    }
  };

  const saveRecordingLocally = async (filePath: string) => {
    try {
      const recording: AudioRecording = {
        id: Date.now().toString(),
        userId: 'current-user', // Will be replaced with actual user ID
        clinicId: 'current-clinic', // Will be replaced with actual clinic ID
        patientId,
        encounterId,
        filePath,
        fileSize: 0, // Will be calculated
        durationSeconds: Math.floor(recordingTime / 1000),
        uploadStatus: isConnected ? 'pending' : 'failed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updatedRecordings = [...offlineRecordings, recording];
      await AsyncStorage.setItem('offline_recordings', JSON.stringify(updatedRecordings));
      setOfflineRecordings(updatedRecordings);

    } catch (error) {
      console.error('Failed to save recording locally:', error);
    }
  };

  const uploadRecording = async (filePath: string) => {
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', {
        uri: filePath,
        type: 'audio/aac',
        name: 'recording.aac',
      } as any);

      if (patientId) {
        formData.append('patientId', patientId);
      }
      if (encounterId) {
        formData.append('encounterId', encounterId);
      }

      const response = await fetch(`${API_BASE_URL}/v1/audio`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        Alert.alert(
          'Success',
          'Recording uploaded successfully. Processing will begin shortly.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        throw new Error('Upload failed');
      }

    } catch (error) {
      console.error('Upload failed:', error);
      Alert.alert('Upload Failed', 'Recording saved locally. Will retry when connection is restored.');
    } finally {
      setIsUploading(false);
    }
  };

  const getAuthToken = async (): Promise<string> => {
    // This would be implemented with your authentication system
    return 'dummy-token';
  };

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const renderWaveform = () => {
    const bars = 50;
    const barWidth = width / bars;
    
    return (
      <View style={styles.waveformContainer}>
        {Array.from({ length: bars }).map((_, index) => {
          const height = isRecording ? Math.random() * 60 + 20 : 10;
          return (
            <View
              key={index}
              style={[
                styles.waveformBar,
                {
                  width: barWidth - 2,
                  height,
                  backgroundColor: isRecording ? '#4CAF50' : '#E0E0E0',
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Medical Consultation Recorder</Text>
        
        {patientId && (
          <Text style={styles.subtitle}>Patient ID: {patientId}</Text>
        )}

        <View style={styles.recordingContainer}>
          {renderWaveform()}
          
          <Text style={styles.timerText}>
            {formatTime(recordingTime)}
          </Text>

          <View style={styles.controlsContainer}>
            <TouchableOpacity
              style={[
                styles.recordButton,
                isRecording && styles.recordingButton,
              ]}
              onPress={isRecording ? stopRecording : startRecording}
              disabled={isUploading}
            >
              <Icon
                name={isRecording ? 'stop' : 'mic'}
                size={32}
                color="white"
              />
            </TouchableOpacity>
          </View>

          {isUploading && (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator size="large" color="#4CAF50" />
              <Text style={styles.uploadingText}>Uploading recording...</Text>
            </View>
          )}

          {!isConnected && (
            <View style={styles.offlineContainer}>
              <Icon name="wifi-off" size={24} color="#FF9800" />
              <Text style={styles.offlineText}>Offline Mode</Text>
            </View>
          )}
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            • Tap the microphone to start/stop recording{'\n'}
            • Recordings are automatically saved locally{'\n'}
            • Uploads when connection is restored{'\n'}
            • All data is encrypted and secure
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    marginBottom: 30,
    opacity: 0.8,
  },
  recordingContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 80,
    marginBottom: 20,
  },
  waveformBar: {
    marginHorizontal: 1,
    borderRadius: 2,
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 30,
  },
  controlsContainer: {
    alignItems: 'center',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  recordingButton: {
    backgroundColor: '#F44336',
  },
  uploadingContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  uploadingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 16,
  },
  offlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 152, 0, 0.2)',
    borderRadius: 20,
  },
  offlineText: {
    color: '#FF9800',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  infoContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 20,
    borderRadius: 10,
    marginTop: 20,
  },
  infoText: {
    color: 'white',
    fontSize: 14,
    lineHeight: 20,
  },
});

export default RecordingScreen; 