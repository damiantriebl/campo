import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export interface NotificationData {
  type: 'company_join_request' | 'company_request_approved' | 'company_request_rejected';
  title: string;
  body: string;
  data?: any;
}

export interface PushToken {
  userId: string;
  token: string;
  platform: string;
  creado: Timestamp;
  actualizado: Timestamp;
}

class NotificationService {
  private static instance: NotificationService;
  private currentUserId: string | null = null;
  private unsubscribeListeners: (() => void)[] = [];

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize notification service for a user
   */
  async initialize(userId: string): Promise<void> {
    this.currentUserId = userId;
    
    // Request permissions
    await this.requestPermissions();
    
    // Register for push notifications only in development builds or production apps, not Expo Go or web
    if (Platform.OS !== 'web') {
      await this.registerForPushNotifications(userId);
    }
    
    // Set up notification listeners
    this.setupNotificationListeners();
  }

  /**
   * Clean up notification service
   */
  cleanup(): void {
    this.unsubscribeListeners.forEach(unsubscribe => unsubscribe());
    this.unsubscribeListeners = [];
    this.currentUserId = null;
  }

  /**
   * Request notification permissions
   */
  private async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return false;
    }

    return true;
  }

  /**
   * Register device for push notifications
   */
  private async registerForPushNotifications(userId: string): Promise<void> {
    try {
      // Skip push notifications in Expo Go and web
      if (Platform.OS === 'web' || Constants.appOwnership === 'expo') {
        console.warn('Push notifications disabled in Expo Go');
        return;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: 'c0013fd4-e820-4177-8301-b97fb53c4fea', // Your actual project ID from app.json
      });

      if (token) {
        await this.savePushToken(userId, token.data);
      }
    } catch (error) {
      console.error('Error registering for push notifications:', error);
    }
  }

  /**
   * Save push token to Firestore
   */
  private async savePushToken(userId: string, token: string): Promise<void> {
    const tokenData: PushToken = {
      userId,
      token,
      platform: Platform.OS,
      creado: Timestamp.now(),
      actualizado: Timestamp.now(),
    };

    await setDoc(doc(db, 'pushTokens', userId), tokenData);
  }

  /**
   * Get push token for a user
   */
  async getUserPushToken(userId: string): Promise<string | null> {
    try {
      const tokenDoc = await getDoc(doc(db, 'pushTokens', userId));
      if (tokenDoc.exists()) {
        const data = tokenDoc.data() as PushToken;
        return data.token;
      }
      return null;
    } catch (error) {
      console.error('Error getting user push token:', error);
      return null;
    }
  }

  /**
   * Send notification to specific user
   */
  async sendNotificationToUser(
    userId: string, 
    notificationData: NotificationData
  ): Promise<void> {
    try {
      const token = await this.getUserPushToken(userId);
      if (!token) {
        console.log(`No push token found for user ${userId}`);
        return;
      }

      const message = {
        to: token,
        sound: 'default',
        title: notificationData.title,
        body: notificationData.body,
        data: notificationData.data || {},
      };

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();
      console.log('Notification sent:', result);
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  /**
   * Send company join request notification
   */
  async sendCompanyJoinRequestNotification(
    companyOwnerId: string,
    requesterEmail: string,
    companyName: string,
    requestId: string
  ): Promise<void> {
    const notificationData: NotificationData = {
      type: 'company_join_request',
      title: 'Nueva solicitud de acceso',
      body: `${requesterEmail} quiere unirse a "${companyName}"`,
      data: {
        requestId,
        companyName,
        requesterEmail,
      },
    };

    await this.sendNotificationToUser(companyOwnerId, notificationData);
  }

  /**
   * Send company request approval notification
   */
  async sendCompanyRequestApprovedNotification(
    requesterId: string,
    companyName: string
  ): Promise<void> {
    const notificationData: NotificationData = {
      type: 'company_request_approved',
      title: 'Solicitud aprobada',
      body: `Tu solicitud para unirte a "${companyName}" ha sido aprobada`,
      data: {
        companyName,
      },
    };

    await this.sendNotificationToUser(requesterId, notificationData);
  }

  /**
   * Send company request rejection notification
   */
  async sendCompanyRequestRejectedNotification(
    requesterId: string,
    companyName: string
  ): Promise<void> {
    const notificationData: NotificationData = {
      type: 'company_request_rejected',
      title: 'Solicitud rechazada',
      body: `Tu solicitud para unirte a "${companyName}" ha sido rechazada`,
      data: {
        companyName,
      },
    };

    await this.sendNotificationToUser(requesterId, notificationData);
  }

  /**
   * Set up notification listeners
   */
  private setupNotificationListeners(): void {
    // Listen for notifications received while app is foregrounded
    const foregroundSubscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received in foreground:', notification);
        // Handle foreground notification display
      }
    );

    // Listen for user interactions with notifications
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification response:', response);
        this.handleNotificationResponse(response);
      }
    );

    this.unsubscribeListeners.push(
      () => foregroundSubscription.remove(),
      () => responseSubscription.remove()
    );
  }

  /**
   * Handle notification tap/interaction
   */
  private handleNotificationResponse(response: Notifications.NotificationResponse): void {
    const { notification } = response;
    const { data } = notification.request.content;

    switch (data.type) {
      case 'company_join_request':
        // Navigate to company management screen
        console.log('Navigate to company requests:', data);
        break;
      case 'company_request_approved':
      case 'company_request_rejected':
        // Navigate to company selection screen
        console.log('Navigate to company selection:', data);
        break;
      default:
        console.log('Unknown notification type:', data.type);
    }
  }

  /**
   * Subscribe to company join requests for real-time notifications
   */
  subscribeToCompanyRequests(companyId: string, ownerId: string): () => void {
    const q = query(
      collection(db, 'solicitudes'),
      where('empresaId', '==', companyId),
      where('estado', '==', 'pendiente')
    );

    return onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const request = { id: change.doc.id, ...change.doc.data() };
          
          // Send notification to company owner
          this.sendCompanyJoinRequestNotification(
            ownerId,
            request.solicitanteEmail,
            companyId, // You might want to pass company name here
            request.id
          );
        }
      });
    });
  }
}

export default NotificationService;