document.addEventListener('DOMContentLoaded', async function() {
    
    const EXCHANGE_API = 'https://api.exchangerate-api.com/v4/latest/USD';
    
    // Load JSON data
    const [valuesRes, currenciesRes] = await Promise.all([
        fetch('values.json'),
        fetch('currencies.json')
    ]);
    const { buttonAmounts } = await valuesRes.json();
    const { currencies } = await currenciesRes.json();

    // DOM Elements
    const container = document.querySelector('.donation-container');
    const currencySelect = document.querySelector('.currency-select');
    const amountInput = document.querySelector('.amount-input');
    const payFastAmountInput = document.getElementById('PayFastAmount');
    const conversionInfo = document.createElement('div');
    conversionInfo.className = 'conversion-info';
    amountInput.parentNode.appendChild(conversionInfo);

    // Get existing warning element
    const minAmountWarning = document.querySelector('.min-amount-warning');
    minAmountWarning.style.color = 'red';
    minAmountWarning.style.marginBottom = '5px';
    minAmountWarning.style.fontSize = '0.8em';
    minAmountWarning.style.display = 'none'; 

    // Initialize with default currency (USD)
    let currentCurrency = currencies.find(c => c.code === 'USD');
    let exchangeRates = {};
    let lastConversion = '';

    // Fetch live exchange rates
    async function fetchExchangeRates() {
        try {
            const response = await fetch(EXCHANGE_API);
            const data = await response.json();
            exchangeRates = data.rates;
            console.log('Exchange rates updated:', exchangeRates);
        } catch (error) {
            console.error('Failed to fetch exchange rates, using fallback:', error);
            // Fallback rates if API fails
            exchangeRates = {
                USD: 1,
                EUR: 0.85,
                GBP: 0.75,
                ZAR: 18.50
            };
        }
    }

    // Check if amount meets minimum requirement
    function checkMinimumAmount(amount) {
        const minAmount = currentCurrency['minimum-amount'];
        if (amount < minAmount && amount > 0) {
            minAmountWarning.textContent = `Minimum amount threshold ${currentCurrency.symbol}${minAmount}`;
            minAmountWarning.style.display = 'block';
            return false;
        } else {
            minAmountWarning.style.display = 'none';
            return true;
        }
    }

    // Convert amount to ZAR and update PayFast input
    function updatePayFastAmount() {
        const amount = parseFloat(amountInput.value) || 0;
        
        // Check minimum amount and show/hide warning
        const isValidAmount = checkMinimumAmount(amount);
        
        if (!isValidAmount) {
            // Don't proceed with conversion if amount is below minimum
            payFastAmountInput.value = '0.00';
            conversionInfo.textContent = '';
            return;
        }

        if (currentCurrency.code === 'ZAR') {
            payFastAmountInput.value = amount.toFixed(2);
            conversionInfo.textContent = '';
        } else {
            if (exchangeRates.ZAR && exchangeRates[currentCurrency.code]) {
                const rate = exchangeRates.ZAR / exchangeRates[currentCurrency.code];
                const zarAmount = (amount * rate).toFixed(2);
                payFastAmountInput.value = zarAmount;
                lastConversion = `${currentCurrency.symbol}${amount} = R${zarAmount}`;
                conversionInfo.textContent = lastConversion;
            } else {
                conversionInfo.textContent = 'Exchange rates not available';
            }
        }

        // Additional check for minimum ZAR amount (5.00)
        if (parseFloat(payFastAmountInput.value) < 5.00 && amount > 0) {
            payFastAmountInput.value = '5.00';
            if (lastConversion) {
                conversionInfo.textContent = `${lastConversion} (Minimum R5.00 applied)`;
            }
        }
    }

    // 1. Generate donation buttons
    function renderButtons() {
        container.innerHTML = buttonAmounts.map(amount => `
            <button class="donation-amount" data-amount="${amount}">
                ${currentCurrency.symbol}${amount}
            </button>
        `).join('');
    }

    // 2. Handle currency switching
    currencySelect.addEventListener('change', (e) => {
        currentCurrency = currencies.find(c => c.code === e.target.value);
        renderButtons();
        updatePayFastAmount();
    });

    // 3. Handle button clicks -> populate input field
    container.addEventListener('click', (e) => {
        if (e.target.classList.contains('donation-amount')) {
            const amount = e.target.dataset.amount;
            amountInput.value = amount;
            updatePayFastAmount();
            
            document.querySelectorAll('.donation-amount').forEach(btn => 
                btn.classList.remove('selected'));
            e.target.classList.add('selected');
        }
    });

    // Handle manual input changes
    amountInput.addEventListener('input', () => {
        updatePayFastAmount();
    });

    // Initialize everything
    await fetchExchangeRates();
    renderButtons();
    updatePayFastAmount();

    // Refresh exchange rates every hour
    setInterval(fetchExchangeRates, 3600000);
});