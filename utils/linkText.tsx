import React from 'react';
import { Text, Linking, TextStyle, StyleProp } from 'react-native';

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

/**
 * Splits text into segments — plain text rendered with `textStyle`,
 * URLs rendered as tappable Text with `linkStyle` that opens in the browser.
 * Use inside a parent <Text> component.
 */
export function renderTextWithLinks(
  text: string,
  textStyle: StyleProp<TextStyle>,
  linkStyle: StyleProp<TextStyle>
) {
  if (!text) return null;
  const parts = text.split(URL_REGEX);
  return parts.map((part, i) => {
    if (!part) return null;
    if (URL_REGEX.test(part)) {
      // Reset regex lastIndex because /g regex is stateful on .test()
      URL_REGEX.lastIndex = 0;
      return (
        <Text
          key={i}
          style={linkStyle}
          onPress={() => Linking.openURL(part).catch(err => console.error('Failed to open URL:', err))}
        >
          {part}
        </Text>
      );
    }
    URL_REGEX.lastIndex = 0;
    return (
      <Text key={i} style={textStyle}>
        {part}
      </Text>
    );
  });
}
