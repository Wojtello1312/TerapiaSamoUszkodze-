# Blisko

Panel organizacji wsparcia dla opiekunów. Minimalistyczny interfejs po polsku, React 19, Vite 6, Node.js 24 i SQLite.

## Uruchomienie lokalne

```sh
npm ci --cache /tmp/blisko-npm-cache
npm run dev
```

Polecenie uruchamia frontend (port 5173) i API (loopback, port 3001). Domyślny dozwolony Origin: `http://localhost:5173`. Dla innego adresu ustaw `APP_ORIGIN`. Nie uruchamiaj jednocześnie poprzedniej instancji Vite lub API na tych portach. Zależności nie wymagają prywatnych tokenów.

## Co działa

- Profil zbiórki, zadania, kontakty, szkice postów i zapytań z lokalnych szablonów.
- Katalog źródeł, notatki, status kontaktu, zapisywanie wyników rejestru i przenoszenie następnego kroku do zadań.
- Zapis lokalny: AES-GCM 256, PBKDF2 SHA-256 (600 000 iteracji), losowe salt i IV. Zapis ręczny, walidacja danych, ostrzeżenie o niezapisanych zmianach.
- Eksport zaszyfrowanej kopii do JSON; import z weryfikacją hasła i integralności; limit 4 MB. Eksport dotyczy ostatniej kopii lokalnej, nie późniejszych zmian.
- Zmiana hasła lokalnej kopii po sprawdzeniu starego. Stare eksporty i sprawy na serwerze pozostają zaszyfrowane poprzednim hasłem.
- Konta z loginem i hasłem, sesje HttpOnly/SameSite=Strict, scrypt dla haseł kont. Oddzielne hasło szyfrowania sprawy nie trafia do API.
- Synchronizacja ręczna zaszyfrowanych spraw, role właściciel/edytor/obserwator, odbieranie dostępu, wykrywanie konfliktu wersji. SQLite na trwałym dysku. Nazwy spraw, loginy i uprawnienia są metadanymi widocznymi dla serwera.
- Zakładka Pilotaż: zgoda na pomiar, kod uczestnika, czas, wynik zadania, trudność, pomoc prowadzącego, notatka i eksport JSON. Pomiary są osobne od sprawy, dostępne tylko w sesji przeglądarki.

## Status weryfikacji i blokery

| Obszar | Stan |
| --- | --- |
| Kopie, hasła, konta, uprawnienia, konflikty | Sprawdzone lokalnie w testach jednostkowych, API i przeglądarkowych na fikcyjnych danych |
| ClinicalTrials.gov API | Integracja i obsługa wyników sprawdzone na odpowiedziach testowych; rzeczywisty dostęp blokowany HTTP 403 |
| Fundacje i pozostałe źródła | Próby pobrania blokowane HTTP 403; daty prób widoczne, daty merytorycznej weryfikacji pozostają puste |
| Zmiana listy domen | Odczyt szkicu konfiguracji platformy zwraca INVALID_ARGUMENT; nie zapisano zastępczej listy |
| Publiczne wdrożenie | Nie wykonano; potrzebne hosting, trwały dysk i domena z HTTPS |
| Badanie z opiekunami | Protokół i narzędzia gotowe; uczestnicy nie zostali zrekrutowani, brak wyników sesji |

W ustawieniach środowiska dodaj do istniejących reguł: `clinicaltrials.gov`, `dzieciom.pl`, `www.siepomaga.pl`, `www.eurordis.org`, `www.orpha.net`. Po zastosowaniu uruchom kontrole źródeł i sprawdź rejestr w przeglądarce. Sama odpowiedź HTTP 200 nie potwierdza kryteriów przyjęcia ani jakości pomocy.

## Kontrole

```sh
npm test
npm run build
npm audit
npm run check:sources
npm run check:registry
```

`check:sources` zapisuje daty prób w `src/source-checks.json`, nie nadaje dat weryfikacji merytorycznej. `check:registry` kończy się błędem przy blokadzie sieci; nie pomija kontroli ani nie przedstawia jej jako zaliczonej.

Przy działającym `npm run dev`:

```sh
npx playwright install chromium
npm run test:browser
npm run test:collaboration
```

Można użyć systemowego Chromium: `CHROMIUM_PATH=/usr/bin/chromium npm run test:collaboration`. Opcjonalny `BASE_URL` wskazuje odizolowaną instancję testową. Test współpracy uruchamia osobny backend w pamięci, dwa konteksty przeglądarki i fikcyjne konta; nie zapełnia bazy aplikacji. Nie zastępuje testów z opiekunami.

## Ograniczenia przed użyciem produkcyjnym

Brak odzyskiwania hasła konta, MFA, weryfikacji tożsamości, usuwania konta i automatycznego scalania konfliktów. Nie wykonano niezależnego audytu bezpieczeństwa ani publicznego wdrożenia. Nie używaj dokumentacji medycznej w pilotażu. Utrata hasła szyfrowania uniemożliwia odzyskanie kopii; dostęp do odblokowanego ekranu ujawnia dane. Odebranie dostępu do sprawy nie cofa wcześniej pobranych kopii.

Rejestr badań nie jest pełnym katalogiem klinik ani potwierdzeniem kwalifikacji do leczenia. Wiadomości nie są wysyłane automatycznie, AI nie jest podłączone. Pilotaż nie zbiera danych medycznych ani prawdziwych haseł uczestników.

- [Uruchomienie serwera, role i wdrożenie HTTPS](docs/WDROZENIE.md)
- [Procedura sprawdzania źródeł i domeny](docs/WERYFIKACJA_ZRODEL.md)
- [Rekrutacja, zgoda, scenariusze i analiza pilotażu](docs/PILOTAZ.md)
