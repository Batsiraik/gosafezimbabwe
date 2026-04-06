import { View, ViewProps } from 'react-native';
import { colors } from '@/lib/theme';

export function Card({ children, style, ...props }: ViewProps) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: 24,
          padding: 32,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          maxWidth: 400,
          width: '100%',
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
