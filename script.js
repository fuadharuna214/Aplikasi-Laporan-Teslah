document.addEventListener('DOMContentLoaded', () => {
    // === ELEMEN PENTING ===
    const reportDateEl = document.getElementById('reportDate');
    const addExpenseBtn = document.getElementById('addExpenseBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const expenseModal = document.getElementById('expenseModal');
    const expenseForm = document.getElementById('expenseForm');
    const expenseTableBody = document.getElementById('expenseTableBody');
    const noExpenseMessage = document.getElementById('noExpenseMessage');
    const incomeInputs = document.querySelectorAll('.income-input');
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    const expenseCategorySelect = document.getElementById('expenseCategory');

    // === ELEMEN NAVIGASI & VIEW ===
    const navLinks = document.querySelectorAll('.nav-link');
    const views = document.querySelectorAll('.view-container');

    // === ELEMEN UNTUK LAPORAN ===
    const saveDailyBtn = document.getElementById('saveDailyBtn');
    const reportOutputEl = document.getElementById('reportOutput');
    const incomeSummaryOutputEl = document.getElementById('incomeSummaryOutput');

    // === ELEMEN TUTUP BUKU ===
    const startDateEl = document.getElementById('startDate');
    const endDateEl = document.getElementById('endDate');
    const tutupBukuBtn = document.getElementById('tutupBukuBtn');

    // === ELEMEN DASHBOARD ===
    const expenseChartCanvas = document.getElementById('expenseChart');
    const summaryChartCanvas = document.getElementById('summaryChart');
    let expenseChartInstance;
    let summaryChartInstance;

    // Variabel untuk menyimpan tanggal yang sedang aktif
    let currentDate;
    const CATEGORY_STORAGE_KEY = 'expenseCategories';

    // === FUNGSI NAVIGASI ===
    function showView(viewId) {
        views.forEach(view => {
            view.classList.add('hidden');
        });
        navLinks.forEach(link => {
            link.classList.remove('active');
        });

        const targetView = document.getElementById(viewId);
        const targetLink = document.querySelector(`[data-view="${viewId}"]`);

        if (targetView) {
            targetView.classList.remove('hidden');
        }
        if (targetLink) {
            targetLink.classList.add('active');
        }
    }

    // === FUNGSI MANAJEMEN KATEGORI ===

    function loadCategories() {
        const savedCategories = JSON.parse(localStorage.getItem(CATEGORY_STORAGE_KEY)) || [];
        const defaultCategories = Array.from(expenseCategorySelect.options).map(opt => opt.value);
        const allCategories = [...new Set([...defaultCategories, ...savedCategories])];

        expenseCategorySelect.innerHTML = '';
        allCategories.forEach(category => {
            if (category) {
                const option = new Option(category, category);
                expenseCategorySelect.add(option);
            }
        });
    }

    function addNewCategory(newCategoryName) {
        if (!newCategoryName || !newCategoryName.trim()) {
            alert('Nama kategori tidak boleh kosong.');
            return;
        }
        newCategoryName = newCategoryName.trim();

        const existingOptions = Array.from(expenseCategorySelect.options).map(opt => opt.value.toLowerCase());
        if (existingOptions.includes(newCategoryName.toLowerCase())) {
            alert('Kategori sudah ada.');
            expenseCategorySelect.value = Array.from(expenseCategorySelect.options).find(opt => opt.value.toLowerCase() === newCategoryName.toLowerCase()).value;
            return;
        }

        const option = new Option(newCategoryName, newCategoryName, true, true);
        expenseCategorySelect.add(option);

        const savedCategories = JSON.parse(localStorage.getItem(CATEGORY_STORAGE_KEY)) || [];
        savedCategories.push(newCategoryName);
        localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify([...new Set(savedCategories)]));
    }

    // === FUNGSI RENDER & UI ===

    function renderExpenseTable(expenses) {
        expenseTableBody.innerHTML = '';

        if (!expenses || expenses.length === 0) {
            updateNoExpenseMessage();
            return;
        }

        const groupedExpenses = expenses.reduce((acc, expense) => {
            const category = expense.category || 'Lain-lain';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(expense);
            return acc;
        }, {});

        Object.keys(groupedExpenses).sort().forEach(category => {
            const headerRow = document.createElement('tr');
            headerRow.classList.add('bg-gray-200', 'font-bold');
            headerRow.innerHTML = `<td colspan="9" class="p-2">${category}</td>`;
            expenseTableBody.appendChild(headerRow);

            groupedExpenses[category].forEach(data => {
                const total = data.price * data.qty;
                const newRow = document.createElement('tr');
                newRow.classList.add('border-b', 'hover:bg-gray-50');
                newRow.dataset.id = data.id;

                newRow.innerHTML = `
                    <td class="p-3">${data.date}</td>
                    <td class="p-3">${data.nota}</td>
                    <td class="p-3 font-medium">${data.type}</td>
                    <td class="p-3">${data.paymentMethod}</td>
                    <td class="p-3">${formatRupiah(data.price)}</td>
                    <td class="p-3">${data.qty}</td>
                    <td class="p-3">${data.unit}</td>
                    <td class="p-3 font-bold">${formatRupiah(total)}</td>
                    <td class="p-3 flex space-x-2">
                        <button class="edit-btn text-yellow-600 hover:text-yellow-700 font-bold">Edit</button>
                        <button class="delete-btn text-red-500 hover:text-red-700 font-bold">Hapus</button>
                    </td>
                `;
                expenseTableBody.appendChild(newRow);
            });
        });

        updateNoExpenseMessage();
    }

    const openModal = () => {
        expenseModal.classList.remove('hidden');
        setTimeout(() => expenseModal.classList.remove('opacity-0'), 10);
    };

    const closeModal = () => {
        expenseModal.classList.add('opacity-0');
        setTimeout(() => {
            expenseModal.classList.add('hidden');
            delete expenseForm.dataset.editingId;
            expenseForm.reset();
        }, 300);
    };
    
    function initializeApp() {
        reportDateEl.valueAsDate = new Date();
        currentDate = reportDateEl.value;
        loadCategories();
        loadDataForDate(currentDate);
        generateWeeklyReport(currentDate);
        updateDashboard();
        showView('view-dashboard'); // Tampilkan dashboard sebagai default
    }

    // === EVENT LISTENERS ===

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const viewId = e.target.dataset.view;
            showView(viewId);
        });
    });

    addExpenseBtn.addEventListener('click', () => {
        delete expenseForm.dataset.editingId;
        expenseForm.reset();
        document.getElementById('expenseDate').value = currentDate;
        openModal();
    });

    closeModalBtn.addEventListener('click', closeModal);
    expenseModal.addEventListener('click', (e) => {
        if (e.target === expenseModal) closeModal();
    });

    addCategoryBtn.addEventListener('click', () => {
        const newCategory = prompt('Masukkan nama kategori baru:');
        if (newCategory) {
            addNewCategory(newCategory);
        }
    });

    reportDateEl.addEventListener('change', (e) => {
        currentDate = e.target.value;
        loadDataForDate(currentDate);
        generateWeeklyReport(currentDate);
    });

    expenseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(expenseForm);
        const editingId = expenseForm.dataset.editingId ? Number(expenseForm.dataset.editingId) : null;

        const expenseData = {
            date: formData.get('expenseDate'),
            id: editingId || Date.now(),
            nota: formData.get('expenseNota'),
            type: formData.get('expenseType'),
            category: formData.get('expenseCategory'),
            paymentMethod: formData.get('expensePaymentMethod'),
            price: parseFloat(formData.get('expensePrice')),
            qty: parseInt(formData.get('expenseQty')),
            unit: formData.get('expenseUnit'),
        };

        if (!expenseData.type || isNaN(expenseData.price) || isNaN(expenseData.qty) || expenseData.price <= 0 || expenseData.qty <= 0) {
            alert('Harap isi semua kolom yang wajib dan pastikan Harga serta Kuantitas adalah angka positif.');
            return;
        }

        const data = getDailyData(currentDate);

        if (editingId) {
            const index = data.expenses.findIndex(exp => exp.id === editingId);
            if (index !== -1) {
                data.expenses[index] = expenseData;
            }
        } else {
            data.expenses.push(expenseData);
        }

        saveDailyData(currentDate, data);
        loadDataForDate(currentDate);
        updateDashboard();
        closeModal();
    });

    expenseTableBody.addEventListener('click', (e) => {
        const row = e.target.closest('tr');
        if (!row) return;

        const id = Number(row.dataset.id);
        const data = getDailyData(currentDate);

        if (e.target.classList.contains('delete-btn')) {
            if (confirm('Apakah Anda yakin ingin menghapus data ini?')) {
                data.expenses = data.expenses.filter(exp => exp.id !== id);
                saveDailyData(currentDate, data);
                loadDataForDate(currentDate);
                updateDashboard();
            }
        }

        if (e.target.classList.contains('edit-btn')) {
            const expenseToEdit = data.expenses.find(exp => exp.id === id);
            if (expenseToEdit) {
                expenseForm.dataset.editingId = expenseToEdit.id;
                document.getElementById('expenseDate').value = expenseToEdit.date;
                document.getElementById('expenseNota').value = expenseToEdit.nota;
                document.getElementById('expenseType').value = expenseToEdit.type;
                document.getElementById('expenseCategory').value = expenseToEdit.category;
                document.getElementById('expensePaymentMethod').value = expenseToEdit.paymentMethod;
                document.getElementById('expensePrice').value = expenseToEdit.price;
                document.getElementById('expenseQty').value = expenseToEdit.qty;
                document.getElementById('expenseUnit').value = expenseToEdit.unit;
                openModal();
            }
        }
    });

    incomeInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            formatCurrencyInput(e.target);
            updateIncomeSummary();
        });
    });

    saveDailyBtn.addEventListener('click', () => {
        saveIncomeData();
        generateWeeklyReport(currentDate);
        updateDashboard();
        alert(`Data Pemasukan untuk tanggal ${currentDate} telah berhasil disimpan dan laporan mingguan diperbarui!`);
    });

    tutupBukuBtn.addEventListener('click', generatePdfReport);

    // === FUNGSI DATA & KALKULASI ===

    function getDailyData(date) {
        return JSON.parse(localStorage.getItem(`report-${date}`)) || { income: {}, expenses: [] };
    }

    function saveDailyData(date, data) {
        localStorage.setItem(`report-${date}`, JSON.stringify(data));
    }

    function saveIncomeData() {
        if (!currentDate) return;
        const data = getDailyData(currentDate);
        data.income = {
            tunaiDebit: parseCurrency(document.getElementById('incomeTunaiDebit').value),
            tunaiNote: document.getElementById('incomeTunaiNote').value,
            tunaiKredit: parseCurrency(document.getElementById('incomeTunaiKredit').value),
            qrisDebit: parseCurrency(document.getElementById('incomeQrisDebit').value),
            qrisNote: document.getElementById('incomeQrisNote').value,
            qrisKredit: parseCurrency(document.getElementById('incomeQrisKredit').value),
            transferDebit: parseCurrency(document.getElementById('incomeTransferDebit').value),
            transferNote: document.getElementById('incomeTransferNote').value,
            transferKredit: parseCurrency(document.getElementById('incomeTransferKredit').value),
        };
        saveDailyData(currentDate, data);
    }

    function loadDataForDate(date) {
        const data = getDailyData(date);
        document.getElementById('incomeTunaiDebit').value = data.income.tunaiDebit ? formatRupiah(data.income.tunaiDebit) : '';
        document.getElementById('incomeTunaiKredit').value = data.income.tunaiKredit ? formatRupiah(data.income.tunaiKredit) : '';
        document.getElementById('incomeTunaiNote').value = data.income.tunaiNote || '';
        document.getElementById('incomeQrisDebit').value = data.income.qrisDebit ? formatRupiah(data.income.qrisDebit) : '';
        document.getElementById('incomeQrisKredit').value = data.income.qrisKredit ? formatRupiah(data.income.qrisKredit) : '';
        document.getElementById('incomeQrisNote').value = data.income.qrisNote || '';
        document.getElementById('incomeTransferDebit').value = data.income.transferDebit ? formatRupiah(data.income.transferDebit) : '';
        document.getElementById('incomeTransferKredit').value = data.income.transferKredit ? formatRupiah(data.income.transferKredit) : '';
        document.getElementById('incomeTransferNote').value = data.income.transferNote || '';
        incomeInputs.forEach(input => formatCurrencyInput(input));
        renderExpenseTable(data.expenses);
        document.getElementById('expenseDate').value = date;
        updateIncomeSummary();
    }

    function formatCurrencyInput(input) {
        let cursorPosition = input.selectionStart;
        const originalLength = input.value.length;
        let rawValue = input.value.replace(/[^0-9]/g, '');
        if (rawValue === '') {
            input.value = '';
            return;
        }
        const formattedValue = `Rp ${parseInt(rawValue).toLocaleString('id-ID')}`;
        input.value = formattedValue;
        const newLength = input.value.length;
        cursorPosition += (newLength - originalLength);
        if (cursorPosition < 3) cursorPosition = 3;
        input.setSelectionRange(cursorPosition, cursorPosition);
    }

    function parseCurrency(value) {
        if (value === null || value === undefined || value === '') return 0;
        if (typeof value === 'number') return value;
        const cleaned = String(value).replace(/Rp/gi, '').replace(/\s+/g, '').replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.\-]/g, '');
        return parseFloat(cleaned) || 0;
    }

    function formatRupiah(angka) {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
    }

    function updateIncomeSummary() {
        const tunaiDebit = parseCurrency(document.getElementById('incomeTunaiDebit').value);
        const tunaiKredit = parseCurrency(document.getElementById('incomeTunaiKredit').value);
        const qrisDebit = parseCurrency(document.getElementById('incomeQrisDebit').value);
        const qrisKredit = parseCurrency(document.getElementById('incomeQrisKredit').value);
        const transferDebit = parseCurrency(document.getElementById('incomeTransferDebit').value);
        const transferKredit = parseCurrency(document.getElementById('incomeTransferKredit').value);
        const tunaiTotal = tunaiDebit - tunaiKredit;
        const qrisTotal = qrisDebit - qrisKredit;
        const transferTotal = transferDebit - transferKredit;
        const grandTotal = tunaiTotal + qrisTotal + transferTotal;
        const summaryHTML = `
            <table class="w-full text-left text-sm">
                <thead class="bg-gray-50"><tr><th class="p-2 font-semibold">Metode</th><th class="p-2 font-semibold">Total Bersih</th></tr></thead>
                <tbody>
                    <tr class="border-b"><td class="p-2">Tunai</td><td class="p-2">${formatRupiah(tunaiTotal)}</td></tr>
                    <tr class="border-b"><td class="p-2">QRIS</td><td class="p-2">${formatRupiah(qrisTotal)}</td></tr>
                    <tr class="border-b"><td class="p-2">Transfer</td><td class="p-2">${formatRupiah(transferTotal)}</td></tr>
                </tbody>
                <tfoot class="bg-gray-100 font-bold"><tr><td class="p-2">Total Pemasukan Bersih</td><td class="p-2 text-lg text-green-700">${formatRupiah(grandTotal)}</td></tr></tfoot>
            </table>`;
        incomeSummaryOutputEl.innerHTML = summaryHTML;
    }
    
    function updateNoExpenseMessage() {
        noExpenseMessage.style.display = expenseTableBody.children.length > 0 ? 'none' : 'block';
    }

    // === FUNGSI LAPORAN MINGGUAN ===

    function generateWeeklyReport(selectedDate) {
        const week = getWeekDays(selectedDate);
        let weeklyTotalIncome = 0;
        let weeklyTotalExpense = 0;
        let tableRowsHTML = '';
        let hasAnyData = false;
        let dayCounter = 1;

        week.forEach(day => {
            const dateString = toLocalISO(day);
            const dayData = getDailyData(dateString);
            let dailyTransactions = [];
            let isFirstTransactionOfDay = true;

            const incomeMethods = [
                { name: 'Tunai', value: parseCurrency(dayData.income.tunaiDebit), note: dayData.income.tunaiNote },
                { name: 'QRIS', value: parseCurrency(dayData.income.qrisDebit), note: dayData.income.qrisNote },
                { name: 'Transfer', value: parseCurrency(dayData.income.transferDebit), note: dayData.income.transferNote },
            ];

            incomeMethods.forEach(item => {
                if (item.value > 0) {
                    dailyTransactions.push({
                        number: isFirstTransactionOfDay ? dayCounter : '',
                        description: item.name,
                        debit: item.value,
                        kredit: 0,
                        note: item.note || 'Pemasukan'
                    });
                    isFirstTransactionOfDay = false;
                    weeklyTotalIncome += item.value;
                }
            });

            const creditMethods = [
                { name: 'Tunai', value: parseCurrency(dayData.income.tunaiKredit), note: dayData.income.tunaiNote },
                { name: 'QRIS', value: parseCurrency(dayData.income.qrisKredit), note: dayData.income.qrisNote },
                { name: 'Transfer', value: parseCurrency(dayData.income.transferKredit), note: dayData.income.transferNote },
            ];

            creditMethods.forEach(item => {
                if (item.value > 0) {
                    dailyTransactions.push({
                        number: '',
                        description: `${item.name} (Kredit)`,
                        debit: 0,
                        kredit: item.value,
                        note: item.note || 'Kredit dari pemasukan'
                    });
                    weeklyTotalExpense += item.value;
                }
            });

            dayData.expenses.forEach(expense => {
                const expenseTotal = expense.price * expense.qty;
                dailyTransactions.push({
                    number: isFirstTransactionOfDay ? dayCounter : '',
                    description: expense.type,
                    debit: 0,
                    kredit: expenseTotal, 
                    note: `Nota: ${expense.nota}, Kat: ${expense.category}, Bayar: ${expense.paymentMethod}`
                });
                isFirstTransactionOfDay = false;
                weeklyTotalExpense += expenseTotal;
            });

            if (dailyTransactions.length > 0) {
                hasAnyData = true;
                tableRowsHTML += `<tr class="bg-gray-200 font-bold"><td colspan="6" class="p-2">${formatDate(day)}</td></tr>`;
                
                dailyTransactions.forEach(trx => {
                    tableRowsHTML += `
                        <tr class="border-b">
                            <td class="p-3" colspan="1"></td>
                            <td class="p-3">${trx.number}</td>
                            <td class="p-3">${trx.description}</td>
                            <td class="p-3 text-green-700">${trx.debit > 0 ? formatRupiah(trx.debit) : '-' }</td>
                            <td class="p-3 text-red-700">${trx.kredit > 0 ? formatRupiah(trx.kredit) : '-' }</td>
                            <td class="p-3 text-sm text-gray-600">${trx.note}</td>
                        </tr>
                    `;
                });
                dayCounter++;
            }
        });

        const weeklyBalance = weeklyTotalIncome - weeklyTotalExpense;

        const reportHTML = `
            <table class="w-full text-left mt-4 text-sm">
                <thead class="bg-gray-50"><tr><th class="p-3 font-semibold">Tanggal</th><th class="p-3 font-semibold w-12">No.</th><th class="p-3 font-semibold">Keterangan</th><th class="p-3 font-semibold">Debit</th><th class="p-3 font-semibold">Kredit</th><th class="p-3 font-semibold">Catatan</th></tr></thead>
                <tbody>
                    ${hasAnyData ? tableRowsHTML : `<tr><td colspan="6" class="text-center p-8 text-gray-500">Tidak ada data untuk minggu ini.</td></tr>`}
                </tbody>
                <tfoot class="bg-gray-100 font-bold"><tr><td class="p-3" colspan="3">Total Mingguan</td><td class="p-3 text-green-800">${formatRupiah(weeklyTotalIncome)}</td><td class="p-3 text-red-800">${formatRupiah(weeklyTotalExpense)}</td><td class="p-3 text-blue-800 text-base">${formatRupiah(weeklyBalance)}</td></tr></tfoot>
            </table>
        `;

        reportOutputEl.innerHTML = reportHTML;
    }

    // === FUNGSI TUTUP BUKU ===

    function generatePdfReport() {
        const startDate = startDateEl.value;
        const endDate = endDateEl.value;

        if (!startDate || !endDate) {
            alert('Harap pilih tanggal mulai dan tanggal akhir.');
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            alert('Tanggal mulai tidak boleh lebih besar dari tanggal akhir.');
            return;
        }

        if (!confirm(`Anda akan membuat laporan PDF dari ${startDate} hingga ${endDate}. Proses ini tidak akan menghapus data. Lanjutkan?`)) {
            return;
        }

        let allData = [];
        let current = new Date(startDate + 'T00:00:00');
        let end = new Date(endDate + 'T00:00:00');

        while (current <= end) {
            const dateString = toLocalISO(current);
            const dayData = getDailyData(dateString);
            if (dayData.income.tunaiDebit || (dayData.expenses && dayData.expenses.length > 0)) {
                allData.push({ date: dateString, ...dayData });
            }
            current.setDate(current.getDate() + 1);
        }

        if (allData.length === 0) {
            alert('Tidak ada data untuk dilaporkan pada rentang tanggal yang dipilih.');
            return;
        }

        const reportHtml = generateReportHtml(allData, startDate, endDate);
        const printWindow = window.open('', '_blank');
        printWindow.document.write(reportHtml);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 500);
    }

    function generateReportHtml(allData, startDate, endDate) {
        let totalIncome = 0;
        let totalExpense = 0;
        let dailyHtml = '';

        allData.forEach(dayData => {
            let dailyIncome = (dayData.income.tunaiDebit || 0) + (dayData.income.qrisDebit || 0) + (dayData.income.transferDebit || 0);
            let dailyCredit = (dayData.income.tunaiKredit || 0) + (dayData.income.qrisKredit || 0) + (dayData.income.transferKredit || 0);
            let dailyExpense = (dayData.expenses || []).reduce((sum, exp) => sum + (exp.price * exp.qty), 0);
            
            totalIncome += dailyIncome;
            totalExpense += dailyExpense + dailyCredit;

            dailyHtml += `
                <div style="margin-bottom: 20px; page-break-inside: avoid;">
                    <h3 style="font-size: 14px; font-weight: bold; background-color: #E5E7EB; padding: 8px; border: 1px solid #D1D5DB;">${formatDate(new Date(dayData.date + 'T00:00:00'))}</h3>
                    
                    <h4 style="font-size: 12px; font-weight: bold; margin-top: 10px; margin-bottom: 5px;">Pemasukan</h4>
                    <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                        <thead style="background-color: #F9FAFB;">
                            <tr>
                                <th style="border: 1px solid #D1D5DB; padding: 5px; text-align: left;">Metode</th>
                                <th style="border: 1px solid #D1D5DB; padding: 5px; text-align: left;">Debit</th>
                                <th style="border: 1px solid #D1D5DB; padding: 5px; text-align: left;">Kredit</th>
                                <th style="border: 1px solid #D1D5DB; padding: 5px; text-align: left;">Catatan</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="border: 1px solid #D1D5DB; padding: 5px;">Tunai</td>
                                <td style="border: 1px solid #D1D5DB; padding: 5px;">${formatRupiah(dayData.income.tunaiDebit || 0)}</td>
                                <td style="border: 1px solid #D1D5DB; padding: 5px;">${formatRupiah(dayData.income.tunaiKredit || 0)}</td>
                                <td style="border: 1px solid #D1D5DB; padding: 5px;">${dayData.income.tunaiNote || ''}</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #D1D5DB; padding: 5px;">QRIS</td>
                                <td style="border: 1px solid #D1D5DB; padding: 5px;">${formatRupiah(dayData.income.qrisDebit || 0)}</td>
                                <td style="border: 1px solid #D1D5DB; padding: 5px;">${formatRupiah(dayData.income.qrisKredit || 0)}</td>
                                <td style="border: 1px solid #D1D5DB; padding: 5px;">${dayData.income.qrisNote || ''}</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #D1D5DB; padding: 5px;">Transfer</td>
                                <td style="border: 1px solid #D1D5DB; padding: 5px;">${formatRupiah(dayData.income.transferDebit || 0)}</td>
                                <td style="border: 1px solid #D1D5DB; padding: 5px;">${formatRupiah(dayData.income.transferKredit || 0)}</td>
                                <td style="border: 1px solid #D1D5DB; padding: 5px;">${dayData.income.transferNote || ''}</td>
                            </tr>
                        </tbody>
                    </table>

                    <h4 style="font-size: 12px; font-weight: bold; margin-top: 10px; margin-bottom: 5px;">Pengeluaran</h4>
                    <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                        <thead style="background-color: #F9FAFB;">
                            <tr>
                                <th style="border: 1px solid #D1D5DB; padding: 5px; text-align: left;">Jenis</th>
                                <th style="border: 1px solid #D1D5DB; padding: 5px; text-align: left;">Kategori</th>
                                <th style="border: 1px solid #D1D5DB; padding: 5px; text-align: left;">Pembayaran</th>
                                <th style="border: 1px solid #D1D5DB; padding: 5px; text-align: left;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(dayData.expenses && dayData.expenses.length > 0) ? dayData.expenses.map(exp => `
                                <tr>
                                    <td style="border: 1px solid #D1D5DB; padding: 5px;">${exp.type}</td>
                                    <td style="border: 1px solid #D1D5DB; padding: 5px;">${exp.category}</td>
                                    <td style="border: 1px solid #D1D5DB; padding: 5px;">${exp.paymentMethod}</td>
                                    <td style="border: 1px solid #D1D5DB; padding: 5px;">${formatRupiah(exp.price * exp.qty)}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="4" style="border: 1px solid #D1D5DB; padding: 5px; text-align: center;">Tidak ada pengeluaran</td></tr>'}
                        </tbody>
                    </table>
                </div>
            `;
        });

        const netTotal = totalIncome - totalExpense;

        return `
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <meta charset="UTF-8">
            <title>Laporan Keuangan Periode ${startDate} - ${endDate}</title>
            <style>
                body { font-family: Arial, sans-serif; color: #111827; }
                h1 { text-align: center; font-size: 24px; }
                h2 { text-align: center; font-size: 16px; margin-bottom: 20px; font-weight: normal; }
                h3 { font-size: 14px; font-weight: bold; background-color: #E5E7EB; padding: 8px; border: 1px solid #D1D5DB; }
                h4 { font-size: 12px; font-weight: bold; margin-top: 10px; margin-bottom: 5px; }
                table { width: 100%; border-collapse: collapse; font-size: 10px; }
                th, td { border: 1px solid #D1D5DB; padding: 5px; text-align: left; }
                thead { background-color: #F9FAFB; }
                .summary-box { margin-bottom: 20px; font-size: 14px; padding: 10px; border: 1px solid #D1D5DB; }
                .day-section { margin-bottom: 20px; page-break-inside: avoid; }
                @media print {
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            </style>
        </head>
        <body>
            <h1>Laporan Keuangan</h1>
            <h2>Periode: ${startDate} hingga ${endDate}</h2>
            
            <div class="summary-box">
                <p><strong>Total Pemasukan:</strong> ${formatRupiah(totalIncome)}</p>
                <p><strong>Total Pengeluaran:</strong> ${formatRupiah(totalExpense)}</p>
                <p style="font-size: 16px; font-weight: bold; margin-top: 10px;"><strong>Laba / Rugi Bersih:</strong> ${formatRupiah(netTotal)}</p>
            </div>

            ${dailyHtml}
        </body>
        </html>
    `;
    }

    // === FUNGSI DASHBOARD ===
    function updateDashboard() {
        if (expenseChartInstance) expenseChartInstance.destroy();
        if (summaryChartInstance) summaryChartInstance.destroy();

        let totalIncome = 0;
        let totalExpense = 0;
        const expenseByCategory = {};

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('report-')) {
                const dayData = JSON.parse(localStorage.getItem(key));
                
                totalIncome += (dayData.income.tunaiDebit || 0) + (dayData.income.qrisDebit || 0) + (dayData.income.transferDebit || 0);
                totalExpense += (dayData.income.tunaiKredit || 0) + (dayData.income.qrisKredit || 0) + (dayData.income.transferKredit || 0);

                (dayData.expenses || []).forEach(expense => {
                    const expenseTotal = expense.price * expense.qty;
                    totalExpense += expenseTotal;
                    expenseByCategory[expense.category] = (expenseByCategory[expense.category] || 0) + expenseTotal;
                });
            }
        }

        // Data untuk Pie Chart
        const categoryLabels = Object.keys(expenseByCategory);
        const categoryData = Object.values(expenseByCategory);

        expenseChartInstance = new Chart(expenseChartCanvas, {
            type: 'doughnut',
            data: {
                labels: categoryLabels,
                datasets: [{
                    label: 'Pengeluaran per Kategori',
                    data: categoryData,
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
                    ],
                }]
            }
        });

        // Data untuk Bar Chart
        summaryChartInstance = new Chart(summaryChartCanvas, {
            type: 'bar',
            data: {
                labels: ['Total Pemasukan', 'Total Pengeluaran'],
                datasets: [{
                    label: 'Ringkasan Keuangan',
                    data: [totalIncome, totalExpense],
                    backgroundColor: ['#36A2EB', '#FF6384'],
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    function getWeekDays(dateString) {
        const date = new Date(`${dateString}T00:00:00`);
        const dayOfWeek = date.getDay();
        const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        monday.setDate(diff);
        const week = [];
        for (let i = 0; i < 7; i++) {
            const nextDay = new Date(monday);
            nextDay.setDate(monday.getDate() + i);
            week.push(nextDay);
        }
        return week;
    }

    function toLocalISO(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dd}`;
    }

    function formatDate(date) {
        return new Intl.DateTimeFormat('id-ID', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' }).format(date);
    }

    initializeApp();
});

function generateDummyData() {
    console.log("Membuat data dummy untuk 7 hari terakhir...");

    const categories = ['Bahan Baku', 'Operasional', 'Gaji Karyawan', 'Marketing'];
    const paymentMethods = ['Tunai', 'QRIS', 'Transfer'];
    const expenseTypes = ['Bawang Merah', 'Listrik', 'Gaji Amir', 'Iklan Instagram', 'Plastik', 'Sewa', 'Gas'];

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function toLocalISO(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dd}`;
    }

    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateString = toLocalISO(date);

        const data = {
            income: {
                tunaiDebit: getRandomInt(10, 50) * 10000,
                tunaiKredit: getRandomInt(0, 5) * 10000,
                tunaiNote: 'Pemasukan tunai harian',
                qrisDebit: getRandomInt(5, 60) * 10000,
                qrisKredit: 0,
                qrisNote: '',
                transferDebit: getRandomInt(0, 20) * 10000,
                transferKredit: 0,
                transferNote: '',
            },
            expenses: []
        };

        const numExpenses = getRandomInt(1, 4);
        for (let j = 0; j < numExpenses; j++) {
            const expense = {
                id: Date.now() + i * 10 + j,
                date: dateString,
                nota: String(getRandomInt(100, 999)),
                type: expenseTypes[getRandomInt(0, expenseTypes.length - 1)],
                category: categories[getRandomInt(0, categories.length - 1)],
                paymentMethod: paymentMethods[getRandomInt(0, paymentMethods.length - 1)],
                price: getRandomInt(1, 20) * 5000,
                qty: getRandomInt(1, 5),
                unit: 'pcs'
            };
            data.expenses.push(expense);
        }
        
        localStorage.setItem(`report-${dateString}`, JSON.stringify(data));
    }

    console.log("Data dummy berhasil dibuat. Silakan muat ulang halaman.");
    alert("Data dummy untuk 7 hari terakhir telah dibuat. Silakan muat ulang halaman Anda.");
}

function checkDummyData() {
    console.log("Membaca semua data laporan dari localStorage...");
    let found = false;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('report-')) {
            console.log(`Ditemukan key: ${key}`);
            try {
                console.log(JSON.parse(localStorage.getItem(key)));
                found = true;
            } catch (e) {
                console.error(`Gagal mem-parsing JSON untuk key: ${key}`, e);
            }
        }
    }
    if (!found) {
        console.log("Tidak ada data laporan dengan prefix 'report-' yang ditemukan di localStorage.");
    }
    console.log("Pemeriksaan selesai.");
}