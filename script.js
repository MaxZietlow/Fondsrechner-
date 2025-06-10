document.addEventListener('DOMContentLoaded', () => {
    // --- 1. DOM-Elemente abrufen und überprüfen ---
    // Eine Hilfsfunktion, um DOM-Elemente sicher abzurufen und Fehler zu loggen
    const getElement = (id) => {
        const element = document.getElementById(id);
        if (!element) {
            // Dies ist die Fehlermeldung, die in der VS Code Konsole angezeigt wird, wenn eine ID nicht gefunden wird.
            // Sie ist hilfreich, um fehlende Elemente im HTML zu identifizieren.
            console.error(`Fehler: DOM-Element mit ID '${id}' wurde nicht gefunden. Bitte prüfen Sie das HTML.`);
        }
        return element;
    };

    const einzahlungsartRadios = document.querySelectorAll('input[name="einzahlungsart"]');
    const alterVertragsbeginnInput = getElement('alterVertragsbeginn');
    const laufzeitInput = getElement('laufzeit');
    const monatlicherBeitragInput = getElement('monatlicherBeitrag');
    const einmalAnlageInput = getElement('einmalAnlage');
    const fondsentwicklungSelect = getElement('fondsentwicklung');
    const berechnenBtn = getElement('berechnenBtn');

    // querySelector gibt null zurück, wenn nicht gefunden, aber mit ?. (optional chaining) sicher verwendet
    const monthlyInputSection = document.querySelector('.monthly-input');
    const einmalInputSection = document.querySelector('.einmal-input');

    const showHistoricalCheckbox = getElement('showHistorical');
    const historicalOptionsDiv = getElement('historicalOptions');
    // querySelectorAll gibt eine leere NodeList zurück, wenn nichts gefunden wird, was hier ok ist
    const historicalIndexRadios = document.querySelectorAll('input[name="historicalIndex"]');
    const historicalSummaryDiv = getElement('historicalSummary');
    const historicalIndexNameSpan = getElement('historicalIndexName');
    const historicalIndexName2Span = getElement('historicalIndexName2');
    const historicalFinalValueSpan = getElement('historicalFinalValue');
    const historicalProfitSpan = getElement('historicalProfit');
    const historicalTotalEinzahlungenSpan = getElement('historicalTotalEinzahlungen');

    const showCashOptionCheckbox = getElement('showCashOption');
    const cashOptionInputSection = getElement('cashOptionInputSection');
    const monatlicheAuszahlungInput = getElement('monatlicheAuszahlung');
    const cashOptionStartYearInput = getElement('cashOptionStartYear');

    const gesamtEinzahlungenSpan = getElement('gesamtEinzahlungen');
    const prognoseFondsvermoegenSpan = getElement('prognoseFondsvermoegen');
    const gewinnPrognoseSpan = getElement('gewinnPrognose');
    const vermoegenChartCanvas = getElement('vermoegenChart'); // Dies MUSS ein <canvas> Element sein und die ID haben

    const prognoseVermoegenCashOptionSpan = getElement('prognoseVermoegenCashOption');
    const gewinnCashOptionSpan = getElement('gewinnCashOption');
    const totalAuszahlungenCashOptionSpan = getElement('totalAuszahlungenCashOption');
    const cashOptionSummaryPrognose = getElement('cashOptionSummaryPrognose');

    // Diese Variablen wurden entfernt, da sie sich auf die historische Cash Option beziehen,
    // die in den vorherigen Schritten aus dem HTML und der Funktionalität entfernt wurde.
    // Ihre Deklaration würde zu "unused variable" Warnungen in VS Code führen.
    // const historicalFinalValueCashOptionSpan = getElement('historicalFinalValueCashOption');
    // const historicalProfitCashOptionSpan = getElement('historicalProfitCashOption');
    // const historicalTotalAuszahlungenCashOptionSpan = getElement('historicalTotalAuszahlungenCashOption');
    // const cashOptionSummaryHistorical = getElement('cashOptionSummaryHistorical');

    const historicalSimulationDisclaimer = getElement('historicalSimulationDisclaimer');


    let chartInstance = null; // Variable, um die Chart-Instanz zu speichern

    // --- 2. Hilfsfunktionen ---

    /**
     * Generiert 12 monatliche Renditen, die kumuliert die gegebene Jahresrendite ergeben,
     * mit einer simulierten monatlichen Volatilität.
     * @param {number} annualReturn Die jährliche Rendite als Dezimalzahl (z.B. 0.07 für 7%).
     * @param {number} volatilityFactor Faktor zur Bestimmung der Stärke der monatlichen Schwankungen.
     * @returns {number[]} Ein Array von 12 monatlichen Renditen.
     */
    const generateMonthlyReturns = (annualReturn, volatilityFactor = 0.5) => {
        const monthlyReturns = [];
        let cumulativeMonthlyReturn = 1;
        const targetCumulativeReturn = 1 + annualReturn;

        const avgMonthlyReturn = Math.pow(targetCumulativeReturn, 1 / 12) - 1;

        for (let i = 0; i < 11; i++) {
            const randomFactor = (Math.random() * 2 - 1) * volatilityFactor;
            let monthly = avgMonthlyReturn * (1 + randomFactor);
            monthly = Math.max(monthly, -0.15); // Nicht mehr als 15% Verlust pro Monat
            monthlyReturns.push(monthly);
            cumulativeMonthlyReturn *= (1 + monthly);
        }

        const lastMonthlyReturn = (targetCumulativeReturn / cumulativeMonthlyReturn) - 1;
        monthlyReturns.push(lastMonthlyReturn);

        return monthlyReturns;
    };

    // --- 3. Historische Daten (Basis für simulierte Monatsrenditen) ---
    const rawAnnualHistoricalData = {
        msci_world: {
            name: 'MSCI World (TR USD - simulierte Monatsrenditen)',
            startYear: 1970,
            returns: [
                0.0210, 0.1652, 0.1989, -0.1472, -0.0135, 0.3804, 0.2078, -0.0760, 0.2741, 0.1632, // 1970-1979
                0.3259, 0.2223, 0.0520, 0.2319, 0.0592, 0.2678, 0.2694, 0.2183, 0.1130, 0.1661, // 1980-1989
                0.0818, 0.1259, 0.0518, 0.2359, 0.0108, 0.1818, 0.2307, 0.0911, 0.1994, 0.2657, // 1990-1999
                -0.1287, -0.1666, -0.1954, 0.3372, 0.1581, 0.1086, 0.2647, 0.1030, -0.4071, 0.3013, // 2000-2009 (Dotcom-Blase, Finanzkrise)
                0.1228, 0.0763, 0.1661, 0.2282, 0.0494, 0.0559, 0.0817, 0.2366, -0.0820, 0.2778, // 2010-2019
                0.1625, 0.1802, -0.1802, 0.2185, 0.2238 // 2020-2024
            ]
        },
        sp500: {
            name: 'S&P 500 (TR USD - simulierte Monatsrenditen)',
            startYear: 1950,
            returns: [
                0.2842, 0.1939, 0.1837, -0.0120, 0.5262, 0.3158, 0.0658, 0.0694, 0.4357, 0.1200, // 1950-1959
                -0.0871, 0.2689, -0.0873, 0.2280, 0.1636, 0.1243, 0.0041, 0.2380, 0.1090, 0.1819, // 1960-1969
                0.0401, 0.1431, 0.1884, -0.1469, -0.2647, 0.3720, 0.2384, -0.0718, 0.0656, 0.1844, // 1970-1979
                0.3235, 0.1009, 0.2155, 0.2255, 0.0627, 0.3173, 0.1867, 0.0525, 0.1654, 0.3169, // 1980-1989
                0.0754, 0.3047, 0.0759, 0.1008, 0.0132, 0.3758, 0.2296, 0.3336, 0.2869, 0.2104, // 1990-1999
                -0.0910, -0.1923, -0.2197, 0.2868, 0.1088, 0.0491, 0.1579, 0.049, -0.3700, 0.2646, // 2000-2009
                0.1506, 0.0210, 0.1600, 0.3239, 0.1369, 0.0138, 0.1196, 0.2183, -0.0438, 0.3149, // 2010-2019
                0.1840, 0.2871, -0.1811, 0.2629, 0.2474 // 2020-2024
            ]
        }
    };

    // Generiere monatliche Renditen für jeden Index aus den Jahresrenditen beim Laden
    const historicalData = {};
    for (const indexKey in rawAnnualHistoricalData) {
        const index = rawAnnualHistoricalData[indexKey];
        const monthlyReturnsForIndex = [];
        for (const annualReturn of index.returns) {
            monthlyReturnsForIndex.push(generateMonthlyReturns(annualReturn));
        }
        historicalData[indexKey] = {
            name: index.name,
            startYear: index.startYear,
            monthlyReturns: monthlyReturnsForIndex
        };
    }

    // --- 4. UI-Logik und Event-Handler ---

    const toggleEinzahlungsart = () => {
        const selectedType = document.querySelector('input[name="einzahlungsart"]:checked')?.value;
        if (selectedType === 'monatlich') {
            monthlyInputSection?.classList.remove('hidden');
            einmalInputSection?.classList.add('hidden');
        } else {
            monthlyInputSection?.classList.add('hidden');
            einmalInputSection?.classList.remove('hidden');
        }
        simulateFonds();
    };

    const toggleCashOptionInput = () => {
        if (showCashOptionCheckbox?.checked) {
            cashOptionInputSection?.classList.remove('hidden');
            const laufzeit = parseInt(laufzeitInput?.value);
            if (!isNaN(laufzeit) && laufzeit >= 1 && cashOptionStartYearInput) {
                cashOptionStartYearInput.min = 1;
                cashOptionStartYearInput.max = laufzeit;
                if (parseInt(cashOptionStartYearInput?.value) > laufzeit) {
                    cashOptionStartYearInput.value = laufzeit;
                }
            }
        } else {
            cashOptionInputSection?.classList.add('hidden');
            cashOptionSummaryPrognose?.classList.add('hidden');
        }
        simulateFonds();
    };

    const toggleHistoricalOptions = () => {
        if (showHistoricalCheckbox?.checked) {
            historicalOptionsDiv?.classList.remove('hidden');
        } else {
            historicalOptionsDiv?.classList.add('hidden');
            historicalSummaryDiv?.classList.add('hidden');
        }
        simulateFonds();
    };


    /**
     * Erstellt oder aktualisiert das Chart.js Diagramm.
     * @param {string[]} labels Die Jahreslabels für die X-Achse.
     * @param {number[]} einzahlungenData Daten für die Gesamteinzahlungen.
     * @param {number[]} vermoegenData Daten für das prognostizierte Vermögen (mit Cash Option).
     * @param {boolean} showHistorical Ob historische Daten angezeigt werden sollen.
     * @param {number[]} historicalVermoegenData Daten für das historische Vermögen (ohne Cash Option).
     * @param {string} selectedHistoricalIndex Der Name des ausgewählten historischen Indexes.
     * @param {boolean} showCashOption Ob die Cash Option aktiv ist.
     * @param {number[]} vermoegenDataNoCashOption Daten für das prognostizierte Vermögen (ohne Cash Option).
     */
    const updateChart = (labels, einzahlungenData, vermoegenData, showHistorical, historicalVermoegenData, selectedHistoricalIndex, showCashOption, vermoegenDataNoCashOption) => {
        if (chartInstance) {
            chartInstance.destroy();
        }

        // Überprüfen, ob Chart.js geladen ist. Dies ist wichtig, wenn das Skript läuft, aber Chart.js nicht gefunden wird.
        if (typeof Chart === 'undefined') {
            console.error('Chart.js ist nicht geladen. Bitte überprüfen Sie die Skript-Einbindung in Ihrer HTML-Datei und stellen Sie sicher, dass Sie einen lokalen Webserver (z.B. Live Server) verwenden.');
            if (vermoegenChartCanvas) vermoegenChartCanvas.style.display = 'none'; // Canvas ausblenden
            const chartParent = vermoegenChartCanvas?.parentNode;
            let noChartMessage = chartParent?.querySelector('.no-chart-message');
            if (!noChartMessage && chartParent) {
                noChartMessage = document.createElement('p');
                noChartMessage.classList.add('no-chart-message');
                noChartMessage.textContent = 'Diagramm konnte nicht geladen werden. Bitte stellen Sie sicher, dass Chart.js richtig eingebunden ist und Sie einen lokalen Webserver nutzen.';
                chartParent.insertBefore(noChartMessage, vermoegenChartCanvas);
            }
            return; // Funktion beenden, da Chart.js fehlt
        } else {
            if (vermoegenChartCanvas) vermoegenChartCanvas.style.display = 'block'; // Canvas einblenden
            const noChartMessage = vermoegenChartCanvas?.parentNode?.querySelector('.no-chart-message');
            if (noChartMessage) noChartMessage.remove(); // Fehlermeldung entfernen, falls vorhanden
        }

        const datasets = [
            {
                label: 'Gesamteinzahlungen (Prognose)',
                data: einzahlungenData,
                borderColor: '#007bff',
                backgroundColor: 'rgba(0, 123, 255, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.1
            }
        ];

        if (showCashOption) {
            datasets.push({
                label: 'Prognostiziertes Fondsvermögen (mit Cash Option)',
                data: vermoegenData,
                borderColor: '#dc3545', // Rot
                backgroundColor: 'rgba(220, 53, 69, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.1
            });
            datasets.push({
                label: 'Prognostiziertes Fondsvermögen (ohne Cash Option)',
                data: vermoegenDataNoCashOption,
                borderColor: '#28a745', // Grün
                backgroundColor: 'rgba(40, 167, 69, 0.1)',
                borderWidth: 2,
                borderDash: [5, 5],
                fill: false,
                tension: 0.1
            });
        } else {
            datasets.push({
                label: 'Prognostiziertes Fondsvermögen', // Angepasste Beschriftung
                data: vermoegenData, // Hier ist vermoegenData = vermoegenDataNoCashOption
                borderColor: '#28a745',
                backgroundColor: 'rgba(40, 167, 69, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.1
            });
        }


        if (showHistorical && historicalVermoegenData.length > 0) {
            const historicalLabel = historicalData[selectedHistoricalIndex] ? historicalData[selectedHistoricalIndex].name : 'Historisch';

            datasets.push({
                label: `Historisch (${historicalLabel})`,
                data: historicalVermoegenData.slice(0, labels.length),
                borderColor: '#ffc107', // Gelb/Orange
                backgroundColor: 'rgba(255, 193, 7, 0.1)',
                borderWidth: 2,
                borderDash: [5, 5],
                fill: false,
                tension: 0.1
            });
        }

        if (vermoegenChartCanvas) { // Nur fortfahren, wenn das Canvas-Element gefunden wurde
            chartInstance = new Chart(vermoegenChartCanvas, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: showHistorical ? 'Jahre (Historisch)' : 'Jahre (Prognose)'
                            },
                            type: 'category',
                            labels: labels
                        },
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Vermögen (€)'
                            },
                            ticks: {
                                callback: function(value) {
                                    return value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
                                }
                            }
                        }
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                title: function(context) {
                                    if (context.dataPoints.length > 0) {
                                        const yearLabel = context.label;
                                        return `Jahr: ${yearLabel}`;
                                    }
                                    return `Jahr: ${context.label}`;
                                },
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    if (context.parsed.y !== null) {
                                        label += context.parsed.y.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
                                    }
                                    return label;
                                }
                            }
                        }
                    }
                }
            });
        }
    };


    // --- 5. Hauptsimulationsfunktion ---

    const simulateFonds = () => {
        // Optionale Warnung, falls wichtige DOM-Elemente nicht gefunden werden.
        // Diese Prüfung ist hauptsächlich für die Entwicklung nützlich, wenn HTML-IDs fehlen.
        if (!alterVertragsbeginnInput || !laufzeitInput || !monatlicherBeitragInput || !einmalAnlageInput ||
            !fondsentwicklungSelect || !gesamtEinzahlungenSpan || !prognoseFondsvermoegenSpan ||
            !gewinnPrognoseSpan || !vermoegenChartCanvas || !showHistoricalCheckbox ||
            !historicalOptionsDiv || !historicalSummaryDiv || !historicalIndexNameSpan ||
            !historicalIndexName2Span || !historicalFinalValueSpan || !historicalProfitSpan ||
            !historicalTotalEinzahlungenSpan || !showCashOptionCheckbox || !cashOptionInputSection ||
            !monatlicheAuszahlungInput || !cashOptionStartYearInput || !prognoseVermoegenCashOptionSpan ||
            !gewinnCashOptionSpan || !totalAuszahlungenCashOptionSpan ||
            !cashOptionSummaryPrognose || !historicalSimulationDisclaimer) {
            console.warn("Einige erforderliche DOM-Elemente wurden nicht gefunden. Simulation wird möglicherweise nicht korrekt ausgeführt.");
            // Hier wird nicht "return" verwendet, damit die Simulation trotzdem versucht wird,
            // auch wenn einzelne Elemente fehlen. Die optionalen Verkettungen ?. schützen vor Abstürzen.
        }


        const einzahlungsart = document.querySelector('input[name="einzahlungsart"]:checked')?.value;
        const alterVertragsbeginn = parseInt(alterVertragsbeginnInput?.value);
        const laufzeit = parseInt(laufzeitInput?.value);
        const monatlicherBeitrag = parseFloat(monatlicherBeitragInput?.value);
        const einmalAnlage = parseFloat(einmalAnlageInput?.value);
        const fondsentwicklungRate = parseFloat(fondsentwicklungSelect?.value);

        const showHistorical = showHistoricalCheckbox?.checked;
        const selectedHistoricalIndex = document.querySelector('input[name="historicalIndex"]:checked')?.value;

        const showCashOption = showCashOptionCheckbox?.checked;
        const monatlicheAuszahlung = parseFloat(monatlicheAuszahlungInput?.value);
        const cashOptionStartYear = parseInt(cashOptionStartYearInput?.value);

        // --- Validierung der Eingaben ---
        if (isNaN(alterVertragsbeginn) || alterVertragsbeginn < 18) {
            alert('Bitte geben Sie ein gültiges Alter bei Vertragsbeginn (mind. 18 Jahre) ein.');
            return;
        }
        if (isNaN(laufzeit) || laufzeit < 5 || laufzeit > 55) {
            alert('Bitte geben Sie eine gültige Laufzeit (mind. 5, max. 55 Jahre) ein.');
            return;
        }
        if (alterVertragsbeginn + laufzeit > 90) {
            alert('Das berechnete Endalter überschreitet das 90. Lebensjahr. Bitte reduzieren Sie die Laufzeit.');
            return;
        }

        if (einzahlungsart === 'monatlich') {
            if (isNaN(monatlicherBeitrag) || monatlicherBeitrag < 25) {
                alert('Bitte geben Sie einen monatlichen Beitrag von mindestens 25 € ein.');
                return;
            }
        } else { // Einmalanlage
            if (isNaN(einmalAnlage) || einmalAnlage < 2500) {
                alert('Bitte geben Sie eine Einmalanlage von mindestens 2.500 € ein.');
                return;
            }
        }

        if (showCashOption) {
            if (isNaN(monatlicheAuszahlung) || monatlicheAuszahlung < 1) {
                alert('Bitte geben Sie einen monatlichen Auszahlungsbetrag von mindestens 1 € ein, wenn die Cash Option aktiv ist.');
                return;
            }
            if (isNaN(cashOptionStartYear) || cashOptionStartYear < 1 || cashOptionStartYear > laufzeit) {
                alert(`Bitte geben Sie ein gültiges Startjahr für die Cash Option ein (zwischen 1 und ${laufzeit} Jahren).`);
                return;
            }
        }

        let totalEinzahlungen = 0;
        let fondsvermoegenWithCashOption = 0; // Fondsvermögen MIT Cash Option (für Prognose)
        let fondsvermoegenWithoutCashOption = 0; // Fondsvermögen OHNE Cash Option (für Prognose)

        const vermoegenProJahrWithCashOption = [];
        const vermoegenProJahrWithoutCashOption = [];
        const einzahlungenProJahr = [];
        let labels = [];

        // Initialisierung des Startkapitals für Prognose
        if (einzahlungsart === 'einmalanlage') {
            fondsvermoegenWithCashOption = einmalAnlage;
            fondsvermoegenWithoutCashOption = einmalAnlage;
            totalEinzahlungen = einmalAnlage;
        }

        // --- Simulation der Prognose ---
        let currentPrognoseFondsvermoegenWithCashOption = fondsvermoegenWithCashOption;
        let currentPrognoseFondsvermoegenWithoutCashOption = fondsvermoegenWithoutCashOption;
        let currentTotalEinzahlungenPrognose = totalEinzahlungen;
        let currentTotalAuszahlungenPrognose = 0;

        for (let jahr = 1; jahr <= laufzeit; jahr++) {
            for (let monat = 0; monat < 12; monat++) {
                // Einzahlungen am Monatsanfang
                if (einzahlungsart === 'monatlich') {
                    currentPrognoseFondsvermoegenWithCashOption += monatlicherBeitrag;
                    currentPrognoseFondsvermoegenWithoutCashOption += monatlicherBeitrag;
                    currentTotalEinzahlungenPrognose += monatlicherBeitrag;
                }

                // Auszahlung vor Verzinsung (nur wenn Cash Option aktiv UND Startjahr erreicht)
                if (showCashOption && jahr >= cashOptionStartYear) {
                    if (currentPrognoseFondsvermoegenWithCashOption >= monatlicheAuszahlung) {
                        currentPrognoseFondsvermoegenWithCashOption -= monatlicheAuszahlung;
                        currentTotalAuszahlungenPrognose += monatlicheAuszahlung;
                    } else {
                        currentTotalAuszahlungenPrognose += currentPrognoseFondsvermoegenWithCashOption;
                        currentPrognoseFondsvermoegenWithCashOption = 0; // Fonds ist leer
                    }
                }

                // Verzinsung
                currentPrognoseFondsvermoegenWithCashOption *= (1 + (fondsentwicklungRate / 12));
                currentPrognoseFondsvermoegenWithoutCashOption *= (1 + (fondsentwicklungRate / 12));
            }
            vermoegenProJahrWithCashOption.push(currentPrognoseFondsvermoegenWithCashOption.toFixed(2));
            vermoegenProJahrWithoutCashOption.push(currentPrognoseFondsvermoegenWithoutCashOption.toFixed(2));
            einzahlungenProJahr.push(currentTotalEinzahlungenPrognose.toFixed(2));
            labels.push(`Jahr ${jahr}`);
        }

        if (gesamtEinzahlungenSpan) gesamtEinzahlungenSpan.textContent = `${currentTotalEinzahlungenPrognose.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}`;
        if (prognoseFondsvermoegenSpan) prognoseFondsvermoegenSpan.textContent = `${currentPrognoseFondsvermoegenWithoutCashOption.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}`;
        if (gewinnPrognoseSpan) gewinnPrognoseSpan.textContent = `${(currentPrognoseFondsvermoegenWithoutCashOption - currentTotalEinzahlungenPrognose).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}`;

        if (showCashOption) {
            cashOptionSummaryPrognose?.classList.remove('hidden');
            if (prognoseVermoegenCashOptionSpan) prognoseVermoegenCashOptionSpan.textContent = `${currentPrognoseFondsvermoegenWithCashOption.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}`;
            if (gewinnCashOptionSpan) gewinnCashOptionSpan.textContent = `${(currentPrognoseFondsvermoegenWithCashOption + currentTotalAuszahlungenPrognose - currentTotalEinzahlungenPrognose).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}`;
            if (totalAuszahlungenCashOptionSpan) totalAuszahlungenCashOptionSpan.textContent = `${currentTotalAuszahlungenPrognose.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}`;
        } else {
            cashOptionSummaryPrognose?.classList.add('hidden');
        }


        // --- Historische Simulation (ohne Cash Option) ---
        let historicalVermoegen = []; // Nur noch ein Array, da keine Cash Option berücksichtigt wird
        let historicalTotalEinzahlungen = 0;

        if (showHistorical && selectedHistoricalIndex && historicalData[selectedHistoricalIndex]) {
            historicalSummaryDiv?.classList.remove('hidden');

            const indexInfo = historicalData[selectedHistoricalIndex];

            if (historicalIndexNameSpan) historicalIndexNameSpan.textContent = indexInfo.name;
            if (historicalIndexName2Span) historicalIndexName2Span.textContent = indexInfo.name;

            const availableHistoricalYears = indexInfo.monthlyReturns.length;
            const startIndex = Math.max(0, availableHistoricalYears - laufzeit);

            if (startIndex + laufzeit > availableHistoricalYears) {
                alert(`Nicht genügend historische Daten für eine Laufzeit von ${laufzeit} Jahren verfügbar. Der ausgewählte Index hat nur ${availableHistoricalYears} Jahre an Daten.`);
                historicalSummaryDiv?.classList.add('hidden');
                updateChart(labels, einzahlungenProJahr, vermoegenProJahrWithCashOption, false, [], selectedHistoricalIndex, showCashOption, vermoegenProJahrWithoutCashOption);
                return;
            }

            const relevantHistoricalMonthlyReturns = indexInfo.monthlyReturns.slice(startIndex, startIndex + laufzeit);

            let currentHistoricalVermoegen;

            if (einzahlungsart === 'einmalanlage') {
                currentHistoricalVermoegen = einmalAnlage;
                historicalTotalEinzahlungen = einmalAnlage;
            } else {
                currentHistoricalVermoegen = 0;
                historicalTotalEinzahlungen = 0;
            }

            // Initialer Wert für den Chart (Jahr 0)
            historicalVermoegen.push(currentHistoricalVermoegen.toFixed(2));


            for (let i = 0; i < relevantHistoricalMonthlyReturns.length; i++) {
                const yearReturns = relevantHistoricalMonthlyReturns[i];

                for (let month = 0; month < 12; month++) {
                    const monthlyReturn = yearReturns[month];

                    // Einzahlungen
                    if (einzahlungsart === 'monatlich') {
                        currentHistoricalVermoegen += monatlicherBeitrag;
                        historicalTotalEinzahlungen += monatlicherBeitrag;
                    }

                    // Keine Auszahlung im historischen Verlauf (die historische Simulation hat keine Cash Option)

                    // Verzinsung
                    currentHistoricalVermoegen *= (1 + monthlyReturn);
                }
                historicalVermoegen.push(currentHistoricalVermoegen.toFixed(2));
            }

            if (historicalTotalEinzahlungenSpan) historicalTotalEinzahlungenSpan.textContent = `${historicalTotalEinzahlungen.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}`;
            if (historicalFinalValueSpan) historicalFinalValueSpan.textContent = `${currentHistoricalVermoegen.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}`;
            if (historicalProfitSpan) historicalProfitSpan.textContent = `${(currentHistoricalVermoegen - historicalTotalEinzahlungen).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}`;

            if (historicalSimulationDisclaimer) historicalSimulationDisclaimer.innerHTML = `Hinweis: Diese Simulation basiert auf ${einzahlungsart === 'monatlich' ? 'monatlichen Einzahlungen und ' : 'einer Einmalanlage sowie '} *simulierten* historischen Monatsrenditen des Index, die aus Jahresrenditen abgeleitet wurden. Sie berücksichtigt keine realen monatlichen Schwankungen oder Währungseffekte und **keine Cash Option**.`;

            // Labels für Historie mit echten Jahreszahlen überschreiben
            labels = [];
            for (let i = 0; i < laufzeit; i++) {
                const year = indexInfo.startYear + startIndex + i;
                labels.push(`${year}`);
            }

        } else {
            historicalSummaryDiv?.classList.add('hidden');
            labels = [];
            for (let jahr = 1; jahr <= laufzeit; jahr++) {
                labels.push(`Jahr ${jahr}`);
            }
        }

        // Der Aufruf von updateChart MUSS erfolgen, damit der Graph angezeigt wird.
        // Alle Daten sollten hier korrekt übergeben werden, auch wenn sie leer sind oder 0.
        updateChart(labels, einzahlungenProJahr, vermoegenProJahrWithCashOption, showHistorical, historicalVermoegen, selectedHistoricalIndex, showCashOption, vermoegenProJahrWithoutCashOption);
    };

    // --- 6. Initialisierung und Event-Listener-Registrierung ---
    einzahlungsartRadios.forEach(radio => {
        radio.addEventListener('change', toggleEinzahlungsart);
    });

    if (showHistoricalCheckbox) {
        showHistoricalCheckbox.addEventListener('change', toggleHistoricalOptions);
    }
    historicalIndexRadios.forEach(radio => {
        radio.addEventListener('change', simulateFonds);
    });

    if (showCashOptionCheckbox) {
        showCashOptionCheckbox.addEventListener('change', toggleCashOptionInput);
    }
    if (monatlicheAuszahlungInput) {
        monatlicheAuszahlungInput.addEventListener('input', simulateFonds);
    }
    if (cashOptionStartYearInput) {
        cashOptionStartYearInput.addEventListener('input', simulateFonds);
    }

    if (berechnenBtn) {
        berechnenBtn.addEventListener('click', simulateFonds);
    }

    const inputElements = [
        alterVertragsbeginnInput,
        laufzeitInput,
        monatlicherBeitragInput,
        einmalAnlageInput,
        fondsentwicklungSelect
    ];

    inputElements.forEach(input => {
        if (input) {
            input.addEventListener('input', simulateFonds);
        }
    });

    // Initialisierung der UI-Zustände und erste Simulation
    toggleEinzahlungsart();
    toggleHistoricalOptions();
    toggleCashOptionInput();

    // Setzt den Startwert für das Auszahlungsjahr auf 1, falls es nicht explizit gesetzt ist.
    if (cashOptionStartYearInput && isNaN(parseInt(cashOptionStartYearInput.value))) {
        cashOptionStartYearInput.value = 1;
    }

    // Führt die erste Simulation beim Laden der Seite aus
    simulateFonds();
});