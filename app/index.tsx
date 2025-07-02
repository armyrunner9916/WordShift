// AD-SUPPORTED VERSION - AdMob enabled, IAP removed
// This version includes ads but no in-app purchases

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

// Google Mobile Ads - PROPERLY FIXED VERSION
import MobileAds, { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

// Import word lists from JSON file with error handling
let wordListsData: WordListsData = {};
try {
  wordListsData = require('./assets/wordLists.json');
} catch (error) {
  console.error('Failed to load word lists:', error);
  // Fallback to empty object to prevent crash
  wordListsData = {};
}

// Type for the word lists
type WordListsData = {
  [key: string]: string[];
};

// Initialize immediately for iOS to prevent crashes
if (Platform.OS === 'ios') {
  MobileAds().initialize().catch((error) => {
    console.warn('Failed to initialize Google Mobile Ads:', error);
  });
}

let adUnitId: string = '';
let isAdMobAvailable = false;

// Initialize Google Mobile Ads with proper error handling (iOS only)
const initializeAdMob = async () => {
  try {
    if (Platform.OS === 'ios') {
      console.log('Checking Google Mobile Ads availability...');
      
      // Check if the module was loaded successfully
      if (!MobileAds || typeof MobileAds !== 'function') {
        console.log('Google Mobile Ads module not available, skipping initialization');
        isAdMobAvailable = false;
        return;
      }
      
      // Initialize the SDK
      try {
        await MobileAds().initialize();
        console.log('Google Mobile Ads initialized successfully');
        
        // Set ad unit ID after successful initialization
        if (!__DEV__) {
          adUnitId = 'ca-app-pub-7368779159802085/3638014569';
        } else {
          // Use test ad ID for development
          adUnitId = TestIds?.BANNER || '';
        }
        
        isAdMobAvailable = true;
      } catch (initError) {
        console.warn('Failed to initialize Google Mobile Ads:', initError);
        isAdMobAvailable = false;
      }
    } else {
      console.log('Android platform detected - no ads (paid version)');
      isAdMobAvailable = false;
    }
  } catch (error) {
    console.warn('Failed to setup Google Mobile Ads:', error);
    isAdMobAvailable = false;
    adUnitId = '';
  }
};

// Storage wrapper to handle Expo Go anonymous mode - IMPROVED VERSION
const Storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      console.log(`Storage getItem success for ${key}:`, value ? 'Found' : 'Not found');
      return value;
    } catch (error) {
      console.warn(`Storage getItem error for ${key}:`, error);
      
      // Fallback to temp storage in development
      if (__DEV__) {
        const tempValue = (global as any).__tempStorage?.[key] || null;
        console.log(`Using temp storage fallback for ${key}:`, tempValue ? 'Found' : 'Not found');
        return tempValue;
      }
      
      // Always return null on error to prevent undefined behavior
      return null;
    }
  },
  
  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
      console.log(`Storage setItem success for ${key}`);
    } catch (error) {
      console.warn(`Storage setItem error for ${key}:`, error);
      
      // Fallback to temp storage in development
      if (__DEV__) {
        if (!(global as any).__tempStorage) {
          (global as any).__tempStorage = {};
        }
        (global as any).__tempStorage[key] = value;
        console.log(`Saved to temp storage fallback for ${key}`);
      }
      // Note: We don't throw the error, just log it
    }
  }
};

// Process imported word lists to ensure exactly 20 words per category
const wordLists: Record<string, string[]> = {};

try {
  Object.entries(wordListsData as WordListsData).forEach(([category, words]) => {
    // Ensure words is an array before processing
    if (Array.isArray(words)) {
      // Take only the first 20 words from each category
      wordLists[category] = words.slice(0, 20);
    } else {
      console.warn(`Category ${category} does not have a valid word array`);
    }
  });
} catch (error) {
  console.error('Error processing word lists:', error);
  // Fallback to a minimal word list to prevent crash
  wordLists.fruits = ['APPLE', 'BANANA', 'CHERRY', 'ORANGE', 'MANGO', 'GRAPE', 'LEMON', 'PEACH', 'PLUM', 'KIWI', 'MELON', 'PAPAYA', 'COCONUT', 'APRICOT', 'PINEAPPLE', 'STRAWBERRY', 'BLUEBERRY', 'GUAVA', 'LYCHEE', 'PEAR'];
}

// Color schemes for letter backgrounds with high contrast text
const colorSchemes = {
  black: { bg: '#000000', text: '#ffffff' },
  white: { bg: '#ffffff', text: '#000000' },
  red: { bg: '#dc143c', text: '#ffffff' },
  orange: { bg: '#ff8c00', text: '#ffffff' },
  yellow: { bg: '#ffd700', text: '#000000' },
  green: { bg: '#228b22', text: '#ffffff' },
  blue: { bg: '#0000cd', text: '#ffffff' },
  indigo: { bg: '#4b0082', text: '#ffffff' },
  violet: { bg: '#8b008b', text: '#ffffff' },
};

// Theme definitions
const lightTheme = {
  background: '#ffffff',
  headerBg: '#f5f5f5',
  cardBg: '#f5f5f5',
  text: '#333333',
  secondaryText: '#666666',
  accent: '#3498db',
  success: '#2ecc71',
  border: '#dddddd',
  inputBg: '#ffffff',
};

const darkTheme = {
  background: '#1a1a1a',
  headerBg: '#2d2d2d',
  cardBg: '#2d2d2d',
  text: '#ffffff',
  secondaryText: '#b0b0b0',
  accent: '#5dade2',
  success: '#58d68d',
  border: '#444444',
  inputBg: '#3a3a3a',
};

// Type definitions
interface Puzzle {
  category: string;
  words: string[];
  encodedWords: string[];
  cipher: Record<string, string>;
  reverseCipher: Record<string, string>;
}

interface Statistics {
  [key: number]: {
    played: number;
    won: number;
  };
}

interface ErrorBoundaryState {
  hasError: boolean;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

// Styles defined BEFORE components
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Black' : 'sans-serif-black',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    flex: 1,
    textAlign: 'center',
    marginRight: -80,
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 10,
  },
  difficultyDisplay: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 60,
  },
  difficultyDisplayText: {
    fontSize: 14,
    fontWeight: '500',
  },
  themeButton: {
    padding: 8,
    borderRadius: 6,
    marginLeft: 'auto',
    zIndex: 10,
  },
  themeIcon: {
    fontSize: 24,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 10,
  },
  categoryText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 15,
    marginBottom: 8,
  },
  successMessage: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  puzzleContainer: {
    padding: 10,
    borderRadius: 10,
    marginVertical: 15,
    marginHorizontal: 5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  wordRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 4,
    paddingHorizontal: 5,
  },
  letterGroup: {
    alignItems: 'center',
  },
  letterInput: {
    width: 32,
    height: 32,
    textAlign: 'center',
    borderWidth: 1,
    borderRadius: 4,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
    textAlignVertical: 'center',
    paddingTop: 0,
    paddingBottom: 0,
  },
  cipherLetter: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  controlsPanel: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  primaryButton: {
    backgroundColor: '#3498db',
  },
  secondaryButton: {
    borderWidth: 1,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  smallButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  smallButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  smallButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  frequencyContainer: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    maxHeight: 200,
  },
  frequencyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  frequencyScrollView: {
    maxHeight: 150,
  },
  frequencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 10,
  },
  frequencyItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
  },
  frequencyLetter: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  frequencyCount: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    padding: 20,
    borderRadius: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    maxWidth: 500,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  colorOption: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  selectedColor: {
    borderWidth: 3,
    borderColor: '#fff',
  },
  colorOptionText: {
    fontWeight: '600',
  },
  closeButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  difficultyOption: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
  },
  difficultyOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  difficultyOptionDesc: {
    fontSize: 14,
    marginTop: 4,
  },
  statsContainer: {
    marginBottom: 20,
  },
  statRow: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
  },
  statLevelName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  statDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statText: {
    fontSize: 14,
  },
  statPercentage: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  welcomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    flex: 1,
  },
  welcomeContent: {
    padding: 15,
    flexGrow: 1,
    paddingBottom: 80,
  },
  instructionsCard: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 13,
    lineHeight: 18,
  },
  selectDifficultyText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  difficultyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  difficultyCardLeft: {
    flex: 1,
  },
  difficultyCardRight: {
    alignItems: 'flex-end',
  },
  difficultyName: {
    fontSize: 16,
    fontWeight: '600',
  },
  difficultyDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  difficultyStats: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  playButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
    color: 'white',
    fontWeight: '600',
  },
  bottomButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 20,
  },
  bottomButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  bottomButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  errorButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  errorButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  patternStreakContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginVertical: 8,
    alignSelf: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  patternStreakText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  patternPointsText: {
    color: '#ffffff',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
    opacity: 0.9,
  },
  bonusAnimationContainer: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    zIndex: 1000,
  },
  bonusAnimationText: {
    fontSize: 24,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  settingsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 10,
  },
  adContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
});

// Error Boundary Component
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Something went wrong!</Text>
          <TouchableOpacity 
            style={styles.errorButton}
            onPress={() => this.setState({ hasError: false })}
          >
            <Text style={styles.errorButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

// Keep splash screen visible initially
SplashScreen.preventAutoHideAsync();

function AppContent() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [difficulty, setDifficulty] = useState(6);
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle | null>(null);
  const [userMapping, setUserMapping] = useState<Record<string, string>>({});
  const [hintsRemaining, setHintsRemaining] = useState(3);
  const [showFrequency, setShowFrequency] = useState(false);
  const [solved, setSolved] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [letterColorScheme, setLetterColorScheme] = useState('green');
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);
  const [statistics, setStatistics] = useState<Statistics>({
    4: { played: 0, won: 0 },
    5: { played: 0, won: 0 },
    6: { played: 0, won: 0 },
    7: { played: 0, won: 0 },
  });
  const [showStats, setShowStats] = useState(false);
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(true);
  const [correctLetters, setCorrectLetters] = useState(new Set<string>());
  const [lastTypedLetter, setLastTypedLetter] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [patternStreak, setPatternStreak] = useState(0);
  const [totalPatternPoints, setTotalPatternPoints] = useState(0);
  const [showPatternBonusAnimation, setShowPatternBonusAnimation] = useState(false);

  const inputRefs = useRef<Record<string, TextInput>>({});

  const theme = isDarkMode ? darkTheme : lightTheme;

  // Updated hint system based on difficulty
  const getInitialHints = (level: number) => {
    switch(level) {
      case 4: // Easy
      case 5: // Medium
        return 3;
      case 6: // Hard
        return 2;
      case 7: // Expert
        return 1;
      default:
        return 3;
    }
  };

  // Calculate optimal letter box size based on screen width
  const calculateLetterBoxSize = useCallback(() => {
    const { width: screenWidth } = Dimensions.get('window');
    const maxWordLength = 10;
    const horizontalPadding = 30;
    const gapSize = 4;
    const availableWidth = screenWidth - horizontalPadding;
    const maxBoxSize = Math.floor((availableWidth - (maxWordLength * gapSize)) / maxWordLength);
    const isTablet = screenWidth >= 768;
    return Math.min(maxBoxSize, isTablet ? 48 : 30);
  }, []);

  const [letterBoxSize, setLetterBoxSize] = useState(calculateLetterBoxSize());

  useEffect(() => {
    const updateLetterBoxSize = () => {
      setLetterBoxSize(calculateLetterBoxSize());
    };

    const subscription = Dimensions.addEventListener('change', updateLetterBoxSize);
    return () => subscription?.remove();
  }, [calculateLetterBoxSize]);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('Starting app initialization...');
        
        // Load settings first
        await loadSettings();
        await loadStatistics();
        
        // Delay AdMob initialization to ensure app is ready
        setTimeout(() => {
          initializeAdMob().catch(error => {
            console.error('AdMob initialization error:', error);
          });
        }, 2000); // 2 second delay
        
        console.log('App initialization complete');
      } catch (error) {
        console.error('Error during app initialization:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync().catch(console.warn);
    }
  }, [isLoading]);

  useEffect(() => {
    setHintsRemaining(getInitialHints(difficulty));
  }, [difficulty]);

  useEffect(() => {
    return () => {
      inputRefs.current = {};
    };
  }, []);

  const loadSettings = async () => {
    console.log('Starting to load settings...');
    try {
      const [savedTheme, savedColorScheme, savedDifficulty] = await Promise.all([
        Storage.getItem('theme'),
        Storage.getItem('letterColorScheme'),
        Storage.getItem('difficulty')
      ]);
      
      if (savedTheme) setIsDarkMode(savedTheme === 'dark');
      if (savedColorScheme && colorSchemes[savedColorScheme as keyof typeof colorSchemes]) {
        setLetterColorScheme(savedColorScheme);
      } else {
        setLetterColorScheme('green');
      }
      if (savedDifficulty) setDifficulty(parseInt(savedDifficulty));
      
      console.log('Settings loaded successfully');
    } catch (error) {
      console.warn('Error loading settings:', error);
      setIsDarkMode(false);
      setLetterColorScheme('green');
      setDifficulty(6);
    }
  };

  const loadStatistics = async () => {
    try {
      const savedStats = await Storage.getItem('statistics');
      if (savedStats) {
        setStatistics(JSON.parse(savedStats));
      }
    } catch (error) {
      console.warn('Error loading statistics:', error);
    }
  };

  const saveStatistics = async (newStats: Statistics) => {
    try {
      await Storage.setItem('statistics', JSON.stringify(newStats));
    } catch (error) {
      console.warn('Error saving statistics:', error);
    }
  };

  const saveSettings = async (key: string, value: string | number) => {
    try {
      await Storage.setItem(key, value.toString());
    } catch (error) {
      console.warn('Error saving settings:', error);
    }
  };

  const generateCipher = useCallback(() => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const shuffled = [...alphabet].sort(() => Math.random() - 0.5);
    const cipher: Record<string, string> = {};
    alphabet.forEach((letter, i) => {
      cipher[letter] = shuffled[i];
    });
    return cipher;
  }, []);

  const encodeWord = useCallback((word: string, cipher: Record<string, string>) => {
    return word.split('').map(letter => cipher[letter]).join('');
  }, []);

  const generateNewPuzzle = useCallback((trackStats = true, forceDifficulty?: number) => {
    const puzzleDifficulty = forceDifficulty !== undefined ? forceDifficulty : difficulty;
    
    if (trackStats && currentPuzzle && !solved) {
      if (Object.keys(userMapping).length > 0) {
        const newStats = { ...statistics };
        newStats[puzzleDifficulty].played += 1;
        setStatistics(newStats);
        saveStatistics(newStats);
      }
    }
    
    const categories = Object.keys(wordLists);
    const category = categories[Math.floor(Math.random() * categories.length)];
    
    const availableWords = [...wordLists[category as keyof typeof wordLists]];
    const selectedWords: string[] = [];
    
    for (let i = 0; i < puzzleDifficulty; i++) {
      const index = Math.floor(Math.random() * availableWords.length);
      selectedWords.push(availableWords[index]);
      availableWords.splice(index, 1);
    }
    
    const cipher = generateCipher();
    
    setCurrentPuzzle({
      category: category.charAt(0).toUpperCase() + category.slice(1),
      words: selectedWords,
      encodedWords: selectedWords.map(word => encodeWord(word, cipher)),
      cipher: cipher,
      reverseCipher: Object.fromEntries(Object.entries(cipher).map(([k, v]) => [v, k]))
    });
    
    setUserMapping({});
    setSolved(false);
    setHintsRemaining(getInitialHints(puzzleDifficulty));
    setCorrectLetters(new Set());
    setLastTypedLetter(null);
    setPatternStreak(0);
    setTotalPatternPoints(0);
    inputRefs.current = {};
  }, [currentPuzzle, solved, userMapping, statistics, difficulty, generateCipher, encodeWord]);

  const handleLetterInput = useCallback((cipherLetter: string, value: string, wordIndex: number, letterIndex: number) => {
    const upperValue = value.toUpperCase();
    
    if (value && !/^[A-Z]$/.test(upperValue)) {
      return;
    }
    
    const newMapping = { ...userMapping };
    if (upperValue) {
      newMapping[cipherLetter] = upperValue;
      setLastTypedLetter(cipherLetter);
    } else {
      delete newMapping[cipherLetter];
    }
    
    setUserMapping(newMapping);
    
    if (currentPuzzle && upperValue) {
      let letterAppearsInWords = 0;
      let correctGuess = false;
      
      currentPuzzle.encodedWords.forEach((encodedWord) => {
        if (encodedWord.includes(cipherLetter)) {
          letterAppearsInWords++;
        }
      });
      
      if (currentPuzzle.reverseCipher[cipherLetter] === upperValue) {
        correctGuess = true;
        
        if (letterAppearsInWords >= 3) {
          setPatternStreak(prev => prev + letterAppearsInWords);
          setTotalPatternPoints(prev => {
            const newTotal = prev + letterAppearsInWords;
            
            // Award bonus hint every 5 pattern points
            if (Math.floor(newTotal / 5) > Math.floor(prev / 5)) {
              setHintsRemaining(hints => hints + 1);
              setShowPatternBonusAnimation(true);
              setTimeout(() => setShowPatternBonusAnimation(false), 2000);
              
              try {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } catch (error) {
                // Haptics not available
              }
            }
            
            return newTotal;
          });
        }
      } else {
        setPatternStreak(0);
      }
      
      const newCorrectLetters = new Set(correctLetters);
      let foundCompleteWord = false;
      
      currentPuzzle.encodedWords.forEach((encodedWord) => {
        const isWordComplete = encodedWord.split('').every(letter => {
          return newMapping[letter] === currentPuzzle.reverseCipher[letter];
        });
        
        if (isWordComplete) {
          encodedWord.split('').forEach(letter => {
            newCorrectLetters.add(letter);
          });
          foundCompleteWord = true;
        }
      });
      
      if (foundCompleteWord) {
        setCorrectLetters(newCorrectLetters);
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (error) {
          // Haptics not available
        }
      }
      
      const allCorrect = currentPuzzle.encodedWords.every(encodedWord => {
        return encodedWord.split('').every(letter => {
          return newMapping[letter] === currentPuzzle.reverseCipher[letter];
        });
      });
      
      if (allCorrect && !solved) {
        setSolved(true);
        const newStats = { ...statistics };
        newStats[difficulty].played += 1;
        newStats[difficulty].won += 1;
        setStatistics(newStats);
        saveStatistics(newStats);
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
          // Haptics not available
        }
        Alert.alert('Congratulations!', 'You solved the puzzle!', [
          { text: 'Continue', onPress: () => {
            setShowWelcomeScreen(true);
            setCurrentPuzzle(null);
            setUserMapping({});
            setSolved(false);
            setCorrectLetters(new Set());
            setLastTypedLetter(null);
            setPatternStreak(0);
            setTotalPatternPoints(0);
            inputRefs.current = {};
          }}
        ]);
      }
      
      // SAFER FOCUS LOGIC - CORRECTED VERSION
      if (upperValue) {
        // Helper function to safely focus an input
        const safelyFocusInput = (wordIdx: number, letterIdx: number): boolean => {
          const key = `${wordIdx}-${letterIdx}`;
          const ref = inputRefs.current[key];
          
          if (ref && ref.focus && typeof ref.focus === 'function') {
            try {
              // Add a small delay to ensure the ref is ready
              setTimeout(() => {
                if (ref && ref.focus && typeof ref.focus === 'function') {
                  ref.focus();
                }
              }, 50);
              return true;
            } catch (error) {
              console.warn(`Failed to focus input ${key}:`, error);
              return false;
            }
          }
          return false;
        };

        let found = false;
        
        // Look for next empty input in current word
        for (let i = letterIndex + 1; i < currentPuzzle.encodedWords[wordIndex].length; i++) {
          const nextLetter = currentPuzzle.encodedWords[wordIndex][i];
          if (!newMapping[nextLetter]) {
            if (safelyFocusInput(wordIndex, i)) {
              found = true;
              break;
            }
          }
        }
        
        // Look for next empty input in subsequent words
        if (!found) {
          for (let w = wordIndex + 1; w < currentPuzzle.encodedWords.length; w++) {
            for (let l = 0; l < currentPuzzle.encodedWords[w].length; l++) {
              const nextLetter = currentPuzzle.encodedWords[w][l];
              if (!newMapping[nextLetter]) {
                if (safelyFocusInput(w, l)) {
                  found = true;
                  break;
                }
              }
            }
            if (found) break;
          }
        }
        
        // Look for empty inputs from the beginning (wrap around)
        if (!found) {
          for (let w = 0; w <= wordIndex; w++) {
            const maxL = w === wordIndex ? letterIndex : currentPuzzle.encodedWords[w].length;
            for (let l = 0; l < maxL; l++) {
              const nextLetter = currentPuzzle.encodedWords[w][l];
              if (!newMapping[nextLetter]) {
                if (safelyFocusInput(w, l)) {
                  found = true;
                  break;
                }
              }
            }
            if (found) break;
          }
        }
      }
    }
  }, [userMapping, currentPuzzle, correctLetters, solved, statistics, difficulty, totalPatternPoints]);

  const getHint = useCallback(() => {
    if (hintsRemaining <= 0 || solved || !currentPuzzle) return;
    
    const unmappedLetters: string[] = [];
    currentPuzzle.encodedWords.forEach(word => {
      word.split('').forEach(letter => {
        if (!userMapping[letter] && !unmappedLetters.includes(letter)) {
          unmappedLetters.push(letter);
        }
      });
    });
    
    if (unmappedLetters.length === 0) return;
    
    const randomLetter = unmappedLetters[Math.floor(Math.random() * unmappedLetters.length)];
    const correctLetter = currentPuzzle.reverseCipher[randomLetter];
    
    const newMapping = { ...userMapping };
    newMapping[randomLetter] = correctLetter;
    setUserMapping(newMapping);
    
    const newCorrectLetters = new Set(correctLetters);
    currentPuzzle.encodedWords.forEach((encodedWord) => {
      const isWordComplete = encodedWord.split('').every(letter => {
        return newMapping[letter] === currentPuzzle.reverseCipher[letter];
      });
      
      if (isWordComplete) {
        encodedWord.split('').forEach(letter => {
          newCorrectLetters.add(letter);
        });
      }
    });
    
    setCorrectLetters(newCorrectLetters);
    setHintsRemaining(hintsRemaining - 1);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      // Haptics not available
    }
  }, [hintsRemaining, solved, currentPuzzle, userMapping, correctLetters]);

  const giveUp = useCallback(() => {
    if (!currentPuzzle || solved) return;
    
    Alert.alert(
      'Give Up?',
      'Are you sure you want to reveal the solution?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Yes, Show Solution', 
          style: 'destructive',
          onPress: () => {
            const newStats = { ...statistics };
            newStats[difficulty].played += 1;
            setStatistics(newStats);
            saveStatistics(newStats);
            
            const fullMapping: Record<string, string> = {};
            Object.entries(currentPuzzle.reverseCipher).forEach(([cipher, plain]) => {
              fullMapping[cipher] = plain;
            });
            setUserMapping(fullMapping);
            
            const allLetters = new Set<string>();
            currentPuzzle.encodedWords.forEach(word => {
              word.split('').forEach(letter => {
                allLetters.add(letter);
              });
            });
            setCorrectLetters(allLetters);
            setSolved(true);
            
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            } catch (error) {
              // Haptics not available
            }
            
            setTimeout(() => {
              Alert.alert('Solution Revealed', 'The correct answer has been shown. Try another puzzle!', [
                { text: 'Continue', onPress: () => {
                  setShowWelcomeScreen(true);
                  setCurrentPuzzle(null);
                  setUserMapping({});
                  setSolved(false);
                  setCorrectLetters(new Set());
                  setLastTypedLetter(null);
                  setPatternStreak(0);
                  setTotalPatternPoints(0);
                  inputRefs.current = {};
                }}
              ]);
            }, 500);
          }
        }
      ]
    );
  }, [currentPuzzle, solved, statistics, difficulty]);

  const undoLastLetter = useCallback(() => {
    if (!lastTypedLetter || solved || !currentPuzzle) return;
    
    const newMapping = { ...userMapping };
    delete newMapping[lastTypedLetter];
    setUserMapping(newMapping);
    
    const newCorrectLetters = new Set<string>();
    currentPuzzle.encodedWords.forEach((encodedWord) => {
      const isWordComplete = encodedWord.split('').every(letter => {
        return newMapping[letter] === currentPuzzle.reverseCipher[letter];
      });
      
      if (isWordComplete) {
        encodedWord.split('').forEach(letter => {
          newCorrectLetters.add(letter);
        });
      }
    });
    
    setCorrectLetters(newCorrectLetters);
    setLastTypedLetter(null);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      // Haptics not available
    }
  }, [lastTypedLetter, solved, userMapping, currentPuzzle]);

  const startNewGame = useCallback((selectedDifficulty: number) => {
    setDifficulty(selectedDifficulty);
    setShowWelcomeScreen(false);
    generateNewPuzzle(false, selectedDifficulty);
  }, [generateNewPuzzle]);

  const letterFrequency = useMemo(() => {
    if (!currentPuzzle || !showFrequency) return {};
    
    const frequency: Record<string, number> = {};
    currentPuzzle.encodedWords.forEach(word => {
      word.split('').forEach(letter => {
        frequency[letter] = (frequency[letter] || 0) + 1;
      });
    });
    
    return frequency;
  }, [currentPuzzle, showFrequency]);

  const toggleTheme = useCallback(() => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    saveSettings('theme', newTheme ? 'dark' : 'light');
  }, [isDarkMode]);

  const selectColorScheme = useCallback((scheme: string) => {
    setLetterColorScheme(scheme);
    saveSettings('letterColorScheme', scheme);
    setShowSettings(false);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      // Haptics not available
    }
  }, []);

  const selectDifficulty = useCallback((newDifficulty: number) => {
    setDifficulty(newDifficulty);
    saveSettings('difficulty', newDifficulty.toString());
    setShowDifficultyModal(false);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      // Haptics not available
    }
  }, []);

  const renderLetterInput = useCallback((letter: string, wordIndex: number, letterIndex: number) => {
    const isCorrect = correctLetters.has(letter);
    const colorScheme = colorSchemes[letterColorScheme as keyof typeof colorSchemes] || colorSchemes.green;
    const { width: screenWidth } = Dimensions.get('window');
    const isTablet = screenWidth >= 768;
    const boxSize = isTablet ? 48 : letterBoxSize;
    const fontSize = isTablet ? 20 : (boxSize > 28 ? 16 : 14);
    
    return (
      <View key={`${wordIndex}-${letterIndex}`} style={styles.letterGroup}>
        <TextInput
          style={[
            styles.letterInput,
            { 
              backgroundColor: isCorrect ? colorScheme.bg : theme.inputBg,
              color: isCorrect ? colorScheme.text : theme.text,
              borderColor: isCorrect ? colorScheme.bg : theme.border,
              width: boxSize,
              height: boxSize,
              fontSize: fontSize,
            }
          ]}
          value={userMapping[letter] || ''}
          onChangeText={(value) => handleLetterInput(letter, value, wordIndex, letterIndex)}
          maxLength={1}
          autoCapitalize="characters"
          autoCorrect={false}
          editable={!solved}
          ref={ref => {
            if (ref) {
              inputRefs.current[`${wordIndex}-${letterIndex}`] = ref;
            }
          }}
        />
        <Text style={[styles.cipherLetter, { color: theme.secondaryText, fontSize: isTablet ? 14 : 10 }]}>{letter}</Text>
      </View>
    );
  }, [correctLetters, letterColorScheme, theme, userMapping, handleLetterInput, solved, letterBoxSize]);

  const AdBanner = useCallback(() => {
    // Multiple safety checks to prevent crashes
    if (!isAdMobAvailable || !adUnitId || Platform.OS !== 'ios') {
      return null;
    }

    // Check if components are available
    if (!BannerAd || !BannerAdSize) {
      console.log('Banner ad components not available');
      return null;
    }

    // Check for valid ad size
    const adSize = BannerAdSize?.ANCHORED_ADAPTIVE_BANNER || BannerAdSize?.ADAPTIVE_BANNER || BannerAdSize?.BANNER;
    if (!adSize) {
      console.log('No valid banner ad size available');
      return null;
    }

    try {
      return (
        <View style={styles.adContainer}>
          <BannerAd
            unitId={adUnitId}
            size={adSize}
            requestOptions={{
              requestNonPersonalizedAdsOnly: true,
            }}
            onAdLoaded={() => {
              console.log('Banner ad loaded successfully');
            }}
            onAdFailedToLoad={(error: any) => {
              console.log('Banner ad failed to load:', error);
            }}
          />
        </View>
      );
    } catch (error) {
      console.log('Error rendering banner ad:', error);
      return null;
    }
  }, [isAdMobAvailable, adUnitId]);

  // Loading Screen
  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  // Welcome Screen
  if (showWelcomeScreen) {
    const { width: screenWidth } = Dimensions.get('window');
    const isTablet = screenWidth >= 768;
    
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        
        <View style={[styles.welcomeHeader, { backgroundColor: theme.headerBg }]}>
          <Text style={[styles.welcomeTitle, { color: theme.accent, fontSize: isTablet ? 36 : 28 }]}>WordShift</Text>
          <TouchableOpacity onPress={toggleTheme} style={styles.themeButton}>
            <Text style={[styles.themeIcon, { fontSize: isTablet ? 32 : 24 }]}>
              {isDarkMode ? '☀️' : '🌙'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          contentContainerStyle={[styles.welcomeContent, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.instructionsCard, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.instructionsTitle, { color: theme.text, fontSize: isTablet ? 22 : 18 }]}>
              How to Play
            </Text>
            <Text style={[styles.instructionsText, { color: theme.secondaryText, fontSize: isTablet ? 16 : 13 }]}>
              Each puzzle contains words from a category where letters have been replaced with different letters using a simple substitution cipher.
              {'\n\n'}
              • The same cipher is used for all the words
              {'\n'}
              • Type a letter to fill in all matching positions
              {'\n'}
              • Green letters indicate correct guesses
              {'\n'}
              • Use hints if you get stuck
              {'\n\n'}
              <Text style={{ fontWeight: 'bold' }}>NEW: Pattern Streak System!</Text>
              {'\n'}
              • Find letters that appear in 3+ words for bonus points
              {'\n'}
              • Every 5 pattern points earns a free hint
              {'\n'}
              • Build combos for higher scores!
            </Text>
          </View>

          <Text style={[styles.selectDifficultyText, { color: theme.text, fontSize: isTablet ? 20 : 16 }]}>
            Select Difficulty
          </Text>

          {[
            { level: 4, name: 'Easy', desc: '4 words, 3 hints', color: '#2ecc71' },
            { level: 5, name: 'Medium', desc: '5 words, 3 hints', color: '#f39c12' },
            { level: 6, name: 'Hard', desc: '6 words, 2 hints', color: '#e74c3c' },
            { level: 7, name: 'Expert', desc: '7 words, 1 hint', color: '#9b59b6' },
          ].map(({ level, name, desc, color }) => {
            const stats = statistics[level];
            const successRate = stats && stats.played > 0 
              ? Math.round((stats.won / stats.played) * 100) 
              : null;
            
            return (
              <TouchableOpacity
                key={level}
                style={[styles.difficultyCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
                onPress={() => startNewGame(level)}
              >
                <View style={styles.difficultyCardLeft}>
                  <Text style={[styles.difficultyName, { color: theme.text, fontSize: isTablet ? 20 : 16 }]}>
                    {name}
                  </Text>
                  <Text style={[styles.difficultyDesc, { color: theme.secondaryText, fontSize: isTablet ? 16 : 13 }]}>
                    {desc}
                  </Text>
                </View>
                <View style={styles.difficultyCardRight}>
                  {successRate !== null && (
                    <Text style={[styles.difficultyStats, { color: color, fontSize: isTablet ? 20 : 16 }]}>
                      {successRate}%
                    </Text>
                  )}
                  <Text style={[
                    styles.playButton, 
                    { backgroundColor: color, fontSize: isTablet ? 18 : 14 }
                  ]}>
                    Play
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}

          <View style={styles.bottomButtons}>
            <TouchableOpacity 
              style={[styles.bottomButton, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
              onPress={() => setShowStats(true)}
            >
              <Text style={[styles.bottomButtonText, { color: theme.text, fontSize: isTablet ? 18 : 15 }]}>
                📊 Statistics
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.bottomButton, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
              onPress={() => setShowSettings(true)}
            >
              <Text style={[styles.bottomButtonText, { color: theme.text, fontSize: isTablet ? 18 : 15 }]}>
                ⚙️ Settings
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.smallButton, 
                { backgroundColor: theme.cardBg, borderColor: theme.border },
                isTablet && { paddingHorizontal: 20, paddingVertical: 12 }
              ]} 
              onPress={undoLastLetter}
              disabled={!lastTypedLetter || solved}
            >
              <Text style={[styles.smallButtonText, { color: theme.text, fontSize: isTablet ? 20 : 16 }]}>
                ↶
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Ad Banner - iOS only */}
        <AdBanner />

        {/* Settings Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showSettings}
          onRequestClose={() => setShowSettings(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Settings</Text>
              
              <Text style={[styles.settingsSectionTitle, { color: theme.text }]}>Letter Color</Text>
              <View style={styles.colorGrid}>
                {Object.entries(colorSchemes).map(([name, scheme]) => (
                  <TouchableOpacity
                    key={name}
                    style={[
                      styles.colorOption,
                      { backgroundColor: scheme.bg },
                      letterColorScheme === name && styles.selectedColor
                    ]}
                    onPress={() => selectColorScheme(name)}
                  >
                    <Text style={[styles.colorOptionText, { color: scheme.text }]}>
                      {name.charAt(0).toUpperCase() + name.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity 
                style={[styles.closeButton, { backgroundColor: theme.accent }]} 
                onPress={() => setShowSettings(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Difficulty Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showDifficultyModal}
          onRequestClose={() => setShowDifficultyModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Select Difficulty</Text>
              {[
                { level: 4, name: 'Easy', desc: '4 words, 3 hints' },
                { level: 5, name: 'Medium', desc: '5 words, 3 hints' },
                { level: 6, name: 'Hard', desc: '6 words, 2 hints' },
                { level: 7, name: 'Expert', desc: '7 words, 1 hint' },
              ].map(({ level, name, desc }) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.difficultyOption,
                    { backgroundColor: theme.background, borderColor: theme.border },
                    difficulty === level && { backgroundColor: theme.accent }
                  ]}
                  onPress={() => {
                    setDifficulty(level);
                    saveSettings('difficulty', level.toString());
                    setShowDifficultyModal(false);
                    generateNewPuzzle(false, level);
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch (error) {
                      // Haptics not available
                    }
                  }}
                >
                  <Text style={[
                    styles.difficultyOptionTitle,
                    { color: difficulty === level ? '#fff' : theme.text }
                  ]}>
                    {name}
                  </Text>
                  <Text style={[
                    styles.difficultyOptionDesc,
                    { color: difficulty === level ? '#fff' : theme.secondaryText }
                  ]}>
                    {desc}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity 
                style={[styles.closeButton, { backgroundColor: theme.accent }]} 
                onPress={() => setShowDifficultyModal(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Statistics Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showStats}
          onRequestClose={() => setShowStats(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Statistics</Text>
              <View style={styles.statsContainer}>
                {[4, 5, 6, 7].map((level) => {
                  const stats = statistics[level];
                  const successRate = stats && stats.played > 0 
                    ? Math.round((stats.won / stats.played) * 100) 
                    : 0;
                  const levelName = level === 4 ? 'Easy' : level === 5 ? 'Medium' : level === 6 ? 'Hard' : 'Expert';
                  
                  return (
                    <View key={level} style={[styles.statRow, { backgroundColor: theme.background, borderColor: theme.border }]}>
                      <Text style={[styles.statLevelName, { color: theme.text }]}>{levelName}</Text>
                      <View style={styles.statDetails}>
                        <Text style={[styles.statText, { color: theme.secondaryText }]}>
                          Played: {stats.played}
                        </Text>
                        <Text style={[styles.statText, { color: theme.secondaryText }]}>
                          Won: {stats.won}
                        </Text>
                        <Text style={[styles.statPercentage, { color: theme.accent }]}>
                          {successRate}%
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
              <TouchableOpacity 
                style={[styles.closeButton, { backgroundColor: theme.accent }]} 
                onPress={() => setShowStats(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // Game Screen
  const { width: screenWidth } = Dimensions.get('window');
  const isTablet = screenWidth >= 768;
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      
      <View style={[styles.header, { backgroundColor: theme.headerBg }]}>
        <Text style={[styles.headerTitle, { color: theme.accent, fontSize: isTablet ? 32 : 20 }]}>WordShift</Text>
        <View style={styles.headerControls}>
          <TouchableOpacity 
            style={[styles.difficultyDisplay, { backgroundColor: theme.cardBg }]}
            onPress={() => setShowDifficultyModal(true)}
          >
            <Text style={[styles.difficultyDisplayText, { color: theme.text }]}>
              {difficulty === 4 ? 'Easy' : difficulty === 5 ? 'Medium' : difficulty === 6 ? 'Hard' : 'Expert'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleTheme} style={styles.themeButton}>
            <Text style={styles.themeIcon}>{isDarkMode ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView 
        style={styles.mainContent}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1, paddingBottom: isTablet ? 100 : 60 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {currentPuzzle && (
            <>
              <Text style={[styles.categoryText, { color: theme.secondaryText, fontSize: isTablet ? 20 : 16 }]}>
                Category: <Text style={{ fontWeight: 'bold', color: theme.text }}>
                  {currentPuzzle.category}
                </Text>
              </Text>

              {patternStreak > 0 && (
                <View style={[styles.patternStreakContainer, { backgroundColor: theme.accent }]}>
                  <Text style={styles.patternStreakText}>
                    Pattern Streak: {patternStreak}
                  </Text>
                  <Text style={styles.patternPointsText}>
                    Total Points: {totalPatternPoints} • Next Hint: {5 - (totalPatternPoints % 5)}
                  </Text>
                </View>
              )}

              {showPatternBonusAnimation && (
                <View style={styles.bonusAnimationContainer}>
                  <Text style={[styles.bonusAnimationText, { color: theme.success }]}>
                    +1 Bonus Hint!
                  </Text>
                </View>
              )}

              {solved && (
                <Text style={[styles.successMessage, { color: theme.success }]}>
                  🎉 Congratulations! 🎉
                </Text>
              )}

              <View style={[styles.puzzleContainer, { backgroundColor: theme.cardBg }]}>
                <ScrollView 
                  horizontal={true} 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ flexGrow: 1 }}
                >
                  <View style={{ alignItems: 'center', width: '100%' }}>
                    {currentPuzzle.encodedWords.map((word, wordIndex) => (
                      <View key={wordIndex} style={styles.wordRow}>
                        {word.split('').map((letter, letterIndex) => 
                          renderLetterInput(letter, wordIndex, letterIndex)
                        )}
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <View style={styles.controlsPanel}>
                <TouchableOpacity 
                  style={[styles.button, styles.primaryButton, { opacity: hintsRemaining > 0 && !solved ? 1 : 0.5 }]} 
                  onPress={getHint}
                  disabled={hintsRemaining <= 0 || solved}
                >
                  <Text style={styles.buttonText}>
                    Hint ({hintsRemaining})
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.button, styles.primaryButton]} 
                  onPress={() => setShowFrequency(!showFrequency)}
                >
                  <Text style={styles.buttonText}>
                    {showFrequency ? 'Hide' : 'Show'} Frequency
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.button, styles.secondaryButton, { borderColor: theme.border, backgroundColor: theme.background }]} 
                  onPress={() => generateNewPuzzle()}
                >
                  <Text style={[styles.buttonText, { color: theme.text }]}>
                    New Puzzle
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.smallButtonsRow}>
                <TouchableOpacity 
                  style={[styles.smallButton, { backgroundColor: theme.cardBg, borderColor: theme.border }]} 
                  onPress={undoLastLetter}
                  disabled={!lastTypedLetter || solved}
                >
                  <Text style={[styles.smallButtonText, { color: theme.text }]}>
                    ↶ Undo
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.smallButton, { backgroundColor: theme.cardBg, borderColor: theme.border }]} 
                  onPress={giveUp}
                  disabled={solved}
                >
                  <Text style={[styles.smallButtonText, { color: theme.text }]}>
                    Give Up
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.smallButton, { backgroundColor: theme.cardBg, borderColor: theme.border }]} 
                  onPress={() => {
                    setShowWelcomeScreen(true);
                    setCurrentPuzzle(null);
                  }}
                >
                  <Text style={[styles.smallButtonText, { color: theme.text }]}>
                    Menu
                  </Text>
                </TouchableOpacity>
              </View>

              {showFrequency && Object.keys(letterFrequency).length > 0 && (
                <View style={[styles.frequencyContainer, { backgroundColor: theme.cardBg }]}>
                  <Text style={[styles.frequencyTitle, { color: theme.text }]}>Letter Frequency</Text>
                  <ScrollView style={styles.frequencyScrollView} showsVerticalScrollIndicator={false}>
                    <View style={styles.frequencyGrid}>
                      {Object.entries(letterFrequency)
                        .sort((a, b) => b[1] - a[1])
                        .map(([letter, count]) => (
                          <View 
                            key={letter}
                            style={[
                              styles.frequencyItem,
                              { 
                                backgroundColor: theme.background,
                                borderColor: theme.border,
                              }
                            ]}
                          >
                            <Text style={[styles.frequencyLetter, { color: theme.text }]}>
                              {letter}
                            </Text>
                            <Text style={[styles.frequencyCount, { color: theme.secondaryText }]}>
                              {count}
                            </Text>
                          </View>
                        ))
                      }
                    </View>
                  </ScrollView>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Ad Banner - iOS only */}
      {currentPuzzle && <AdBanner />}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}