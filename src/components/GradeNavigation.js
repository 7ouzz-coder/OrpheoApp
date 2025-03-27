import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

export default function GradeNavigation({ onSelectGrade, currentGrade }) {
  const grades = [
    { id: 'aprendiz', title: 'Aprendices' },
    { id: 'companero', title: 'Compañeros' },
    { id: 'maestro', title: 'Maestros' },
    { id: 'oficial', title: 'Oficialidad' }
  ];

  return (
    <View style={styles.container}>
      {grades.map((grade) => (
        <TouchableOpacity
          key={grade.id}
          style={[
            styles.button,
            currentGrade === grade.id && styles.activeButton
          ]}
          onPress={() => onSelectGrade(grade.id)}
        >
          <Text 
            style={[
              styles.buttonText,
              currentGrade === grade.id && styles.activeButtonText
            ]}
          >
            {grade.title}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    justifyContent: 'space-around',
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    minWidth: 80,
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  activeButtonText: {
    color: '#fff',
  },
});