




// src/services/notificationService.ts

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase/firebase";

const NOTIFICATIONS_COLLECTION = "notifications";
const SETTINGS_COLLECTION = "notification_settings";

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
  smsSent: boolean;
  createdAt: string;
}

export interface NotificationSettings {
  id?: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  email?: string;
  phoneNumber?: string;
  thresholds: {
    toner: number; // percentage (e.g., 20%)
    gadget: number; // quantity
    internet: number; // days remaining
    a4Sheet: number; // quantity/percentage
  };
}

// CREATE NOTIFICATION
export async function createNotification(
  notification: Omit<Notification, "id" | "read" | "emailSent" | "smsSent" | "createdAt">
): Promise<void> {
  try {
    const settings = await getNotificationSettings();
    
    const newNotification = {
      ...notification,
      read: false,
      emailSent: false,
      smsSent: false,
      createdAt: new Date().toISOString(),
    };

    // Add to database
    await addDoc(collection(db, NOTIFICATIONS_COLLECTION), newNotification);

    // Send email if enabled
    if (settings?.emailEnabled && settings?.email) {
      await sendEmailNotification(newNotification, settings.email);
    }

    // Send SMS if enabled
    if (settings?.smsEnabled && settings?.phoneNumber) {
      await sendSMSNotification(newNotification, settings.phoneNumber);
    }

    console.log("Notification created successfully");
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
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

// GET NOTIFICATION SETTINGS
export async function getNotificationSettings(): Promise<NotificationSettings | null> {
  try {
    const snapshot = await getDocs(collection(db, SETTINGS_COLLECTION));
    
    if (snapshot.empty) {
      // Return default settings
      return {
        emailEnabled: false,
        smsEnabled: false,
        thresholds: {
          toner: 20, // 20%
          gadget: 5, // 5 units
          internet: 7, // 7 days
          a4Sheet: 10, // 10 reams
        },
      };
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as NotificationSettings;
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
      // Create new settings
      await addDoc(collection(db, SETTINGS_COLLECTION), settings);
    } else {
      // Update existing settings
      const docId = snapshot.docs[0].id;
      const { id, ...data } = settings;
      await updateDoc(doc(db, SETTINGS_COLLECTION, docId), data);
    }

    console.log("Notification settings updated successfully");
  } catch (error) {
    console.error("Error updating notification settings:", error);
    throw error;
  }
}

// SEND EMAIL NOTIFICATION (Mock - integrate with actual email service)
async function sendEmailNotification(
  notification: Omit<Notification, "id">,
  email: string
): Promise<void> {
  try {
    // TODO: Integrate with actual email service (e.g., SendGrid, AWS SES, etc.)
    console.log(`📧 Email sent to ${email}:`, {
      subject: notification.title,
      body: notification.message,
    });

    // In production, you would call your email API here:
    /*
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email }],
          subject: notification.title,
        }],
        from: { email: 'noreply@yourdomain.com' },
        content: [{
          type: 'text/html',
          value: `<h2>${notification.title}</h2><p>${notification.message}</p>`,
        }],
      }),
    });
    */
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

// SEND SMS NOTIFICATION (Mock - integrate with actual SMS service)
async function sendSMSNotification(
  notification: Omit<Notification, "id">,
  phoneNumber: string
): Promise<void> {
  try {
    // TODO: Integrate with actual SMS service (e.g., Twilio, AWS SNS, etc.)
    console.log(`📱 SMS sent to ${phoneNumber}:`, notification.message);

    // In production, you would call your SMS API here:
    /*
    const response = await fetch('https://api.twilio.com/2010-04-01/Accounts/YOUR_ACCOUNT_SID/Messages.json', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa('YOUR_ACCOUNT_SID:YOUR_AUTH_TOKEN')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: phoneNumber,
        From: 'YOUR_TWILIO_NUMBER',
        Body: notification.message,
      }),
    });
    */
  } catch (error) {
    console.error("Error sending SMS:", error);
  }
}

// CHECK TONER LEVEL AND CREATE NOTIFICATION
export async function checkTonerLevel(
  toner: any,
  threshold: number = 20
): Promise<void> {
  try {
    // Calculate percentage
    const percentage = (toner.quantity / (toner.initialQuantity || 1)) * 100;

    if (percentage <= threshold && percentage > 0) {
      await createNotification({
        type: "toner",
        severity: percentage <= 10 ? "critical" : "low",
        title: `Low Toner Alert: ${toner.colorType}`,
        message: `${toner.location} - ${toner.printerType} ${toner.colorType} toner is at ${Math.round(percentage)}% (${toner.quantity} remaining)`,
        itemId: toner.id,
        itemName: `${toner.location} - ${toner.tonerType} ${toner.colorType}`,
      });
    }
  } catch (error) {
    console.error("Error checking toner level:", error);
  }
}

// CHECK A4 SHEET STOCK AND CREATE NOTIFICATION
export async function checkA4SheetStock(sheet: any): Promise<void> {
  try {
    if (sheet.currentQuantity <= sheet.minimumStockLevel) {
      await createNotification({
        type: "a4_sheet",
        severity: sheet.currentQuantity === 0 ? "critical" : "low",
        title: `Low A4 Sheet Stock: ${sheet.officeName}`,
        message: `${sheet.officeName} has ${sheet.currentQuantity} reams remaining (minimum: ${sheet.minimumStockLevel})`,
        itemId: sheet.id,
        itemName: `${sheet.officeName} - ${sheet.brand}`,
      });
    }
  } catch (error) {
    console.error("Error checking A4 sheet stock:", error);
  }
}

// CHECK INTERNET USAGE AND CREATE NOTIFICATION
export async function checkInternetUsage(usage: any, daysThreshold: number = 7): Promise<void> {
  try {
    if (usage.dateExhausted) {
      const daysRemaining = Math.ceil(
        (new Date(usage.dateExhausted).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      );

      if (daysRemaining <= daysThreshold && daysRemaining > 0) {
        await createNotification({
          type: "internet",
          severity: daysRemaining <= 3 ? "critical" : "low",
          title: `Internet Expiring Soon: ${usage.officeName}`,
          message: `${usage.officeName} internet (${usage.provider}) expires in ${daysRemaining} days`,
          itemId: usage.id,
          itemName: `${usage.officeName} - ${usage.provider}`,
        });
      }
    }
  } catch (error) {
    console.error("Error checking internet usage:", error);
  }
}