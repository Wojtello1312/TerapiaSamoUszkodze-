# Weryfikacja katalogu

W bieżącym środowisku próby pobrania ClinicalTrials.gov, Fundacji Dzieciom, Siepomaga, EURORDIS i Orphanet zostały zablokowane przez proxy HTTP 403. Daty w `src/source-checks.json` są datami prób, nie potwierdzeniem treści. `verifiedAt: null` oznacza brak weryfikacji merytorycznej.

Narzędzie konfiguracji dwukrotnie zwróciło `INVALID_ARGUMENT` przy odczycie szkicu. Nie zapisano zastępczej listy domen, ponieważ aktualnego szkicu nie da się odczytać. W ustawieniach należy zachować istniejące reguły i dodać: `clinicaltrials.gov`, `dzieciom.pl`, `www.siepomaga.pl`, `www.eurordis.org`, `www.orpha.net`. Jeśli strona przekieruje na inną domenę, należy sprawdzić ją i dodać tylko wymagany adres.

Po zmianie ustawień uruchom `node scripts/check-sources.js`. Odpowiedź 200 oznacza wyłącznie dostępność HTTP. Następnie osoba odpowiedzialna za katalog sprawdza na oficjalnej stronie:

- zgodność nazwy i tożsamości organizacji;
- grupę odbiorców, zasięg i aktualne kryteria;
- sposób zgłoszenia, wymagane dokumenty i opłaty;
- kontakt i dokładny URL dokumentu źródłowego;
- datę weryfikacji, zakres potwierdzonych informacji i kolejny termin przeglądu.

Fundacja, platforma zbiórek, organizacja pacjencka i rejestr badań mają różne funkcje. Obecny katalog jest zestawem punktów startowych; nie zawiera potwierdzonych ofert wsparcia finansowego ani przyjęcia na leczenie. Nadanie `verifiedAt` powinno nastąpić dopiero po przeczytaniu źródeł i aktualizacji opisu. Nie nadawać go na podstawie samego testu HTTP.
