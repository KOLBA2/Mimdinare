   // Load history data from localStorage
   let historyData = JSON.parse(localStorage.getItem('historyData')) || [];

   // Example history data structure
   // historyData = [
   //     { timestamp: 1633072800000, type: 'Shop Purchase', price: 25.50, items: [{ name: 'Item A', quantity: 2 }] },
   //     { timestamp: 1633159200000, type: 'Game Session', duration: '2 hours', price: 15.00 },
   //     { timestamp: 1633245600000, type: 'End Day', price: 0.00 },
   //     { timestamp: 1633332000000, type: 'Game Session', duration: '1 hour', price: 10.00 }
   // ];

   // Display username
   const username = localStorage.getItem('username');
   document.getElementById('username-display').textContent = username;

   // Initialize Flatpickr calendars
   const startDateInput = flatpickr("#startDateInput", {
       dateFormat: "Y-m-d",
       onChange: function(selectedDates, dateStr) {
           filterByDateRange();
       }
   });

   const endDateInput = flatpickr("#endDateInput", {
       dateFormat: "Y-m-d",
       onChange: function(selectedDates, dateStr) {
           filterByDateRange();
       }
   });

   // Function to filter history by date range
   function filterByDateRange() {
       const startDate = document.getElementById('startDateInput').value;
       const endDate = document.getElementById('endDateInput').value;
       const filter = document.querySelector('.filters button.active').getAttribute('onclick').match(/'([^']+)'/)[1];
       const searchQuery = document.getElementById('searchInput').value.toLowerCase();
       renderHistoryTable(filter, searchQuery, startDate, endDate);
   }

   // Function to render history table with filters
   function renderHistoryTable(filter = 'all', searchQuery = '', startDate = '', endDate = '') {
       const tableBody = document.querySelector('#historyTable tbody');
       const noDataMessage = document.getElementById('noDataMessage');

       // Filter history data
       const filteredData = historyData.filter(entry => {
           if (filter === 'shop' && entry.type !== 'Shop Purchase') return false;
           if (filter === 'game' && (entry.type === 'Shop Purchase' || entry.type === 'End Day')) return false;
           if (searchQuery) {
               const searchLower = searchQuery.toLowerCase();
               const matchesDate = new Date(entry.timestamp).toLocaleString().toLowerCase().includes(searchLower);
               const matchesType = entry.type.toLowerCase().includes(searchLower);
               const matchesItems = entry.items ? entry.items.some(item => item.name.toLowerCase().includes(searchLower)) : false;
               if (!matchesDate && !matchesType && !matchesItems) return false;
           }
           if (startDate && endDate) {
               const entryDate = new Date(entry.timestamp).toISOString().split('T')[0];
               if (entryDate < startDate || entryDate > endDate) return false;
           }
           return true;
       });

       if (filteredData.length === 0) {
           noDataMessage.style.display = 'block';
           tableBody.innerHTML = '';
           return;
       }

       noDataMessage.style.display = 'none';
       tableBody.innerHTML = '';

       filteredData.forEach(entry => {
           const row = document.createElement('tr');
           row.innerHTML = `
               <td>${new Date(entry.timestamp).toLocaleString()}</td>
               <td>${entry.type}</td>
               <td>${entry.duration || 'N/A'}</td>
               <td>${entry.price ? entry.price.toFixed(2) : 'N/A'}</td>
               <td>${entry.items ? entry.items.map(item => `${item.name} (${item.quantity}x)`).join(', ') : 'N/A'}</td>
           `;
           tableBody.appendChild(row);
       });
   }

   // Function to filter history
   function filterHistory(filter) {
       // Update active filter button
       document.querySelectorAll('.filters button').forEach(button => {
           button.classList.remove('active');
       });
       document.querySelector(`.filters button[onclick="filterHistory('${filter}')"]`).classList.add('active');

       // Render the table with the selected filter
       const startDate = document.getElementById('startDateInput').value;
       const endDate = document.getElementById('endDateInput').value;
       renderHistoryTable(filter, document.getElementById('searchInput').value, startDate, endDate);
   }

   // Function to search history
   function searchHistory() {
       const searchQuery = document.getElementById('searchInput').value.toLowerCase();
       const startDate = document.getElementById('startDateInput').value;
       const endDate = document.getElementById('endDateInput').value;
       renderHistoryTable(document.querySelector('.filters button.active').getAttribute('onclick').match(/'([^']+)'/)[1], searchQuery, startDate, endDate);
   }

   // Function to clear search
   function clearSearch() {
       document.getElementById('searchInput').value = '';
       const startDate = document.getElementById('startDateInput').value;
       const endDate = document.getElementById('endDateInput').value;
       renderHistoryTable(document.querySelector('.filters button.active').getAttribute('onclick').match(/'([^']+)'/)[1], '', startDate, endDate);
   }

   // Render the table on page load
   renderHistoryTable();

   // Logout function
   function logout() {
       localStorage.removeItem('isLoggedIn');
       localStorage.removeItem('username');
       window.location.href = 'index.html';
   }

   // Redirect to dashboard
   function redirectToDashboard() {
       window.location.href = 'dashboard.html';
   }