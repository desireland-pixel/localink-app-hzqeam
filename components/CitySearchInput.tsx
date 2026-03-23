
import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, ScrollView, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { apiGet } from '@/utils/api';

interface CitySearchInputProps {
  value: string;
  onChangeText: (city: string) => void;
  placeholder?: string;
  style?: any;
  cityType?: 'all' | 'travel';
}

export function CitySearchInput({ value, onChangeText, placeholder = 'Search city...', style, cityType = 'all' }: CitySearchInputProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const selectedFromSuggestion = useRef(false);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const handleQueryChange = async (text: string) => {
    selectedFromSuggestion.current = false;
    setQuery(text);
    
    if (text.trim().length > 0) {
      try {
        const typeParam = cityType !== 'all' ? `&type=${cityType}` : '';
        const response = await apiGet<{ cities: string[] }>(`/api/cities/search?q=${encodeURIComponent(text)}&limit=8${typeParam}`);
        setSuggestions(response.cities);
        setShowSuggestions(response.cities.length > 0);
      } catch (error) {
        console.error('[CitySearchInput] Error searching cities:', error);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectCity = (city: string) => {
    console.log('[CitySearchInput] City selected:', city);
    selectedFromSuggestion.current = true;
    setQuery(city);
    onChangeText(city);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleBlur = () => {
    // Delay to allow tap on suggestion
    setTimeout(() => {
      setShowSuggestions(false);
      // Only update parent with typed query if user did NOT select from suggestions
      if (!selectedFromSuggestion.current && query !== value) {
        onChangeText(query);
      }
    }, 300);
  };

  const handleFocus = async () => {
    selectedFromSuggestion.current = false;
    if (query.trim().length > 0) {
      try {
        const typeParam = cityType !== 'all' ? `&type=${cityType}` : '';
        const response = await apiGet<{ cities: string[] }>(`/api/cities/search?q=${encodeURIComponent(query)}&limit=8${typeParam}`);
        setSuggestions(response.cities);
        setShowSuggestions(response.cities.length > 0);
      } catch (error) {
        console.error('[CitySearchInput] Error searching cities:', error);
      }
    }
  };

  return (
    <View style={[styles.container, style]}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.textLight}
        value={query}
        onChangeText={handleQueryChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        autoCapitalize="words"
        autoCorrect={false}
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <ScrollView 
            style={styles.suggestionsList}
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled={true}
          >
            {suggestions.map((item, index) => (
              <TouchableOpacity
                key={`${item}-${index}`}
                style={styles.suggestionItem}
                onPress={() => handleSelectCity(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.suggestionText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...typography.body,
    color: colors.text,
    minHeight: 44,
    textAlignVertical: 'center',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1001,
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestionItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionText: {
    ...typography.body,
    color: colors.text,
  },
});
