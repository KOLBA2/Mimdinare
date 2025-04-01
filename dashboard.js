let selectedCard = null;
let timerIntervals = {};
let alarmSound = new Audio("https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3");

let totalCashBalance = parseFloat(localStorage.getItem('cashBalance')) || 0;
let totalCardBalance = parseFloat(localStorage.getItem('cardBalance')) || 0;
let activeSessions = JSON.parse(localStorage.getItem('activeSessions')) || {};

let stockData = [
    { item: "Cappy", price: 3.10, quantity: 0 },
    { item: "Fuse tea", price: 2.60, quantity: 0 },
    { item: "Vape IZY", price: 15.00, quantity: 0 },
    { item: "Vape VOOM", price: 17.00, quantity: 0 },
    { item: "ასორტი", price: 10.00, quantity: 0 },
    { item: "ბოთლის კოკა-კოლა", price: 3.00, quantity: 0 },
    { item: "დორიტოსი", price: 3.50, quantity: 0 },
    { item: "პოპკორნი", price: 2.50, quantity: 0 },
    { item: "სნუსი DOPE", price: 23.00, quantity: 0 },
    { item: "ფრიქსი", price: 3.00, quantity: 0 },
    { item: "ქილის კოკა-კოლა", price: 2.50, quantity: 0 },
    { item: "ყავა", price: 3.00, quantity: 0 },
    { item: "ჩაი", price: 3.00, quantity: 0 },
    { item: "ჩიტოსი", price: 3.00, quantity: 0 },
    { item: "წყალი", price: 1.50, quantity: 0 },
    { item: "ხრუსტიმი დიდი", price: 3.00, quantity: 0 },
    { item: "ხრუსტიმი პატარა", price: 2.00, quantity: 0 }
];

let currentShopCardId = null;
let shopCart = [];
let currentPaymentCardId = null;
let currentPaymentAmount = 0;

const rentalOptions = {
    'ps5-premium': [
        { label: '+2 ჯოისტიკი & 50% ფასდაკლება', price: 9 },
        { label: '+2 ჯოისტიკი', price: 18 },
        { label: 'უფასო', price: 0 },
        { label: '50% ფასდაკლება', price: 7 },
        { label: 'Fixed', price: 14 }
    ],
    'ps5': [
        { label: '+2 ჯოისტიკი & 50% ფასდაკლება', price: 6 },
        { label: '+2 ჯოისტიკი', price: 12 },
        { label: 'უფასო', price: 0 },
        { label: '50% ფასდაკლება', price: 4 },
        { label: 'Fixed', price: 8 }
    ],
    'vip': [
        { label: '+2 ჯოისტიკი & 50% ფასდაკლება', price: 8 },
        { label: '+2 ჯოისტიკი', price: 16 },
        { label: 'უფასო', price: 0 },
        { label: '50% ფასდაკლება', price: 6 },
        { label: 'Fixed', price: 10 }
    ],
    'sache': [
        { label: '50% ფასდაკლება', price: 6 },
        { label: 'უფასო', price: 0 },
        { label: 'Fixed', price: 12 }
    ]
};

let totalPrice = 0;

window.addEventListener('load', function() {
    if (localStorage.getItem('isLoggedIn') !== 'true') {
        window.location.href = 'index.html';
        return;
    }

    restoreActiveSessions();

    const username = localStorage.getItem('username');
    document.getElementById('username-display').textContent = username;
    updateBalanceDisplay();
    
    document.querySelectorAll('input[name="shopPaymentType"]').forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'both') {
                document.getElementById('shopBothPayments').style.display = 'block';
                updateShopPaymentSplit();
            } else {
                document.getElementById('shopBothPayments').style.display = 'none';
            }
        });
    });

    const rentalTypeSelect = document.getElementById('rentalType');
    rentalTypeSelect.addEventListener('change', function() {
        const isFixedRental = this.value === 'Fixed';
        
        if (isFixedRental) {
            document.getElementById('timeInput').value = '00:00';
            totalPrice = parseFloat(this.options[this.selectedIndex].dataset.price);
            document.getElementById('hourlyPrice').value = `${totalPrice.toFixed(2)}₾`;
            document.getElementById('paymentInputs').style.display = 'none';
        } else {
            document.getElementById('paymentInputs').style.display = 'block';
            updatePrice();
        }
    });

    document.addEventListener('click', function(event) {
        const timeInput = document.getElementById('timeInput');
        const timeDropdown = document.getElementById('timeDropdown');
        
        if (!timeInput.contains(event.target) && !timeDropdown.contains(event.target)) {
            timeDropdown.classList.remove('active');
        }
    });
});

function saveState() {
    localStorage.setItem('cashBalance', totalCashBalance);
    localStorage.setItem('cardBalance', totalCardBalance);
    localStorage.setItem('activeSessions', JSON.stringify(activeSessions));
}

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function restoreActiveSessions() {
    Object.keys(activeSessions).forEach(cardId => {
        const session = activeSessions[cardId];
        const card = document.querySelector(`[data-card-id="${cardId}"]`);
        
        if (card) {
            const currentTime = Date.now();
            const elapsedSeconds = Math.floor((currentTime - session.startTime) / 1000);
            
            let remainingSeconds;
            if (session.isFixedRental) {
                remainingSeconds = elapsedSeconds;
                if (remainingSeconds >= 24 * 60 * 60) {
                    delete activeSessions[cardId];
                    resetCard(card);
                    return;
                }
            } else {
                remainingSeconds = Math.max(0, session.totalDuration - elapsedSeconds);
                if (remainingSeconds <= 0) {
                    delete activeSessions[cardId];
                    resetCard(card);
                    return;
                }
            }

            renderActiveSession(card, session);
            startTimer(remainingSeconds, card, session.rentalType, session.pricePerHour, session.isFixedRental, session.payLater);
        }
    });
    saveState();
}

function resetCard(card) {
    card.innerHTML = '<div class="add-button" onclick="showPopup(this)">+</div><div class="plus-button" onclick="openShopWindow(this)">+</div>';
    card.classList.remove('timer-active');
    card.classList.remove('flash');
    alarmSound.pause();
    alarmSound.currentTime = 0;
}

function renderActiveSession(card, session) {
    const currentTime = Date.now();
    const elapsedSeconds = Math.floor((currentTime - session.startTime) / 1000);
    
    let remainingSeconds;
    if (session.isFixedRental) {
        remainingSeconds = elapsedSeconds;
    } else {
        remainingSeconds = Math.max(0, session.totalDuration - elapsedSeconds);
    }

    card.innerHTML = `
        <div>Time: <span id="cardTimer">${formatTime(remainingSeconds)}</span></div>
        <div>Type: ${session.rentalType}</div>
        ${session.isFixedRental ? '' : `<div>Price: ₾ ${session.price.toFixed(2)}</div>`}
        ${session.purchases ? session.purchases.map(purchase => `
            <div>${purchase.items.map(item => `${item.name} (${item.quantity})`).join(', ')}</div>
        `).join('') : ''}
        <button class="end-button" onclick="endSession(this)">End</button>
        <div class="plus-button visible" onclick="openShopWindow(this)">+</div>
    `;
    card.classList.add('timer-active');
}

function saveHistoryEntry(entry) {
    const historyData = JSON.parse(localStorage.getItem('historyData')) || [];
    historyData.push(entry);
    localStorage.setItem('historyData', JSON.stringify(historyData));
}

function startRental() {
    if (selectedCard) {
        const cashAmount = parseFloat(document.getElementById('cashPayment').value) || 0;
        const cardAmount = parseFloat(document.getElementById('cardPayment').value) || 0;
        const timeInput = document.getElementById('timeInput').value;
        const rentalType = document.querySelector('#rentalType').value;
        const payLater = document.getElementById('payLaterCheckbox').checked;
        const isFixedRental = rentalType === 'Fixed';

        // Validate time input if not fixed rental
        if (!isFixedRental) {
            const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
            if (!timeRegex.test(timeInput)) {
                alert('Please enter a valid time in HH:MM format (e.g., 01:30)');
                return;
            }
        }

        let totalSeconds;
        let pricePerHour = parseFloat(document.querySelector('#rentalType option:checked').dataset.price);
        
        if (isFixedRental) {
            totalSeconds = 24 * 60 * 60; // 24 hours
        } else {
            const [hours, minutes] = timeInput.split(':').map(Number);
            totalSeconds = (hours * 3600) + (minutes * 60);
        }

        // Only add payment if not fixed rental and not paying later
        if (!isFixedRental && !payLater) {
            totalCashBalance += cashAmount;
            totalCardBalance += cardAmount;
            updateBalanceDisplay();
        }

        const cardId = selectedCard.dataset.cardId;

        activeSessions[cardId] = {
            startTime: Date.now(),
            totalDuration: totalSeconds,
            price: isFixedRental ? 0 : (cashAmount + cardAmount),
            timeLeft: totalSeconds,
            selectedDuration: isFixedRental ? 'Fixed' : timeInput,
            rentalType: rentalType,
            isFixedRental: isFixedRental,
            pricePerHour: pricePerHour,
            payLater: payLater,
            cashAmount: isFixedRental ? 0 : cashAmount,
            cardAmount: isFixedRental ? 0 : cardAmount,
            purchases: []
        };

        if (!isFixedRental && !payLater) {
            saveHistoryEntry({
                timestamp: Date.now(),
                type: rentalType,
                duration: timeInput,
                price: cashAmount + cardAmount,
                items: null,
                payLater: payLater
            });
        }

        renderActiveSession(selectedCard, activeSessions[cardId]);
        startTimer(totalSeconds, selectedCard, rentalType, pricePerHour, isFixedRental, payLater);
        closePopup();
        saveState();
    }
}
async function processShopPurchase() {
    if (shopCart.length === 0 || !currentShopCardId) {
        closeShopWindow();
        return;
    }

    const total = shopCart.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    if (total <= 0) {
        closeShopWindow();
        return;
    }

    const paymentMethod = document.querySelector('input[name="shopPaymentType"]:checked').value;
    let cashAmount = 0;
    let cardAmount = 0;

    if (paymentMethod === 'cash') {
        cashAmount = total;
    } else if (paymentMethod === 'card') {
        cardAmount = total;
    } else if (paymentMethod === 'both') {
        cashAmount = parseFloat(document.getElementById('shopCashAmount').value) || 0;
        cashAmount = Math.min(cashAmount, total);
        cardAmount = total - cashAmount;
        document.getElementById('shopCardAmount').value = cardAmount.toFixed(2);
    }

    // Update local balances
    totalCashBalance += cashAmount;
    totalCardBalance += cardAmount;
    updateBalanceDisplay();

    try {
        // Make API call to update cash register
        const response = await fetch('http://mimdinare.runasp.net/api/Cashreg', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                cash: cashAmount,
                card: cardAmount
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        console.log('Cash register updated successfully');
    } catch (error) {
        console.error('Error updating cash register:', error);
        // You might want to handle the error here, maybe show a message to the user
        // or revert the local balance changes if the API call fails
    }

    // Update stock quantities
    shopCart.forEach(cartItem => {
        const stockItemIndex = stockData.findIndex(item => item.item === cartItem.name);
        if (stockItemIndex !== -1) {
            stockData[stockItemIndex].quantity -= cartItem.quantity;
        }
    });

    if (activeSessions[currentShopCardId]) {
        if (!activeSessions[currentShopCardId].purchases) {
            activeSessions[currentShopCardId].purchases = [];
        }

        activeSessions[currentShopCardId].purchases.push({
            items: JSON.parse(JSON.stringify(shopCart)),
            total: total,
            cashAmount: cashAmount,
            cardAmount: cardAmount,
            timestamp: Date.now()
        });

        saveHistoryEntry({
            timestamp: Date.now(),
            type: 'Shop Purchase',
            duration: 'N/A',
            price: total,
            items: shopCart
        });
    }

    localStorage.setItem('stockData', JSON.stringify(stockData));
    saveState();
    closeShopWindow();
}

function startTimer(duration, card, rentalType, pricePerHour, isFixedRental = false, payLater = false) {
    const cardId = card.dataset.cardId;
    if (timerIntervals[cardId]) {
        clearInterval(timerIntervals[cardId]);
    }

    const startTime = Date.now();

    function updateTimer() {
        const currentTime = Date.now();
        const elapsedSeconds = Math.floor((currentTime - startTime) / 1000);
        
        let remainingSeconds;
        if (isFixedRental) {
            remainingSeconds = elapsedSeconds;
            if (remainingSeconds >= 24 * 60 * 60) {
                clearInterval(timerIntervals[cardId]);
                triggerAlarm(card);
                showPaymentPopup(cardId, elapsedSeconds, pricePerHour);
                delete activeSessions[cardId];
                saveState();
                return;
            }
        } else {
            remainingSeconds = Math.max(0, duration - elapsedSeconds);
            if (remainingSeconds <= 0) {
                clearInterval(timerIntervals[cardId]);
                triggerAlarm(card);
                if (payLater) {
                    const hoursUsed = duration / 3600;
                    const amountDue = hoursUsed * pricePerHour;
                    showPaymentPopup(cardId, duration, pricePerHour);
                } else {
                    delete activeSessions[cardId];
                    resetCard(card);
                }
                saveState();
                return;
            }
        }

        const cardTimer = card.querySelector('#cardTimer');
        if (cardTimer) {
            cardTimer.textContent = formatTime(remainingSeconds);
            activeSessions[cardId].timeLeft = remainingSeconds;
            saveState();
        }
    }

    timerIntervals[cardId] = setInterval(updateTimer, 1000);
    updateTimer();
}

function showPaymentPopup(cardId, elapsedSeconds, pricePerHour) {
    const hoursUsed = elapsedSeconds / 3600;
    const amountDue = hoursUsed * pricePerHour;
    
    currentPaymentCardId = cardId;
    currentPaymentAmount = amountDue;
    
    document.getElementById('paymentAmount').value = amountDue.toFixed(2);
    document.getElementById('paymentCashAmount').value = amountDue.toFixed(2);
    document.getElementById('paymentCardAmount').value = '0';
    document.getElementById('paymentTotalAmount').textContent = `Total: ₾ ${amountDue.toFixed(2)}`;
    
    document.getElementById('paymentPopup').style.display = 'block';
    document.getElementById('paymentOverlay').style.display = 'block';
}

function closePaymentPopup() {
    document.getElementById('paymentPopup').style.display = 'none';
    document.getElementById('paymentOverlay').style.display = 'none';
    currentPaymentCardId = null;
    currentPaymentAmount = 0;
}

function updatePaymentCashAmount() {
    const cardAmount = parseFloat(document.getElementById('paymentCardAmount').value) || 0;
    const cashAmount = currentPaymentAmount - cardAmount;
    document.getElementById('paymentCashAmount').value = cashAmount > 0 ? cashAmount.toFixed(2) : '0';
    document.getElementById('paymentTotalAmount').textContent = `Total: ₾ ${currentPaymentAmount.toFixed(2)}`;
}

function updatePaymentCardAmount() {
    const cashAmount = parseFloat(document.getElementById('paymentCashAmount').value) || 0;
    const cardAmount = currentPaymentAmount - cashAmount;
    document.getElementById('paymentCardAmount').value = cardAmount > 0 ? cardAmount.toFixed(2) : '0';
    document.getElementById('paymentTotalAmount').textContent = `Total: ₾ ${currentPaymentAmount.toFixed(2)}`;
}

function confirmPayment() {
    const cashAmount = parseFloat(document.getElementById('paymentCashAmount').value) || 0;
    const cardAmount = parseFloat(document.getElementById('paymentCardAmount').value) || 0;
    
    if (Math.abs((cashAmount + cardAmount) - currentPaymentAmount) > 0.01) {
        alert('The sum of cash and card payments must equal the amount due.');
        return;
    }
    
    totalCashBalance += cashAmount;
    totalCardBalance += cardAmount;
    updateBalanceDisplay();
    
    const session = activeSessions[currentPaymentCardId];
    
    saveHistoryEntry({
        timestamp: Date.now(),
        type: session ? session.rentalType : 'Fixed Rental Payment',
        duration: session ? session.selectedDuration : formatTime(Math.floor(currentPaymentAmount / pricePerHour * 3600)),
        price: currentPaymentAmount,
        cashAmount: cashAmount,
        cardAmount: cardAmount,
        payLater: session ? session.payLater : false
    });
    
    if (activeSessions[currentPaymentCardId]) {
        const card = document.querySelector(`[data-card-id="${currentPaymentCardId}"]`);
        if (card) {
            resetCard(card);
        }
        delete activeSessions[currentPaymentCardId];
    }
    
    closePaymentPopup();
    saveState();
}

function endSession(button) {
    const card = button.closest('.card');
    if (card) {
        const cardId = card.dataset.cardId;
        const session = activeSessions[cardId];
        
        if (session) {
            const currentTime = Date.now();
            const elapsedSeconds = Math.floor((currentTime - session.startTime) / 1000);
            
            if (session.isFixedRental || session.payLater) {
                const hoursUsed = session.isFixedRental ? elapsedSeconds / 3600 : session.totalDuration / 3600;
                const amountDue = hoursUsed * session.pricePerHour;
                showPaymentPopup(cardId, session.isFixedRental ? elapsedSeconds : session.totalDuration, session.pricePerHour);
                return;
            }
            
            clearInterval(timerIntervals[cardId]);
            delete timerIntervals[cardId];
            delete activeSessions[cardId];
            resetCard(card);
            saveState();
        }
    }
}

function triggerAlarm(card) {
    card.classList.add('flash');
    alarmSound.loop = true;
    alarmSound.play();

    const existingStopButton = card.querySelector('.stop-alarm-btn');
    if (existingStopButton) {
        existingStopButton.remove();
    }

    const stopButton = document.createElement('button');
    stopButton.textContent = 'Stop Alarm';
    stopButton.classList.add('stop-alarm-btn');
    stopButton.onclick = function() {
        stopAlarm(card);
        const cardId = card.dataset.cardId;
        if (!activeSessions[cardId]) {
            resetCard(card);
        }
    };
    card.appendChild(stopButton);
}

function stopAlarm(card) {
    card.classList.remove('flash');
    alarmSound.pause();
    alarmSound.currentTime = 0;
    
    const stopButton = card.querySelector('.stop-alarm-btn');
    if (stopButton) stopButton.remove();
}

function logout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    window.location.href = 'index.html';
}

function showPopup(button) {
    selectedCard = button.parentElement;

    // Find the category by looking at the card's parent section
    const cardGrid = selectedCard.closest('.card-grid');
    const categoryTitle = cardGrid.previousElementSibling;
    const category = categoryTitle.textContent.trim().toLowerCase().replace(' ', '-');

    // Get the rental options for this category
    const options = rentalOptions[category] || [];

    const rentalTypeSelect = document.getElementById('rentalType');
    rentalTypeSelect.innerHTML = options.map(option => `
        <option value="${option.label}" data-price="${option.price}">${option.label}</option>
    `).join('');

    document.getElementById('payLaterCheckbox').checked = false;
    document.getElementById('paymentInputs').style.display = 'block';
    document.getElementById('timeInput').value = '01:00';

    document.getElementById('popup').style.display = 'block';
    document.getElementById('popupOverlay').style.display = 'block';
    document.getElementById('cashPayment').value = '0';
    document.getElementById('cardPayment').value = '0';
    updatePrice();
}
function updatePrice() {
    const selectedOption = document.querySelector('#rentalType option:checked');
    if (selectedOption && selectedOption.value !== 'Fixed') {
        const price = parseFloat(selectedOption.dataset.price);
        const timeInput = document.getElementById('timeInput').value;
        
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
        if (timeRegex.test(timeInput)) {
            const [hours, minutes] = timeInput.split(':').map(Number);
            totalPrice = (hours + (minutes / 60)) * price;

            document.getElementById('hourlyPrice').value = `${price.toFixed(2)}₾`;
            document.getElementById('cashPayment').value = totalPrice.toFixed(2);
            document.getElementById('cardPayment').value = '0';
            updatePaymentTotal();
        }
    }
}

function showTimeDropdown() {
    document.getElementById('timeDropdown').classList.add('active');
}

function handleTimeInput() {
    const timeInput = document.getElementById('timeInput');
    const timeDropdown = document.getElementById('timeDropdown');
    
    if (timeInput.value.length > 0) {
        timeDropdown.classList.add('active');
    } else {
        timeDropdown.classList.remove('active');
    }
    
    const rentalType = document.querySelector('#rentalType').value;
    if (rentalType !== 'Fixed') {
        updatePrice();
    }
}

function selectTimeOption(time) {
    document.getElementById('timeInput').value = time;
    document.getElementById('timeDropdown').classList.remove('active');
    
    const rentalType = document.querySelector('#rentalType').value;
    if (rentalType !== 'Fixed') {
        updatePrice();
    }
}

function togglePayLater() {
    const payLater = document.getElementById('payLaterCheckbox').checked;
    document.getElementById('paymentInputs').style.display = payLater ? 'none' : 'block';
}

function updateCashPayment() {
    const cardPayment = parseFloat(document.getElementById('cardPayment').value) || 0;
    const cashPayment = totalPrice - cardPayment;
    document.getElementById('cashPayment').value = cashPayment > 0 ? cashPayment.toFixed(2) : '0';
    updatePaymentTotal();
}

function updateCardPayment() {
    const cashPayment = parseFloat(document.getElementById('cashPayment').value) || 0;
    const cardPayment = totalPrice - cashPayment;
    document.getElementById('cardPayment').value = cardPayment > 0 ? cardPayment.toFixed(2) : '0';
    updatePaymentTotal();
}

function closePopup() {
    document.getElementById('popup').style.display = 'none';
    document.getElementById('popupOverlay').style.display = 'none';
}

function updatePaymentTotal() {
    const cashAmount = parseFloat(document.getElementById('cashPayment').value) || 0;
    const cardAmount = parseFloat(document.getElementById('cardPayment').value) || 0;
    const total = cashAmount + cardAmount;
    document.getElementById('paymentTotal').textContent = `Total: ₾ ${total.toFixed(2)}`;
}

function updateShopPaymentSplit() {
    const total = shopCart.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const cashAmount = parseFloat(document.getElementById('shopCashAmount').value) || 0;
    const cardAmount = parseFloat(document.getElementById('shopCardAmount').value) || 0;
    const totalEntered = cashAmount + cardAmount;
    
    if (Math.abs(totalEntered - total) > 0.01) {
        document.getElementById('shopCardAmount').value = (total - cashAmount).toFixed(2);
    }
    
    document.getElementById('shopTotal').textContent = `Total: ₾ ${total.toFixed(2)}`;
}
async function updateBalanceDisplay() {
    try {
        // 1. Fetch current balance from API
        const response = await fetch('http://mimdinare.runasp.net/api/Cashreg');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // 2. Parse the response data
        const balanceData = await response.json();
        
        // 3. Update global balance variables
        totalCashBalance = balanceData.cash;
        totalCardBalance = balanceData.card;
        
        // 4. Update the UI display
        document.getElementById('cash-balance').textContent = `₾ ${totalCashBalance.toFixed(2)}`;
        document.getElementById('card-balance').textContent = `₾ ${totalCardBalance.toFixed(2)}`;
        document.getElementById('total-balance').textContent = `Total: ₾ ${balanceData.total.toFixed(2)}`;
        
        // 5. Save to local storage
        saveState();
        
    } catch (error) {
        console.error('Failed to update balance:', error);
        
        // Fallback to local values if API fails
        document.getElementById('cash-balance').textContent = `₾ ${totalCashBalance.toFixed(2)}`;
        document.getElementById('card-balance').textContent = `₾ ${totalCardBalance.toFixed(2)}`;
        document.getElementById('total-balance').textContent = `Total: ₾ ${(totalCashBalance + totalCardBalance).toFixed(2)}`;
    }
}

function toggleDropdown(id) {
    const content = document.getElementById(id);
    content.classList.toggle('active');
}

function openShopWindow(button) {
    currentShopCardId = button.closest('.card').dataset.cardId;
    document.getElementById('shopWindow').style.display = 'block';
    document.getElementById('shopOverlay').style.display = 'block';
    populateShopItems();
}

function closeShopWindow() {
    document.getElementById('shopWindow').style.display = 'none';
    document.getElementById('shopOverlay').style.display = 'none';
    shopCart = [];
    currentShopCardId = null;
}

function populateShopItems() {
    const shopItemsContainer = document.getElementById('shopItemsContainer');
    shopItemsContainer.innerHTML = '';
    stockData.forEach(item => {
        const shopItem = document.createElement('div');
        shopItem.classList.add('shop-item');
        shopItem.innerHTML = `
            <div class="shop-item-details">
                <div class="shop-item-name">${item.item}</div>
                <div class="shop-item-price">₾ ${item.price.toFixed(2)}</div>
            </div>
            <div class="shop-item-controls">
                <div class="quantity-control" onclick="decreaseQuantity('${item.item}')">-</div>
                <div class="quantity-display" id="quantity-${item.item}">0</div>
                <div class="quantity-control" onclick="increaseQuantity('${item.item}')">+</div>
            </div>
        `;
        shopItemsContainer.appendChild(shopItem);
    });
}

function increaseQuantity(itemName) {
    const quantityDisplay = document.getElementById(`quantity-${itemName}`);
    let quantity = parseInt(quantityDisplay.textContent) || 0;
    quantity++;
    quantityDisplay.textContent = quantity;
    updateShopCart(itemName, quantity);
}

function decreaseQuantity(itemName) {
    const quantityDisplay = document.getElementById(`quantity-${itemName}`);
    let quantity = parseInt(quantityDisplay.textContent) || 0;
    if (quantity > 0) {
        quantity--;
        quantityDisplay.textContent = quantity;
        updateShopCart(itemName, quantity);
    }
}

function updateShopCart(itemName, quantity) {
    const itemIndex = shopCart.findIndex(item => item.name === itemName);
    if (itemIndex !== -1) {
        if (quantity > 0) {
            shopCart[itemIndex].quantity = quantity;
        } else {
            shopCart.splice(itemIndex, 1);
        }
    } else if (quantity > 0) {
        const item = stockData.find(item => item.item === itemName);
        if (item) {
            shopCart.push({ name: itemName, quantity: quantity, price: item.price });
        }
    }
    updateShopTotal();
}

function updateShopTotal() {
    const total = shopCart.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    document.getElementById('shopTotal').textContent = `Total: ₾ ${total.toFixed(2)}`;
    
    if (document.querySelector('input[name="shopPaymentType"]:checked').value === 'both') {
        document.getElementById('shopCashAmount').value = total.toFixed(2);
        document.getElementById('shopCardAmount').value = '0';
    }
}

function filterShopItems() {
    const searchInput = document.getElementById('shopSearchInput').value.toLowerCase();
    const shopItems = document.querySelectorAll('.shop-item');
    shopItems.forEach(item => {
        const itemName = item.querySelector('.shop-item-name').textContent.toLowerCase();
        if (itemName.includes(searchInput)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

function openEndDayPopup() {
    document.getElementById('endDayPopup').style.display = 'block';
    document.getElementById('endDayOverlay').style.display = 'block';
}

function closeEndDayPopup() {
    document.getElementById('endDayPopup').style.display = 'none';
    document.getElementById('endDayOverlay').style.display = 'none';
}
async function confirmEndDay() {
    const cashToLeave = parseFloat(document.getElementById('cashToLeave').value) || 0;
    
    // Validate input
    if (cashToLeave > totalCashBalance) {
        alert('You cannot leave more cash than the current balance.');
        return;
    }

    try {
        // Calculate amounts
        const cashTaken = totalCashBalance - cashToLeave;
        
        // 1. Make API request to reset balances
        const response = await fetch('http://mimdinare.runasp.net/api/reset-add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: cashTaken  // Send the amount being taken out
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        // 2. Update local balances only after successful API call
        totalCashBalance = cashToLeave;
        totalCardBalance = 0;

        // 3. Save to history
        saveHistoryEntry({
            timestamp: Date.now(),
            type: 'End Day',
            cashLeft: cashToLeave,
            cashTaken: cashTaken,
            cardReset: true,
            apiConfirmed: true  // Flag to show this was synced with API
        });

        // 4. Update UI
        updateBalanceDisplay();
        closeEndDayPopup();

        alert('End of day processed successfully!');

    } catch (error) {
        console.error('End Day Error:', error);
        alert(`Failed to complete end of day: ${error.message}`);
        
        // Optional: Revert any changes if you want to implement transaction rollback
    }
}async function confirmEndDay() {
    const cashToLeave = parseFloat(document.getElementById('cashToLeave').value) || 0;
    
    // Validate input
    if (cashToLeave > totalCashBalance) {
        alert('You cannot leave more cash than the current balance.');
        return;
    }

    try {
        // Calculate amounts
        const cashTaken = totalCashBalance - cashToLeave;
        
        // 1. Make API request to reset balances
        const response = await fetch('http://mimdinare.runasp.net/api/cashreg/reset-add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: cashToLeave  // Send the amount being taken out
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        // 2. Update local balances only after successful API call
        totalCashBalance = cashToLeave;
        totalCardBalance = 0;

        // 3. Save to history
        saveHistoryEntry({
            timestamp: Date.now(),
            type: 'End Day',
            cashLeft: cashToLeave,
            cashTaken: cashTaken,
            cardReset: true,
            apiConfirmed: true  // Flag to show this was synced with API
        });

        // 4. Update UI
        updateBalanceDisplay();
        closeEndDayPopup();

        alert('End of day processed successfully!');

    } catch (error) {
        console.error('End Day Error:', error);
        alert(`Failed to complete end of day: ${error.message}`);
        
        // Optional: Revert any changes if you want to implement transaction rollback
    }
}

function openEditBalancePopup() {
    document.getElementById('editBalancePopup').style.display = 'block';
    document.getElementById('editBalanceOverlay').style.display = 'block';
}

function closeEditBalancePopup() {
    document.getElementById('editBalancePopup').style.display = 'none';
    document.getElementById('editBalanceOverlay').style.display = 'none';
}

async function saveBalance() {
    const balanceType = document.getElementById('balanceType').value;
    const newAmount = parseFloat(document.getElementById('newBalanceAmount').value) || 0;

    try {
        // First get current balances from API
        const currentBalanceResponse = await fetch('http://mimdinare.runasp.net/api/Cashreg');
        if (!currentBalanceResponse.ok) {
            throw new Error('Failed to fetch current balances');
        }
        const currentBalances = await currentBalanceResponse.json();

        // Prepare update data - preserve the balance we're NOT changing
        const updateData = {
            cash: balanceType === 'cash' ? newAmount : currentBalances.cash,
            card: balanceType === 'card' ? newAmount : currentBalances.card,
            total: (balanceType === 'cash' ? newAmount : currentBalances.cash) + 
                  (balanceType === 'card' ? newAmount : currentBalances.card)
        };

        // Determine the correct endpoint
        const endpoint = balanceType === 'cash' ? 
            'http://mimdinare.runasp.net/api/cashreg/update-cash' :
            'http://mimdinare.runasp.net/api/cashreg/update-card';

        // Send the update
        const updateResponse = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: newAmount
            })
        });

        if (!updateResponse.ok) {
            throw new Error('Failed to update balance');
        }

        // Update local state
        if (balanceType === 'cash') {
            totalCashBalance = newAmount;
        } else {
            totalCardBalance = newAmount;
        }

        updateBalanceDisplay();
        closeEditBalancePopup();

        alert(`${balanceType.toUpperCase()} balance successfully updated to ₾${newAmount.toFixed(2)}`);

    } catch (error) {
        console.error('Balance update failed:', error);
        alert(`Error: ${error.message}\nBalances were not changed.`);
    }
}

document.getElementById('cashPayment').addEventListener('input', updateCardPayment);
document.getElementById('cardPayment').addEventListener('input', updateCashPayment);

window.addEventListener('beforeunload', function() {
    saveState();
});

function logPurchase(items, total) {
    const historyData = JSON.parse(localStorage.getItem('historyData')) || [];
    historyData.push({
        timestamp: new Date().toISOString(),
        type: 'Shop Purchase',
        price: total,
        items: items.filter(item => item.quantity > 0).map(item => ({
            name: item.name,
            quantity: item.quantity
        }))
    });
    localStorage.setItem('historyData', JSON.stringify(historyData));
}

function processPayment() {
    const items = [
        { name: "Cappy", quantity: 2 },
        { name: "Fuse tea", quantity: 1 }
    ];
    const total = 10.50;
    logPurchase(items, total);
    alert("Purchase logged!");
}

function updateRentalOptions() {
    const rentalTypeSelect = document.getElementById('rentalType');
    rentalTypeSelect.innerHTML = '';

    const category = selectedCard.closest('.dropdown-content').id.replace('-dropdown', '');
    const options = rentalOptions[category] || [];

    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.label;
        optionElement.textContent = option.label;
        optionElement.dataset.price = option.price;
        rentalTypeSelect.appendChild(optionElement);
    });
}

function updateStockItems() {
    const shopItemsContainer = document.getElementById('shopItemsContainer');
    shopItemsContainer.innerHTML = '';

    stockData.forEach(item => {
        const shopItem = document.createElement('div');
        shopItem.classList.add('shop-item');
        shopItem.innerHTML = `
            <div class="shop-item-details">
                <div class="shop-item-name">${item.item}</div>
                <div class="shop-item-price">₾ ${item.price.toFixed(2)}</div>
            </div>
            <div class="shop-item-controls">
                <div class="quantity-control" onclick="decreaseQuantity('${item.item}')">-</div>
                <div class="quantity-display" id="quantity-${item.item}">0</div>
                <div class="quantity-control" onclick="increaseQuantity('${item.item}')">+</div>
            </div>
        `;
        shopItemsContainer.appendChild(shopItem);
    });
}

window.addEventListener('storage', function (event) {
    if (event.key === 'rentalOptions') {
        rentalOptions = JSON.parse(event.newValue);
        updateRentalOptions();
    }
    if (event.key === 'stockData') {
        stockData = JSON.parse(event.newValue);
        updateStockItems();
    }
});

updateRentalOptions();
updateStockItems();