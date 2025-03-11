document.addEventListener('DOMContentLoaded', function() {
  // Socket.io connection
  const socket = io();
  
  // Chat functionality
  const chatForm = document.getElementById('chatForm');
  const messageInput = document.getElementById('messageInput');
  const chatMessages = document.getElementById('chatMessages');
  
  if (chatForm) {
    // Get chat ID from URL
    const pathParts = window.location.pathname.split('/');
    const chatId = pathParts[pathParts.length - 1];
    
    // Safely get user ID from meta tag
    const userIdMeta = document.querySelector('meta[name="userId"]');
    const userId = userIdMeta ? userIdMeta.content : null;
    
    // Scroll to bottom of chat
    function scrollToBottom() {
      if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    }
    
    // Initial scroll
    scrollToBottom();
    
    // Submit message
    chatForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const message = messageInput.value.trim();
      
      if (!message) return;
      
      // Clear input
      messageInput.value = '';
      
      // Send to server
      socket.emit('chatMessage', {
        chatId,
        message,
        sender: userId
      });
    });
    
    // Message from server
    socket.on('message', function(data) {
      if (data.chatId === chatId) {
        // Add message to UI
        // This would be implemented in a real application
        scrollToBottom();
      }
    });
  }
  
  // Tooltips
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
    tooltipTriggerList.map(function(tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl);
    });
  }
  
  // Popovers
  const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
  if (typeof bootstrap !== 'undefined' && bootstrap.Popover) {
    popoverTriggerList.map(function(popoverTriggerEl) {
      return new bootstrap.Popover(popoverTriggerEl);
    });
  }
  
  // Mobile sidebar toggle
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar = document.querySelector('.sidebar');
  
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', function() {
      sidebar.classList.toggle('show');
    });
  }
  
  // Form validation
  const forms = document.querySelectorAll('.needs-validation');
  
  Array.from(forms).forEach(form => {
    form.addEventListener('submit', event => {
      if (!form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
      }
      
      form.classList.add('was-validated');
    }, false);
  });
}); 