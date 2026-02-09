








// src/services/notificationService.ts
// ✅ NO TWILIO - Mock SMS implementation

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import emailjs from '@emailjs/browser';

const NOTIFICATIONS_COLLECTION = "notifications";
const SETTINGS_COLLECTION = "notification_settings";

// EmailJS Configuration
const EMAILJS_SERVICE_ID = "service_hafgg6k";
const EMAILJS_TEMPLATE_ID = "template_h6q6rd6";
const EMAILJS_PUBLIC_KEY = "aOwp7WMRCyqarRbCk";

// Initialize EmailJS
emailjs.init(EMAILJS_PUBLIC_KEY);

export interface Notification {
  id: string;
  type: "toner" | "gadget" | "internet" | "a4_sheet";
  severity: "low" | "critical" | "info";
  title: string;
  message: string;
  itemId: string;
  itemName: string;
  read: boolean;
  emailSent: boolean;
  emailsSentTo: string[];
  smsSent: boolean;
  smssSentTo: string[];
  createdAt: string;
}

export interface NotificationSettings {
  id?: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  emails: string[];
  phoneNumbers: string[];
  thresholds: {
    toner: number;
    gadget: number;
    internet: number;
    a4Sheet: number;
  };
}

// CREATE NOTIFICATION
export async function createNotification(
  notification: Omit<Notification, "id" | "read" | "emailSent" | "emailsSentTo" | "smsSent" | "smssSentTo" | "createdAt">
): Promise<void> {
  try {
    const settings = await getNotificationSettings();
    
    const newNotification = {
      ...notification,
      read: false,
      emailSent: false,
      emailsSentTo: [],
      smsSent: false,
      smssSentTo: [],
      createdAt: new Date().toISOString(),
    };

    // Add to database
    const docRef = await addDoc(collection(db, NOTIFICATIONS_COLLECTION), newNotification);
    console.log("✅ Notification created:", docRef.id);

    // Send emails to all recipients if enabled
    if (settings?.emailEnabled && settings?.emails?.length > 0) {
      console.log(`📧 Sending email notifications to ${settings.emails.length} recipient(s)...`);
      
      const successfulEmails = await sendEmailsToAll(
        settings.emails,
        newNotification
      );
      
      if (successfulEmails.length > 0) {
        await updateDoc(doc(db, NOTIFICATIONS_COLLECTION, docRef.id), {
          emailSent: true,
          emailsSentTo: successfulEmails,
        });
        console.log(`✅ Emails sent successfully to: ${successfulEmails.join(", ")}`);
      }
    }

    // Send SMS to all phone numbers if enabled (MOCK)
    if (settings?.smsEnabled && settings?.phoneNumbers?.length > 0) {
      console.log(`📱 SMS WOULD be sent to ${settings.phoneNumbers.length} recipient(s):`);
      
      const successfulSMS = await sendSMSToAll(
        settings.phoneNumbers,
        newNotification
      );
      
      if (successfulSMS.length > 0) {
        await updateDoc(doc(db, NOTIFICATIONS_COLLECTION, docRef.id), {
          smsSent: true,
          smssSentTo: successfulSMS,
        });
        console.log(`📱 SMS MOCK sent to: ${successfulSMS.join(", ")}`);
      }
    }

    // Trigger event for real-time UI updates
    window.dispatchEvent(new CustomEvent("notification-added"));
  } catch (error) {
    console.error("❌ Error creating notification:", error);
    throw error;
  }
}

// ✅ MOCK SMS - No actual sending (replace with real SMS provider later)
async function sendSMSToAll(
  phoneNumbers: string[],
  notification: Omit<Notification, "id">
): Promise<string[]> {
  const successfulSMS: string[] = [];
  
  // Create SMS message (keep under 160 chars)
  const smsMessage = `${notification.severity.toUpperCase()}: ${notification.title}\n${notification.message}`;
  
  console.log('📱 ========== MOCK SMS ==========');
  console.log(`   Message: ${smsMessage}`);
  console.log('   Recipients:');
  
  // MOCK: Just log to console, mark all as successful
  for (const phoneNumber of phoneNumbers) {
    console.log(`   → ${phoneNumber}`);
    successfulSMS.push(phoneNumber);
  }
  
  console.log('================================');
  console.log('💡 To enable real SMS, integrate with:');
  console.log('   - Hubtel (Ghana): https://hubtel.com/');
  console.log('   - Africa\'s Talking: https://africastalking.com/');
  console.log('   - Twilio: https://twilio.com/');
  console.log('================================');
  
  return successfulSMS;
}

// SEND EMAILS TO ALL RECIPIENTS
async function sendEmailsToAll(
  recipients: string[],
  notification: Omit<Notification, "id">
): Promise<string[]> {
  const successfulEmails: string[] = [];
  
  for (const email of recipients) {
    try {
      const sent = await sendEmailNotification(email, notification);
      if (sent) {
        successfulEmails.push(email);
      }
    } catch (error) {
      console.error(`❌ Failed to send to ${email}:`, error);
    }
  }
  
  return successfulEmails;
}

// SEND EMAIL VIA EMAILJS
async function sendEmailNotification(
  recipientEmail: string,
  notification: Omit<Notification, "id">
): Promise<boolean> {
  try {
    const templateParams = {
      email: recipientEmail,
      subject: notification.title,
      title: notification.title,
      message: notification.message,
      severity: notification.severity.toUpperCase(),
      type: notification.type.toUpperCase(),
      timestamp: new Date().toLocaleString(),
    };

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams
    );

    if (response.status === 200) {
      console.log("✅ Email sent to", recipientEmail);
      return true;
    }
    return false;
  } catch (error: any) {
    console.error("❌ EmailJS error for", recipientEmail, ":", error);
    return false;
  }
}

// GET ALL NOTIFICATIONS
export async function getNotifications(): Promise<Notification[]> {
  try {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Notification[];
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }
}

// GET UNREAD NOTIFICATIONS
export async function getUnreadNotifications(): Promise<Notification[]> {
  try {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where("read", "==", false),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Notification[];
  } catch (error) {
    console.error("Error fetching unread notifications:", error);
    return [];
  }
}

// GET UNREAD COUNT
export async function getUnreadCount(): Promise<number> {
  try {
    const unread = await getUnreadNotifications();
    return unread.length;
  } catch (error) {
    console.error("Error getting unread count:", error);
    return 0;
  }
}

// MARK NOTIFICATION AS READ
export async function markAsRead(id: string): Promise<void> {
  try {
    await updateDoc(doc(db, NOTIFICATIONS_COLLECTION, id), {
      read: true,
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
}

// MARK ALL AS READ
export async function markAllAsRead(): Promise<void> {
  try {
    const notifications = await getUnreadNotifications();
    const promises = notifications.map((n) => markAsRead(n.id));
    await Promise.all(promises);
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    throw error;
  }
}

// DELETE NOTIFICATION
export async function deleteNotification(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, NOTIFICATIONS_COLLECTION, id));
  } catch (error) {
    console.error("Error deleting notification:", error);
    throw error;
  }
}

// DELETE ALL NOTIFICATIONS
export async function deleteAllNotifications(): Promise<void> {
  try {
    const all = await getNotifications();
    const promises = all.map((n) => deleteNotification(n.id));
    await Promise.all(promises);
    console.log(`✅ Deleted ${all.length} notifications`);
  } catch (error) {
    console.error("Error deleting all notifications:", error);
    throw error;
  }
}

// DELETE ALL READ NOTIFICATIONS
export async function deleteAllReadNotifications(): Promise<void> {
  try {
    const all = await getNotifications();
    const readOnes = all.filter(n => n.read);
    const promises = readOnes.map((n) => deleteNotification(n.id));
    await Promise.all(promises);
    console.log(`✅ Deleted ${readOnes.length} read notifications`);
  } catch (error) {
    console.error("Error deleting read notifications:", error);
    throw error;
  }
}

// GET NOTIFICATION SETTINGS
export async function getNotificationSettings(): Promise<NotificationSettings | null> {
  try {
    const snapshot = await getDocs(collection(db, SETTINGS_COLLECTION));
    
    if (snapshot.empty) {
      return {
        emailEnabled: false,
        smsEnabled: false,
        emails: [],
        phoneNumbers: [],
        thresholds: {
          toner: 20,
          gadget: 5,
          internet: 7,
          a4Sheet: 10,
        },
      };
    }

    const docData = snapshot.docs[0];
    const data = docData.data() as any;
    
    // Migration: Convert old formats to new array format
    const settings: NotificationSettings = {
      id: docData.id,
      emailEnabled: data.emailEnabled || false,
      smsEnabled: data.smsEnabled || false,
      emails: Array.isArray(data.emails) ? data.emails : (data.email ? [data.email] : []),
      phoneNumbers: Array.isArray(data.phoneNumbers) ? data.phoneNumbers : (data.phoneNumber ? [data.phoneNumber] : []),
      thresholds: data.thresholds || {
        toner: 20,
        gadget: 5,
        internet: 7,
        a4Sheet: 10,
      },
    };
    
    return settings;
  } catch (error) {
    console.error("Error fetching notification settings:", error);
    return null;
  }
}

// UPDATE NOTIFICATION SETTINGS
export async function updateNotificationSettings(
  settings: NotificationSettings
): Promise<void> {
  try {
    const snapshot = await getDocs(collection(db, SETTINGS_COLLECTION));

    if (snapshot.empty) {
      await addDoc(collection(db, SETTINGS_COLLECTION), settings);
    } else {
      const docId = snapshot.docs[0].id;
      const { id, ...data } = settings;
      await updateDoc(doc(db, SETTINGS_COLLECTION, docId), data);
    }

    console.log("✅ Notification settings updated");
    console.log(`   Email: ${settings.emailEnabled ? 'Enabled' : 'Disabled'}`);
    console.log(`   SMS: ${settings.smsEnabled ? 'Enabled (MOCK)' : 'Disabled'}`);
    if (settings.emails.length > 0) {
      console.log(`   Email recipients (${settings.emails.length}):`, settings.emails.join(", "));
    }
    if (settings.phoneNumbers.length > 0) {
      console.log(`   SMS recipients (${settings.phoneNumbers.length}):`, settings.phoneNumbers.join(", "));
    }
  } catch (error) {
    console.error("Error updating notification settings:", error);
    throw error;
  }
}








