// src/app/services/toast.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  success(message: string): void {
    this.showToast(message, 'success');
    console.log('Success:', message);
  }

  error(message: string): void {
    this.showToast(message, 'error');
    console.error('Error:', message);
  }

  info(message: string): void {
    this.showToast(message, 'info');
    console.info('Info:', message);
  }

  warning(message: string): void {
    this.showToast(message, 'warning');
    console.warn('Warning:', message);
  }

  private showToast(message: string, type: string): void {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.textContent = message;
    
    // Add some inline styles
    toast.style.position = 'fixed';
    toast.style.top = '20px';
    toast.style.right = '20px';
    toast.style.padding = '15px 20px';
    toast.style.borderRadius = '4px';
    toast.style.color = 'white';
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    toast.style.zIndex = '9999';
    toast.style.maxWidth = '350px';
    
    // Set background color based on type
    switch(type) {
      case 'success':
        toast.style.backgroundColor = '#28a745';
        break;
      case 'error':
        toast.style.backgroundColor = '#dc3545';
        break;
      case 'info':
        toast.style.backgroundColor = '#17a2b8';
        break;
      case 'warning':
        toast.style.backgroundColor = '#ffc107';
        toast.style.color = '#212529';
        break;
    }
    
    // Append to body
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => {
      toast.style.opacity = '1';
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 3000);
  }
}