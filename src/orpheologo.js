import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';

/**
 * Componente reutilizable para mostrar el logo/isotipo de Orpheo
 * @param {Object} props - Propiedades del componente
 * @param {number} props.size - Tamaño del logo (default: 80)
 * @param {boolean} props.showText - Mostrar texto junto al logo (default: true)
 * @param {string} props.textColor - Color del texto (default: '#007AFF')
 * @param {boolean} props.vertical - Orientación vertical (logo arriba, texto abajo) (default: false)
 */
export default function OrpheoLogo({ 
  size = 80, 
  showText = true, 
  textColor = '#007AFF',
  vertical = false,
  subtitle = null
}) {
  return (
    <View style={[
      styles.container, 
      vertical ? styles.containerVertical : styles.containerHorizontal
    ]}>
      <Image
        source={require('../assets/Orpheo1.png')}
        style={[styles.logo, { width: size, height: size }]}
        resizeMode="contain"
      />
      
      {showText && (
        <View style={vertical ? styles.textContainerVertical : styles.textContainerHorizontal}>
          <Text style={[styles.title, { color: textColor }]}>Logia Orpheo</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  containerHorizontal: {
    flexDirection: 'row',
  },
  containerVertical: {
    flexDirection: 'column',
  },
  logo: {
    marginRight: 10,
  },
  textContainerHorizontal: {
    justifyContent: 'center',
  },
  textContainerVertical: {
    alignItems: 'center',
    marginTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    color: '#555',
    marginTop: 5,
  },
});