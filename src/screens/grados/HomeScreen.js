import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen({ navigation }) {
  // Datos de ejemplo - después vendrán de una base de datos
  const [announcements] = useState([
    {
      id: '1',
      title: 'Reunión Mensual',
      content: 'Recordatorio: Reunión mensual este viernes a las 19:00 hrs.',
      date: '18/01/2025',
      priority: 'high'
    },
    {
      id: '2',
      title: 'Nuevo Material Disponible',
      content: 'Se ha agregado nuevo material de estudio para aprendices.',
      date: '17/01/2025',
      priority: 'medium'
    }
  ]);

  const [upcomingActivities] = useState([
    {
      id: '1',
      type: 'teaching',
      title: 'Introducción a los principios',
      date: '20/01/2025',
      time: '19:00',
      grade: 'Aprendices'
    },
    {
      id: '2',
      type: 'meeting',
      title: 'Reunión de Oficialidad',
      date: '22/01/2025',
      time: '20:00',
      grade: 'Maestros'
    }
  ]);

  const stats = {
    totalMembers: 45,
    apprentices: 15,
    fellows: 20,
    masters: 10,
    pendingApprovals: 3,
    upcomingEvents: 5
  };

  const renderActivity = ({ item }) => (
    <TouchableOpacity 
      style={styles.activityCard}
      onPress={() => navigation.navigate('Programa')}
    >
      <View style={styles.activityHeader}>
        <View style={styles.activityType}>
          <Ionicons 
            name={item.type === 'teaching' ? 'school' : 'people'} 
            size={24} 
            color="#007AFF" 
          />
          <Text style={styles.activityGrade}>{item.grade}</Text>
        </View>
        <Text style={styles.activityDate}>{item.date}</Text>
      </View>
      <Text style={styles.activityTitle}>{item.title}</Text>
      <Text style={styles.activityTime}>{item.time} hrs</Text>
    </TouchableOpacity>
  );

  const renderAnnouncement = ({ item }) => (
    <View style={[
      styles.announcementCard,
      item.priority === 'high' && styles.highPriority
    ]}>
      <View style={styles.announcementHeader}>
        <Text style={styles.announcementTitle}>{item.title}</Text>
        <Text style={styles.announcementDate}>{item.date}</Text>
      </View>
      <Text style={styles.announcementContent}>{item.content}</Text>
    </View>
  );

  // Combinamos todos los datos en un solo array para la FlatList principal
  const sections = [
    { 
      id: 'header', 
      type: 'header'
    },
    { 
      id: 'stats', 
      type: 'stats',
      data: stats 
    },
    { 
      id: 'activities', 
      type: 'activities', 
      title: 'Próximas Actividades',
      data: upcomingActivities 
    },
    { 
      id: 'announcements', 
      type: 'announcements', 
      title: 'Anuncios Importantes',
      data: announcements 
    }
  ];

  const renderItem = ({ item }) => {
    switch (item.type) {
      case 'header':
        return (
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Bienvenido,</Text>
              <Text style={styles.username}>{global.userFullName || global.userName || 'Usuario'}</Text>
            </View>
            {global.userRole === 'admin' && (
              <TouchableOpacity 
                style={styles.adminBadge}
                onPress={() => navigation.navigate('Admin')}
              >
                <Ionicons name="settings-outline" size={20} color="#fff" />
                <Text style={styles.adminText}>Admin</Text>
              </TouchableOpacity>
            )}
          </View>
        );
        
      case 'stats':
        return (
          <View style={styles.statsContainer}>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{item.data.totalMembers}</Text>
                <Text style={styles.statLabel}>Total Miembros</Text>
              </View>
              <View style={[styles.statBox, styles.statBoxMiddle]}>
                <Text style={styles.statNumber}>{item.data.upcomingEvents}</Text>
                <Text style={styles.statLabel}>Próximos Eventos</Text>
              </View>
              {global.userRole === 'admin' && (
                <View style={styles.statBox}>
                  <Text style={styles.statNumber}>{item.data.pendingApprovals}</Text>
                  <Text style={styles.statLabel}>Pendientes</Text>
                </View>
              )}
            </View>
          </View>
        );
        
      case 'activities':
        return (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{item.title}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Programa')}>
                <Text style={styles.seeAllText}>Ver Todo</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={item.data}
              renderItem={renderActivity}
              keyExtractor={activity => activity.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.activitiesList}
              nestedScrollEnabled={true}
            />
          </View>
        );
        
      case 'announcements':
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{item.title}</Text>
            {item.data.map(announcement => (
              <View key={announcement.id}>
                {renderAnnouncement({ item: announcement })}
              </View>
            ))}
          </View>
        );
        
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={sections}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#007AFF',
  },
  greeting: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 20,
  },
  adminText: {
    color: '#fff',
    marginLeft: 5,
  },
  statsContainer: {
    margin: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
  },
  statBoxMiddle: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#eee',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  section: {
    margin: 15,
    marginTop: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  seeAllText: {
    color: '#007AFF',
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginRight: 15,
    width: 250,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  activityType: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityGrade: {
    marginLeft: 5,
    color: '#007AFF',
    fontSize: 14,
  },
  activityDate: {
    color: '#666',
    fontSize: 14,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  activityTime: {
    fontSize: 14,
    color: '#666',
  },
  announcementCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  highPriority: {
    borderLeftWidth: 4,
    borderLeftColor: '#ff4d4f',
  },
  announcementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  announcementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  announcementDate: {
    fontSize: 12,
    color: '#666',
  },
  announcementContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  activitiesList: {
    paddingRight: 5,
  },
});