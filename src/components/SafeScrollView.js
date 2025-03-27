// src/components/SafeScrollView.js
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

/**
 * ScrollView seguro que evita el anidamiento de VirtualizedLists
 * Este componente se puede usar como reemplazo directo de ScrollView en pantallas
 * donde pueda haber FlatLists anidadas, evitando el error:
 * "VirtualizedLists should never be nested inside plain ScrollViews..."
 */
const SafeScrollView = ({ 
  children, 
  contentContainerStyle, 
  style, 
  removeClippedSubviews = true,
  ...props 
}) => {
  return (
    <ScrollView
      {...props}
      style={[styles.container, style]}
      contentContainerStyle={contentContainerStyle}
      removeClippedSubviews={removeClippedSubviews}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={props.showsVerticalScrollIndicator !== undefined 
        ? props.showsVerticalScrollIndicator 
        : true}
      nestedScrollEnabled={true}
      keyboardShouldPersistTaps={props.keyboardShouldPersistTaps || 'handled'}
    >
      <View style={styles.innerContainer}>
        {children}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  innerContainer: {
    // Esta propiedad es clave para evitar que se considere que 
    // las listas están "anidadas" al nivel del DOM
    flex: 0
  }
});

export default SafeScrollView;