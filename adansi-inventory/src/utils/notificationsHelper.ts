


// src/utils/notificationHelper.ts

import { createNotification, getNotifications } from "../services/notificationService";

export async function addNotification(
  type: "toner" | "gadget" | "internet" | "a4_sheet",
  severity: "low" | "critical" | "info",
  title: string,
  message: string,
  itemId: string,
  itemName: string
) {
  try {
    await createNotification({
      type,
      severity,
      title,
      message,
      itemId,
      itemName,
    });

    // Trigger event for live updates - IMPORTANT: This makes notifications appear immediately
    const event = new CustomEvent("notification-added", {
      detail: {
        type,
        severity,
        title,
        message,
        itemId,
        itemName,
      },
    });
    
    window.dispatchEvent(event);
    
    // Force update of localStorage to trigger re-render
    const notifications = JSON.parse(localStorage.getItem("notifications") || "[]");
    localStorage.setItem("notifications", JSON.stringify(notifications));
    
    // Also dispatch storage event for cross-tab updates
    window.dispatchEvent(new Event('storage'));
  } catch (error) {
    console.error("Error adding notification:", error);
  }
}

// Helper to check and notify for low toner
export async function checkAndNotifyTonerLevel(
  toner: any,
  threshold: number = 20
) {
  try {
    if (!toner.initialQuantity || toner.initialQuantity === 0) return;

    const percentage = (toner.quantity / toner.initialQuantity) * 100;

    // Only notify if below threshold and hasn't been notified recently
    if (percentage <= threshold && percentage > 0) {
      // CHECK IF NOTIFICATION ALREADY EXISTS to prevent duplicates
      const existingNotifications = await getNotifications();
      const alreadyNotified = existingNotifications.some(
        n => n.itemId === toner.id && n.type === 'toner' && !n.read
      );
      
      if (alreadyNotified) {
        console.log(`[Notification] Skipping - notification already exists for ${toner.colorType} toner`);
        return;
      }
      
      const severity = percentage <= 10 ? "critical" : "low";
      
      await addNotification(
        "toner",
        severity,
        `Low Toner: ${toner.colorType}`,
        `${toner.location} - ${toner.printerType} ${toner.colorType} toner is at ${Math.round(percentage)}% (${toner.quantity} remaining)`,
        toner.id,
        `${toner.location} - ${toner.tonerType} ${toner.colorType}`
      );
    }
  } catch (error) {
    console.error("Error checking toner level:", error);
  }
}

// Helper to check and notify for low A4 sheet stock
export async function checkAndNotifyA4SheetStock(sheet: any, threshold: number = 10) {
  try {
    if (sheet.currentQuantity <= threshold && sheet.currentQuantity > 0) {
      const severity = sheet.currentQuantity <= 5 ? "critical" : "low";
      
      await addNotification(
        "a4_sheet",
        severity,
        `Low A4 Stock: ${sheet.officeName}`,
        `${sheet.officeName} has ${sheet.currentQuantity} reams remaining`,
        sheet.id,
        `${sheet.officeName}`
      );
    }
  } catch (error) {
    console.error("Error checking A4 sheet stock:", error);
  }
}

// Helper to check and notify for internet expiration
export async function checkAndNotifyInternetExpiration(
  usage: any,
  daysThreshold: number = 7
) {
  try {
    if (!usage.dateExhausted) {
      console.log(`[Notification] No dateExhausted for ${usage.officeName}`);
      return;
    }
    
    const daysRemaining = Math.ceil(
      (new Date(usage.dateExhausted).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24)
    );

    console.log(`[Notification] ${usage.officeName}: ${daysRemaining} days remaining`);

    // Notify if within threshold OR already exhausted
    if (daysRemaining <= daysThreshold) {
      // CHECK IF NOTIFICATION ALREADY EXISTS to prevent duplicates
      const existingNotifications = await getNotifications();
      const alreadyNotified = existingNotifications.some(
        n => n.itemId === usage.id && n.type === 'internet' && !n.read
      );
      
      if (alreadyNotified) {
        console.log(`[Notification] Skipping - notification already exists for ${usage.officeName}`);
        return;
      }
      
      let severity: "low" | "critical" | "info";
      let message: string;
      
      if (daysRemaining < 0) {
        // Already exhausted
        severity = "critical";
        const daysAgo = Math.abs(daysRemaining);
        message = `${usage.officeName} internet expired ${daysAgo} day${daysAgo === 1 ? '' : 's'} ago`;
      } else if (daysRemaining === 0) {
        // Expires today
        severity = "critical";
        message = `${usage.officeName} internet expires TODAY`;
      } else if (daysRemaining <= 3) {
        // Critical - expires soon
        severity = "critical";
        message = `${usage.officeName} internet expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`;
      } else {
        // Low - within threshold
        severity = "low";
        message = `${usage.officeName} internet expires in ${daysRemaining} days`;
      }
      
      console.log(`[Notification] Creating notification: ${severity} - ${message}`);
      
      await addNotification(
        "internet",
        severity,
        daysRemaining < 0 ? `Internet Expired: ${usage.officeName}` : `Internet Expiring: ${usage.officeName}`,
        message,
        usage.id,
        usage.officeName
      );
    }
  } catch (error) {
    console.error("Error checking internet expiration:", error);
  }
}

// Helper to check and notify for gadget stock
export async function checkAndNotifyGadgetStock(
  gadget: any,
  threshold: number = 5
) {
  try {
    // Check if gadget has quantity property and is low
    const stockCount = gadget.quantity || 0;
    
    if (stockCount <= threshold && stockCount > 0) {
      const severity = stockCount <= 2 ? "critical" : "low";
      
      await addNotification(
        "gadget",
        severity,
        `Low Gadget Stock: ${gadget.model}`,
        `${gadget.model} stock is low (${stockCount} remaining)`,
        gadget.id,
        gadget.model
      );
    }
  } catch (error) {
    console.error("Error checking gadget stock:", error);
  }
}

// Helper function to manually trigger notification update
export function triggerNotificationUpdate() {
  window.dispatchEvent(new CustomEvent("notification-added"));
  window.dispatchEvent(new Event('storage'));
}