// TEMPORARY VERSION FOR SCREENSHOTS - AdMob and IAP commented out
// Uncomment these features before your production build!

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
// import * as InAppPurchases from 'expo-in-app-purchases';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Keyboard,
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
// import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

// AdMob Banner ID - COMMENTED OUT FOR SCREENSHOTS
// const adUnitId = __DEV__ 
//   ? TestIds.BANNER 
//   : Platform.OS === 'ios' 
//     ? 'ca-app-pub-7368779159802085/1234567890' 
//     : 'ca-app-pub-7368779159802085/0987654321';

// In-App Purchase Product ID
const REMOVE_ADS_PRODUCT_ID = Platform.OS === 'ios' 
  ? 'com.steveomatic.wordshift.removeads' 
  : 'remove_ads';

// Storage wrapper to handle Expo Go anonymous mode
const Storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      if (__DEV__) {
        return (global as any).__tempStorage?.[key] || null;
      }
      throw error;
    }
  },
  
  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      if (__DEV__) {
        if (!(global as any).__tempStorage) {
          (global as any).__tempStorage = {};
        }
        (global as any).__tempStorage[key] = value;
        return;
      }
      throw error;
    }
  }
};

// Calculate optimal letter box size based on screen width
const calculateLetterBoxSize = () => {
  const { width: screenWidth } = Dimensions.get('window');
  const maxWordLength = 10;
  const horizontalPadding = 40;
  const gapSize = 4;
  const availableWidth = screenWidth - horizontalPadding;
  const maxBoxSize = Math.floor((availableWidth - (maxWordLength * gapSize)) / maxWordLength);
  // Increased size for iPad
  const isTablet = screenWidth >= 768;
  return Math.min(maxBoxSize, isTablet ? 48 : 32);
};

const letterBoxSize = calculateLetterBoxSize();

// Enhanced word lists with at least 15 words per category
const wordLists = {
  fruits: ['APPLE', 'BANANA', 'CHERRY', 'ORANGE', 'MANGO', 'GRAPE', 'LEMON', 'PEACH', 'PLUM', 'KIWI', 'MELON', 'PAPAYA', 'COCONUT', 'APRICOT', 'PINEAPPLE', 'STRAWBERRY', 'BLUEBERRY', 'FIG', 'GUAVA', 'LYCHEE'],
  vegetables: ['CARROT', 'POTATO', 'TOMATO', 'ONION', 'PEPPER', 'CELERY', 'LETTUCE', 'CUCUMBER', 'SPINACH', 'CABBAGE', 'GARLIC', 'RADISH', 'BROCCOLI', 'CORN', 'PUMPKIN', 'EGGPLANT', 'ASPARAGUS', 'TURNIP', 'SQUASH', 'ZUCCHINI'],
  animals: ['TIGER', 'EAGLE', 'RABBIT', 'DOLPHIN', 'MONKEY', 'GIRAFFE', 'PENGUIN', 'OCTOPUS', 'ZEBRA', 'TURTLE', 'ELEPHANT', 'KANGAROO', 'LEOPARD', 'WHALE', 'SNAKE', 'PARROT', 'HAMSTER', 'BEAR', 'FOX', 'LION'],
  professions: ['DOCTOR', 'TEACHER', 'ARTIST', 'PILOT', 'CHEF', 'NURSE', 'LAWYER', 'DENTIST', 'AUTHOR', 'FARMER', 'BANKER', 'ACTOR', 'SINGER', 'DANCER', 'ATHLETE', 'ENGINEER', 'SCIENTIST', 'VETERINARIAN', 'PHARMACIST', 'MECHANIC'],
  countries: ['FRANCE', 'BRAZIL', 'CANADA', 'MEXICO', 'INDIA', 'EGYPT', 'SWEDEN', 'TURKEY', 'POLAND', 'GREECE', 'NORWAY', 'VIETNAM', 'SPAIN', 'GERMANY', 'JAPAN', 'ICELAND', 'MOROCCO', 'ARGENTINA', 'CHILE', 'THAILAND'],
  sports: ['SOCCER', 'TENNIS', 'SKIING', 'BOXING', 'GOLF', 'HOCKEY', 'RUGBY', 'CYCLING', 'ARCHERY', 'FENCING', 'ROWING', 'SURFING', 'BASEBALL', 'BOWLING', 'SWIMMING', 'RUNNING', 'KARATE', 'WRESTLING', 'CRICKET', 'DIVING'],
  kitchen: ['KNIFE', 'SPOON', 'PLATE', 'BOWL', 'FORK', 'STOVE', 'OVEN', 'MIXER', 'TIMER', 'SCALE', 'PANTRY', 'FREEZER', 'BLENDER', 'TOASTER', 'GRIDDLE', 'SKILLET', 'WHISK', 'SPATULA', 'TONGS', 'KETTLE'],
  weather: ['SUNNY', 'CLOUDY', 'STORM', 'WINDY', 'FOGGY', 'SNOW', 'RAIN', 'THUNDER', 'HUMID', 'BREEZE', 'DRIZZLE', 'TORNADO', 'FROST', 'HAIL', 'SLEET', 'DROUGHT', 'RAINBOW', 'MISTY', 'CHILLY', 'OVERCAST'],
  emotions: ['HAPPY', 'EXCITED', 'NERVOUS', 'ANGRY', 'PROUD', 'LONELY', 'BRAVE', 'CURIOUS', 'JEALOUS', 'PEACEFUL', 'GRATEFUL', 'WORRIED', 'CONFUSED', 'HOPEFUL', 'FEARFUL', 'JOYFUL', 'ANXIOUS', 'SAD', 'RELIEVED', 'SURPRISED'],
  transportation: ['PLANE', 'TRAIN', 'BICYCLE', 'SUBWAY', 'FERRY', 'ROCKET', 'SCOOTER', 'YACHT', 'TAXI', 'TRUCK', 'CANOE', 'TRAM', 'HELICOPTER', 'MOTORCYCLE', 'SKATEBOARD', 'SAILBOAT', 'BALLOON', 'CAR', 'BUS', 'JET'],
  instruments: ['PIANO', 'GUITAR', 'VIOLIN', 'TRUMPET', 'DRUMS', 'FLUTE', 'HARP', 'CELLO', 'OBOE', 'BANJO', 'ORGAN', 'TUBA', 'CLARINET', 'SAXOPHONE', 'UKULELE', 'ACCORDION', 'XYLOPHONE', 'BONGO', 'TAMBOURINE', 'MARIMBA'],
  clothing: ['SHIRT', 'JACKET', 'GLOVES', 'SCARF', 'BOOTS', 'SWEATER', 'SOCKS', 'BELT', 'HAT', 'COAT', 'DRESS', 'JEANS', 'SHORTS', 'PAJAMAS', 'UNIFORM', 'SANDALS', 'MITTENS', 'TIE', 'VEST', 'HOODIE'],
  technology: ['COMPUTER', 'PHONE', 'TABLET', 'CAMERA', 'PRINTER', 'MONITOR', 'KEYBOARD', 'MOUSE', 'SPEAKER', 'ROUTER', 'LAPTOP', 'HEADPHONES', 'MICROPHONE', 'SCANNER', 'PROJECTOR', 'WEBCAM', 'CHARGER', 'CONSOLE', 'DRONE', 'SERVER'],
  furniture: ['CHAIR', 'TABLE', 'COUCH', 'DESK', 'LAMP', 'SHELF', 'DRESSER', 'MIRROR', 'CABINET', 'STOOL', 'BENCH', 'OTTOMAN', 'BOOKCASE', 'WARDROBE', 'NIGHTSTAND', 'RECLINER', 'MATTRESS', 'ARMCHAIR', 'VANITY', 'COT'],
  hobbies: ['READING', 'GAMING', 'HIKING', 'PAINTING', 'DANCING', 'SINGING', 'WRITING', 'FISHING', 'COOKING', 'KNITTING', 'CAMPING', 'DRAWING', 'COLLECTING', 'PHOTOGRAPHY', 'GARDENING', 'TRAVELING', 'BAKING', 'SEWING', 'BIRDING', 'JUGGLING'],
  school: ['PENCIL', 'NOTEBOOK', 'BACKPACK', 'ERASER', 'RULER', 'TEXTBOOK', 'CLASSROOM', 'TEACHER', 'STUDENT', 'LIBRARY', 'CAFETERIA', 'HOMEWORK', 'EXAM', 'DIPLOMA', 'PRINCIPAL', 'SCIENCE', 'HISTORY', 'CHALKBOARD', 'MARKER', 'QUIZ'],
  colors: ['PURPLE', 'ORANGE', 'YELLOW', 'GREEN', 'BLUE', 'RED', 'PINK', 'BROWN', 'BLACK', 'WHITE', 'GRAY', 'SILVER', 'GOLD', 'MAROON', 'TURQUOISE', 'MAGENTA', 'CRIMSON', 'BEIGE', 'CYAN', 'LAVENDER'],
  drinks: ['WATER', 'COFFEE', 'TEA', 'JUICE', 'MILK', 'SODA', 'LEMONADE', 'SMOOTHIE', 'COCOA', 'CIDER', 'SHAKE', 'PUNCH', 'ESPRESSO', 'CAPPUCCINO', 'CHAMPAGNE', 'MILKSHAKE', 'HERBAL', 'MOCHA', 'ENERGY', 'TONIC'],
  desserts: ['CAKE', 'COOKIE', 'BROWNIE', 'PUDDING', 'CUPCAKE', 'DONUT', 'MUFFIN', 'PASTRY', 'CANDY', 'CHOCOLATE', 'FUDGE', 'TRUFFLE', 'TART', 'SUNDAE', 'CHEESECAKE', 'MOUSSE', 'SORBET', 'MACARON', 'ICECREAM', 'CANNOLI'],
  tools: ['HAMMER', 'SCREWDRIVER', 'WRENCH', 'PLIERS', 'DRILL', 'SAW', 'LEVEL', 'CHISEL', 'CLAMP', 'RULER', 'SANDER', 'SHOVEL', 'LADDER', 'TOOLBOX', 'CROWBAR', 'SCISSORS', 'GRINDER', 'TROWEL', 'MALLET', 'FILE'],
  body_parts: ['HEAD', 'ARM', 'LEG', 'HAND', 'FOOT', 'EYE', 'EAR', 'NOSE', 'MOUTH', 'TOOTH', 'KNEE', 'ELBOW', 'NECK', 'BACK', 'CHEST', 'FINGER', 'WRIST', 'ANKLE', 'THUMB', 'SHOULDER'],
  buildings: ['HOUSE', 'SCHOOL', 'HOSPITAL', 'CHURCH', 'BANK', 'STORE', 'MUSEUM', 'THEATER', 'STADIUM', 'LIBRARY', 'AIRPORT', 'CASTLE', 'PALACE', 'HOTEL', 'FACTORY', 'WAREHOUSE', 'APARTMENT', 'CABIN', 'DORM', 'SKYSCRAPER'],
  occupations: ['PLUMBER', 'MECHANIC', 'FIREFIGHTER', 'POLICE', 'JUDGE', 'BARBER', 'SCIENTIST', 'WRITER', 'CHEF', 'PHOTOGRAPHER', 'PHARMACIST', 'ACTOR', 'NURSE', 'VETERINARIAN', 'COACH', 'MUSICIAN', 'ARCHITECT', 'PROGRAMMER', 'DIRECTOR', 'JANITOR'],
  actions: ['RUN', 'JUMP', 'SWIM', 'CLIMB', 'DANCE', 'READ', 'WRITE', 'SING', 'DRAW', 'COOK', 'LAUGH', 'CRY', 'SLEEP', 'EAT', 'DRINK', 'THROW', 'CATCH', 'BUILD', 'BREAK', 'FIX']
};

// Color schemes for letter backgrounds with high contrast text
const colorSchemes = {
  black: { bg: '#000000', text: '#ffffff' },
  white: { bg: '#ffffff', text: '#000000' },
  red: { bg: '#dc143c', text: '#ffffff' },
  orange: { bg: '#ff8c00', text: '#000000' },
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
  inputBg: '#1a1a1a',
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
  const [adsRemoved, setAdsRemoved] = useState(false); // Always false for screenshots
  const [isPurchasing, setIsPurchasing] = useState(false);

  const inputRefs = useRef<Record<string, TextInput>>({});

  const theme = isDarkMode ? darkTheme : lightTheme;

  useEffect(() => {
    loadSettings();
    loadStatistics();
    // initializeIAP(); // COMMENTED OUT FOR SCREENSHOTS
  }, []);

  useEffect(() => {
    if (!isLoading) {
      // Hide splash screen after loading
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  useEffect(() => {
    setHintsRemaining(difficulty - 3);
    if (difficulty === 7) {
      setHintsRemaining(3);
    }
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
        Storage.getItem('difficulty'),
        // Storage.getItem('adsRemoved') // COMMENTED OUT
      ]);
      
      if (savedTheme) setIsDarkMode(savedTheme === 'dark');
      if (savedColorScheme) setLetterColorScheme(savedColorScheme);
      if (savedDifficulty) setDifficulty(parseInt(savedDifficulty));
      // setAdsRemoved(false); // Always false for screenshots
    } catch (error) {
      console.warn('Error loading settings:', error);
      setIsDarkMode(false);
      setLetterColorScheme('green');
      setDifficulty(6);
      setAdsRemoved(false);
    } finally {
      console.log('Settings loaded, setting isLoading to false');
      setIsLoading(false);
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

  // IAP FUNCTIONS COMMENTED OUT FOR SCREENSHOTS
  /*
  const initializeIAP = async () => {
    // Commented out
  };

  const handleSuccessfulPurchase = async (purchase: InAppPurchases.InAppPurchase) => {
    // Commented out
  };

  const purchaseRemoveAds = async () => {
    // Commented out - just show alert
    Alert.alert('Coming Soon!', 'Remove ads feature will be available in the App Store version.');
  };

  const restorePurchases = async () => {
    // Commented out - just show alert
    Alert.alert('Coming Soon!', 'Restore purchases will be available in the App Store version.');
  };
  */

  // Temporary functions for screenshots
  const purchaseRemoveAds = async () => {
    Alert.alert('Coming Soon!', 'Remove ads feature will be available in the App Store version.');
  };

  const restorePurchases = async () => {
    Alert.alert('Coming Soon!', 'Restore purchases will be available in the App Store version.');
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
    setHintsRemaining(puzzleDifficulty - 3);
    if (puzzleDifficulty === 7) {
      setHintsRemaining(3);
    }
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
          setTotalPatternPoints(prev => prev + letterAppearsInWords);
          setShowPatternBonusAnimation(true);
          setTimeout(() => setShowPatternBonusAnimation(false), 2000);
          
          if ((totalPatternPoints + letterAppearsInWords) % 10 === 0) {
            setHintsRemaining(prev => prev + 1);
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              // Haptics not available
            }
          }
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
      
      if (upperValue) {
        let found = false;
        
        for (let i = letterIndex + 1; i < currentPuzzle.encodedWords[wordIndex].length; i++) {
          const nextLetter = currentPuzzle.encodedWords[wordIndex][i];
          if (!newMapping[nextLetter]) {
            const ref = inputRefs.current[`${wordIndex}-${i}`];
            if (ref) {
              ref.focus();
              found = true;
              break;
            }
          }
        }
        
        if (!found) {
          for (let w = wordIndex + 1; w < currentPuzzle.encodedWords.length; w++) {
            for (let l = 0; l < currentPuzzle.encodedWords[w].length; l++) {
              const nextLetter = currentPuzzle.encodedWords[w][l];
              if (!newMapping[nextLetter]) {
                const ref = inputRefs.current[`${w}-${l}`];
                if (ref) {
                  ref.focus();
                  found = true;
                  break;
                }
              }
            }
            if (found) break;
          }
        }
        
        if (!found) {
          for (let w = 0; w <= wordIndex; w++) {
            const maxL = w === wordIndex ? letterIndex : currentPuzzle.encodedWords[w].length;
            for (let l = 0; l < maxL; l++) {
              const nextLetter = currentPuzzle.encodedWords[w][l];
              if (!newMapping[nextLetter]) {
                const ref = inputRefs.current[`${w}-${l}`];
                if (ref) {
                  ref.focus();
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
    const colorScheme = colorSchemes[letterColorScheme as keyof typeof colorSchemes];
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
              backgroundColor: theme.inputBg, 
              color: theme.text, 
              borderColor: theme.border,
              width: boxSize,
              height: boxSize,
              fontSize: fontSize,
            },
            isCorrect && { 
              backgroundColor: colorScheme.bg, 
              color: colorScheme.text,
              borderColor: colorScheme.bg 
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
  }, [correctLetters, letterColorScheme, theme, userMapping, handleLetterInput, solved]);

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
          contentContainerStyle={[styles.welcomeContent, { paddingBottom: 40 }]}
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
              • Every 10 pattern points earns a free hint
              {'\n'}
              • Build combos for higher scores!
            </Text>
          </View>

          <Text style={[styles.selectDifficultyText, { color: theme.text, fontSize: isTablet ? 20 : 16 }]}>
            Select Difficulty
          </Text>

          {[
            { level: 4, name: 'Easy', desc: '4 words, 1 hint', color: '#2ecc71' },
            { level: 5, name: 'Medium', desc: '5 words, 2 hints', color: '#f39c12' },
            { level: 6, name: 'Hard', desc: '6 words, 3 hints', color: '#e74c3c' },
            { level: 7, name: 'Expert', desc: '7 words, 3 hints', color: '#9b59b6' },
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

        {/* Ad Banner placeholder for screenshots */}
        <View style={[
          styles.adContainer, 
          { 
            backgroundColor: '#f0f0f0', 
            height: isTablet ? 90 : 50, 
            justifyContent: 'center', 
            alignItems: 'center' 
          }
        ]}>
          <Text style={{ color: '#999', fontSize: isTablet ? 16 : 12 }}>Ad Banner Space</Text>
      </View>

      {/* Settings Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showSettings}
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Letter Color Settings</Text>
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
              { level: 4, name: 'Easy', desc: '4 words, 1 hint' },
              { level: 5, name: 'Medium', desc: '5 words, 2 hints' },
              { level: 6, name: 'Hard', desc: '6 words, 3 hints' },
              { level: 7, name: 'Expert', desc: '7 words, 3 hints' },
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

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
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
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  difficultyDisplay: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    zIndex: 1,
  },
  difficultyDisplayText: {
    fontSize: 14,
    fontWeight: '500',
  },
  themeButton: {
    padding: 8,
    borderRadius: 6,
    marginLeft: 'auto',
    zIndex: 1,
  },
  themeIcon: {
    fontSize: 24,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 20,
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
    padding: 15,
    borderRadius: 10,
    marginVertical: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  wordRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 4,
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
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  welcomeContent: {
    padding: 15,
    flexGrow: 1,
    paddingBottom: 80, // Extra padding for ad banner
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
  splashTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Black' : 'sans-serif-black',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  splashSubtitle: {
    fontSize: 18,
    color: '#ffffff',
    marginTop: 20,
    opacity: 0.8,
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
  adContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  settingsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 10,
  },
  removeAdsSection: {
    marginTop: 20,
    alignItems: 'center',
  },
  purchaseButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  purchaseButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  restoreButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  restoreButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
        </View>

        {/* Settings Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showSettings}
          onRequestClose={() => setShowSettings(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[
              styles.modalContent, 
              { backgroundColor: theme.cardBg, maxWidth: isTablet ? 600 : 400 }
            ]}>
              <Text style={[styles.modalTitle, { color: theme.text, fontSize: isTablet ? 24 : 18 }]}>
                Settings
              </Text>
              
              <Text style={[styles.settingsSectionTitle, { color: theme.text, fontSize: isTablet ? 20 : 16 }]}>
                Letter Color
              </Text>
              <View style={styles.colorGrid}>
                {Object.entries(colorSchemes).map(([name, scheme]) => (
                  <TouchableOpacity
                    key={name}
                    style={[
                      styles.colorOption,
                      { backgroundColor: scheme.bg },
                      letterColorScheme === name && styles.selectedColor,
                      isTablet && { minWidth: 120, paddingVertical: 15 }
                    ]}
                    onPress={() => selectColorScheme(name)}
                  >
                    <Text style={[
                      styles.colorOptionText, 
                      { color: scheme.text, fontSize: isTablet ? 18 : 14 }
                    ]}>
                      {name.charAt(0).toUpperCase() + name.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <View style={styles.removeAdsSection}>
                <Text style={[styles.settingsSectionTitle, { color: theme.text, fontSize: isTablet ? 20 : 16 }]}>
                  Remove Ads
                </Text>
                <TouchableOpacity 
                  style={[
                    styles.purchaseButton, 
                    { backgroundColor: theme.accent },
                    isTablet && { paddingHorizontal: 30, paddingVertical: 16 }
                  ]}
                  onPress={purchaseRemoveAds}
                  disabled={isPurchasing}
                >
                  <Text style={[styles.purchaseButtonText, { fontSize: isTablet ? 20 : 16 }]}>
                    Remove Ads - $0.99
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.restoreButton, 
                    { borderColor: theme.accent },
                    isTablet && { paddingHorizontal: 30, paddingVertical: 14 }
                  ]}
                  onPress={restorePurchases}
                >
                  <Text style={[styles.restoreButtonText, { color: theme.accent, fontSize: isTablet ? 18 : 14 }]}>
                    Restore Purchase
                  </Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity 
                style={[
                  styles.closeButton, 
                  { backgroundColor: theme.accent },
                  isTablet && { paddingVertical: 16 }
                ]} 
                onPress={() => setShowSettings(false)}
              >
                <Text style={[styles.closeButtonText, { fontSize: isTablet ? 20 : 16 }]}>Close</Text>
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
            <View style={[
              styles.modalContent, 
              { backgroundColor: theme.cardBg, maxWidth: isTablet ? 600 : 400 }
            ]}>
              <Text style={[styles.modalTitle, { color: theme.text, fontSize: isTablet ? 24 : 18 }]}>
                Statistics
              </Text>
              <View style={styles.statsContainer}>
                {[4, 5, 6, 7].map((level) => {
                  const stats = statistics[level];
                  const successRate = stats && stats.played > 0 
                    ? Math.round((stats.won / stats.played) * 100) 
                    : 0;
                  const levelName = level === 4 ? 'Easy' : level === 5 ? 'Medium' : level === 6 ? 'Hard' : 'Expert';
                  
                  return (
                    <View key={level} style={[
                      styles.statRow, 
                      { backgroundColor: theme.background, borderColor: theme.border }
                    ]}>
                      <Text style={[styles.statLevelName, { color: theme.text, fontSize: isTablet ? 20 : 16 }]}>
                        {levelName}
                      </Text>
                      <View style={styles.statDetails}>
                        <Text style={[styles.statText, { color: theme.secondaryText, fontSize: isTablet ? 18 : 14 }]}>
                          Played: {stats.played}
                        </Text>
                        <Text style={[styles.statText, { color: theme.secondaryText, fontSize: isTablet ? 18 : 14 }]}>
                          Won: {stats.won}
                        </Text>
                        <Text style={[styles.statPercentage, { color: theme.accent, fontSize: isTablet ? 22 : 18 }]}>
                          {successRate}%
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
              <TouchableOpacity 
                style={[
                  styles.closeButton, 
                  { backgroundColor: theme.accent },
                  isTablet && { paddingVertical: 16 }
                ]} 
                onPress={() => setShowStats(false)}
              >
                <Text style={[styles.closeButtonText, { fontSize: isTablet ? 20 : 16 }]}>Close</Text>
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
        <View style={[styles.difficultyDisplay, { backgroundColor: theme.cardBg }]}>
          <Text style={[styles.difficultyDisplayText, { color: theme.text, fontSize: isTablet ? 18 : 14 }]}>
            {difficulty === 4 ? 'Easy' : difficulty === 5 ? 'Medium' : difficulty === 6 ? 'Hard' : 'Expert'}
          </Text>
        </View>
        
        <Text style={[styles.headerTitle, { color: theme.accent, fontSize: isTablet ? 28 : 20 }]}>
          WordShift
        </Text>
        
        <TouchableOpacity 
          onPress={toggleTheme} 
          style={[
            styles.themeButton, 
            { backgroundColor: theme.cardBg, borderRadius: 6 }
          ]}
        >
          <Text style={[styles.themeIcon, { fontSize: isTablet ? 32 : 24 }]}>
            {isDarkMode ? '☀️' : '🌙'}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.mainContent}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={Keyboard.dismiss}
        >
          <Text style={[styles.categoryText, { color: theme.secondaryText, fontSize: isTablet ? 20 : 16 }]}>
            Category: {currentPuzzle?.category}
          </Text>

          {/* Pattern Streak Display */}
          {patternStreak > 0 && (
            <View style={[styles.patternStreakContainer, { backgroundColor: theme.accent }]}>
              <Text style={[styles.patternStreakText, { fontSize: isTablet ? 20 : 16 }]}>
                Pattern Streak: {patternStreak} 🔥
              </Text>
              {totalPatternPoints > 0 && (
                <Text style={[styles.patternPointsText, { fontSize: isTablet ? 16 : 12 }]}>
                  Total Points: {totalPatternPoints} (Next bonus at {Math.ceil((totalPatternPoints + 1) / 10) * 10})
                </Text>
              )}
            </View>
          )}

          {showPatternBonusAnimation && (
            <View style={styles.bonusAnimationContainer}>
              <Text style={[styles.bonusAnimationText, { color: theme.success, fontSize: isTablet ? 32 : 24 }]}>
                Pattern Bonus! +{patternStreak} points
              </Text>
            </View>
          )}

          {solved && (
            <Text style={[styles.successMessage, { color: theme.success, fontSize: isTablet ? 26 : 20 }]}>
              🎉 Congratulations! You solved it! 🎉
            </Text>
          )}

          <View style={[styles.puzzleContainer, { backgroundColor: theme.cardBg }]}>
            {currentPuzzle?.encodedWords.map((word, wordIndex) => (
              <View key={wordIndex} style={styles.wordRow}>
                {word.split('').map((letter, letterIndex) => 
                  renderLetterInput(letter, wordIndex, letterIndex)
                )}
              </View>
            ))}
          </View>

          <View style={styles.controlsPanel}>
            <TouchableOpacity 
              style={[
                styles.button, 
                styles.primaryButton, 
                { backgroundColor: theme.accent },
                isTablet && { paddingHorizontal: 24, paddingVertical: 14 }
              ]} 
              onPress={() => setShowDifficultyModal(true)}
            >
              <Text style={[styles.buttonText, { fontSize: isTablet ? 18 : 14 }]}>New Game</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.button, 
                styles.secondaryButton, 
                { backgroundColor: theme.cardBg, borderColor: theme.border },
                isTablet && { paddingHorizontal: 24, paddingVertical: 14 }
              ]} 
              onPress={getHint}
              disabled={hintsRemaining === 0 || solved}
            >
              <Text style={[styles.buttonText, { color: theme.text, fontSize: isTablet ? 18 : 14 }]}>
                Hint ({hintsRemaining})
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.button, 
                styles.secondaryButton, 
                { backgroundColor: theme.cardBg, borderColor: theme.border },
                isTablet && { paddingHorizontal: 24, paddingVertical: 14 }
              ]} 
              onPress={giveUp}
              disabled={solved}
            >
              <Text style={[styles.buttonText, { color: theme.text, fontSize: isTablet ? 18 : 14 }]}>
                Give Up
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.smallButtonsRow}>
            <TouchableOpacity 
              style={[
                styles.smallButton, 
                { backgroundColor: theme.cardBg, borderColor: theme.border },
                isTablet && { paddingHorizontal: 20, paddingVertical: 12 }
              ]} 
              onPress={() => setShowFrequency(!showFrequency)}
            >
              <Text style={[styles.smallButtonText, { color: theme.text, fontSize: isTablet ? 18 : 14 }]}>
                Freq
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.smallButton, 
                { backgroundColor: theme.cardBg, borderColor: theme.border },
                isTablet && { paddingHorizontal: 20, paddingVertical: 12 }
              ]} 
              onPress={() => setShowSettings(true)}
            >
              <Text style={[styles.smallButtonText, { color: theme.text, fontSize: isTablet ? 18 : 14 }]}>
                ⚙️
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.smallButton, 
                { backgroundColor: theme.cardBg, borderColor: theme.border },
                isTablet && { paddingHorizontal: 20, paddingVertical: 12 }
              ]} 
              onPress={() => {
                Alert.alert(
                  'Pattern Streak System',
                  'Earn bonus points by finding letters that appear in multiple words!\n\n' +
                  '• Letters in 3+ words give pattern points\n' +
                  '• Build streaks with consecutive pattern finds\n' +
                  '• Every 10 points earns a bonus hint\n' +
                  '• Wrong guesses reset your streak\n\n' +
                  `Current Points: ${totalPatternPoints}`,
                  [{ text: 'Got it!' }]
                );
              }}
            >
              <Text style={[styles.smallButtonText, { color: theme.text, fontSize: isTablet ? 18 : 14 }]}>
                🔥
              </Text>
            </TouchableOpacity>
          </View>

          {showFrequency && (
            <View style={[styles.frequencyContainer, { backgroundColor: theme.cardBg }]}>
              <Text style={[styles.frequencyTitle, { color: theme.secondaryText, fontSize: isTablet ? 20 : 16 }]}>
                Letter Frequency
              </Text>
              <ScrollView 
                style={styles.frequencyScrollView}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
              >
                <View style={styles.frequencyGrid}>
                  {Object.entries(letterFrequency)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .map(([letter, count]) => (
                      <View key={letter} style={[
                        styles.frequencyItem, 
                        { backgroundColor: theme.background, borderColor: theme.border },
                        isTablet && { paddingHorizontal: 16, paddingVertical: 12 }
                      ]}>
                        <Text style={[styles.frequencyLetter, { color: theme.accent, fontSize: isTablet ? 18 : 14 }]}>
                          {letter}
                        </Text>
                        <Text style={[styles.frequencyCount, { color: theme.secondaryText, fontSize: isTablet ? 16 : 12 }]}>
                          {count as number}
                        </Text>
                      </View>
                    ))}
                </View>
              </ScrollView>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Ad Banner placeholder for screenshots */}
      <View style={[
        styles.adContainer, 
        { 
          backgroundColor: '#f0f0f0', 
          height: isTablet ? 90 : 50, 
          justifyContent: 'center', 
          alignItems: 'center' 
        }
      ]}>
        <Text style={{ color: '#999', fontSize: isTablet ? 16 : 12 }}>Ad Banner Space</Text>
      </View>
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

